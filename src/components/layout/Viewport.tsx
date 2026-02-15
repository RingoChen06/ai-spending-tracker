import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import HomePage from "../../pages/HomePage";
import TransactionPage from "../../pages/TransactionPage";
import AddSpendingPage from "../../pages/AddSpendingPage";
import SpendingSummaryPage from "../../pages/SpendingSummaryPage";
import { Paper, BottomNavigation, BottomNavigationAction, Container } from "@mui/material";
import {
  Home as HomeIcon,
  ReceiptLong as ReceiptLongIcon,
  AddCircleOutline as AddCircleOutlineIcon,
  Summarize as SummarizeIcon,
} from "@mui/icons-material";
import "./Viewport.css";

const pathToValueMap: Record<string, number> = {
  "/": 0,
  "/transactions": 1,
  "/add-spending": 2,
  "/spending-summary": 3,
};

const valueToPathMap: Record<number, string> = {
  0: "/",
  1: "/transactions",
  2: "/add-spending",
  3: "/spending-summary",
};

const Viewport = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Set initial value based on the current path, defaulting to 0 (Home)
  const [value, setValue] = useState(pathToValueMap[location.pathname] ?? 0);

  // Effect to update BottomNavigation value if the route changes (e.g., browser back/forward)
  useEffect(() => {
    setValue(pathToValueMap[location.pathname] ?? 0);
  }, [location.pathname]);

  const handleNavigationChange = (
    _event: React.SyntheticEvent,
    newValue: number
  ) => {
    setValue(newValue);
    navigate(valueToPathMap[newValue]);
  };

  return (
    <>
      {/* Main Content */}
      <main className="main-content">
        <Container maxWidth="sm" sx={{ px: { xs: 0, sm: 2 } }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/transactions" element={<TransactionPage />} />
            <Route path="/add-spending" element={<AddSpendingPage />} />
            <Route path="/spending-summary" element={<SpendingSummaryPage />} />
          </Routes>
        </Container>
      </main>

      {/* Botton Nav Bar */}
      <Paper
        sx={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1000 }}
        elevation={10}
      >
        <BottomNavigation
          showLabels
          value={value}
          onChange={handleNavigationChange}
        >
          <BottomNavigationAction label="Home" icon={<HomeIcon />} />
          <BottomNavigationAction
            label="Transactions"
            icon={<ReceiptLongIcon />}
          />
          <BottomNavigationAction
            label="Add Spending"
            icon={<AddCircleOutlineIcon />}
          />
          <BottomNavigationAction label="Summary" icon={<SummarizeIcon />} />
        </BottomNavigation>
      </Paper>
    </>
  );
};

export default Viewport;
