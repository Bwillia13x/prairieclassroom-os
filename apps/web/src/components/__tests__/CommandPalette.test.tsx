import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CommandPalette, { buildPaletteRows } from "../CommandPalette";
import type { PaletteEntry } from "../../hooks/usePaletteEntries";

function makeEntries(): PaletteEntry[] {
  return [
    { kind: "panel", id: "p1", label: "Today", group: "today", keywords: "today", shortcut: "1", onSelect: vi.fn() },
    { kind: "panel", id: "p2", label: "Family Message", group: "review", keywords: "family message review", shortcut: "0", onSelect: vi.fn() },
    { kind: "action", id: "a1", label: "Draft family message", keywords: "draft message family", onSelect: vi.fn() },
  ];
}

function makeLocalStorageMock(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
    key: () => null,
    length: 0,
  };
}

describe("CommandPalette", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", makeLocalStorageMock());
  });

  it("renders nothing when closed", () => {
    render(<CommandPalette open={false} onClose={() => {}} entries={makeEntries()} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders input and full entry list when open", () => {
    render(<CommandPalette open={true} onClose={() => {}} entries={makeEntries()} />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Family Message")).toBeInTheDocument();
    expect(screen.getByText("Draft family message")).toBeInTheDocument();
  });

  it("filters by substring match across label + keywords", () => {
    render(<CommandPalette open={true} onClose={() => {}} entries={makeEntries()} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "fam" } });
    expect(screen.queryByText("Today")).toBeNull();
    expect(screen.getByText("Family Message")).toBeInTheDocument();
    expect(screen.getByText("Draft family message")).toBeInTheDocument();
  });

  it("fires onSelect and onClose when an entry is clicked", () => {
    const onClose = vi.fn();
    const entries = makeEntries();
    render(<CommandPalette open={true} onClose={onClose} entries={entries} />);
    fireEvent.click(screen.getByText("Family Message"));
    expect(entries[1].onSelect).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("ArrowDown moves active entry, Enter selects it", () => {
    const onClose = vi.fn();
    const entries = makeEntries();
    render(<CommandPalette open={true} onClose={onClose} entries={entries} />);
    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(entries[1].onSelect).toHaveBeenCalledOnce();
  });

  it("Escape closes", () => {
    const onClose = vi.fn();
    render(<CommandPalette open={true} onClose={onClose} entries={makeEntries()} />);
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows 'No matches' when query matches nothing", () => {
    render(<CommandPalette open={true} onClose={() => {}} entries={makeEntries()} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "xyzzy" } });
    expect(screen.getByText(/no matches/i)).toBeInTheDocument();
  });

  it("renders a keyboard shortcut badge for panel entries that expose one", () => {
    render(<CommandPalette open={true} onClose={() => {}} entries={makeEntries()} />);
    expect(screen.getByLabelText("Keyboard shortcut 1")).toHaveTextContent("1");
    expect(screen.getByLabelText("Keyboard shortcut 0")).toHaveTextContent("0");
    // Action entries without a shortcut should not render a kbd badge.
    expect(screen.queryByLabelText(/keyboard shortcut.*draft/i)).toBeNull();
  });

  it("renders a footer hint reinforcing keyboard navigation", () => {
    render(<CommandPalette open={true} onClose={() => {}} entries={makeEntries()} />);
    expect(screen.getByText(/jump to any panel/i)).toBeInTheDocument();
  });

  it("renders Space-Mono ALL CAPS section headers between kind transitions", () => {
    const entries: PaletteEntry[] = [
      { kind: "panel", id: "p1", label: "Today", keywords: "today", onSelect: vi.fn() },
      { kind: "panel", id: "p2", label: "Differentiate", keywords: "diff", onSelect: vi.fn() },
      { kind: "classroom", id: "c1", label: "Demo Grade 3-4", keywords: "demo", onSelect: vi.fn() },
      { kind: "action", id: "a1", label: "Draft family message", keywords: "draft", onSelect: vi.fn() },
    ];
    const { container } = render(<CommandPalette open={true} onClose={() => {}} entries={entries} />);
    const headers = Array.from(
      container.querySelectorAll<HTMLLIElement>("li.command-palette__group-header"),
    );
    expect(headers.length).toBe(3);
    expect(headers.map((h) => h.textContent)).toEqual(["PANELS", "CLASSROOMS", "ACTIONS"]);
    headers.forEach((h) => {
      expect(h.getAttribute("role")).toBe("presentation");
    });
  });
});

describe("buildPaletteRows", () => {
  it("emits a header before each kind transition and tags entries with their filtered index", () => {
    const entries: PaletteEntry[] = [
      { id: "a", kind: "panel", label: "Today", keywords: "today", onSelect: vi.fn() },
      { id: "b", kind: "panel", label: "Differentiate", keywords: "diff", onSelect: vi.fn() },
      { id: "c", kind: "classroom", label: "Demo", keywords: "demo", onSelect: vi.fn() },
    ];
    const rows = buildPaletteRows(entries);
    expect(rows.map((r) => (r.type === "header" ? `H:${r.label}` : `E:${r.entry.id}@${r.index}`))).toEqual([
      "H:PANELS",
      "E:a@0",
      "E:b@1",
      "H:CLASSROOMS",
      "E:c@2",
    ]);
  });

  it("returns an empty array for empty input", () => {
    expect(buildPaletteRows([])).toEqual([]);
  });
});
