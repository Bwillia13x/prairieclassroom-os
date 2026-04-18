import { useState, useRef, useEffect } from "react";
import "./QuickCaptureTray.css";
import StudentAvatar from "./StudentAvatar";
import InterventionChip from "./InterventionChip";
import { INTERVENTION_CHIP_DEFS, type InterventionChipKey } from "./interventionChipDefs";
import { useSpeechCapture } from "../../hooks/useSpeechCapture";
import { ActionButton } from "../shared";
import type { InterventionRequest } from "../../types";

interface QuickCaptureTrayProps {
  classroomId: string;
  students: { alias: string }[];
  loading: boolean;
  onSubmit: (request: InterventionRequest) => boolean | void | Promise<boolean | void>;
}

/**
 * Move focus to the previous or next sibling button inside a container
 * when ArrowLeft / ArrowRight is pressed on a button within that container.
 */
function moveFocusByArrow(
  e: React.KeyboardEvent<HTMLDivElement>,
  container: HTMLDivElement | null,
): void {
  if (!container) return;
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;

  const buttons = Array.from(
    container.querySelectorAll<HTMLButtonElement>("button"),
  );
  const focused = document.activeElement as HTMLElement;
  const idx = buttons.indexOf(focused as HTMLButtonElement);
  if (idx === -1) return;

  e.preventDefault();
  const next =
    e.key === "ArrowRight"
      ? buttons[idx + 1]
      : buttons[idx - 1];
  if (next) {
    next.focus();
  }
}

export default function QuickCaptureTray({
  classroomId,
  students,
  loading,
  onSubmit,
}: QuickCaptureTrayProps) {
  const [selectedAliases, setSelectedAliases] = useState<string[]>([]);
  const [selectedChip, setSelectedChip] = useState<InterventionChipKey | null>(null);
  const [note, setNote] = useState("");
  const [noteDirty, setNoteDirty] = useState(false);

  const { supported, recording, transcript, start, stop, reset } = useSpeechCapture();

  // Track which portion of the transcript has already been appended to note.
  const lastTranscriptRef = useRef("");

  // When transcript changes while recording, append the delta to note.
  useEffect(() => {
    if (!recording) return;
    const prev = lastTranscriptRef.current;
    if (transcript.length > prev.length) {
      const delta = transcript.slice(prev.length);
      lastTranscriptRef.current = transcript;
      setNote((n) => n + delta);
    }
  }, [transcript, recording]);

  const avatarRowRef = useRef<HTMLDivElement | null>(null);
  const chipRowRef = useRef<HTMLDivElement | null>(null);

  function handleToggleAlias(alias: string) {
    setSelectedAliases((prev) =>
      prev.includes(alias) ? prev.filter((a) => a !== alias) : [...prev, alias],
    );
  }

  function handleSelectChip(key: InterventionChipKey) {
    setSelectedChip(key);
    if (!noteDirty) {
      const def = INTERVENTION_CHIP_DEFS.find((d) => d.key === key);
      if (def) {
        setNote(def.starterNote(selectedAliases));
      }
    }
  }

  function handleNoteChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setNote(e.target.value);
    setNoteDirty(true);
  }

  function handleMicToggle() {
    if (recording) {
      stop();
      reset();
      lastTranscriptRef.current = "";
    } else {
      lastTranscriptRef.current = "";
      start();
    }
  }

  async function handleSubmit() {
    const didPersist = await Promise.resolve().then(() => onSubmit({
      classroom_id: classroomId,
      student_refs: selectedAliases,
      teacher_note: note.trim(),
      context: selectedChip ? `Quick-capture: ${selectedChip}` : undefined,
    })).catch(() => false);

    if (didPersist === false) return;

    // Reset all state
    setSelectedAliases([]);
    setSelectedChip(null);
    setNote("");
    setNoteDirty(false);
    lastTranscriptRef.current = "";
  }

  const canSubmit = selectedAliases.length > 0 && note.trim().length > 0;

  return (
    <div className="quick-capture-tray">
      {/* Header */}
      <h3>Quick capture</h3>
      <p>Tap, tap, done.</p>

      {/* Who? — avatar row. With large classes the rail scrolls horizontally;
          surface the full count so teachers know the row isn't truncated. */}
      {students.length > 0 ? (
        <p className="quick-capture-tray__roster-hint" aria-live="polite">
          {students.length === 1 ? "1 student" : `${students.length} students`}
          {students.length > 6 ? " — scroll the row to reach anyone" : null}
        </p>
      ) : null}
      <div
        className="quick-capture-tray__avatar-row"
        ref={avatarRowRef}
        onKeyDown={(e) => moveFocusByArrow(e, avatarRowRef.current)}
      >
        {students.map((s) => (
          <StudentAvatar
            key={s.alias}
            alias={s.alias}
            selected={selectedAliases.includes(s.alias)}
            onToggle={handleToggleAlias}
          />
        ))}
      </div>

      {/* What happened? — chip row */}
      <div
        className="quick-capture-tray__chip-row"
        ref={chipRowRef}
        onKeyDown={(e) => moveFocusByArrow(e, chipRowRef.current)}
      >
        {INTERVENTION_CHIP_DEFS.map((def) => (
          <InterventionChip
            key={def.key}
            def={def}
            selected={selectedChip === def.key}
            onSelect={handleSelectChip}
          />
        ))}
      </div>

      {/* Note textarea */}
      <textarea
        className="quick-capture-tray__note"
        rows={3}
        aria-label="Intervention note"
        value={note}
        onChange={handleNoteChange}
      />

      {/* Controls row */}
      <div className="quick-capture-tray__controls">
        {supported && (
          <button
            type="button"
            className="btn btn--ghost"
            aria-label={recording ? "Stop dictation" : "Start dictation"}
            aria-pressed={recording}
            onClick={handleMicToggle}
          >
            {recording ? "Stop dictation" : "Start dictation"}
          </button>
        )}
        <ActionButton
          variant="primary"
          fullWidth
          loading={loading}
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          Log intervention
        </ActionButton>
      </div>
    </div>
  );
}
