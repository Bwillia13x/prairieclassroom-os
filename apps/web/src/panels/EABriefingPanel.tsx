import { useApp } from "../AppContext";
import { useAsyncAction } from "../useAsyncAction";
import { generateEABriefing } from "../api";
import EABriefingView from "../components/EABriefing";
import type { EABriefingResponse } from "../types";

export default function EABriefingPanel() {
  const { classrooms, activeClassroom, setActiveClassroom, showSuccess } = useApp();
  const { loading, result, execute } = useAsyncAction<EABriefingResponse>();

  if (classrooms.length === 0) return null;

  async function handleSubmit(classroomId: string, eaName?: string) {
    const resp = await execute((signal) =>
      generateEABriefing({ classroom_id: classroomId, ea_name: eaName }, signal)
    );
    if (resp) showSuccess("Briefing generated");
  }

  return (
    <EABriefingView
      classrooms={classrooms}
      selectedClassroom={activeClassroom}
      onClassroomChange={setActiveClassroom}
      onSubmit={handleSubmit}
      loading={loading}
      result={result}
    />
  );
}
