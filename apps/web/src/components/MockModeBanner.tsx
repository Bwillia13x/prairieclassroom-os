/**
 * MockModeBanner.tsx — Panel-level honesty banner.
 *
 * The system-level "mock mode" banner is easy to miss once a teacher is
 * inside a generation panel. The structured walkthrough's Top 5 friction
 * list (Walkthrough #3) flagged this as the single biggest cause of
 * "is the system actually doing translation / retrieval / planning?"
 * confusion in mock mode.
 *
 * This banner answers that question inline, in the panel where the output
 * was rendered. It only mounts when the inference response was produced
 * by the mock backend (model_id === "mock"). On real model lanes
 * (Ollama, hosted Gemini, Vertex) it renders nothing, so production
 * panels stay quiet.
 *
 * Per-panel `panelHint` lets each surface explain WHICH model behavior
 * the mock fixture is hiding (e.g. "translation does not vary by target
 * language in mock mode" on Family Message).
 */

import "./MockModeBanner.css";

interface Props {
  modelId?: string;
  panelHint?: string;
}

export default function MockModeBanner({ modelId, panelHint }: Props) {
  if (modelId !== "mock") return null;
  return (
    <aside className="mock-mode-banner" role="status" aria-label="Demo content notice">
      <span className="mock-mode-banner__badge" aria-hidden="true">●</span>
      <div className="mock-mode-banner__body">
        <p className="mock-mode-banner__title">Demo content</p>
        <p className="mock-mode-banner__detail">
          {panelHint ??
            "You're viewing sample output so the screens work offline. Connect a Gemma 4 model to see the assistant generate against your own classroom."}
        </p>
      </div>
    </aside>
  );
}
