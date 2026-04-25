import "./CohortSparklineGrid.css";
import type { StudentSummary } from "../types";

interface Props {
  students: StudentSummary[];
  onStudentClick?: (alias: string) => void;
}

const CELL_W = 92;
const CELL_H = 28;
const PAD = 4;
const HISTORY_DAYS = 14;

/**
 * CohortSparklineGrid — small-multiples grid of per-student
 * 14-day intervention sparklines. Designed for pre-attentive
 * outlier detection: the eye finds rising or sustained cells
 * faster than reading a sequential roster.
 *
 * Encoding:
 *   x-axis: day (oldest left, today right) — fixed 14 points
 *   y-axis: per-student intervention count for that day
 *   per-cell scale: each sparkline is normalized to its own min/max
 *     so quiet students stay visually quiet, but trajectory still shows
 *   cohort baseline: faint dashed line per cell showing the cohort mean
 *
 * No automatic ranking, no risk score — alphabetical only by alias.
 */
export default function CohortSparklineGrid({ students, onStudentClick }: Props) {
  if (students.length === 0) {
    return (
      <div className="cohort-grid cohort-grid--empty" role="status">
        No students in cohort.
      </div>
    );
  }

  const sortedStudents = [...students].sort((a, b) =>
    a.alias.localeCompare(b.alias),
  );

  const baseline = students.length > 1 ? computeBaseline(students) : null;

  return (
    <div
      className="cohort-grid"
      role="group"
      aria-label="Cohort 14-day intervention pulse"
    >
      {sortedStudents.map((student) => {
        const total = sumSeries(student.intervention_history_14d);
        const ariaLabel = `${student.alias}: ${total} intervention${total === 1 ? "" : "s"} in last 14 days`;
        const cellContent = (
          <>
            <span className="cohort-cell__alias">{student.alias}</span>
            <CellSparkline
              data={student.intervention_history_14d}
              baseline={baseline}
            />
          </>
        );

        if (onStudentClick) {
          return (
            <button
              key={student.alias}
              data-testid="cohort-cell"
              className="cohort-cell cohort-cell--interactive"
              aria-label={ariaLabel}
              onClick={() => onStudentClick(student.alias)}
            >
              {cellContent}
            </button>
          );
        }

        return (
          <div
            key={student.alias}
            role="group"
            data-testid="cohort-cell"
            className="cohort-cell"
            aria-label={ariaLabel}
          >
            {cellContent}
          </div>
        );
      })}
    </div>
  );
}

interface CellSparklineProps {
  data: number[];
  baseline: number[] | null;
}

function CellSparkline({ data, baseline }: CellSparklineProps) {
  if (data.length < 2) return null;
  const max = Math.max(1, ...data, ...(baseline ?? []));
  const innerW = CELL_W - PAD * 2;
  const innerH = CELL_H - PAD * 2;

  const toPoints = (series: number[]) =>
    series
      .map((v, i) => {
        const x = PAD + (i / (series.length - 1)) * innerW;
        const y = PAD + (1 - v / max) * innerH;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

  return (
    <svg
      className="cohort-cell__svg"
      width={CELL_W}
      height={CELL_H}
      viewBox={`0 0 ${CELL_W} ${CELL_H}`}
      aria-hidden="true"
    >
      {baseline && (
        <polyline
          data-testid="cohort-baseline"
          className="cohort-cell__baseline"
          points={toPoints(baseline)}
          fill="none"
          stroke="var(--color-text-tertiary)"
          strokeWidth={1}
          strokeOpacity={0.45}
          strokeDasharray="2 2"
        />
      )}
      <polyline
        className="cohort-cell__line"
        points={toPoints(data)}
        fill="none"
        stroke="var(--color-section-priority)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function sumSeries(data: number[]): number {
  return data.reduce((acc, v) => acc + v, 0);
}

function computeBaseline(students: StudentSummary[]): number[] {
  const out = new Array(HISTORY_DAYS).fill(0);
  for (const s of students) {
    for (let i = 0; i < HISTORY_DAYS; i += 1) {
      // Schema-enforced length 14, but ?? 0 guards against future drift.
      out[i] += s.intervention_history_14d[i] ?? 0;
    }
  }
  return out.map((v) => v / students.length);
}
