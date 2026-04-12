import { useState, useCallback, useEffect } from "react";
import { useApp } from "../AppContext";
import { useSession } from "../SessionContext";
import { useAsyncAction } from "../useAsyncAction";
import { generateSurvivalPacket } from "../api";
import SurvivalPacketView from "../components/SurvivalPacket";
import ErrorBanner from "../components/ErrorBanner";
import SkeletonLoader from "../components/SkeletonLoader";
import StreamingIndicator from "../components/StreamingIndicator";
import ContextualHint from "../components/ContextualHint";
import OutputFeedback from "../components/OutputFeedback";
import PageIntro from "../components/PageIntro";
import WorkspaceLayout from "../components/WorkspaceLayout";
import EmptyStateCard from "../components/EmptyStateCard";
import EmptyStateIllustration from "../components/EmptyStateIllustration";
import ResultBanner from "../components/ResultBanner";
import { ActionButton, FeedbackCollector, FormSection } from "../components/shared";
import { useFeedback } from "../hooks/useFeedback";
import { useStreamingRequest } from "../hooks/useStreamingRequest";
import type { SurvivalPacketResponse } from "../types";

export default function SurvivalPacketPanel() {
  const { classrooms, activeClassroom, setActiveClassroom, profile, showSuccess, streaming } = useApp();
  const session = useSession();
  const { loading, error, result, execute, cancel, reset } = useAsyncAction<SurvivalPacketResponse>();
  const streamer = useStreamingRequest({
    sectionLabels: ["Schedule", "Student profiles", "Emergency info"],
  });
  const [resultKey, setResultKey] = useState(0);
  const feedback = useFeedback(activeClassroom, session.sessionId);

  useEffect(() => {
    session.recordPanelVisit("survival-packet");
  }, [session]);

  const handleFeedbackSubmit = useCallback(
    (rating: number, comment?: string) => {
      feedback.submit("survival-packet", rating, comment, `packet-${resultKey}`, "generate_survival_packet");
      session.recordFeedback();
    },
    [feedback.submit, resultKey, session],
  );

  if (classrooms.length === 0) return null;

  async function handleSubmit() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const targetDate = tomorrow.toISOString().split("T")[0];

    const resp = await streamer.execute(() =>
      execute((signal) =>
        generateSurvivalPacket(activeClassroom, targetDate, undefined, undefined, signal)
      )
    );
    if (resp) {
      showSuccess("Survival packet generated");
      session.recordGeneration("survival-packet", "generate_survival_packet");
      setResultKey((k) => k + 1);
    }
  }

  return (
    <section className="workspace-page">
      <PageIntro
        eyebrow="Operations Workspace"
        title="Prepare the Substitute Packet"
        sectionTone="slate"
        sectionIcon="grid"
        breadcrumb={{ group: "Ops", tab: "Sub Packet" }}
        description="Create a print-ready packet that packages routines, student supports, family communication constraints, and the simplified day plan for substitute coverage."
        badges={[
          { label: profile ? `Grade ${profile.grade_band}` : "Sub coverage", tone: "sun" },
          { label: "Print-ready packet", tone: "slate" },
          { label: "Protected classroom aware", tone: "pending" },
        ]}
      />

      <WorkspaceLayout
        rail={(
          <>
            <ContextualHint
              featureKey="survival-packet"
              title="Substitute Packet"
              description="Generate a print-ready document for substitute coverage. Includes routines, student supports, and a simplified day plan."
              tone="slate"
            />
            <div className="form-panel">
              <h2>Substitute Survival Packet</h2>
              <p className="form-description">
                Generate a print-ready packet for a substitute covering your classroom tomorrow.
              </p>
              <FormSection label="Classroom" description="Select the classroom for substitute coverage.">
                <select
                  id="sp-classroom"
                  value={activeClassroom}
                  onChange={(e) => setActiveClassroom(e.target.value)}
                >
                  {classrooms.map((c) => (
                    <option key={c.classroom_id} value={c.classroom_id}>
                      Grade {c.grade_band} — {c.subject_focus.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </FormSection>
              <ActionButton
                variant="primary"
                loading={loading}
                disabled={!activeClassroom}
                onClick={handleSubmit}
              >
                Generate Survival Packet
              </ActionButton>
            </div>
          </>
        )}
        canvas={(
          <div className="workspace-result" aria-live="polite" aria-busy={loading && result === null}>
            {error && result === null ? <ErrorBanner message={error} onDismiss={reset} /> : null}
            {loading && result === null ? (
              streaming.phase !== "idle"
                ? <StreamingIndicator onCancel={cancel} />
                : <SkeletonLoader variant="stack" message="Building substitute survival packet..." label="Generating survival packet" />
            ) : null}
            {!loading && result === null && !error ? (
              <EmptyStateCard
                icon={<EmptyStateIllustration name="packet" />}
                title="No packet yet"
                description="Select a classroom and generate a full survival packet for tomorrow's substitute."
              />
            ) : null}
            {result ? (
              <>
                <ResultBanner label="Survival packet generated" generatedAt={Date.now()} />
                <SurvivalPacketView packet={result.packet} />
                <OutputFeedback outputId={`packet-${resultKey}`} outputType="survival-packet" />
                <FeedbackCollector
                  onSubmit={handleFeedbackSubmit}
                  submitted={feedback.submitted}
                  panelLabel="survival packet"
                />
              </>
            ) : null}
          </div>
        )}
      />
    </section>
  );
}
