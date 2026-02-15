import { useState, useEffect } from "react";
import {
  Tabs,
  Tab,
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Fade,
  Slide,
  Chip,
} from "@mui/material";
import {
  TrendingUp,
  AccountBalanceWallet,
} from "@mui/icons-material";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { getSpendingSummary } from "../api/api";
import { useAuth } from "../hooks/useAuth";

const COLORS = ["#1976d2", "#42a5f5", "#90caf9", "#bbdefb", "#64b5f6", "#1e88e5", "#0d47a1", "#e3f2fd"];

const convertTabValue = (tabValue: number) => {
  switch (tabValue) {
    case 0:
      return "daily";
    case 1:
      return "weekly";
    case 2:
      return "monthly";
    default:
      return "daily";
  }
};

const SpendingSummaryPage = () => {
  const { isAuthenticated } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [totalSpent, setTotalSpent] = useState(0);
  const [topCategories, setTopCategories] = useState<
    {
      category: string;
      total_amount: number;
    }[]
  >([]);
  const [insightsAndSuggestions, setInsightsAndSuggestions] = useState("");

  useEffect(() => {
    if (!isAuthenticated) return;
    setIsDataLoading(true);

    getSpendingSummary(convertTabValue(tabValue))
      .then((response) => {
        setTotalSpent(response.totalSpent);
        setTopCategories(response.topCategories);
        setInsightsAndSuggestions(response.insights);
        setIsDataLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching spending summary:", error);
        setIsDataLoading(false);
      });
  }, [isAuthenticated, tabValue]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
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
      {/* Tabs with clean styling */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="Spending summary tabs"
          centered
          sx={{
            '& .MuiTab-root': {
              fontWeight: 600,
              fontSize: '1rem',
              textTransform: 'none',
              minHeight: 56,
              transition: 'all 0.15s ease',
            },
          }}
        >
          <Tab label="Daily" />
          <Tab label="Weekly" />
          <Tab label="Monthly" />
        </Tabs>
      </Box>

      {/* Content with smooth transitions */}
      {isDataLoading ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 400,
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <CircularProgress size={60} thickness={4} />
          <Typography variant="body1" color="text.secondary">
            Loading spending summary...
          </Typography>
        </Box>
      ) : (
        <Fade in={!isDataLoading} timeout={250}>
          <Box sx={{ p: { xs: 2, md: 3 } }}>
            {/* Total Spent Card */}
            <Slide direction="down" in={!isDataLoading} timeout={200}>
              <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <AccountBalanceWallet color="primary" />
                  <Typography variant="h6" component="h3" sx={{ fontWeight: 500 }}>
                    Total Spent (USD)
                  </Typography>
                </Box>
                <Typography
                  variant="h3"
                  component="p"
                  sx={{ fontWeight: 'bold', letterSpacing: '-0.02em', color: 'primary.main' }}
                >
                  ${totalSpent.toFixed(2)}
                </Typography>
              </Paper>
            </Slide>

            {/* Pie Chart + Top Categories */}
            <Slide direction="up" in={!isDataLoading} timeout={250}>
              <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <TrendingUp color="primary" />
                  <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
                    Top Categories
                  </Typography>
                </Box>

                {topCategories.length > 0 && (
                  <Box sx={{ width: '100%', height: 180, mb: 2 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={topCategories.map((cat) => ({
                            name: cat.category,
                            value: cat.total_amount,
                          }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                          label={false}
                        >
                          {topCategories.map((_cat, index) => (
                            <Cell key={index} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any) => `$${Number(value).toFixed(2)}`}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                )}
                <List sx={{ p: 0 }}>
                  {topCategories.map((cat, index) => (
                    <Fade
                      in={!isDataLoading}
                      timeout={300 + index * 30}
                      key={index}
                    >
                      <ListItem
                        sx={{
                          py: 1.5,
                          px: 0,
                          borderBottom: index < topCategories.length - 1 ? 1 : 0,
                          borderColor: 'divider',
                        }}
                      >
                        <Chip
                          label={index + 1}
                          size="small"
                          color="primary"
                          sx={{ mr: 2, fontWeight: 'bold' }}
                        />
                        <ListItemText
                          primary={cat.category}
                          primaryTypographyProps={{
                            fontWeight: 500,
                            fontSize: '1rem',
                          }}
                        />
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                          ${cat.total_amount.toFixed(2)}
                        </Typography>
                      </ListItem>
                    </Fade>
                  ))}
                </List>
              </Paper>
            </Slide>

            {/* Insights & Suggestions */}
            <Slide direction="up" in={!isDataLoading} timeout={300}>
              <Paper elevation={2} sx={{ p: 3 }}>
                <Typography variant="h6" component="h3" sx={{ fontWeight: 600, mb: 2 }}>
                  Insights & Suggestions
                </Typography>
                <Typography variant="body1" sx={{ lineHeight: 1.7 }}>
                  {insightsAndSuggestions}
                </Typography>
              </Paper>
            </Slide>
          </Box>
        </Fade>
      )}
    </Box>
  );
};

export default SpendingSummaryPage;
