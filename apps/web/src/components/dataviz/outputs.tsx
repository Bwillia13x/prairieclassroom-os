/**
 * dataviz/outputs.tsx — Surfaces describing what was *produced*:
 * intervention timelines, follow-up resolution rate, variant summaries,
 * readability before/after, workflow patterns, message pipeline, and
 * per-student spark indicators.
 */

import { useMemo } from "react";
import type { KeyboardEvent } from "react";
import type { InterventionRecord, StudentSummary } from "../../types";

interface IntTimelineProps {
  records: InterventionRecord[];
  onDotClick?: (record: InterventionRecord) => void;
}

export function InterventionTimeline({ records, onDotClick }: IntTimelineProps) {
  const sorted = useMemo(() => {
    return [...records]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(-20)
      .map((r) => ({ ...r, _ts: new Date(r.created_at).getTime() }));
  }, [records]);

  if (sorted.length === 0) return null;

  const minDate = sorted[0]._ts;
  const maxDate = sorted[sorted.length - 1]._ts;
  const range = Math.max(maxDate - minDate, 86400000); // at least 1 day
  const w = 260;
  const h = 40;
  const pad = 12;

  return (
    <div className="viz-int-timeline" role={onDotClick ? "group" : "img"} aria-label={`${sorted.length} interventions over time`}>
      <div className="viz-header">
        <span className="t-eyebrow viz-title">Intervention Timeline</span>
        <span className="t-eyebrow viz-subtitle">{sorted.length} records</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="viz-svg viz-int-timeline__svg">
        {/* baseline */}
        <line x1={pad} y1={h / 2} x2={w - pad} y2={h / 2}
          stroke="var(--color-border)" strokeWidth={1} />
        {sorted.map((record) => {
          const x = pad + ((record._ts - minDate) / range) * (w - pad * 2);
          const fill = record.follow_up_needed
            ? "var(--color-warning)"
            : "var(--color-success)";
          const dateStr = new Date(record._ts).toLocaleDateString();
          const studentsStr = record.student_refs.join(", ");
          const dotAriaLabel = `Intervention on ${dateStr}: ${studentsStr}`;
          const clickProps = onDotClick
            ? {
                role: "button" as const,
                tabIndex: 0,
                className: "viz-int-timeline__dot--clickable",
                "data-testid": `viz-int-timeline-dot-${record.record_id}`,
                "aria-label": dotAriaLabel,
                onClick: () => onDotClick(record),
                onKeyDown: (e: KeyboardEvent<SVGCircleElement>) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onDotClick(record);
                  }
                },
              }
            : {};
          return (
            <circle
              key={record.record_id}
              cx={x}
              cy={h / 2}
              r={4}
              fill={fill}
              opacity={0.85}
              {...clickProps}
            >
              <title>
                {dateStr} — {record.follow_up_needed ? "Needs follow-up" : "Resolved"}
              </title>
            </circle>
          );
        })}
      </svg>
      <div className="viz-int-timeline__legend">
        <span className="viz-int-timeline__legend-item">
          <span className="viz-int-timeline__dot viz-int-timeline__dot--resolved" /> Resolved
        </span>
        <span className="viz-int-timeline__legend-item">
          <span className="viz-int-timeline__dot viz-int-timeline__dot--followup" /> Needs follow-up
        </span>
      </div>
    </div>
  );
}

interface FollowUpRateProps {
  records: InterventionRecord[];
  onSegmentClick?: (payload: { category: "stale_followup"; items: InterventionRecord[] }) => void;
}

export function FollowUpSuccessRate({ records, onSegmentClick }: FollowUpRateProps) {
  const { resolved, total, pct } = useMemo(() => {
    const t = records.length;
    const r = records.filter((rec) => !rec.follow_up_needed).length;
    return { resolved: r, total: t, pct: t > 0 ? Math.round((r / t) * 100) : 0 };
  }, [records]);

  if (total === 0) return null;

  const size = 56;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);
  const tone = pct >= 70 ? "success" : pct >= 40 ? "warning" : "danger";

  const staleItems = records.filter((r) => r.follow_up_needed);
  const handleFollowUpClick = onSegmentClick
    ? () => onSegmentClick({ category: "stale_followup", items: staleItems })
    : undefined;
  const handleFollowUpKeyDown = onSegmentClick
    ? (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSegmentClick({ category: "stale_followup", items: staleItems });
        }
      }
    : undefined;

  return (
    <div
      className={`viz-followup-rate${onSegmentClick ? " viz-followup-rate--clickable" : ""}`}
      role={onSegmentClick ? "button" : "img"}
      aria-label={onSegmentClick ? `${pct}% resolved — click to review ${staleItems.length} pending follow-ups` : `${pct}% resolution rate`}
      tabIndex={onSegmentClick ? 0 : undefined}
      data-testid={onSegmentClick ? "viz-followup-rate-hit" : undefined}
      onClick={handleFollowUpClick}
      onKeyDown={handleFollowUpKeyDown}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--color-border)" strokeWidth={stroke}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={`var(--color-${tone})`}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x={size / 2} y={size / 2}
          textAnchor="middle" dominantBaseline="central"
          fontSize="12" fontWeight="600"
          fill={`var(--color-${tone})`}
        >
          {pct}%
        </text>
      </svg>
      <div className="viz-followup-rate__detail">
        <span className="viz-followup-rate__label">Resolved</span>
        <span className="viz-followup-rate__count">{resolved} / {total}</span>
      </div>
    </div>
  );
}

interface VariantSummaryItem {
  variant_type: string;
  estimated_minutes: number;
  title: string;
}

interface VariantSummaryStripProps {
  variants: VariantSummaryItem[];
  onSegmentClick?: (payload: { variantType: string; label: string; variants: VariantSummaryItem[] }) => void;
}

const VARIANT_TONE: Record<string, string> = {
  core: "var(--color-section-ea)",
  eal_supported: "var(--color-accent)",
  chunked: "var(--color-section-family)",
  ea_small_group: "var(--color-section-watchpoint)",
  extension: "var(--color-analysis)",
};

function prettyVariantType(vt: string): string {
  return vt.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function VariantSummaryStrip({ variants, onSegmentClick }: VariantSummaryStripProps) {
  if (variants.length === 0) return null;

  const maxMin = Math.max(...variants.map((v) => v.estimated_minutes), 1);

  return (
    <div className="viz-variant-strip" role={onSegmentClick ? "group" : "img"} aria-label="Variant summary">
      {variants.map((v, i) => {
        const inner = (
          <>
            <div className="viz-variant-strip__bar-wrap">
              <div
                className="viz-variant-strip__bar"
                style={{
                  width: `${Math.max(10, (v.estimated_minutes / maxMin) * 100)}%`,
                  backgroundColor: VARIANT_TONE[v.variant_type] ?? "var(--color-section-ea)",
                }}
              />
            </div>
            <span className="viz-variant-strip__type">{prettyVariantType(v.variant_type)}</span>
            <span className="viz-variant-strip__min">{v.estimated_minutes}m</span>
          </>
        );
        if (onSegmentClick) {
          return (
            <button
              key={i}
              type="button"
              className="viz-variant-strip__item viz-variant-strip__item--clickable"
              aria-label={`Show ${prettyVariantType(v.variant_type)} variants`}
              onClick={() => onSegmentClick({ variantType: v.variant_type, label: prettyVariantType(v.variant_type), variants })}
            >
              {inner}
            </button>
          );
        }
        return (
          <div key={i} className="viz-variant-strip__item">
            {inner}
          </div>
        );
      })}
    </div>
  );
}

interface MessageFunnelProps {
  messagesTotal: number;
  messagesApproved: number;
}

export function MessageApprovalFunnel({ messagesTotal, messagesApproved }: MessageFunnelProps) {
  if (messagesTotal === 0) return null;

  const pending = messagesTotal - messagesApproved;
  const approvalRate = messagesTotal > 0 ? (messagesApproved / messagesTotal) * 100 : 0;

  const barW = 200;
  const genW = barW;
  const approvedW = (messagesApproved / messagesTotal) * barW;

  return (
    <div className="viz-funnel" role="img" aria-label={`Message Pipeline: ${Math.round(approvalRate)}% approval rate`}>
      <div className="viz-header">
        <h4 className="t-eyebrow viz-title">Message Pipeline</h4>
        <span className="t-eyebrow viz-subtitle">{Math.round(approvalRate)}% approval rate</span>
      </div>
      <div className="viz-funnel__body">
        <div className="viz-funnel__stage">
          <span className="viz-funnel__stage-label">Generated</span>
          <div className="viz-funnel__bar" style={{ width: genW, background: "var(--color-section-ea)" }}>
            <span className="viz-funnel__bar-text">{messagesTotal}</span>
          </div>
        </div>
        <div className="viz-funnel__stage">
          <span className="viz-funnel__stage-label">Approved</span>
          <div className="viz-funnel__bar" style={{ width: Math.max(24, approvedW), background: "var(--color-success)" }}>
            <span className="viz-funnel__bar-text">{messagesApproved}</span>
          </div>
        </div>
        {pending > 0 && (
          <div className="viz-funnel__stage">
            <span className="viz-funnel__stage-label">Pending</span>
            <div className="viz-funnel__bar" style={{ width: Math.max(24, (pending / messagesTotal) * barW), background: "var(--color-warning)" }}>
              <span className="viz-funnel__bar-text">{pending}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface StudentSparkProps {
  student: StudentSummary;
}

export function StudentSparkIndicator({ student }: StudentSparkProps) {
  // Synthesize a simple "heat" signal as 3 synthetic data points
  // based on available metrics (no time-series in StudentSummary)
  const base = student.pending_action_count;
  const recency = student.last_intervention_days ?? 0;
  const patterns = student.active_pattern_count;

  const signal = [
    Math.max(0, base - 1),
    base,
    base + Math.min(3, Math.floor(recency / 3)) + patterns,
  ];

  const max = Math.max(1, ...signal);
  const w = 40;
  const h = 12;
  const padding = 1;

  const points = signal
    .map((v, i) => {
      const x = padding + (i / (signal.length - 1)) * (w - padding * 2);
      const y = padding + (1 - v / max) * (h - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const tone = base > 2 ? "var(--color-danger)" : base > 0 ? "var(--color-warning)" : "var(--color-success)";

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true"
      className="viz-student-spark">
      <polyline
        points={points}
        fill="none" stroke={tone} strokeWidth={1.5}
        strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

interface WorkflowFlow {
  sequence: string[];
  count: number;
}

interface WorkflowFlowStripProps {
  flows: WorkflowFlow[];
}

function flowColor(index: number): string {
  const palette = [
    "var(--color-accent)",
    "var(--color-section-family)",
    "var(--color-section-watchpoint)",
    "var(--color-analysis)",
    "var(--color-danger)",
  ];
  return palette[index % palette.length];
}

export function WorkflowFlowStrip({ flows }: WorkflowFlowStripProps) {
  if (flows.length === 0) return null;

  const top = flows.slice(0, 5);

  return (
    <div className="viz-workflow-strip" role="img" aria-label="Common workflow patterns">
      {top.map((flow, fi) => (
        <div key={fi} className="viz-workflow-strip__row">
          <span className="viz-workflow-strip__count">{flow.count}×</span>
          <div className="viz-workflow-strip__lane">
            {flow.sequence.map((step, si) => (
              <span key={si} className="viz-workflow-strip__step" style={{ borderColor: flowColor(fi) }}>
                {step.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                {si < flow.sequence.length - 1 && (
                  <span className="viz-workflow-strip__arrow" style={{ color: flowColor(fi) }}>→</span>
                )}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface ReadabilityComparisonGaugeProps {
  sourceText: string;
  simplifiedText: string;
}

function textMetrics(text: string) {
  const words = text.split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const avgWordLen = words.length > 0 ? words.reduce((s, w) => s + w.length, 0) / words.length : 0;
  return { wordCount: words.length, sentenceCount: sentences.length, avgWordLen };
}

export function ReadabilityComparisonGauge({ sourceText, simplifiedText }: ReadabilityComparisonGaugeProps) {
  const src = useMemo(() => textMetrics(sourceText), [sourceText]);
  const sim = useMemo(() => textMetrics(simplifiedText), [simplifiedText]);

  const metrics: { label: string; before: number; after: number; unit: string; lowerIsBetter: boolean }[] = [
    { label: "Words", before: src.wordCount, after: sim.wordCount, unit: "", lowerIsBetter: true },
    { label: "Sentences", before: src.sentenceCount, after: sim.sentenceCount, unit: "", lowerIsBetter: true },
    { label: "Avg word length", before: Math.round(src.avgWordLen * 10) / 10, after: Math.round(sim.avgWordLen * 10) / 10, unit: " chars", lowerIsBetter: true },
  ];

  return (
    <div className="viz-readability-gauge" role="img" aria-label="Readability comparison">
      {metrics.map((m) => {
        const max = Math.max(m.before, m.after, 1);
        const improved = m.lowerIsBetter ? m.after < m.before : m.after > m.before;
        return (
          <div key={m.label} className="viz-readability-gauge__row">
            <span className="viz-readability-gauge__label">{m.label}</span>
            <div className="viz-readability-gauge__bars">
              <div className="viz-readability-gauge__bar-pair">
                <div
                  className="viz-readability-gauge__bar viz-readability-gauge__bar--before"
                  style={{ width: `${(m.before / max) * 100}%` }}
                >
                  <span>{m.before}{m.unit}</span>
                </div>
                <div
                  className={`viz-readability-gauge__bar viz-readability-gauge__bar--after${improved ? " viz-readability-gauge__bar--improved" : ""}`}
                  style={{ width: `${(m.after / max) * 100}%` }}
                >
                  <span>{m.after}{m.unit}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      <div className="viz-readability-gauge__legend">
        <span className="viz-readability-gauge__legend-item viz-readability-gauge__legend-item--before">Original</span>
        <span className="viz-readability-gauge__legend-item viz-readability-gauge__legend-item--after">Simplified</span>
      </div>
    </div>
  );
}
