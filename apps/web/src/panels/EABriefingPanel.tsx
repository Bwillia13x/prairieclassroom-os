import { useState, useCallback, useEffect, useMemo } from "react";
import { useApp } from "../AppContext";
import { useSession } from "../SessionContext";
import { useAsyncAction } from "../useAsyncAction";
import { generateEABriefing } from "../api";
import { EABriefingForm, EABriefingResult } from "../components/EABriefing";
import ErrorBanner from "../components/ErrorBanner";
import SkeletonLoader from "../components/SkeletonLoader";
import StreamingIndicator from "../components/StreamingIndicator";
import WorkspaceLayout from "../components/WorkspaceLayout";
import EmptyStateCard from "../components/EmptyStateCard";
import ResultBanner from "../components/ResultBanner";
import MockModeBanner from "../components/MockModeBanner";
import RetrievalTraceCard from "../components/RetrievalTraceCard";
import { FeedbackCollector, OutputActionBar, type OutputAction } from "../components/shared";
import { useFeedback } from "../hooks/useFeedback";
import { useCopyToClipboard } from "../hooks/useCopyToClipboard";
import { useDownloadBlob } from "../hooks/useDownloadBlob";
import { useStreamingRequest } from "../hooks/useStreamingRequest";
import { serializeEABriefingToPlainText, serializeEABriefingToMarkdown } from "./outputActionBarHelpers";
import type { EABriefingResponse } from "../types";

export default function EABriefingPanel() {
  const { classrooms, activeClassroom, showSuccess, showError, appendTomorrowNote, streaming } = useApp();
  const session = useSession();
  const { loading, error, result, execute, cancel, reset } = useAsyncAction<EABriefingResponse>({
    onError: (msg) => showError(`Couldn't generate briefing — ${msg}`),
  });
  const streamer = useStreamingRequest({
    sectionLabels: ["Notes", "Schedule", "Watch list", "Follow-ups"],
  });
  const [resultKey, setResultKey] = useState(0);
  const feedback = useFeedback(activeClassroom, session.sessionId);
  const { copy } = useCopyToClipboard();
  const { download } = useDownloadBlob();

  const actions = useMemo<OutputAction[]>(() => {
    if (!result) return [];
    const briefing = result.briefing;
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
          await copy(serializeEABriefingToPlainText(briefing));
          showSuccess("Copied");
        },
      },
      {
        key: "download",
        label: "Download",
        icon: "grid",
        onClick: () =>
          download({
            filename: `ea-briefing-${briefing.date}.md`,
            content: serializeEABriefingToMarkdown(briefing),
            mime: "text/markdown",
          }),
      },
      {
        key: "save-to-tomorrow",
        label: "Save to Tomorrow",
        icon: "star",
        variant: "primary",
        onClick: () => {
          appendTomorrowNote({
            sourcePanel: "ea-briefing",
            sourceType: "generate_ea_briefing",
            summary: `EA briefing for ${briefing.date}: ${briefing.schedule_blocks.length} blocks, ${briefing.student_watch_list.length} watch items`,
          });
          showSuccess("Saved to Tomorrow Plan");
        },
      },
    ];
  }, [result, copy, download, appendTomorrowNote, showSuccess]);

  useEffect(() => {
    session.recordPanelVisit("ea-briefing");
  }, [session]);

  const handleFeedbackSubmit = useCallback(
    (rating: number, comment?: string) => {
      feedback.submit("ea-briefing", rating, comment, `briefing-${resultKey}`, "generate_ea_briefing");
      session.recordFeedback();
    },
    [feedback.submit, resultKey, session],
  );

  if (classrooms.length === 0) return null;

  async function handleSubmit(classroomId: string, eaName?: string, coordinationNotes?: string) {
    const resp = await streamer.execute((stream) =>
      execute((signal) =>
        generateEABriefing(
          {
            classroom_id: classroomId,
            ea_name: eaName,
            coordination_notes: coordinationNotes,
          },
          signal,
          stream,
        ),
      ),
    );
    if (resp) {
      showSuccess("Briefing generated");
      session.recordGeneration("ea-briefing", "generate_ea_briefing");
      setResultKey((k) => k + 1);
    }
  }

  return (
    <section className="workspace-page">
      <WorkspaceLayout
        className="workspace-layout--ops-workflow"
        surface="ops-briefing"
        splitState={result ? "output" : "input"}
        rail={(
          <>
            <EABriefingForm
              selectedClassroom={activeClassroom}
              onSubmit={handleSubmit}
              loading={loading}
            />
          </>
        )}
        canvas={(
          <div className="workspace-result" aria-live="polite" aria-busy={loading && result === null}>
            {error && result === null ? <ErrorBanner message={error} onDismiss={reset} /> : null}
            {loading && result === null ? (
              streaming.phase !== "idle"
                ? <StreamingIndicator label="Generating EA briefing" onCancel={cancel} />
                : <SkeletonLoader variant="stack" message="Building EA coordination briefing…" label="Generating EA briefing" />
            ) : null}
            {!loading && result === null && !error ? (
              /* The real briefing renders 4 regions (notes, schedule,
                 watch list, follow-ups). The preview archetype hard-codes
                 3 skeleton cards — under-promised until EmptyStateCard
                 picks up an optional `count` prop. */
              <EmptyStateCard
                variant="preview"
                label="EA briefing preview"
              />
            ) : null}
            {result ? (
              <>
                <ResultBanner label="Briefing generated" generatedAt={Date.now()} />
                <MockModeBanner
                  modelId={result.model_id}
                  panelHint="Briefing content does not pull from real intervention history in mock mode. The schedule and watch list shape are real; the retrieval is not."
                />
                {/* Above-the-fold utility ribbon — Print + Download only,
                    sticky to the top of the scroll container. 2026-04-19
                    OPS audit phase 4.2. Full set still renders at the
                    bottom so the primary actions stay anchored near the
                    output's end. */}
                <OutputActionBar
                  actions={actions}
                  contextLabel="EA briefing quick actions"
                  position="top"
                  topKeys={["copy", "download", "save-to-tomorrow"]}
                />
                <EABriefingResult result={result} />
                <RetrievalTraceCard trace={result.retrieval_trace} />
                <FeedbackCollector
                  onSubmit={handleFeedbackSubmit}
                  submitted={feedback.submitted}
                  panelLabel="EA briefing"
                />
                <OutputActionBar
                  actions={actions}
                  contextLabel="EA briefing output"
                />
              </>
            ) : null}
          </div>
        )}
      />
    </section>
  );
}
