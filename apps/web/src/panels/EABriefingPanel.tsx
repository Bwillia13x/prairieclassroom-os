import { useState } from "react";
import { useApp } from "../AppContext";
import { useAsyncAction } from "../useAsyncAction";
import { generateEABriefing } from "../api";
import EABriefingView from "../components/EABriefing";
import OutputFeedback from "../components/OutputFeedback";
import type { EABriefingResponse } from "../types";

export default function EABriefingPanel() {
  const { classrooms, activeClassroom, setActiveClassroom, showSuccess } = useApp();
  const { loading, result, execute } = useAsyncAction<EABriefingResponse>();
  const [resultKey, setResultKey] = useState(0);

  if (classrooms.length === 0) return null;

  async function handleSubmit(classroomId: string, eaName?: string) {
    const resp = await execute((signal) =>
      generateEABriefing({ classroom_id: classroomId, ea_name: eaName }, signal)
    );
    if (resp) showSuccess("Briefing generated");
    if (resp) setResultKey((k) => k + 1);
  }

  return (
    <>
      <EABriefingView
        classrooms={classrooms}
        selectedClassroom={activeClassroom}
        onClassroomChange={setActiveClassroom}
        onSubmit={handleSubmit}
        loading={loading}
        result={result}
      />
      {result && <OutputFeedback outputId={`briefing-${resultKey}`} outputType="ea-briefing" />}
    </>
  );
}
