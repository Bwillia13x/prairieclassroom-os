import { useState, useCallback, useEffect } from "react";
import { useApp } from "../AppContext";
import { useSession } from "../SessionContext";
import { useAsyncAction } from "../useAsyncAction";
import { simplifyText, generateVocabCards } from "../api";
import SimplifiedViewer from "../components/SimplifiedViewer";
import VocabCardGrid from "../components/VocabCardGrid";
import ContextualHint from "../components/ContextualHint";
import ErrorBanner from "../components/ErrorBanner";
import OutputFeedback from "../components/OutputFeedback";
import PageIntro from "../components/PageIntro";
import WorkspaceLayout from "../components/WorkspaceLayout";
import EmptyStateCard from "../components/EmptyStateCard";
import EmptyStateIllustration from "../components/EmptyStateIllustration";
import SkeletonLoader from "../components/SkeletonLoader";
import ResultBanner from "../components/ResultBanner";
import { FeedbackCollector } from "../components/shared";
import { useFeedback } from "../hooks/useFeedback";
import type { SimplifyResponse, VocabCardsResponse } from "../types";

type LanguageTool = "simplify" | "vocab";

export default function LanguageToolsPanel() {
  const { profile, showSuccess, activeClassroom } = useApp();
  const session = useSession();
  const simplify = useAsyncAction<SimplifyResponse>();
  const vocab = useAsyncAction<VocabCardsResponse>();
  const [activeTool, setActiveTool] = useState<LanguageTool>("simplify");
  const [simplifyKey, setSimplifyKey] = useState(0);
  const [vocabKey, setVocabKey] = useState(0);
  const feedback = useFeedback(activeClassroom, session.sessionId);

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
    const resp = await simplify.execute((signal) =>
      simplifyText({ source_text: sourceText, grade_band: gradeBand, eal_level: ealLevel }, signal)
    );
    if (resp) {
      showSuccess("Text simplified");
      session.recordGeneration("language-tools", "simplify_for_student");
      setSimplifyKey((k) => k + 1);
    }
  }

  async function handleVocabCards(artifactText: string, subject: string, targetLanguage: string, gradeBand: string) {
    const resp = await vocab.execute((signal) =>
      generateVocabCards({
        artifact_text: artifactText,
        subject,
        target_language: targetLanguage,
        grade_band: gradeBand,
      }, signal)
    );
    if (resp) {
      showSuccess("Cards generated");
      session.recordGeneration("language-tools", "generate_vocab_cards");
      setVocabKey((k) => k + 1);
    }
  }

  const activeAction = activeTool === "simplify" ? simplify : vocab;

  return (
    <section className="workspace-page">
      <PageIntro
        eyebrow="Prep Workspace"
        title="Language Support Tools"
        sectionTone="sage"
        sectionIcon="pencil"
        breadcrumb={{ group: "Prep", tab: "Language Tools" }}
        description="Simplify classroom text for EAL learners or generate bilingual vocabulary cards from any lesson content."
        badges={[
          { label: profile ? `Grade ${profile.grade_band}` : "Language prep", tone: "sun" },
          { label: "EAL-ready output", tone: "sage" },
          { label: "Bilingual support", tone: "provenance" },
        ]}
      />

      <WorkspaceLayout
        rail={(
          <>
            <ContextualHint
              featureKey="language-tools"
              title="Language Tools"
              description="Simplify text for EAL learners or generate bilingual vocabulary cards from any lesson content."
              tone="sage"
            />
            <div className="language-tool-toggle">
              <button
                type="button"
                className={`language-tool-toggle__btn${activeTool === "simplify" ? " language-tool-toggle__btn--active" : ""}`}
                onClick={() => setActiveTool("simplify")}
                aria-pressed={activeTool === "simplify"}
              >
                Simplify Text
              </button>
              <button
                type="button"
                className={`language-tool-toggle__btn${activeTool === "vocab" ? " language-tool-toggle__btn--active" : ""}`}
                onClick={() => setActiveTool("vocab")}
                aria-pressed={activeTool === "vocab"}
              >
                Vocab Cards
              </button>
            </div>
            {activeTool === "simplify" ? (
              <SimplifiedViewer onSubmit={handleSimplify} result={null} loading={simplify.loading} />
            ) : (
              <VocabCardGrid onSubmit={handleVocabCards} result={null} loading={vocab.loading} />
            )}
          </>
        )}
        canvas={(
          <div className="workspace-result" aria-live="polite" aria-busy={activeAction.loading && activeAction.result === null}>
            {activeAction.error && activeAction.result === null ? (
              <ErrorBanner message={activeAction.error} onDismiss={activeAction.reset} />
            ) : null}
            {activeAction.loading && activeAction.result === null ? (
              <SkeletonLoader
                variant={activeTool === "vocab" ? "grid" : "single"}
                message={activeTool === "simplify" ? "Simplifying text for EAL learners..." : "Generating bilingual vocabulary cards..."}
                label={activeTool === "simplify" ? "Simplifying text" : "Generating vocabulary cards"}
              />
            ) : null}
            {!activeAction.loading && activeAction.result === null && !activeAction.error ? (
              <EmptyStateCard
                icon={<EmptyStateIllustration name="language" />}
                title={activeTool === "simplify" ? "No simplified text yet" : "No vocabulary cards yet"}
                description={activeTool === "simplify"
                  ? "Paste classroom text and select the EAL level to generate a simplified version with key vocabulary and visual cue suggestions."
                  : "Paste lesson content and choose a target language to generate bilingual vocabulary cards for EAL students."
                }
              />
            ) : null}
            {simplify.result && activeTool === "simplify" ? (
              <>
                <ResultBanner label="Text simplified" generatedAt={Date.now()} />
                <SimplifiedViewer onSubmit={handleSimplify} result={simplify.result} loading={simplify.loading} />
                <OutputFeedback outputId={`simplify-${simplifyKey}`} outputType="simplify" />
                <FeedbackCollector
                  onSubmit={handleFeedbackSubmit}
                  submitted={feedback.submitted}
                  panelLabel="simplified text"
                />
              </>
            ) : null}
            {vocab.result && activeTool === "vocab" ? (
              <>
                <ResultBanner label={`${vocab.result.card_set.cards.length} cards generated`} generatedAt={Date.now()} />
                <VocabCardGrid onSubmit={handleVocabCards} result={vocab.result} loading={vocab.loading} />
                <OutputFeedback outputId={`vocab-${vocabKey}`} outputType="vocab-cards" />
                <FeedbackCollector
                  onSubmit={handleFeedbackSubmit}
                  submitted={feedback.submitted}
                  panelLabel="vocabulary cards"
                />
              </>
            ) : null}
          </div>
        )}
      />
    </section>
  );
}
