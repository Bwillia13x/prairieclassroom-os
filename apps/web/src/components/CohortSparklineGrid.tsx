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

type CellSeverity = "low" | "medium" | "high";

/**
 * CohortSparklineGrid — small-multiples grid of per-student
 * 14-day intervention sparklines. Designed for pre-attentive
 * outlier detection: the eye finds rising or sustained cells
 * faster than reading a sequential roster.
 *
 * Encoding:
 *   x-axis: day (oldest left, today right) — fixed 14 points
 *   y-axis: per-student intervention count for that day
 *   per-cell scale: shared maximum of (this student's data ∪ cohort baseline),
 *     so quiet students stay visually quiet while active students' trajectories
 *     rise toward the cell top — and the baseline line is comparable across cells
 *   cohort baseline: faint dashed line per cell showing the cohort mean
 *   stroke tone (2026-04-27 Phase C1): each cell's stroke maps to
 *     `--chart-tone-{low,medium,high}` based on the student's 14-day
 *     intervention sum vs. the cohort's 14-day sum. A student materially
 *     above the cohort norm renders in rust (high), materially below in
 *     navy (low), and around the norm in amber (medium). Removes the
 *     prior single-tone navy stroke that ignored severity entirely.
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
  const cohortTotal = baseline ? sumSeries(baseline) : 0;

  return (
    <div
      className="cohort-grid"
      role="group"
      aria-label="Cohort 14-day intervention pulse"
    >
      {sortedStudents.map((student) => {
        const total = sumSeries(student.intervention_history_14d);
        const severity = classifySeverity(total, cohortTotal);
        const ariaLabel = `${student.alias}: ${total} intervention${total === 1 ? "" : "s"} in last 14 days`;
        const cellContent = (
          <>
            <span className="cohort-cell__alias">{student.alias}</span>
            <CellSparkline
              data={student.intervention_history_14d}
              baseline={baseline}
              severity={severity}
            />
          </>
        );

        const severityClass = ` cohort-cell--severity-${severity}`;

        if (onStudentClick) {
          return (
            <button
              key={student.alias}
              data-testid="cohort-cell"
              data-severity={severity}
              className={`cohort-cell cohort-cell--interactive${severityClass}`}
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
            data-severity={severity}
            className={`cohort-cell${severityClass}`}
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
  severity: CellSeverity;
}

function CellSparkline({ data, baseline, severity }: CellSparklineProps) {
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
        className={`cohort-cell__line cohort-cell__line--${severity}`}
        points={toPoints(data)}
        fill="none"
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

/**
 * classifySeverity — map a student's 14-day intervention sum to a
 * severity tier relative to the cohort. Thresholds are deliberately
 * generous (1.4× and 0.6×) so casual variance reads as "medium" and
 * only meaningful outliers flip to high/low.
 *
 * Edge cases:
 *   - Empty cohort baseline (single-student view): default to medium
 *     so the lone cell still reads as a neutral pulse rather than
 *     silently downgrading to "low" via the divide-by-zero branch.
 *   - Student total is 0 with non-zero cohort total: low, since the
 *     student is materially below the norm.
 */
function classifySeverity(total: number, cohortTotal: number): CellSeverity {
  if (cohortTotal <= 0) return "medium";
  const ratio = total / cohortTotal;
  if (ratio >= 1.4) return "high";
  if (ratio < 0.6) return "low";
  return "medium";
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
