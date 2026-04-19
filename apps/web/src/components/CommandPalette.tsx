import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import type { PaletteEntry } from "../hooks/usePaletteEntries";
import "./CommandPalette.css";

interface Props {
  open: boolean;
  onClose: () => void;
  entries: PaletteEntry[];
}

const KIND_HEADER: Record<PaletteEntry["kind"], string> = {
  panel: "PANELS",
  classroom: "CLASSROOMS",
  action: "ACTIONS",
};

const RECENTS_KEY = "prairieclassroom.palette.recents";
const MAX_RECENTS = 5;

function loadRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    return raw ? (JSON.parse(raw) as string[]).slice(0, MAX_RECENTS) : [];
  } catch {
    return [];
  }
}

function saveRecent(id: string) {
  try {
    const prev = loadRecents();
    const next = [id, ...prev.filter((x) => x !== id)].slice(0, MAX_RECENTS);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    /* noop */
  }
}

export default function CommandPalette({ open, onClose, entries }: Props) {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [recents, setRecents] = useState<string[]>([]);
  const cardRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useFocusTrap(cardRef, open);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      setRecents(loadRecents());
      queueMicrotask(() => inputRef.current?.focus());
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      const recentEntries = recents
        .map((id) => entries.find((e) => e.id === id))
        .filter((e): e is PaletteEntry => Boolean(e));
      const rest = entries.filter((e) => !recents.includes(e.id));
      return [...recentEntries, ...rest];
    }
    return entries.filter((e) => e.keywords.includes(q) || e.label.toLowerCase().includes(q));
  }, [entries, query, recents]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  if (!open) return null;

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, Math.max(0, filtered.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const entry = filtered[activeIdx];
      if (entry) {
        entry.onSelect();
        saveRecent(entry.id);
        onClose();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }

  return (
    <div className="command-palette__backdrop" role="presentation" onClick={onClose}>
      <div
        ref={cardRef}
        className="command-palette__card"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls="command-palette-results"
          aria-activedescendant={filtered[activeIdx] ? `cp-opt-${filtered[activeIdx].id}` : undefined}
          className="command-palette__input"
          placeholder="Jump to panel, classroom, or action…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <ul id="command-palette-results" className="command-palette__list" role="listbox">
          {filtered.length === 0 ? (
            <li className="command-palette__empty">No matches</li>
          ) : (
            filtered.slice(0, 40).reduce<ReactElement[]>((acc, entry, i, arr) => {
              const prevKind = i === 0 ? null : arr[i - 1].kind;
              if (entry.kind !== prevKind) {
                acc.push(
                  <li
                    key={`hdr-${entry.kind}`}
                    className="command-palette__group-header"
                    role="presentation"
                  >
                    {KIND_HEADER[entry.kind]}
                  </li>,
                );
              }
              acc.push(
                <li
                  key={entry.id}
                  id={`cp-opt-${entry.id}`}
                  role="option"
                  aria-selected={i === activeIdx}
                  className={`command-palette__item command-palette__item--${entry.kind}${i === activeIdx ? " command-palette__item--active" : ""}`}
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => {
                    entry.onSelect();
                    saveRecent(entry.id);
                    onClose();
                  }}
                >
                  <span className="command-palette__kind">{entry.kind}</span>
                  <span className="command-palette__label">{entry.label}</span>
                  <span className="command-palette__meta">
                    {entry.group && <span className="command-palette__group">{entry.group}</span>}
                    {entry.shortcut && (
                      <kbd
                        className="command-palette__shortcut"
                        aria-label={`Keyboard shortcut ${entry.shortcut}`}
                      >
                        {entry.shortcut}
                      </kbd>
                    )}
                  </span>
                </li>,
              );
              return acc;
            }, [])
          )}
        </ul>
        <footer className="command-palette__footer">
          <span className="command-palette__hint">
            Press <kbd>1</kbd>–<kbd>0</kbd> to jump to any panel · <kbd>?</kbd> for all shortcuts
          </span>
        </footer>
      </div>
    </div>
  );
}
