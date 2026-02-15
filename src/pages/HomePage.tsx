import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from "firebase/auth";
import { auth } from "../firebase";
import { Box, Button, Typography, Paper, Avatar, CircularProgress, Fade } from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import GoogleIcon from "@mui/icons-material/Google";
import { useAuth } from "../hooks/useAuth";

function HomePage() {
  const { user, isLoading } = useAuth();

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error during Google sign-in:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during sign-out:", error);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "calc(100vh - 70px)", flexDirection: "column", gap: 2 }}>
        <CircularProgress size={60} thickness={4} />
        <Typography variant="body1" color="text.secondary">Loading...</Typography>
      </Box>
    );
  }

  return (
    <Fade in={!isLoading} timeout={300}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "calc(100vh - 70px)",
          px: 2,
        }}
      >
        <AccountBalanceWalletIcon sx={{ fontSize: 80, color: "primary.main", mb: 2 }} />

        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700, textAlign: "center" }}>
          AI Spending Tracker
        </Typography>

        <Typography variant="h6" color="text.secondary" sx={{ mb: 4, textAlign: "center", maxWidth: 500 }}>
          Track your expenses smartly with AI-powered receipt scanning and intelligent insights
        </Typography>

        <Paper elevation={2} sx={{ p: 3, minWidth: 300 }}>
          {user ? (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              {user.photoURL && (
                <Avatar src={user.photoURL} sx={{ width: 64, height: 64 }} />
              )}
              <Typography variant="h6" sx={{ textAlign: "center" }}>
                Welcome back!
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ textAlign: "center" }}>
                {user.displayName || user.email}
              </Typography>
              <Button
                variant="outlined"
                color="error"
                onClick={handleLogout}
                fullWidth
                sx={{ mt: 2 }}
              >
                Logout
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <Typography variant="body1" sx={{ textAlign: "center", mb: 1 }}>
                Sign in to start tracking your spending
              </Typography>
              <Button
                variant="contained"
                onClick={handleGoogleLogin}
                startIcon={<GoogleIcon />}
                fullWidth
                sx={{ py: 1.5 }}
              >
                Sign in with Google
              </Button>
            </Box>
          )}
        </Paper>
      </Box>
    </Fade>
  );
}
export default HomePage;
