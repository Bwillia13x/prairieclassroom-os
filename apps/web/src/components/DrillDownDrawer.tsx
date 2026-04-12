import { useState, useEffect, useRef, useCallback } from "react";
import { useApp } from "../AppContext";
import { useFocusTrap } from "../hooks/useFocusTrap";
import type { DrillDownContext } from "../types";
import type { ActiveTab } from "../appReducer";
import StudentDetailView from "./StudentDetailView";
import ForecastBlockView from "./ForecastBlockView";
import DebtCategoryView from "./DebtCategoryView";
import TrendDetailView from "./TrendDetailView";
import "./DrillDownDrawer.css";

interface Props {
  context: DrillDownContext | null;
  onClose: () => void;
  onNavigate: (tab: ActiveTab) => void;
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

function computeTitle(context: DrillDownContext): string {
  switch (context.type) {
    case "forecast-block":
      return `${context.block.time_slot} — ${context.block.activity} · ${context.block.level} complexity`;
    case "student":
      return `${context.alias} — Student Detail`;
    case "debt-category":
      return `${context.items.length} ${context.category.replace(/_/g, " ")}`;
    case "trend":
      return `${context.label} — 14-day trend`;
  }
}

export default function DrillDownDrawer({
  context,
  onClose,
  onNavigate,
  onInterventionPrefill,
  onMessagePrefill,
}: Props) {
  const { activeClassroom } = useApp();
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout>>();

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
            ✕
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
        </div>
      </div>
    </>
  );
}
