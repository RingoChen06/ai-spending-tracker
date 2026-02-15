import { useState, useRef, useEffect } from "react";
import {
  TextField,
  Button,
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Paper,
  MenuItem,
  Alert,
  CircularProgress,
  Snackbar,
} from "@mui/material";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import EditIcon from "@mui/icons-material/Edit";
import Webcam from "react-webcam";
import { useAuth } from "../hooks/useAuth";
import { SPENDING_CATEGORIES } from "../types";
import { addTransaction, receiptScan } from "../api/api";

const AddSpendingPage = () => {
  const { isAuthenticated } = useAuth();
  const [date, setDate] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [uploadMode, setUploadMode] = useState<"manual" | "camera">("manual");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState(0.0);
  const [note, setNote] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Snackbar state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">("success");

  const videoConstraints = {
    width: 1920,
    height: 1080,
    facingMode: "environment",
  };
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(reader.result as string);
      setIsCameraOpen(false);
    };
    reader.readAsDataURL(file);
    // Reset input so the same file can be re-selected
    e.target.value = "";
  };

  const showSnackbar = (message: string, severity: "success" | "error") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleSubmit = async () => {
    if (uploadMode === "camera") {
      if (capturedImage) {
        setIsScanning(true);
        try {
          // Strip any data URL prefix (works for jpeg, png, webp, etc.)
          const base64Data = capturedImage.includes(",")
            ? capturedImage.split(",")[1]
            : capturedImage;
          const response = await receiptScan(base64Data);
          const responseString = response.response;
          const jsonStartIndex = responseString.indexOf("{");
          const jsonEndIndex = responseString.lastIndexOf("}");
          const jsonString = responseString.substring(
            jsonStartIndex,
            jsonEndIndex + 1
          );
          const parsedObject = JSON.parse(jsonString);

          setDate(parsedObject.date);
          setMerchantName(parsedObject.merchantName);
          setCategory(parsedObject.category);
          setAmount(parsedObject.amount);
          setAdditionalInfo("Details from scanned receipt (Edit if needed).");
          setUploadMode("manual");
          showSnackbar("Receipt scanned successfully!", "success");
        } catch (error) {
          console.error("Error scanning receipt:", error);
          showSnackbar("Failed to scan receipt. Please try again or enter manually.", "error");
        } finally {
          setIsScanning(false);
        }
      } else {
        showSnackbar("Please capture an image first or switch to Manual Entry.", "error");
      }
    } else if (uploadMode === "manual") {
      if (!date || !merchantName || !category || !amount) {
        showSnackbar("Please fill in all required fields.", "error");
        return;
      }
      setIsSubmitting(true);
      try {
        await addTransaction(date, merchantName, category, amount, note || undefined);
        showSnackbar("Transaction added successfully!", "success");
        setDate("");
        setMerchantName("");
        setCategory("");
        setAmount(0.0);
        setNote("");
        setAdditionalInfo("");
        setCapturedImage(null);
      } catch (error) {
        console.error("Error adding transaction:", error);
        showSnackbar("Failed to add transaction. Please try again.", "error");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  useEffect(() => {
    if (uploadMode === "manual") {
      setIsCameraOpen(false);
    }
  }, [uploadMode]);

  const handleUploadModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newMode: "manual" | "camera" | null
  ) => {
    if (newMode !== null) {
      setUploadMode(newMode);
    }
  };

  if (!isAuthenticated) {
    return (
      <Box sx={{ textAlign: "center", mt: 4 }}>
        <Typography variant="h6" color="text.secondary">
          Please login to view this page
        </Typography>
      </Box>
    );
  }

  return (
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
          Add New Spending
        </Typography>

        <ToggleButtonGroup
          value={uploadMode}
          exclusive
          onChange={handleUploadModeChange}
          fullWidth
          aria-label="upload mode button group"
          sx={{ mb: 3, transition: 'all 0.15s ease' }}
        >
          <ToggleButton value="manual" aria-label="manual upload" disabled={isScanning}>
            <EditIcon sx={{ mr: 1 }} />
            Manual Entry
          </ToggleButton>
          <ToggleButton value="camera" aria-label="camera scan" disabled={isScanning}>
            <CameraAltIcon sx={{ mr: 1 }} />
            Scan Receipt
          </ToggleButton>
        </ToggleButtonGroup>

        <Paper elevation={2} sx={{ p: 3 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {uploadMode === "manual" && (
            <>
              {additionalInfo && (
                <Alert severity="info" sx={{ mb: 1 }}>
                  {additionalInfo}
                </Alert>
              )}
              <TextField
                label="Date"
                fullWidth
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                required
              />
              <TextField
                label="Merchant Name"
                fullWidth
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                required
              />
              <TextField
                label="Category"
                fullWidth
                select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                {SPENDING_CATEGORIES.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Amount ($)"
                fullWidth
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value))}
                slotProps={{ input: { inputProps: { step: "0.01", min: "0" } } }}
                required
              />
              <TextField
                label="Note (optional)"
                fullWidth
                value={note}
                onChange={(e) => setNote(e.target.value)}
                multiline
                rows={2}
              />
            </>
          )}

          {uploadMode === "camera" && (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                alignItems: "center",
              }}
            >
              {!isCameraOpen && !capturedImage && !isScanning && (
                <Box sx={{ display: "flex", gap: 2, width: "100%" }}>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => setIsCameraOpen(true)}
                    startIcon={<CameraAltIcon />}
                  >
                    Open Camera
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => fileInputRef.current?.click()}
                    startIcon={<UploadFileIcon />}
                  >
                    Upload File
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleFileUpload}
                  />
                </Box>
              )}

              {isCameraOpen && !capturedImage && (
                <>
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    width="100%"
                    videoConstraints={videoConstraints}
                  />
                  <Button
                    variant="contained"
                    onClick={() => {
                      const imageSrc = webcamRef.current?.getScreenshot();
                      if (imageSrc) {
                        setCapturedImage(imageSrc);
                        setIsCameraOpen(false);
                      }
                    }}
                    fullWidth
                  >
                    Take Photo
                  </Button>
                </>
              )}

              {capturedImage && !isScanning && (
                <>
                  <Box
                    component="img"
                    src={capturedImage}
                    alt="Captured"
                    sx={{ width: "100%", borderRadius: 1 }}
                  />
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setCapturedImage(null);
                    }}
                    fullWidth
                  >
                    Remove Image
                  </Button>
                </>
              )}

              {isScanning && (
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, py: 4 }}>
                  <CircularProgress size={60} thickness={4} />
                  <Typography variant="body1" color="text.secondary">
                    Scanning receipt with AI...
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={
              isScanning ||
              isSubmitting ||
              (uploadMode === "camera" && !capturedImage)
            }
            fullWidth
            size="large"
            sx={{ mt: 2 }}
          >
            {isScanning
              ? "Scanning..."
              : isSubmitting
              ? "Adding..."
              : uploadMode === "camera"
              ? "Process Receipt"
              : "Add Transaction"}
          </Button>
        </Box>
      </Paper>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={{ mb: 7 }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};
export default AddSpendingPage;
