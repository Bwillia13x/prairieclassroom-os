import { useApp } from "../AppContext";
import { useAsyncAction } from "../useAsyncAction";
import { simplifyText, generateVocabCards } from "../api";
import SimplifiedViewer from "../components/SimplifiedViewer";
import VocabCardGrid from "../components/VocabCardGrid";
import type { SimplifyResponse, VocabCardsResponse } from "../types";

export default function LanguageToolsPanel() {
  const { showSuccess } = useApp();
  const simplify = useAsyncAction<SimplifyResponse>();
  const vocab = useAsyncAction<VocabCardsResponse>();

  async function handleSimplify(sourceText: string, gradeBand: string, ealLevel: "beginner" | "intermediate" | "advanced") {
    const resp = await simplify.execute((signal) =>
      simplifyText({ source_text: sourceText, grade_band: gradeBand, eal_level: ealLevel }, signal)
    );
    if (resp) showSuccess("Text simplified");
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
  }

  return (
    <>
      {simplify.error && <div className="error-banner">{simplify.error}</div>}
      {vocab.error && <div className="error-banner">{vocab.error}</div>}
      <SimplifiedViewer
        onSubmit={handleSimplify}
        result={simplify.result}
        loading={simplify.loading}
      />
      <hr className="section-divider" />
      <VocabCardGrid
        onSubmit={handleVocabCards}
        result={vocab.result}
        loading={vocab.loading}
      />
    </>
  );
}
