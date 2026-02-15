import { StrictMode, useMemo } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Viewport from "./components/layout/Viewport";
import { BrowserRouter } from "react-router-dom";
import {
  ThemeProvider,
  createTheme,
  useMediaQuery,
  CssBaseline,
} from "@mui/material";

// Component to provide the theme based on user's system preference
const AppWithTheme = () => {
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: prefersDarkMode ? "dark" : "light",
        },
      }),
    [prefersDarkMode]
  );

  return (
    <ThemeProvider theme={theme}>
      {/* CssBaseline kickstarts an elegant, consistent, and simple baseline to build upon. */}
      <CssBaseline />
      <BrowserRouter>
        <Viewport />
      </BrowserRouter>
    </ThemeProvider>
  );
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppWithTheme />
  </StrictMode>
);
