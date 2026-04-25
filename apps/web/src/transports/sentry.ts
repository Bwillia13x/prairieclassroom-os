import * as Sentry from "@sentry/browser";
import type { ErrorReport, ErrorTransport } from "../errorReporter";

export interface SentryTransportConfig {
  dsn: string;
  environment?: string;
  release?: string;
}

export function createSentryTransport(config: SentryTransportConfig): ErrorTransport {
  const enabled = config.dsn.length > 0;

  if (enabled) {
    Sentry.init({
      dsn: config.dsn,
      environment: config.environment,
      release: config.release,
      // Per safety-governance.md: no PII, no session replay, no user-identifying context.
      sendDefaultPii: false,
      autoSessionTracking: false,
    });
  }

  return function sentryTransport(report: ErrorReport): void {
    if (!enabled) return;
    const err = new Error(report.message);
    err.stack = report.stack;
    Sentry.captureException(err, {
      extra: report,
    });
  };
}
