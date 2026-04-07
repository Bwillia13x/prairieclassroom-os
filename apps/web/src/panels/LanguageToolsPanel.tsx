import { useState } from "react";
import { useApp } from "../AppContext";
import { useAsyncAction } from "../useAsyncAction";
import { simplifyText, generateVocabCards } from "../api";
import SimplifiedViewer from "../components/SimplifiedViewer";
import VocabCardGrid from "../components/VocabCardGrid";
import ContextualHint from "../components/ContextualHint";
import OutputFeedback from "../components/OutputFeedback";
import type { SimplifyResponse, VocabCardsResponse } from "../types";

export default function LanguageToolsPanel() {
  const { showSuccess } = useApp();
  const simplify = useAsyncAction<SimplifyResponse>();
  const vocab = useAsyncAction<VocabCardsResponse>();
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

  return (
    <>
      <ContextualHint
        featureKey="language-tools"
        title="Language Tools"
        description="Simplify text for EAL learners or generate bilingual vocabulary cards from any lesson content."
      />
      {simplify.error && <div className="error-banner">{simplify.error}</div>}
      {vocab.error && <div className="error-banner">{vocab.error}</div>}
      <SimplifiedViewer
        onSubmit={handleSimplify}
        result={simplify.result}
        loading={simplify.loading}
      />
      {simplify.result && <OutputFeedback outputId={`simplify-${simplifyKey}`} outputType="simplify" />}
      <hr className="section-divider" />
      <VocabCardGrid
        onSubmit={handleVocabCards}
        result={vocab.result}
        loading={vocab.loading}
      />
      {vocab.result && <OutputFeedback outputId={`vocab-${vocabKey}`} outputType="vocab-cards" />}
    </>
  );
}
