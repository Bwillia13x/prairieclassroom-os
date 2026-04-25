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
      // Per safety-governance.md: no PII, no surveillance.
      // sendDefaultPii=false strips IP, cookies, and request bodies.
      // Sessions are NOT tracked because the Replay integration is intentionally
      // omitted (Sentry v10 removed autoSessionTracking; absence of Replay is
      // the canonical way to avoid session-replay capture).
      sendDefaultPii: false,
    });
  }

  return function sentryTransport(report: ErrorReport): void {
    if (!enabled) return;
    const err = new Error(report.message);
    if (report.stack) err.stack = report.stack;
    Sentry.captureException(err, {
      extra: { ...report },
    });
  };
}
