import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ErrorBoundary from "./components/ErrorBoundary";
import { reportError } from "./errorReporter";
import App from "./App";
import "./styles/fonts.css";
import "./styles/tokens.css";
import "./tokens.css";
import "./styles/base.css";
import "./styles/primitives.css";
import "./styles/shell.css";
import "./motion.css";
import "./styles/nothing-theme.css";
import "./print.css";

/* Global handlers for errors that escape React's boundary */
window.addEventListener("error", (event) => {
  reportError(event.error ?? event.message);
});
window.addEventListener("unhandledrejection", (event) => {
  reportError(
    event.reason instanceof Error ? event.reason : String(event.reason),
  );
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
