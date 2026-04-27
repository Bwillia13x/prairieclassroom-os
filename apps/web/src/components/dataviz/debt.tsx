/**
 * dataviz/debt.tsx — Complexity debt gauge + 14-day debt-trend sparkline.
 *
 * ComplexityDebtGauge: triage card showing total load, severity, delta,
 * and category mix. Answers: "Am I falling behind?"
 *
 * DebtTrendSparkline: miniature 14-day sparkline of total debt with a
 * gradient-stroke + area-fill (reduced-motion safe).
 */

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { DebtItem } from "../../types";
import SourceTag from "../SourceTag";
import { useReducedMotion } from "../../hooks/useReducedMotion";

interface DebtGaugeProps {
  debtItems: DebtItem[];
  previousTotal?: number;
  onSegmentClick?: (payload: { trendKey: "debt"; label: string; data: number[] }) => void;
}

export function ComplexityDebtGauge({ debtItems, previousTotal, onSegmentClick }: DebtGaugeProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const total = debtItems.length;
  const tone = total <= 3 ? "success" : total <= 7 ? "warning" : "danger";

  const categories = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of debtItems) {
      map[item.category] = (map[item.category] ?? 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [debtItems]);

  const maxCategoryCount = Math.max(1, ...categories.map(([, count]) => count));
  const toneLabel = tone === "success" ? "Manageable" : tone === "warning" ? "Accumulating" : "Critical";
  const topCategory = categories[0] ? formatDebtCategory(categories[0][0]) : null;
  const topCategoryCount = categories[0]?.[1] ?? 0;

  const delta =
    typeof previousTotal === "number" && previousTotal !== total
      ? total - previousTotal
      : null;

  const ariaLabel =
    `Complexity debt: ${total} ${total === 1 ? "item" : "items"}, ${toneLabel.toLowerCase()}` +
    (topCategory ? `, ${topCategory} leading` : "") +
    (delta !== null ? `, ${delta > 0 ? "up" : "down"} ${Math.abs(delta)} from last check` : "") +
    ".";

  const handleGaugeClick = onSegmentClick
    ? () => onSegmentClick({ trendKey: "debt", label: "Complexity debt", data: [debtItems.length] })
    : undefined;

  const handleGaugeKeyDown = onSegmentClick
    ? (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Enter" || e.key === " ") {
          if (e.key === " ") e.preventDefault();
          onSegmentClick({ trendKey: "debt", label: "Complexity debt", data: [debtItems.length] });
        }
      }
    : undefined;

  return (
    <div
      className={`viz-debt-gauge${mounted ? " viz-debt-gauge--mounted" : ""}${onSegmentClick ? " viz-debt-gauge--clickable" : ""}`}
      {...(onSegmentClick
        ? {
            role: "button",
            tabIndex: 0,
            "aria-label": ariaLabel,
            "data-testid": "viz-debt-gauge-hit",
            onClick: handleGaugeClick,
            onKeyDown: handleGaugeKeyDown,
          }
        : {})}
    >
      <div className="viz-header">
        <h3 className="t-eyebrow viz-title">Complexity Debt <SourceTag kind="record" /></h3>
        <div className="viz-debt-gauge__badges">
          {delta !== null && (
            <span
              className={`viz-debt-gauge__delta viz-debt-gauge__delta--${delta > 0 ? "up" : "down"}`}
              aria-hidden="true"
            >
              {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}
            </span>
          )}
          {/* Audit #12: attach a definition tooltip to the tone badge so
              CRITICAL / Accumulating / Manageable each carry their
              threshold rule on hover. */}
          <span
            className={`t-eyebrow viz-tone-badge viz-tone-badge--${tone}`}
            title={
              tone === "danger"
                ? "Critical: 8 or more open items. Healthy range is 0–3; 4–7 is accumulating."
                : tone === "warning"
                  ? "Accumulating: 4–7 open items. Healthy range is 0–3."
                  : "Manageable: 3 or fewer open items."
            }
          >
            {toneLabel}
          </span>
        </div>
      </div>
      <div className="viz-debt-gauge__body">
        <div className={`viz-debt-gauge__summary viz-debt-gauge__summary--${tone}`}>
          <div className="viz-debt-gauge__total">
            <span className="viz-debt-gauge__total-number">{total}</span>
            <span className="viz-debt-gauge__total-label">{total === 1 ? "open item" : "open items"}</span>
          </div>
          <div className="viz-debt-gauge__signal">
            <span>Largest source</span>
            <strong>{topCategory ?? "No open source"}</strong>
            {topCategory ? <em>{topCategoryCount} {topCategoryCount === 1 ? "item" : "items"}</em> : null}
          </div>
          <div className="viz-debt-gauge__threshold-wrapper">
            {/* Audit #11: explicit legend above the threshold row — it
                was previously unlabelled, leaving 0-3 / 4-7 / 8+ to
                read as opaque tier codes. */}
            <p
              className="viz-debt-gauge__threshold-legend"
              data-testid="debt-scale-legend"
            >
              Debt severity tier
            </p>
            <div className="viz-debt-gauge__threshold" aria-hidden="true">
              <span className={`viz-debt-gauge__threshold-zone${tone === "success" ? " viz-debt-gauge__threshold-zone--active" : ""}`}>0-3</span>
              <span className={`viz-debt-gauge__threshold-zone${tone === "warning" ? " viz-debt-gauge__threshold-zone--active" : ""}`}>4-7</span>
              <span className={`viz-debt-gauge__threshold-zone${tone === "danger" ? " viz-debt-gauge__threshold-zone--active" : ""}`}>8+</span>
            </div>
          </div>
        </div>
        {categories.length > 0 && (
          <div className="viz-debt-gauge__breakdown">
            {categories.map(([cat, count], index) => (
              <div
                key={cat}
                className={`viz-debt-gauge__cat viz-debt-gauge__cat--${debtCategoryTone(cat)}`}
                style={{ animationDelay: `${120 + index * 55}ms` }}
              >
                <div className="viz-debt-gauge__cat-main">
                  <span className="viz-debt-gauge__cat-label">{formatDebtCategory(cat)}</span>
                  <span className="viz-debt-gauge__cat-count">{count}</span>
                </div>
                <div className="viz-debt-gauge__bar" aria-hidden="true">
                  <span
                    className="viz-debt-gauge__bar-fill"
                    style={{
                      "--debt-bar-width": `${Math.max(8, (count / maxCategoryCount) * 100)}%`,
                    } as CSSProperties}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatDebtCategory(category: string): string {
  const labels: Record<string, string> = {
    approaching_review: "Approaching review",
    stale_followup: "Stale follow-up",
    recurring_plan_item: "Recurring plan item",
    unaddressed_pattern: "Unaddressed pattern",
    unapproved_message: "Unapproved message",
  };
  return labels[category] ?? category.replace(/_/g, " ");
}

/**
 * Unify Complexity Debt breakdown colors with the Day Arc LOW / MEDIUM /
 * HIGH vocabulary (audit #13). Every category lands on one of three
 * severity buckets so the dashboard reads with one semantic palette.
 */
function debtCategoryTone(category: string): "high" | "medium" | "low" {
  if (category === "approaching_review" || category === "stale_followup") return "high";
  if (category === "recurring_plan_item" || category === "unapproved_message") return "medium";
  return "low";
}

interface DebtTrendProps {
  data: number[];
  onSegmentClick?: (payload: { trendKey: "debt"; label: string; data: number[] }) => void;
}

export function DebtTrendSparkline({ data, onSegmentClick }: DebtTrendProps) {
  const w = 140;
  const h = 32;
  const pad = 4;

  const { points, areaPath, lastX, lastY, first, last, trend, tone, bandY, bandHeight } = useMemo(() => {
    const trimmed = data.slice(-14);
    const max = Math.max(...trimmed, 1);
    const coords = trimmed.map((v, i) => ({
      x: pad + (i / Math.max(trimmed.length - 1, 1)) * (w - pad * 2),
      y: pad + (1 - v / max) * (h - pad * 2),
    }));
    const pts = coords.map((c) => `${c.x},${c.y}`).join(" ");
    const endPt = coords[coords.length - 1] ?? { x: 0, y: 0 };
    const startPt = coords[0] ?? { x: 0, y: 0 };
    const f = trimmed[0] ?? 0;
    const l = trimmed[trimmed.length - 1] ?? 0;
    const tr = l > f ? "rising" : l < f ? "falling" : "flat";
    const tn = tr === "rising" ? "var(--color-danger)" : tr === "falling" ? "var(--color-success)" : "var(--color-warning)";
    // Audit #22: paint a healthy band (debt <= 15) behind the line so
    // the Y axis has scale context without overloading the sparkline.
    // When max <= 15, the entire plot is healthy — the band fills it.
    const HEALTHY_THRESHOLD = 15;
    const bandTop = max > HEALTHY_THRESHOLD
      ? pad + (1 - HEALTHY_THRESHOLD / max) * (h - pad * 2)
      : pad;
    const bandBottom = pad + (h - pad * 2);
    // Phase δ1 (2026-04-28) — area-fill path under the polyline. Built
    // by traversing every point along the line, then dropping to the
    // baseline at the right edge, traversing back to the start at the
    // left, closing the path. The SVG <linearGradient id="debt-trend-area">
    // fills it with high-tone alpha at the right (today) fading to 0 at
    // the left (14d ago) so the rise on the right is *felt*, not just read.
    const baseline = bandBottom;
    const ap = coords.length > 0
      ? `M${coords[0]!.x},${coords[0]!.y} ${coords.slice(1).map((c) => `L${c.x},${c.y}`).join(" ")} L${endPt.x},${baseline} L${startPt.x},${baseline} Z`
      : "";
    return {
      points: pts,
      areaPath: ap,
      lastX: endPt.x,
      lastY: endPt.y,
      first: f,
      last: l,
      trend: tr,
      tone: tn,
      count: trimmed.length,
      bandY: bandTop,
      bandHeight: Math.max(0, bandBottom - bandTop),
    };
  }, [data]);

  // Phase δ1 — reduced-motion fallback: gradient-stroke + area-fill is
  // a layered visual that the spec treats as a reduced-motion-eligible
  // accommodation. When the user prefers reduced motion, fall back to
  // the existing solid trend-toned stroke so the chart still encodes
  // direction (rising = danger, falling = success, flat = warning) with
  // a single visual layer.
  const prefersReducedMotion = useReducedMotion();

  if (data.length < 2) return null;

  const toneClass = trend === "rising" ? "danger" : trend === "falling" ? "success" : "warning";
  const count = Math.min(data.length, 14);

  return (
    <div
      className={`viz-debt-trend${onSegmentClick ? " viz-debt-trend--clickable" : ""}`}
      role={onSegmentClick ? "button" : "img"}
      aria-label={`Debt trend over ${count} days: ${trend}`}
      {...(onSegmentClick
        ? {
            tabIndex: 0,
            "data-testid": "viz-debt-trend-hit",
            onClick: () => onSegmentClick({ trendKey: "debt", label: "Debt trend", data }),
            onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
              if (e.key === "Enter" || e.key === " ") {
                if (e.key === " ") e.preventDefault();
                onSegmentClick({ trendKey: "debt", label: "Debt trend", data });
              }
            },
          }
        : {})}
    >
      <div className="viz-header">
        <span className="t-eyebrow viz-title">Debt Trend</span>
        <span className={`t-eyebrow viz-tone-badge viz-tone-badge--${toneClass}`}>
          {trend === "rising" ? "↑ Rising" : trend === "falling" ? "↓ Falling" : "→ Flat"}
        </span>
      </div>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="viz-svg">
        {/* Phase δ1 (2026-04-28) — gradient defs for the tonal stroke
            and area fill. Stop-color references the chart-tone token
            family via inline style so token cascade works. */}
        {!prefersReducedMotion && (
          <defs>
            <linearGradient id="debt-trend-stroke" x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" style={{ stopColor: "var(--chart-tone-low)" }} />
              <stop offset="100%" style={{ stopColor: "var(--chart-tone-high)" }} />
            </linearGradient>
            <linearGradient id="debt-trend-area" x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" style={{ stopColor: "var(--chart-tone-high)", stopOpacity: 0 }} />
              <stop offset="100%" style={{ stopColor: "var(--chart-tone-high)", stopOpacity: 0.12 }} />
            </linearGradient>
          </defs>
        )}
        {/* Audit #22: healthy band (0–15) gives the Y axis an anchor
            without requiring tick labels on a sparkline. */}
        {bandHeight > 0 && (
          <rect
            className="viz-debt-trend__healthy-band"
            x={0}
            y={bandY}
            width={w}
            height={bandHeight}
          >
            <title>Healthy range: 0–15 open items</title>
          </rect>
        )}
        {!prefersReducedMotion && areaPath ? (
          <path d={areaPath} fill="url(#debt-trend-area)" stroke="none" />
        ) : null}
        <polyline
          points={points}
          fill="none"
          stroke={prefersReducedMotion ? tone : "url(#debt-trend-stroke)"}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={lastX} cy={lastY} r={2.5} fill={tone} />
      </svg>
      <div className="viz-debt-trend__range">
        <span className="viz-debt-trend__label">{count}d ago: {first}</span>
        <span className="viz-debt-trend__label">Today: {last}</span>
      </div>
    </div>
  );
}
