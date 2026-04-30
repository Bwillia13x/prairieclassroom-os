import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ErrorBoundary from "./components/ErrorBoundary";
import { addErrorTransport, reportError } from "./errorReporter";
import App from "./App";

const sentryDsn = import.meta.env.VITE_SENTRY_DSN ?? "";
if (sentryDsn) {
  void import("./transports/sentry")
    .then(({ createSentryTransport }) => {
      addErrorTransport(
        createSentryTransport({
          dsn: sentryDsn,
          environment: import.meta.env.MODE,
        }),
      );
    })
    .catch(() => {
      // Sentry init failure must not prevent the app from booting.
    });
}
import "./styles/fonts.css";
import "./styles/tokens.css";
import "./tokens.css";
import "./styles/base.css";
import "./styles/typography.css";
import "./styles/primitives.css";
import "./styles/shell.css";
import "./motion.css";
import "./styles/nothing-theme.css";
import "./styles/ambient.css";
import "./styles/proof-trace.css";
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
