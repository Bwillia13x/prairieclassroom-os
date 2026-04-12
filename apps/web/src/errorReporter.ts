/**
 * Structured error reporter for PrairieClassroom OS.
 *
 * Captures errors with classroom context and logs them in a structured format.
 * Exposes a pluggable transport so Sentry/LogRocket can be added later without
 * changing call sites.
 */

export interface ErrorReport {
  message: string;
  stack?: string;
  classroomId?: string;
  activeTab?: string;
  url: string;
  timestamp: string;
  userAgent: string;
  componentStack?: string;
}

export type ErrorTransport = (report: ErrorReport) => void;

const transports: ErrorTransport[] = [];

/** Register an error transport (e.g., Sentry, server-side logger) */
export function addErrorTransport(transport: ErrorTransport): void {
  transports.push(transport);
}

/** Report a structured error */
export function reportError(
  error: Error | string,
  context?: Partial<
    Pick<ErrorReport, "classroomId" | "activeTab" | "componentStack">
  >,
): void {
  const err = typeof error === "string" ? new Error(error) : error;

  const report: ErrorReport = {
    message: err.message,
    stack: err.stack,
    classroomId: context?.classroomId,
    activeTab: context?.activeTab,
    url: window.location.href,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    componentStack: context?.componentStack,
  };

  // Always log to console in structured format
  console.error("[PrairieClassroom Error]", JSON.stringify(report, null, 2));

  // Forward to any registered transports
  for (const transport of transports) {
    try {
      transport(report);
    } catch {
      // Never let a transport crash the app
    }
  }
}
