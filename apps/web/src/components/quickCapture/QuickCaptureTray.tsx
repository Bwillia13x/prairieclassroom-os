import { useState, useRef, useEffect } from "react";
import "./QuickCaptureTray.css";
import StudentAvatar from "./StudentAvatar";
import InterventionChip from "./InterventionChip";
import { INTERVENTION_CHIP_DEFS, type InterventionChipKey } from "./interventionChipDefs";
import { useSpeechCapture } from "../../hooks/useSpeechCapture";
import { ActionButton } from "../shared";
import type { InterventionRequest } from "../../types";

/**
 * Per-student signal from the Today snapshot. Drives the corner dot on
 * StudentAvatar so teachers can see who needs follow-up without reading
 * the debt register directly. 2026-04-19 OPS audit phase 7.1.
 */
export interface StudentFlag {
  priority?: boolean;
  staleFollowupDays?: number;
}

interface QuickCaptureTrayProps {
  classroomId: string;
  students: { alias: string }[];
  loading: boolean;
  onSubmit: (request: InterventionRequest) => boolean | void | Promise<boolean | void>;
  /**
   * Optional per-student flag map keyed by alias. Missing entries
   * render without a dot. 2026-04-19 OPS audit phase 7.1.
   */
  studentFlags?: Record<string, StudentFlag>;
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
  studentFlags,
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
        {students.map((s) => {
          const flag = studentFlags?.[s.alias];
          const dotKind: "priority" | "stale" | undefined = flag?.staleFollowupDays
            ? "stale"
            : flag?.priority
              ? "priority"
              : undefined;
          return (
            <StudentAvatar
              key={s.alias}
              alias={s.alias}
              selected={selectedAliases.includes(s.alias)}
              onToggle={handleToggleAlias}
              flag={dotKind}
            />
          );
        })}
      </div>

      {/* What happened? — chips grouped into one row with a wider gap
          between behavioral, support, and positive categories so the
          visual structure reads on mobile without three separate rows.
          2026-04-19 OPS audit phase 7.2. */}
      <div
        className="quick-capture-tray__chip-row"
        ref={chipRowRef}
        onKeyDown={(e) => moveFocusByArrow(e, chipRowRef.current)}
        role="group"
        aria-label="Intervention type"
      >
        {(["behavioral", "support", "positive"] as const).map((cat, i) => (
          <div
            key={cat}
            className={`quick-capture-tray__chip-group quick-capture-tray__chip-group--${cat}`}
            data-category={cat}
            data-first={i === 0 ? "true" : "false"}
          >
            {INTERVENTION_CHIP_DEFS.filter((def) => def.category === cat).map((def) => (
              <InterventionChip
                key={def.key}
                def={def}
                selected={selectedChip === def.key}
                onSelect={handleSelectChip}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Note textarea with an integrated mic button in the bottom-right.
          The standalone "Start dictation" pill is gone; the mic is now a
          thumb-reachable affordance inside the input itself. 2026-04-19
          OPS audit phase 7.3. */}
      <div className="quick-capture-tray__note-wrap">
        <textarea
          className="quick-capture-tray__note"
          rows={3}
          aria-label="Intervention note"
          placeholder="e.g., 'Brody struggled with transition from recess — used calm corner for 3 min, returned ready to work.'"
          value={note}
          onChange={handleNoteChange}
        />
        {supported ? (
          <button
            type="button"
            className={`quick-capture-tray__mic${recording ? " quick-capture-tray__mic--recording" : ""}`}
            aria-label={recording ? "Stop dictation" : "Start dictation"}
            aria-pressed={recording}
            onClick={handleMicToggle}
          >
            <span aria-hidden="true">{recording ? "■" : "🎤"}</span>
          </button>
        ) : null}
      </div>

      {/* Controls row — mic lives inside the textarea now; this row is
          just the primary submit. Kept as a flex container so later
          additions (e.g., clear draft) slot in without another rewrite. */}
      <div className="quick-capture-tray__controls">
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
