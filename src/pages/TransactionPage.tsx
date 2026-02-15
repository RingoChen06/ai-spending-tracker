import { useState, useEffect, useMemo } from "react";
import {
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  type SelectChangeEvent,
  CircularProgress,
  Fade,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  FileDownload as FileDownloadIcon,
} from "@mui/icons-material";
import TransactionDetail from "../components/common/TransactionDetail";
import { useAuth } from "../hooks/useAuth";
import { getIconForCategory } from "../utils/categoryIcons";
import { type Transaction, SPENDING_CATEGORIES } from "../types";
import { getTransactions, deleteTransaction, updateTransaction } from "../api/api";
import styles from "./TransactionPage.module.css";

const TransactionPage = () => {
  const { isAuthenticated } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [editMerchant, setEditMerchant] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editNote, setEditNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Snackbar state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">("success");

  const showSnackbar = (message: string, severity: "success" | "error") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  useEffect(() => {
    if (isAuthenticated) {
      const fetchAndSetTransactions = async () => {
        try {
          const apiData = await getTransactions();

          const mappedTransactions: Transaction[] = apiData
            .map((item: any) => ({
              id: item.id,
              name: item.merchantName,
              category: item.category,
              amount: item.amount,
              date: new Date(item.date).toLocaleDateString(),
              rawDate: new Date(item.date).getTime(),
              note: item.note || "",
              icon: getIconForCategory(item.category),
            }))
            .sort((a: any, b: any) => b.rawDate - a.rawDate);
          setTransactions(mappedTransactions);
          setIsDataLoaded(true);
        } catch (error) {
          console.error("Failed to fetch transactions:", error);
          setIsDataLoaded(true);
        }
      };

      fetchAndSetTransactions();
    }
  }, [isAuthenticated]);

  const uniqueDates = useMemo(() => {
    const dates = new Set(transactions.map((t) => t.date));
    return Array.from(dates).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );
  }, [transactions]);

  const uniqueCategories = useMemo(() => {
    const categories = new Set(transactions.map((t) => t.category));
    return Array.from(categories).sort();
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const lowerSearchTerm = searchTerm.toLowerCase();
      const matchesSearchTerm =
        transaction.name.toLowerCase().includes(lowerSearchTerm) ||
        transaction.category.toLowerCase().includes(lowerSearchTerm);
      const matchesDate =
        selectedDate === "" || transaction.date === selectedDate;
      const matchesCategory =
        selectedCategory === "" || transaction.category === selectedCategory;
      return matchesSearchTerm && matchesDate && matchesCategory;
    });
  }, [transactions, searchTerm, selectedDate, selectedCategory]);

  // Delete handlers
  const handleDeleteClick = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!transactionToDelete) return;
    setIsDeleting(true);
    try {
      await deleteTransaction(transactionToDelete.id);
      setTransactions((prev) => prev.filter((t) => t.id !== transactionToDelete.id));
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
      showSnackbar("Transaction deleted.", "success");
    } catch (error) {
      console.error("Failed to delete transaction:", error);
      showSnackbar("Failed to delete transaction.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Edit handlers
  const handleEditClick = (transaction: Transaction) => {
    setTransactionToEdit(transaction);
    setEditMerchant(transaction.name);
    setEditAmount(String(transaction.amount));
    setEditCategory(transaction.category);
    setEditNote(transaction.note || "");
    const parsed = new Date(transaction.date);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, "0");
      const day = String(parsed.getDate()).padStart(2, "0");
      setEditDate(`${year}-${month}-${day}`);
    } else {
      setEditDate("");
    }
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!transactionToEdit) return;
    setIsSaving(true);
    try {
      await updateTransaction(transactionToEdit.id, {
        merchantName: editMerchant,
        amount: parseFloat(editAmount),
        category: editCategory,
        date: editDate,
        note: editNote,
      });
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === transactionToEdit.id
            ? {
                ...t,
                name: editMerchant,
                amount: parseFloat(editAmount),
                category: editCategory,
                date: new Date(editDate + "T00:00:00").toLocaleDateString(),
                note: editNote,
                icon: getIconForCategory(editCategory),
              }
            : t
        )
      );
      setEditDialogOpen(false);
      setTransactionToEdit(null);
      showSnackbar("Transaction updated.", "success");
    } catch (error) {
      console.error("Failed to update transaction:", error);
      showSnackbar("Failed to update transaction.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // CSV export
  const handleExportCSV = () => {
    const rows = filteredTransactions.map((t) => ({
      Date: t.date,
      Merchant: t.name,
      Category: t.category,
      Amount: t.amount.toFixed(2),
      Note: t.note || "",
    }));

    const headers = Object.keys(rows[0] || {});
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((h) => {
            const val = row[h as keyof typeof row];
            // Escape quotes and wrap in quotes if contains comma
            const str = String(val).replace(/"/g, '""');
            return str.includes(",") ? `"${str}"` : str;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `transactions_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" component="h2" sx={{ fontWeight: 600 }}>
          Transactions
        </Typography>
        {isDataLoaded && filteredTransactions.length > 0 && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportCSV}
          >
            Export CSV
          </Button>
        )}
      </Box>

      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <div className={styles.FilterContainer}>
          <TextField
            label="Search Transactions"
            variant="outlined"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ flexGrow: 1, minWidth: { xs: "100%", sm: "300px" } }}
          />
          <div className={styles.DropdownContainer}>
            <FormControl sx={{ minWidth: 100 }}>
              <InputLabel id="date-filter-label">Date</InputLabel>
              <Select
                labelId="date-filter-label"
                value={selectedDate}
                label="Date"
                onChange={(e: SelectChangeEvent<string>) =>
                  setSelectedDate(e.target.value)
                }
              >
                <MenuItem value="">
                  <em>All Dates</em>
                </MenuItem>
                {uniqueDates.map((date) => (
                  <MenuItem key={date} value={date}>
                    {date}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel id="category-filter-label">Category</InputLabel>
              <Select
                labelId="category-filter-label"
                value={selectedCategory}
                label="Category"
                onChange={(e: SelectChangeEvent<string>) =>
                  setSelectedCategory(e.target.value)
                }
              >
                <MenuItem value="">
                  <em>All Categories</em>
                </MenuItem>
                {uniqueCategories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        </div>
      </Paper>

      {!isDataLoaded && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400, flexDirection: 'column', gap: 2 }}>
          <CircularProgress size={60} thickness={4} />
          <Typography variant="body1" color="text.secondary">Loading transactions...</Typography>
        </Box>
      )}

      {isDataLoaded && filteredTransactions.length === 0 && (
        <Box sx={{ textAlign: "center", mt: 4 }}>
          <Typography color="text.secondary">
            No transactions found matching your criteria.
          </Typography>
        </Box>
      )}

      {isDataLoaded &&
        filteredTransactions.length > 0 &&
        filteredTransactions.map((transaction, index) => (
          <Fade in={isDataLoaded} timeout={200 + index * 20} key={transaction.id}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                borderBottom: "1px solid",
                borderColor: "divider",
                "&:last-child": { borderBottom: "none" },
              }}
            >
              <Box sx={{ flex: 1 }}>
                <TransactionDetail
                  icon={transaction.icon}
                  merchant={transaction.name}
                  type={transaction.category}
                  amount={transaction.amount}
                  date={transaction.date}
                  note={transaction.note}
                />
              </Box>
              <Box sx={{ display: "flex", gap: 0.5, ml: 1 }}>
                <IconButton
                  size="small"
                  onClick={() => handleEditClick(transaction)}
                  sx={{ color: "text.secondary", "&:hover": { color: "primary.main" } }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => handleDeleteClick(transaction)}
                  sx={{ color: "text.secondary", "&:hover": { color: "error.main" } }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          </Fade>
        ))}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Transaction</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the transaction
            {transactionToDelete ? ` "${transactionToDelete.name}"` : ""}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Transaction Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Edit Transaction</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="Merchant Name"
              value={editMerchant}
              onChange={(e) => setEditMerchant(e.target.value)}
              fullWidth
            />
            <TextField
              label="Amount"
              type="number"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              fullWidth
              slotProps={{ htmlInput: { step: "0.01", min: "0" } }}
            />
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={editCategory}
                label="Category"
                onChange={(e) => setEditCategory(e.target.value)}
              >
                {SPENDING_CATEGORIES.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Date"
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Note (optional)"
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              fullWidth
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleEditSave}
            variant="contained"
            disabled={isSaving || !editMerchant || !editAmount || !editCategory || !editDate}
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
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

export default TransactionPage;
