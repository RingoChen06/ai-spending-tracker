# AI Spending Tracker

A full-stack expense tracking app with AI-powered receipt scanning and spending insights.

## Features

- **Receipt Scanning** — Upload or photograph receipts; Gemini AI extracts date, merchant, category, and amount automatically
- **Manual Entry** — Add transactions with merchant, amount, category, date, and optional notes
- **Transaction Management** — Search, filter, edit, delete transactions; export to CSV
- **Spending Summary** — Daily/weekly/monthly breakdowns with pie chart and AI-generated insights
- **Authentication** — Google OAuth via Firebase

## Tech Stack

| Layer | Stack |
|-------|-------|
| Frontend | React 19, TypeScript, Material-UI 7, Recharts, Vite |
| Backend | Flask, Firebase Admin SDK, Google Gemini 2.0 Flash |
| Database | Google Cloud Firestore |
| Auth | Firebase Authentication |
| Deployment | Vercel (frontend + serverless API) |

## Project Structure

```
├── src/
│   ├── pages/           # HomePage, AddSpendingPage, TransactionPage, SpendingSummaryPage
│   ├── components/      # Viewport layout, TransactionDetail, BottomNav
│   ├── api/             # Axios instance with Firebase token interceptors
│   ├── hooks/           # useAuth hook
│   ├── utils/           # Category icon mappings
│   └── types/           # TypeScript interfaces
├── backend/
│   └── app.py           # Flask API (transactions CRUD, receipt scan, spending summary)
├── api/
│   └── index.py         # Vercel serverless entry point
└── vercel.json          # Vercel deployment config
```
