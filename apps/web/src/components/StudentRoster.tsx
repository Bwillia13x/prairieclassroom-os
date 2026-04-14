import { useState, useEffect, useCallback } from "react";
import { useApp } from "../AppContext";
import { useAsyncAction } from "../useAsyncAction";
import { fetchStudentSummary } from "../api";
import type { DrillDownContext, StudentSummary } from "../types";
import SectionIcon from "./SectionIcon";
import SkeletonLoader from "./SkeletonLoader";
import { StudentSparkIndicator } from "./DataVisualizations";
import "./StudentRoster.css";

const STORAGE_KEY = "prairie-roster-expanded";
const MAX_VISIBLE = 30;

interface Props {
  attentionCount: number;
  onDrillDown: (context: DrillDownContext) => void;
}

function sortStudents(students: StudentSummary[]): StudentSummary[] {
  return [...students].sort((a, b) => {
    if (b.pending_action_count !== a.pending_action_count) {
      return b.pending_action_count - a.pending_action_count;
    }
    return a.alias.localeCompare(b.alias);
  });
}

function hasAnyActivity(student: StudentSummary): boolean {
  return (
    student.pending_action_count > 0 ||
    student.last_intervention_days !== null ||
    student.active_pattern_count > 0 ||
    student.pending_message_count > 0 ||
    student.latest_priority_reason !== null
  );
}

interface StudentCardProps {
  student: StudentSummary;
  onDrillDown: (context: DrillDownContext) => void;
}

function StudentCard({ student, onDrillDown }: StudentCardProps) {
  const hasAttention = student.pending_action_count > 0;
  const active = hasAnyActivity(student);

  function handleClick() {
    onDrillDown({
      type: "student",
      alias: student.alias,
      initialData: student,
    });
  }

  return (
    <button
      className={`student-card${hasAttention ? " student-card--attention" : ""}`}
      onClick={handleClick}
      aria-label={`View ${student.alias}${hasAttention ? `, ${student.pending_action_count} pending action${student.pending_action_count !== 1 ? "s" : ""}` : ""}`}
      type="button"
    >
      <div className="student-card__header">
        <span className="student-card__name">
          {student.alias}
          <StudentSparkIndicator student={student} />
        </span>
        {hasAttention && (
          <span className="student-card__count" aria-hidden="true">
            {student.pending_action_count}
          </span>
        )}
      </div>

      {active ? (
        <div className="student-card__stats">
          <div className="student-card__stat">
            ● Last intervention:{" "}
            {student.last_intervention_days !== null
              ? `${student.last_intervention_days}d`
              : "none"}
          </div>
          <div className="student-card__stat">
            ● Patterns: {student.active_pattern_count} active
          </div>
          <div className="student-card__stat">
            ● Messages: {student.pending_message_count} pending
          </div>
        </div>
      ) : (
        <div className="student-card__stat student-card__stat--muted">
          No recent activity
        </div>
      )}

      {student.latest_priority_reason && (
        <div className="student-card__priority">
          ⚡ {student.latest_priority_reason}
        </div>
      )}

      <div className="student-card__cta">View →</div>
    </button>
  );
}

export default function StudentRoster({ attentionCount, onDrillDown }: Props) {
  const { activeClassroom } = useApp();

  const [expanded, setExpanded] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === null ? false : stored === "true";
    } catch {
      return false;
    }
  });

  const [showAll, setShowAll] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const summaryAction = useAsyncAction<StudentSummary[]>();

  const loadStudents = useCallback(() => {
    summaryAction.execute((signal) =>
      fetchStudentSummary(activeClassroom, undefined, signal)
    );
  }, [activeClassroom, summaryAction.execute]);

  useEffect(() => {
    if (expanded && !hasLoaded) {
      setHasLoaded(true);
      loadStudents();
    }
  }, [expanded, hasLoaded, loadStudents]);

  function handleToggle() {
    const next = !expanded;
    setExpanded(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // storage unavailable — ignore
    }
  }

  const sorted = summaryAction.result ? sortStudents(summaryAction.result) : [];
  const visible = showAll ? sorted : sorted.slice(0, MAX_VISIBLE);
  const hiddenCount = sorted.length - MAX_VISIBLE;

  return (
    <div className="student-roster">
      <button
        className="student-roster__toggle"
        onClick={handleToggle}
        aria-expanded={expanded}
        aria-controls="student-roster-body"
        type="button"
      >
        <SectionIcon name="grid" className="student-roster__icon" />
        <span className="student-roster__label">Students</span>
        {attentionCount > 0 && (
          <span className="student-roster__badge">
            {attentionCount} need attention
          </span>
        )}
        <span
          className={`student-roster__chevron${expanded ? " student-roster__chevron--open" : ""}`}
          aria-hidden="true"
        >
          ›
        </span>
      </button>

      {expanded && (
        <div id="student-roster-body">
          {summaryAction.loading && (
            <SkeletonLoader
              variant="grid"
              message="Loading students…"
              label="Loading student roster"
            />
          )}

          {summaryAction.error && !summaryAction.loading && (
            <div className="student-roster__error">
              <span>Could not load students.</span>
              <button
                type="button"
                className="student-roster__retry"
                onClick={loadStudents}
              >
                Retry
              </button>
            </div>
          )}

          {!summaryAction.loading && !summaryAction.error && sorted.length > 0 && (
            <>
              <div className="student-card-grid motion-stagger">
                {visible.map((student) => (
                  <StudentCard
                    key={student.alias}
                    student={student}
                    onDrillDown={onDrillDown}
                  />
                ))}
              </div>

              {!showAll && hiddenCount > 0 && (
                <button
                  type="button"
                  className="student-roster__show-all"
                  onClick={() => setShowAll(true)}
                >
                  Show all {sorted.length} students
                </button>
              )}
            </>
          )}

          {!summaryAction.loading && !summaryAction.error && sorted.length === 0 && hasLoaded && (
            <div className="student-roster__empty">No student data found.</div>
          )}
        </div>
      )}
    </div>
  );
}
