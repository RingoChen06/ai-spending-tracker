import base64
import io
import os
import traceback
from datetime import datetime, time, timedelta, timezone
from flask import Flask, g, request, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import auth, credentials, firestore
from google import genai
from PIL import Image
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(
    app,
    origins=["https://ai-spending-tracker.vercel.app", "http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173"],
    supports_credentials=True,
    allow_headers=['Content-Type', 'Authorization']
)

SPENDING_CATEGORIES = [
    "Food & Dining", "Shopping", "Transportation", "Health & Fitness",
    "Entertainment", "Utilities", "Travel", "Other"
]

# --- Google Services Init ---

try:
    # Construct Firebase credentials from environment variables.
    # This is useful for environments like containers or serverless where file paths can be tricky.
    firebase_creds = {
        "type": "service_account",
        "project_id": os.environ.get("FIREBASE_PROJECT_ID"),
        "private_key_id": os.environ.get("FIREBASE_PRIVATE_KEY_ID"),
        # The private key must be passed with newlines escaped (e.g., in a .env file)
        "private_key": os.environ.get("FIREBASE_PRIVATE_KEY", "").replace('\\n', '\n'),
        "client_email": os.environ.get("FIREBASE_CLIENT_EMAIL"),
        "client_id": os.environ.get("FIREBASE_CLIENT_ID"),
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": os.environ.get("FIREBASE_CLIENT_X509_CERT_URL")
    }

    # Check if all required environment variables for Firebase are set
    required_firebase_vars = ["FIREBASE_PROJECT_ID", "FIREBASE_PRIVATE_KEY_ID", "FIREBASE_PRIVATE_KEY", "FIREBASE_CLIENT_EMAIL", "FIREBASE_CLIENT_ID", "FIREBASE_CLIENT_X509_CERT_URL"]
    if not all(os.environ.get(var) for var in required_firebase_vars):
        raise ValueError("One or more required Firebase environment variables are not set.")

    cred = credentials.Certificate(firebase_creds)
    firebase_admin.initialize_app(cred)

    # Initialize Firestore DB
    db = firestore.client()
    print("Successfully connected to Firestore!")

    # Initialize Gemini AI model
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY environment variable not set.")

    model = genai.Client(api_key=GEMINI_API_KEY)
    print("Successfully initialized Gemini AI model (gemini-2.0-flash)!")

except Exception as e:
    print(f"Error during initialization: {e}")
    db = None
    model = None

# --- Authentication Middleware ---

@app.before_request
def verify_token():
    # Skip token verification for public endpoints
    if request.path in ['/', '/healthcheck'] or request.method == 'OPTIONS':
        return

    auth_header = request.headers.get('Authorization')
    print(f"[DEBUG] Path: {request.path}, Auth header present: {bool(auth_header)}")

    if not auth_header or not auth_header.startswith('Bearer '):
        print(f"[ERROR] Missing or invalid auth header")
        return jsonify({"error": "Authorization header with Bearer token is required"}), 401

    id_token = auth_header.split('Bearer ')[1]
    try:
        g.user = auth.verify_id_token(id_token)
        print(f"[DEBUG] Token verified successfully for user: {g.user.get('uid')}")
    except (auth.InvalidIdTokenError, ValueError) as e:
        print(f"[ERROR] Token verification failed: {e}")
        return jsonify({"error": f"Invalid or expired token: {e}"}), 401
    except Exception as e:
        print(f"[ERROR] Unexpected error during token verification: {e}")
        return jsonify({"error": f"Authentication error: {e}"}), 500

# --- API Endpoints ---

@app.route('/')
def index():
    """
    Welcome page for the AI Spending Tracker API
    """
    return jsonify({
        "message": "Welcome to AI Spending Tracker API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/healthcheck",
            "transactions": "/transactions",
            "receipt_scan": "/receipt",
            "spending_summary": "/summary/spending"
        }
    })

@app.route('/healthcheck')
def healthcheck():
    """
    Performs a health check on the server.
    Checks if Firestore and Gemini AI clients are initialized.
    """
    if db and model:
        return "Flask server is running. Firestore and Gemini AI integration are active."
    else:
        return jsonify({"error": "Firestore or Gemini AI integration is not active."}), 500

@app.route('/users', methods=['GET'])
def get_users():
    """
    Fetches all documents from the 'users' collection in Firestore.
    """
    if not db:
        return jsonify({"error": "Firestore is not initialized."}), 500

    try:
        users_ref = db.collection('users')
        docs_stream = users_ref.stream()
        
        documents = []
        for doc in docs_stream:
            doc_data = doc.to_dict()
            doc_data['id'] = doc.id
            documents.append(doc_data)
        
        if not documents:
            return jsonify({"message": "No documents found in collection 'users' or collection does not exist."}), 404
            
        return jsonify(documents), 200
    except Exception as e:
        return jsonify({"error": f"An error occurred: {e}"}), 500

@app.route('/users', methods=['POST'])
def create_user():
    """
    Creates a new user in the 'users' collection.
    Expects 'email' and 'displayName' in the JSON body.
    The 'createdAt' field is automatically added with the server timestamp.
    """
    if not db:
        return jsonify({"error": "Firestore is not initialized."}), 500

    try:
        data = request.get_json()
        if not data or 'email' not in data or 'displayName' not in data:
            return jsonify({"error": "Missing required fields: email and displayName"}), 400

        user_data = {
            'email': data['email'],
            'displayName': data['displayName'],
            'createdAt': firestore.SERVER_TIMESTAMP
        }

        # Add a new doc with a generated ID and return its ID
        update_time, doc_ref = db.collection('users').add(user_data)
        return jsonify({"message": "User created successfully", "id": doc_ref.id}), 201
    except Exception as e:
        return jsonify({"error": f"An error occurred while creating user: {e}"}), 500

@app.route('/transactions', methods=['GET'])
def get_transactions():
    """
    Fetches all transactions for the authenticated user from Firestore.
    """
    if not db:
        return jsonify({"error": "Firestore is not initialized."}), 500

    try:
        user_id = g.user['uid']
        print(f"[DEBUG] Fetching transactions for user: {user_id}")

        # Query for transactions belonging to the user
        trans_ref = db.collection('transactions').where(filter=firestore.FieldFilter('userId', '==', user_id))
        docs_stream = trans_ref.stream()

        documents = []
        for doc in docs_stream:
            doc_data = doc.to_dict()
            doc_data['id'] = doc.id
            documents.append(doc_data)

        if not documents:
            return jsonify({"message": f"No transactions found for user {user_id}."}), 404

        return jsonify(documents), 200
    except Exception as e:
        print(f"[ERROR] Failed to fetch transactions: {e}")
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        return jsonify({"error": f"An error occurred: {e}"}), 500

@app.route('/summary/spending', methods=['GET'])
def get_spending_summary():
    """
    Calculates spending summary by category for the authenticated user
    for a specified period (daily, weekly, monthly).
    """
    if not db:
        return jsonify({"error": "Firestore is not initialized."}), 500

    try:
        user_id = g.user['uid']
        period = request.args.get('period', 'monthly').lower()
        print(f"[DEBUG] Fetching spending summary for user {user_id}, period: {period}", flush=True)

        if period not in ['daily', 'weekly', 'monthly']:
            return jsonify({"error": "Invalid period. Supported values are 'daily', 'weekly', 'monthly'."}), 400

        # Use local time (no timezone) to match how transactions are stored
        now = datetime.now()
        if period == 'daily':
            # For daily, go back 1 day to account for timezone differences
            start_date = datetime.combine((now - timedelta(days=1)).date(), time.min)
        elif period == 'weekly':
            start_of_week = now.date() - timedelta(days=now.weekday())
            start_date = datetime.combine(start_of_week, time.min)
        else:  # monthly
            start_of_month = now.date().replace(day=1)
            start_date = datetime.combine(start_of_month, time.min)

        # Query for all transactions belonging to the user
        # Then filter by date in Python to avoid composite index requirement
        trans_ref = db.collection('transactions').where(filter=firestore.FieldFilter('userId', '==', user_id))
        docs_stream = trans_ref.stream()

        spending_by_category = {}
        total_spent = 0
        transaction_count = 0
        for doc in docs_stream:
            transaction = doc.to_dict()
            transaction_count += 1

            # Filter by date in Python (compare just the date part, not time)
            transaction_date = transaction.get('date')
            if transaction_date:
                # Compare only the date part to avoid timezone issues
                transaction_date_only = transaction_date.date() if hasattr(transaction_date, 'date') else transaction_date
                start_date_only = start_date.date()
                match = transaction_date_only >= start_date_only
                print(f"[DEBUG] Transaction date: {transaction_date_only}, start_date: {start_date_only}, match: {match}", flush=True)
            else:
                match = False
                print(f"[DEBUG] Transaction has no date", flush=True)

            if match:
                category = transaction.get('category', 'Other')
                amount = transaction.get('amount', 0)

                if isinstance(amount, (int, float)):
                    spending_by_category[category] = spending_by_category.get(category, 0) + amount
                    total_spent += amount

        print(f"[DEBUG] Total transactions found: {transaction_count}, matching period: {len(spending_by_category)}", flush=True)

        if not spending_by_category:
            return jsonify({"message": f"No transactions found for user {user_id} in the '{period}' period."}), 404

        # Sort categories by total spending in descending order
        sorted_summary = sorted(
            [{"category": k, "total_amount": v} for k, v in spending_by_category.items()],
            key=lambda x: x['total_amount'],
            reverse=True
        )

        result = {
            "period": period,
            "totalSpent": total_spent,
            "topCategories": sorted_summary
        }

        # Try to generate AI insights
        try:
            prompt = f"Based on the spending summary, provide a concise analysis of the user's spending habits. Include insights on top spending categories and any notable trends. Spending data: {result}"

            response = model.models.generate_content(
                model="gemini-2.0-flash", contents=[prompt]
            )
            result['insights'] = response.text
        except Exception as ai_error:
            print(f"[WARNING] AI insights failed, using fallback: {ai_error}")
            result['insights'] = f"You spent ${total_spent:.2f} across {len(sorted_summary)} categories during this {period} period."

        return jsonify(result), 200
    except Exception as e:
        print(f"[ERROR] Failed to get spending summary: {e}")
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        return jsonify({"error": f"An error occurred: {e}"}), 500

@app.route('/transactions', methods=['POST'])
def create_transaction():
    """
    Creates a new transaction for the authenticated user.
    Expects 'merchantName', 'amount', 'category', and 'date' in the JSON body.
    The 'userId' and 'createdAt' fields are automatically added. The 'date' should be in 'YYYY-MM-DD' format.
    """
    if not db:
        return jsonify({"error": "Firestore is not initialized."}), 500

    try:
        data = request.get_json()
        user_id = g.user['uid']
        print(f"[DEBUG] Creating transaction for user {user_id}: {data}")
        required_fields = ['amount', 'category', 'date', 'merchantName']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        # Convert date string (e.g., 'YYYY-MM-DD') to a datetime object for proper querying
        try:
            transaction_date = datetime.strptime(data['date'], '%Y-%m-%d')
        except ValueError as ve:
            print(f"[ERROR] Invalid date format: {ve}")
            return jsonify({"error": "Invalid date format. Please use YYYY-MM-DD."}), 400

        transaction_data = {
            'userId': user_id,
            'merchantName': data['merchantName'],
            'amount': data['amount'],
            'category': data['category'],
            'date': transaction_date,
            'note': data.get('note', ''),
            'createdAt': firestore.SERVER_TIMESTAMP
        }

        # Add a new doc with a generated ID and return its ID
        update_time, doc_ref = db.collection('transactions').add(transaction_data)
        print(f"[DEBUG] Transaction created successfully with ID: {doc_ref.id}")
        return jsonify({"message": "Transaction created successfully", "id": doc_ref.id}), 201
    except Exception as e:
        print(f"[ERROR] Failed to create transaction: {e}")
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        return jsonify({"error": f"An error occurred while creating transaction: {e}"}), 500

@app.route('/transactions/<transaction_id>', methods=['DELETE'])
def delete_transaction(transaction_id):
    if not db:
        return jsonify({"error": "Firestore is not initialized."}), 500
    try:
        user_id = g.user['uid']
        doc_ref = db.collection('transactions').document(transaction_id)
        doc = doc_ref.get()
        if not doc.exists:
            return jsonify({"error": "Transaction not found"}), 404
        if doc.to_dict().get('userId') != user_id:
            return jsonify({"error": "Unauthorized"}), 403
        doc_ref.delete()
        return jsonify({"message": "Transaction deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to delete transaction: {e}"}), 500

@app.route('/transactions/<transaction_id>', methods=['PUT'])
def update_transaction(transaction_id):
    if not db:
        return jsonify({"error": "Firestore is not initialized."}), 500
    try:
        user_id = g.user['uid']
        data = request.get_json()
        doc_ref = db.collection('transactions').document(transaction_id)
        doc = doc_ref.get()
        if not doc.exists:
            return jsonify({"error": "Transaction not found"}), 404
        if doc.to_dict().get('userId') != user_id:
            return jsonify({"error": "Unauthorized"}), 403

        update_data = {}
        if 'merchantName' in data:
            update_data['merchantName'] = data['merchantName']
        if 'amount' in data:
            update_data['amount'] = data['amount']
        if 'category' in data:
            update_data['category'] = data['category']
        if 'date' in data:
            try:
                update_data['date'] = datetime.strptime(data['date'], '%Y-%m-%d')
            except ValueError:
                return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400
        if 'note' in data:
            update_data['note'] = data['note']

        doc_ref.update(update_data)
        return jsonify({"message": "Transaction updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to update transaction: {e}"}), 500

@app.route('/receipt', methods=['POST'])
def receipt_scan():
    """
    Analyzes an image with a given prompt using the Gemini AI model.
    Expects a base64-encoded 'image_data' in the JSON body.
    """
    try:
        data = request.get_json()
        prompt = "Scan this receipt. Based on the entire receipt, provide me in JSON format the below information: date(yyyy-MM-dd), merchantName, category(only one category based on the merchant, must select from " + ", ".join(SPENDING_CATEGORIES) + "), amount(total amount in the receipt). If the receipt is not valid, return an empty JSON object. "
        image_data = data['image_data']
        try:
            image_data = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_data))
        except Exception as e:
            return jsonify({"error": f"Failed to process image data: {e}"}), 400
        
        response = model.models.generate_content(
            model="gemini-2.0-flash", contents=[prompt, image]
        )
        return jsonify({"response": response.text})
    except Exception as e:
        print(f"[ERROR] Failed to scan receipt: {e}")
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        return jsonify({"error": f"An error occurred while generating content: {e}"}), 500

# Global error handler for debugging (MUST be before if __name__)
@app.errorhandler(Exception)
def handle_exception(e):
    print(f"[GLOBAL ERROR] Unhandled exception: {e}")
    print(f"[GLOBAL ERROR] Traceback: {traceback.format_exc()}")
    return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)
