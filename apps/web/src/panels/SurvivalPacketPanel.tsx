import { useState, useCallback, useEffect, useMemo } from "react";
import { useApp } from "../AppContext";
import { useSession } from "../SessionContext";
import { useAsyncAction } from "../useAsyncAction";
import { generateSurvivalPacket } from "../api";
import SurvivalPacketView from "../components/SurvivalPacket";
import OpsWorkflowStepper from "../components/OpsWorkflowStepper";
import ErrorBanner from "../components/ErrorBanner";
import SkeletonLoader from "../components/SkeletonLoader";
import StreamingIndicator from "../components/StreamingIndicator";
import PageIntro from "../components/PageIntro";
import WorkspaceLayout from "../components/WorkspaceLayout";
import EmptyStateCard from "../components/EmptyStateCard";
import ResultBanner from "../components/ResultBanner";
import MockModeBanner from "../components/MockModeBanner";
import RetrievalTraceCard from "../components/RetrievalTraceCard";
import { ActionButton, FeedbackCollector, FormCard, OutputActionBar, type OutputAction } from "../components/shared";
import { useFeedback } from "../hooks/useFeedback";
import { useCopyToClipboard } from "../hooks/useCopyToClipboard";
import { useDownloadBlob } from "../hooks/useDownloadBlob";
import { useStreamingRequest } from "../hooks/useStreamingRequest";
import { serializeSurvivalPacketToMarkdown } from "./outputActionBarHelpers";
import type { SurvivalPacketResponse } from "../types";

export default function SurvivalPacketPanel() {
  const { classrooms, activeClassroom, showSuccess, showError, streaming } = useApp();
  const session = useSession();
  const { loading, error, result, execute, cancel, reset } = useAsyncAction<SurvivalPacketResponse>({
    onError: (msg) => showError(`Couldn't generate sub packet — ${msg}`),
  });
  const streamer = useStreamingRequest({
    sectionLabels: ["Schedule", "Student profiles", "Emergency info"],
  });
  const [resultKey, setResultKey] = useState(0);
  const feedback = useFeedback(activeClassroom, session.sessionId);
  const { copy } = useCopyToClipboard();
  const { download } = useDownloadBlob();

  const actions = useMemo<OutputAction[]>(() => {
    if (!result) return [];
    const packet = result.packet;
    return [
      {
        key: "print",
        label: "Print",
        icon: "pencil",
        onClick: () => window.print(),
      },
      {
        key: "copy",
        label: "Copy",
        icon: "check",
        onClick: async () => {
          await copy(serializeSurvivalPacketToMarkdown(packet));
          showSuccess("Copied");
        },
      },
      {
        key: "download",
        label: "Download",
        icon: "grid",
        onClick: () =>
          download({
            filename: `survival-packet-${packet.generated_for_date}.md`,
            content: serializeSurvivalPacketToMarkdown(packet),
            mime: "text/markdown",
          }),
      },
    ];
  }, [result, copy, download, showSuccess]);

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

    const resp = await streamer.execute((stream) =>
      execute((signal) =>
        generateSurvivalPacket(activeClassroom, targetDate, undefined, undefined, signal, stream)
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
        title="Prepare the Substitute Packet"
        sectionTone="slate"
        description="Create a print-ready packet that packages routines, student supports, family communication constraints, and the simplified day plan for substitute coverage."
        infoContent={{
          title: "Substitute Packet",
          body: (
            <p>
              Generate a print-ready document for substitute coverage. Includes routines,
              student supports, and a simplified day plan.
            </p>
          ),
        }}
      />

      <OpsWorkflowStepper activeTool="survival-packet" />

      <WorkspaceLayout
        splitState={result ? "output" : "input"}
        rail={(
          <>
            <FormCard className="survival-packet-form">
              <h2>Substitute survival packet</h2>
              <p className="form-description">
                Generate a print-ready packet for a substitute covering your classroom tomorrow.
              </p>
              <ActionButton
                variant="primary"
                loading={loading}
                disabled={!activeClassroom}
                onClick={handleSubmit}
                data-testid="generate-survival-packet-submit"
              >
                Generate sub packet
              </ActionButton>
            </FormCard>
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
              /* The real packet renders 4+ document regions (schedule,
                 routines, supports, contacts). The preview archetype
                 hard-codes 3 skeleton cards — under-promised on purpose
                 until EmptyStateCard picks up an optional `count` prop. */
              <EmptyStateCard
                variant="preview"
                label="Survival packet preview"
              />
            ) : null}
            {result ? (
              <>
                <ResultBanner label="Survival packet generated" generatedAt={Date.now()} />
                <MockModeBanner
                  modelId={result.model_id}
                  panelHint="Survival packet content is static fixture text in mock mode and does not adapt to your classroom's specific routines. Run with Ollama or hosted Gemini to see real synthesis."
                />
                <SurvivalPacketView packet={result.packet} meta={result} />
                <RetrievalTraceCard trace={result.retrieval_trace} />
                <FeedbackCollector
                  onSubmit={handleFeedbackSubmit}
                  submitted={feedback.submitted}
                  panelLabel="survival packet"
                />
                <OutputActionBar
                  actions={actions}
                  contextLabel="Survival packet output"
                  topContextLabel="Survival packet quick actions"
                  position="both"
                />
              </>
            ) : null}
          </div>
        )}
      />
    </section>
  );
}
