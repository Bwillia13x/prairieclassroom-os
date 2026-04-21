import { useState, useCallback, useEffect, useMemo } from "react";
import { useApp } from "../AppContext";
import { useSession } from "../SessionContext";
import { useAsyncAction } from "../useAsyncAction";
import { simplifyText, generateVocabCards } from "../api";
import SimplifiedViewer from "../components/SimplifiedViewer";
import VocabCardGrid from "../components/VocabCardGrid";
import ContextualHint from "../components/ContextualHint";
import ErrorBanner from "../components/ErrorBanner";
import { ReadabilityComparisonGauge } from "../components/DataVisualizations";
import PageIntro from "../components/PageIntro";
import WorkspaceLayout from "../components/WorkspaceLayout";
import LanguageToolsEmptyState from "../components/LanguageToolsEmptyState";
import LanguageToolsStudentPicker, { type StudentLike } from "../components/LanguageToolsStudentPicker";
import RecentRunsChipRow from "../components/RecentRunsChipRow";
import StreamingIndicator from "../components/StreamingIndicator";
import { StudentCoverageStrip } from "../components/TriageSurfaces";
import { useEmulatedStreaming } from "../hooks/useEmulatedStreaming";
import ResultBanner from "../components/ResultBanner";
import MockModeBanner from "../components/MockModeBanner";
import { FeedbackCollector, OutputActionBar, type OutputAction } from "../components/shared";
import { useFeedback } from "../hooks/useFeedback";
import { useCopyToClipboard } from "../hooks/useCopyToClipboard";
import { useDownloadBlob } from "../hooks/useDownloadBlob";
import { serializeLanguageOutputToPlainText, serializeVocabCardSetToMarkdown } from "./outputActionBarHelpers";
import type { CurriculumSelection, SimplifyResponse, VocabCardsResponse } from "../types";
import {
  pickDefaultGradeBand,
  pickDefaultTargetLanguage,
  topFamilyLanguages,
} from "../utils/classroomLanguageDefaults";
import { useRecentRuns } from "../hooks/useRecentRuns";

type LanguageTool = "simplify" | "vocab";

export default function LanguageToolsPanel() {
  const { profile, showSuccess, appendTomorrowNote, activeClassroom, streaming, latestTodaySnapshot } = useApp();
  const session = useSession();
  const simplify = useAsyncAction<SimplifyResponse>();
  const vocab = useAsyncAction<VocabCardsResponse>();
  const [activeTool, setActiveTool] = useState<LanguageTool>("simplify");
  const [simplifyKey, setSimplifyKey] = useState(0);
  const [vocabKey, setVocabKey] = useState(0);
  const [focusStudent, setFocusStudent] = useState<StudentLike | null>(null);
  const feedback = useFeedback(activeClassroom, session.sessionId);
  const defaultGradeBand = useMemo(() => pickDefaultGradeBand(profile ?? null), [profile]);
  const defaultTargetLanguage = useMemo(() => pickDefaultTargetLanguage(profile ?? null), [profile]);
  const effectiveTargetLanguage = useMemo(() => {
    if (!focusStudent?.family_language) return defaultTargetLanguage;
    return pickDefaultTargetLanguage({
      classroom_id: profile?.classroom_id ?? "",
      grade_band: profile?.grade_band ?? "",
      subject_focus: profile?.subject_focus ?? "",
      classroom_notes: profile?.classroom_notes ?? [],
      students: [
        {
          alias: focusStudent.alias,
          family_language: focusStudent.family_language,
          eal_flag: focusStudent.eal_flag,
        },
      ],
    });
  }, [focusStudent, defaultTargetLanguage, profile]);
  const simplifyRecent = useRecentRuns("simplify", activeClassroom, 3);
  const vocabRecent = useRecentRuns("vocab", activeClassroom, 3);
  const streamer = useEmulatedStreaming({
    sectionLabels: ["Processing text", "Applying language models", "Formatting output"],
    structuringDelayMs: 1500,
  });
  const { copy } = useCopyToClipboard();
  const { download } = useDownloadBlob();

  const actions = useMemo<OutputAction[]>(() => {
    if (activeTool === "simplify") {
      if (!simplify.result) return [];
      const simplified = simplify.result.simplified;
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
            await copy(serializeLanguageOutputToPlainText(simplified));
            showSuccess("Copied");
          },
        },
        {
          key: "download",
          label: "Download",
          icon: "grid",
          onClick: () =>
            download({
              filename: "simplified-text.txt",
              content: serializeLanguageOutputToPlainText(simplified),
              mime: "text/plain",
            }),
        },
        {
          key: "save-to-tomorrow",
          label: "Save to Tomorrow",
          icon: "star",
          variant: "primary",
          onClick: () => {
            appendTomorrowNote({
              sourcePanel: "language-tools",
              sourceType: "simplify_for_student",
              summary: `Simplified text (${simplified.eal_level}, Grade ${simplified.grade_band})`,
            });
            showSuccess("Saved to Tomorrow Plan");
          },
        },
      ];
    } else {
      if (!vocab.result) return [];
      const cardSet = vocab.result.card_set;
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
            await copy(serializeLanguageOutputToPlainText(cardSet));
            showSuccess("Copied");
          },
        },
        {
          key: "download",
          label: "Download",
          icon: "grid",
          onClick: () =>
            download({
              filename: `vocab-cards-${cardSet.target_language}.md`,
              content: serializeVocabCardSetToMarkdown(cardSet),
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
              sourcePanel: "language-tools",
              sourceType: "generate_vocab_cards",
              summary: `${cardSet.cards.length} vocab cards (${cardSet.target_language}, ${cardSet.subject})`,
            });
            showSuccess("Saved to Tomorrow Plan");
          },
        },
      ];
    }
  }, [activeTool, simplify.result, vocab.result, copy, download, appendTomorrowNote, showSuccess]);

  useEffect(() => {
    session.recordPanelVisit("language-tools");
  }, [session]);

  const handleFeedbackSubmit = useCallback(
    (rating: number, comment?: string) => {
      const outputType = activeTool === "simplify" ? "simplify" : "vocab-cards";
      const promptClass = activeTool === "simplify" ? "simplify_for_student" : "generate_vocab_cards";
      const key = activeTool === "simplify" ? `simplify-${simplifyKey}` : `vocab-${vocabKey}`;
      feedback.submit(outputType, rating, comment, key, promptClass);
      session.recordFeedback();
    },
    [feedback.submit, activeTool, simplifyKey, vocabKey, session],
  );

  async function handleSimplify(sourceText: string, gradeBand: string, ealLevel: "beginner" | "intermediate" | "advanced") {
    const resp = await streamer.execute(() =>
      simplify.execute((signal) =>
        simplifyText({ source_text: sourceText, grade_band: gradeBand, eal_level: ealLevel }, signal)
      )
    );
    if (resp) {
      showSuccess("Text simplified");
      session.recordGeneration("language-tools", "simplify_for_student");
      setSimplifyKey((k) => k + 1);
      const runId = `simplify-${simplifyKey + 1}-${Date.now()}`;
      simplifyRecent.record(
        {
          id: runId,
          label: sourceText.slice(0, 40) + (sourceText.length > 40 ? "…" : ""),
          at: Date.now(),
        },
        { response: resp },
      );
    }
  }

  function handleRestoreSimplifyRun(runId: string) {
    const cached = simplifyRecent.getPayload<{ response: SimplifyResponse }>(runId);
    if (cached) {
      simplify.execute(async () => cached.response);
    }
  }

  async function handleVocabCards(
    artifactText: string,
    subject: string,
    targetLanguage: string,
    gradeBand: string,
    curriculumSelection: CurriculumSelection | null,
  ) {
    const resp = await streamer.execute(() =>
      vocab.execute((signal) =>
        generateVocabCards({
          artifact_text: artifactText,
          subject,
          target_language: targetLanguage,
          grade_band: gradeBand,
          curriculum_selection: curriculumSelection ?? undefined,
        }, signal)
      )
    );
    if (resp) {
      showSuccess("Cards generated");
      session.recordGeneration("language-tools", "generate_vocab_cards");
      setVocabKey((k) => k + 1);
      const runId = `vocab-${vocabKey + 1}-${Date.now()}`;
      vocabRecent.record(
        {
          id: runId,
          label: `${targetLanguage.toUpperCase()} · ${gradeBand}`,
          at: Date.now(),
        },
        { response: resp },
      );
    }
  }

  function handleRestoreVocabRun(runId: string) {
    const cached = vocabRecent.getPayload<{ response: VocabCardsResponse }>(runId);
    if (cached) {
      vocab.execute(async () => cached.response);
    }
  }

  const activeAction = activeTool === "simplify" ? simplify : vocab;

  return (
    <section className="workspace-page">
      <PageIntro
        eyebrow="Prep Workspace"
        title="Language Support Tools"
        sectionTone="sage"
        description="Simplify classroom text for EAL learners or generate bilingual vocabulary cards from any lesson content."
      />

      {latestTodaySnapshot?.student_threads?.length ? (
        <StudentCoverageStrip
          threads={latestTodaySnapshot.student_threads}
          title="Language support coverage"
          selectedAlias={focusStudent?.alias ?? null}
          onSelectThread={(thread) => {
            const match = profile?.students.find((student) => student.alias === thread.alias);
            if (match) {
              setFocusStudent({
                alias: match.alias,
                eal_flag: match.eal_flag,
                family_language: match.family_language,
              });
            }
          }}
        />
      ) : null}

      <WorkspaceLayout
        splitState={activeAction.result ? "output" : "input"}
        rail={(
          <>
            <ContextualHint
              featureKey="language-tools"
              title="Language Tools"
              description="Simplify text for EAL learners or generate bilingual vocabulary cards from any lesson content."
              tone="sage"
            />
            <div className="language-tool-toggle" role="tablist" aria-label="Language tool">
              <button
                type="button"
                className={`language-tool-toggle__btn${activeTool === "simplify" ? " language-tool-toggle__btn--active" : ""}`}
                onClick={() => setActiveTool("simplify")}
                aria-pressed={activeTool === "simplify"}
                role="tab"
                aria-selected={activeTool === "simplify"}
              >
                <span className="language-tool-toggle__glyph" aria-hidden="true">Aa</span>
                <span className="language-tool-toggle__label">Simplify Text</span>
              </button>
              <button
                type="button"
                className={`language-tool-toggle__btn${activeTool === "vocab" ? " language-tool-toggle__btn--active" : ""}`}
                onClick={() => setActiveTool("vocab")}
                aria-pressed={activeTool === "vocab"}
                role="tab"
                aria-selected={activeTool === "vocab"}
              >
                <span className="language-tool-toggle__glyph" aria-hidden="true">▢▢</span>
                <span className="language-tool-toggle__label">Vocab Cards</span>
              </button>
            </div>
            <LanguageToolsStudentPicker
              students={profile?.students ?? []}
              value={focusStudent}
              onChange={setFocusStudent}
            />
            {activeTool === "simplify" ? (
              <SimplifiedViewer
                onSubmit={handleSimplify}
                result={null}
                loading={simplify.loading}
                defaultGradeBand={defaultGradeBand}
              />
            ) : (
              <VocabCardGrid
                onSubmit={handleVocabCards}
                result={null}
                loading={vocab.loading}
                defaultGradeBand={defaultGradeBand}
                defaultTargetLanguage={effectiveTargetLanguage}
              />
            )}
          </>
        )}
        canvas={(
          <div className="workspace-result" aria-live="polite" aria-busy={(activeAction.loading || streaming.active) && activeAction.result === null}>
            {activeAction.error && activeAction.result === null ? (
              <ErrorBanner message={activeAction.error} onDismiss={activeAction.reset} />
            ) : null}
            {(activeAction.loading || streaming.active) && activeAction.result === null ? (
              <StreamingIndicator
                label={activeTool === "simplify" ? "Simplifying text for EAL learners" : "Generating bilingual vocabulary cards"}
                onCancel={activeAction.cancel}
              />
            ) : null}
            {!activeAction.loading && activeAction.result === null && !activeAction.error ? (
              <LanguageToolsEmptyState
                mode={activeTool === "simplify" ? "simplify" : "vocab"}
                ealStudents={profile?.students.filter((s) => s.eal_flag).length ?? 0}
                topLanguages={topFamilyLanguages(profile?.students ?? [])}
              />
            ) : null}
            {simplify.result && activeTool === "simplify" ? (
              <>
                <RecentRunsChipRow
                  runs={simplifyRecent.runs}
                  onSelect={handleRestoreSimplifyRun}
                />
                <ResultBanner label="Text simplified" generatedAt={Date.now()} />
                <MockModeBanner
                  modelId={simplify.result.model_id}
                  panelHint="Simplified text is the same fixture in mock mode regardless of source. Run with Ollama or hosted Gemini to see real simplification."
                />
                <ReadabilityComparisonGauge
                  sourceText={simplify.result.simplified.source_text}
                  simplifiedText={simplify.result.simplified.simplified_text}
                />
                <SimplifiedViewer
                  onSubmit={handleSimplify}
                  result={simplify.result}
                  loading={simplify.loading}
                  defaultGradeBand={defaultGradeBand}
                />
                <FeedbackCollector
                  onSubmit={handleFeedbackSubmit}
                  submitted={feedback.submitted}
                  panelLabel="simplified text"
                />
                <OutputActionBar actions={actions} contextLabel="Language tools output" />
              </>
            ) : null}
            {vocab.result && activeTool === "vocab" ? (
              <>
                <RecentRunsChipRow
                  runs={vocabRecent.runs}
                  onSelect={handleRestoreVocabRun}
                />
                <ResultBanner label={`${vocab.result.card_set.cards.length} cards generated`} generatedAt={Date.now()} />
                <MockModeBanner
                  modelId={vocab.result.model_id}
                  panelHint="Vocabulary cards are static fixture content in mock mode and do not vary by source text or target language. Run with Ollama or hosted Gemini to see real vocab generation."
                />
                <VocabCardGrid
                  onSubmit={handleVocabCards}
                  result={vocab.result}
                  loading={vocab.loading}
                  defaultGradeBand={defaultGradeBand}
                  defaultTargetLanguage={effectiveTargetLanguage}
                />
                <FeedbackCollector
                  onSubmit={handleFeedbackSubmit}
                  submitted={feedback.submitted}
                  panelLabel="vocabulary cards"
                />
                <OutputActionBar actions={actions} contextLabel="Language tools output" />
              </>
            ) : null}
          </div>
        )}
      />
    </section>
  );
}
