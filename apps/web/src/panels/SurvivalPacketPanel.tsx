import { useState } from "react";
import { useApp } from "../AppContext";
import { useAsyncAction } from "../useAsyncAction";
import { generateSurvivalPacket } from "../api";
import SurvivalPacketView from "../components/SurvivalPacket";
import SkeletonLoader from "../components/SkeletonLoader";
import StreamingIndicator from "../components/StreamingIndicator";
import OutputFeedback from "../components/OutputFeedback";
import { useStreamingRequest } from "../hooks/useStreamingRequest";
import type { SurvivalPacketResponse } from "../types";

export default function SurvivalPacketPanel() {
  const { classrooms, activeClassroom, setActiveClassroom, showSuccess, streaming } = useApp();
  const { loading, error, result, execute } = useAsyncAction<SurvivalPacketResponse>();
  const streamer = useStreamingRequest({
    sectionLabels: ["Schedule", "Student profiles", "Emergency info"],
  });
  const [resultKey, setResultKey] = useState(0);

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
    if (resp) showSuccess("Survival packet generated");
    if (resp) setResultKey((k) => k + 1);
  }

  return (
    <div className={result ? "split-pane" : ""}>
      <div className="form-panel">
        <h2>Substitute Survival Packet</h2>
        <p className="form-description">
          Generate a print-ready packet for a substitute covering your classroom tomorrow.
        </p>
        <div className="field">
          <label htmlFor="sp-classroom">Classroom</label>
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
        </div>
        <button
          type="button"
          className="btn btn--primary"
          disabled={loading || !activeClassroom}
          onClick={handleSubmit}
        >
          {loading ? "Generating Packet..." : "Generate Survival Packet"}
        </button>
      </div>
      <div aria-live="polite">
        {error && result === null && <div className="error-banner">{error}</div>}
        {loading && result === null && (
          streaming.phase !== "idle" ? (
            <StreamingIndicator />
          ) : (
            <SkeletonLoader variant="stack" message="Building substitute survival packet..." label="Generating survival packet" />
          )
        )}
        {!loading && result === null && !error && (
          <div className="empty-state">
            <svg className="empty-state-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true"><rect x="8" y="8" width="32" height="34" rx="3" stroke="var(--color-border)" strokeWidth="2"/><path d="M18 8V6a4 4 0 018 0v2" stroke="var(--color-border)" strokeWidth="2" strokeLinecap="round"/><path d="M16 18h16M16 24h12M16 30h8" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round"/><circle cx="35" cy="35" r="7" fill="var(--color-bg-accent)" stroke="var(--color-accent)" strokeWidth="1.5"/><path d="M35 31v8M31 35h8" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round"/></svg>
            <div className="empty-state-title">No packet yet</div>
            <p className="empty-state-description">
              Select a classroom and generate a full survival packet for tomorrow's substitute.
            </p>
          </div>
        )}
        {result && (
          <>
            <SurvivalPacketView packet={result.packet} />
            <OutputFeedback outputId={`packet-${resultKey}`} outputType="survival-packet" />
          </>
        )}
      </div>
    </div>
  );
}
