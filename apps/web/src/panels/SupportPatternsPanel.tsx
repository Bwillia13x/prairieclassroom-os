import { useState } from "react";
import { useApp } from "../AppContext";
import { useAsyncAction } from "../useAsyncAction";
import { detectSupportPatterns } from "../api";
import PatternReport from "../components/PatternReport";
import OutputFeedback from "../components/OutputFeedback";
import type { SupportPatternsResponse, FamilyMessagePrefill, InterventionPrefill } from "../types";

interface Props {
  onFollowupClick: (prefill: FamilyMessagePrefill) => void;
  onInterventionClick: (prefill: InterventionPrefill) => void;
}

export default function SupportPatternsPanel({ onFollowupClick, onInterventionClick }: Props) {
  const { classrooms, activeClassroom, setActiveClassroom, students, showSuccess } = useApp();
  const { loading, result, execute } = useAsyncAction<SupportPatternsResponse>();
  const [resultKey, setResultKey] = useState(0);

  if (classrooms.length === 0) return null;

  async function handleSubmit(classroomId: string, studentFilter?: string, timeWindow?: number) {
    const resp = await execute((signal) =>
      detectSupportPatterns({
        classroom_id: classroomId,
        student_filter: studentFilter,
        time_window: timeWindow,
      }, signal)
    );
    if (resp) showSuccess("Patterns analyzed");
    if (resp) setResultKey((k) => k + 1);
  }

  return (
    <>
      <PatternReport
        classrooms={classrooms}
        students={students}
        selectedClassroom={activeClassroom}
        onClassroomChange={setActiveClassroom}
        onSubmit={handleSubmit}
        loading={loading}
        result={result}
        onInterventionClick={onInterventionClick}
        onFollowupClick={onFollowupClick}
      />
      {result && <OutputFeedback outputId={`patterns-${resultKey}`} outputType="support-patterns" />}
    </>
  );
}
