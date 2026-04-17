import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CommandPalette from "../CommandPalette";
import type { PaletteEntry } from "../../hooks/usePaletteEntries";

function makeEntries(): PaletteEntry[] {
  return [
    { kind: "panel", id: "p1", label: "Today", group: "today", keywords: "today", onSelect: vi.fn() },
    { kind: "panel", id: "p2", label: "Family Message", group: "review", keywords: "family message review", onSelect: vi.fn() },
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
});
