import { useState, useEffect, useRef, useCallback } from "react";
import { useApp } from "../AppContext";
import { useFocusTrap } from "../hooks/useFocusTrap";
import type { DrillDownContext } from "../types";
import type { ActiveTab } from "../appReducer";
import StudentDetailView from "./StudentDetailView";
import ForecastBlockView from "./ForecastBlockView";
import DebtCategoryView from "./DebtCategoryView";
import TrendDetailView from "./TrendDetailView";
import PlanCoverageSectionView from "./PlanCoverageSectionView";
import StudentTagGroupView from "./StudentTagGroupView";
import VariantLaneView from "./VariantLaneView";
import "./DrillDownDrawer.css";

interface Props {
  context: DrillDownContext | null;
  onClose: () => void;
  onNavigate: (tab: ActiveTab) => void;
  /**
   * Called when a child view needs to escalate to a different context
   * without closing the drawer (e.g., student-tag-group → student detail).
   * Required when rendering `student-tag-group` context; omitting it silently
   * disables student escalation from that view.
   */
  onContextChange?: (next: DrillDownContext) => void;
  onInterventionPrefill?: (prefill: {
    student_ref: string;
    suggested_action: string;
    reason: string;
  }) => void;
  onMessagePrefill?: (prefill: {
    student_ref: string;
    reason: string;
    message_type: string;
  }) => void;
}

// Friendlier, less-judgmental category labels for the drawer title.
// The schema key `stale_followup` reads as "you've been bad" to a teacher
// already feeling behind; "open follow-ups" does the same operational work
// without the emotional charge. Schema keys remain unchanged.
const DEBT_CATEGORY_LABELS: Record<string, string> = {
  stale_followup: "open follow-ups",
  unaddressed_pattern: "unaddressed patterns",
  unapproved_message: "unapproved messages",
  approaching_review: "approaching review",
};

function computeTitle(context: DrillDownContext): string {
  switch (context.type) {
    case "forecast-block":
      return `${context.block.time_slot} — ${context.block.activity} · ${context.block.level} complexity`;
    case "student":
      return `${context.alias} — Student Detail`;
    case "debt-category": {
      const label = DEBT_CATEGORY_LABELS[context.category] ?? context.category.replace(/_/g, " ");
      return `${context.items.length} ${label}`;
    }
    case "trend":
      return `${context.label} — 14-day trend`;
    case "plan-coverage-section":
      return `${context.label} — ${context.items.length} ${context.items.length === 1 ? "item" : "items"}`;
    case "student-tag-group":
      return `${context.label} — ${context.students.length} ${context.students.length === 1 ? "student" : "students"}`;
    case "variant-lane": {
      const count = context.variants.filter((v) => v.variant_type === context.variantType).length;
      return `${context.label} — ${count} ${count === 1 ? "variant" : "variants"}`;
    }
  }
}

export default function DrillDownDrawer({
  context,
  onClose,
  onNavigate,
  onContextChange,
  onInterventionPrefill,
  onMessagePrefill,
}: Props) {
  const { activeClassroom } = useApp();
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useFocusTrap(drawerRef, context !== null);

  useEffect(() => {
    clearTimeout(closeTimerRef.current);
    setIsClosing(false);
  }, [context]);

  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 220);
  }, [isClosing, onClose]);

  useEffect(() => {
    if (!context) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [context, handleClose]);

  if (!context) return null;

  const title = computeTitle(context);

  return (
    <>
      <div
        className={`drill-down-backdrop${isClosing ? " drill-down-backdrop--closing" : ""}`}
        aria-hidden="true"
        onClick={handleClose}
      />

      <div
        ref={drawerRef}
        className={`drill-down-drawer${isClosing ? " drill-down-drawer--closing" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="drill-down-drawer__header">
          <h2 className="drill-down-drawer__title" title={title}>
            {title}
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            className="drill-down-drawer__close"
            aria-label="Close drawer"
            onClick={handleClose}
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <div className="drill-down-drawer__body">
          {context.type === "student" && (
            <StudentDetailView
              context={context}
              classroomId={activeClassroom}
              onInterventionPrefill={onInterventionPrefill}
              onMessagePrefill={onMessagePrefill}
              onNavigate={onNavigate}
            />
          )}

          {context.type === "forecast-block" && (
            <ForecastBlockView block={context.block} />
          )}

          {context.type === "debt-category" && (
            <DebtCategoryView
              items={context.items}
              onInterventionPrefill={onInterventionPrefill}
              onNavigate={onNavigate}
            />
          )}

          {context.type === "trend" && <TrendDetailView context={context} />}

          {context.type === "plan-coverage-section" && (
            <PlanCoverageSectionView context={context} />
          )}

          {context.type === "student-tag-group" && (
            <StudentTagGroupView
              context={context}
              onStudentSelect={(alias) => {
                onContextChange?.({ type: "student", alias });
              }}
            />
          )}

          {context.type === "variant-lane" && <VariantLaneView context={context} />}
        </div>
      </div>
    </>
  );
}
