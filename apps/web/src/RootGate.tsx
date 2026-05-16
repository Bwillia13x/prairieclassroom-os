import { lazy, Suspense } from "react";
import LandingPage from "./components/LandingPage";

const App = lazy(() => import("./App"));

export const CANONICAL_DEMO_ROUTE =
  "/?demo=true&tab=today&classroom=demo-okafor-grade34";

const APP_QUERY_KEYS = new Set([
  "tab",
  "tool",
  "classroom",
  "demo",
  "presentation",
  "judge",
  "live",
  "hosted",
]);

interface RouteLocation {
  pathname: string;
  search: string;
}

export function hasRecognizedAppQuery(search: string): boolean {
  const params = new URLSearchParams(search);
  for (const key of params.keys()) {
    if (APP_QUERY_KEYS.has(key.toLowerCase())) return true;
  }
  return false;
}

export function shouldShowLandingForLocation(location: RouteLocation): boolean {
  return location.pathname === "/" && !hasRecognizedAppQuery(location.search);
}

export default function RootGate() {
  const shouldShowLanding =
    typeof window !== "undefined" && shouldShowLandingForLocation(window.location);

  if (shouldShowLanding) {
    return <LandingPage demoRoute={CANONICAL_DEMO_ROUTE} />;
  }

  return (
    <Suspense
      fallback={
        <div className="root-gate__app-loading" role="status">
          Loading PrairieClassroom OS...
        </div>
      }
    >
      <App />
    </Suspense>
  );
}
