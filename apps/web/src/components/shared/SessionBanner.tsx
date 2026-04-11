import { HealthDot } from "./DataViz";
import "./SessionBanner.css";

interface SessionBannerProps {
  name: string;
  gradeBand: string;
  healthStatus: "healthy" | "warning" | "critical";
}

export default function SessionBanner({ name, gradeBand, healthStatus }: SessionBannerProps) {
  return (
    <div className="session-banner" role="banner">
      <HealthDot status={healthStatus} tooltip={`Health: ${healthStatus}`} />
      <span className="session-banner__name">{name}</span>
      <span className="session-banner__grade">{gradeBand}</span>
    </div>
  );
}
