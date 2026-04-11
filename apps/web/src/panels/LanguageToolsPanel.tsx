import { useState } from "react";
import { useApp } from "../AppContext";
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
import type { SimplifyResponse, VocabCardsResponse } from "../types";

type LanguageTool = "simplify" | "vocab";

export default function LanguageToolsPanel() {
  const { profile, showSuccess } = useApp();
  const simplify = useAsyncAction<SimplifyResponse>();
  const vocab = useAsyncAction<VocabCardsResponse>();
  const [activeTool, setActiveTool] = useState<LanguageTool>("simplify");
  const [simplifyKey, setSimplifyKey] = useState(0);
  const [vocabKey, setVocabKey] = useState(0);

  async function handleSimplify(sourceText: string, gradeBand: string, ealLevel: "beginner" | "intermediate" | "advanced") {
    const resp = await simplify.execute((signal) =>
      simplifyText({ source_text: sourceText, grade_band: gradeBand, eal_level: ealLevel }, signal)
    );
    if (resp) showSuccess("Text simplified");
    if (resp) setSimplifyKey((k) => k + 1);
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
    if (resp) showSuccess("Cards generated");
    if (resp) setVocabKey((k) => k + 1);
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
              </>
            ) : null}
            {vocab.result && activeTool === "vocab" ? (
              <>
                <ResultBanner label={`${vocab.result.card_set.cards.length} cards generated`} generatedAt={Date.now()} />
                <VocabCardGrid onSubmit={handleVocabCards} result={vocab.result} loading={vocab.loading} />
                <OutputFeedback outputId={`vocab-${vocabKey}`} outputType="vocab-cards" />
              </>
            ) : null}
          </div>
        )}
      />
    </section>
  );
}
