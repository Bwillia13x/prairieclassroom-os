import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QuickCaptureTray from "../QuickCaptureTray";

const STUDENTS = [{ alias: "Ari" }, { alias: "Bea" }];

describe("QuickCaptureTray", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    // Default: speech unsupported
    vi.stubGlobal("SpeechRecognition", undefined);
    vi.stubGlobal("webkitSpeechRecognition", undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders all students as avatars", () => {
    render(<QuickCaptureTray classroomId="c1" students={STUDENTS} loading={false} onSubmit={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Select Ari" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select Bea" })).toBeInTheDocument();
  });

  it("renders all 6 intervention chips", () => {
    render(<QuickCaptureTray classroomId="c1" students={STUDENTS} loading={false} onSubmit={vi.fn()} />);
    const labels = ["Redirect", "Calm corner", "Praise", "Break", "Check-in", "Scaffold"];
    for (const label of labels) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("submit is disabled until a student and a note are provided", () => {
    render(<QuickCaptureTray classroomId="c1" students={STUDENTS} loading={false} onSubmit={vi.fn()} />);
    const submit = screen.getByRole("button", { name: /log intervention|submit|log/i });
    expect(submit).toBeDisabled();
  });

  it("chip selection auto-populates note with student aliases", async () => {
    const user = userEvent.setup();
    render(<QuickCaptureTray classroomId="c1" students={STUDENTS} loading={false} onSubmit={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Select Ari" }));
    await user.click(screen.getByRole("button", { name: "Redirect" }));
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.value).toContain("Ari");
  });

  it("noteDirty suppresses overwrite when user has edited the textarea", async () => {
    const user = userEvent.setup();
    render(<QuickCaptureTray classroomId="c1" students={STUDENTS} loading={false} onSubmit={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Select Ari" }));
    await user.click(screen.getByRole("button", { name: "Redirect" }));
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    await user.type(textarea, " — also used timer");
    await user.click(screen.getByRole("button", { name: "Praise" }));
    expect(textarea.value).toContain("also used timer");
  });

  it("multi-student starter note uses 'and' joiner", async () => {
    const user = userEvent.setup();
    render(<QuickCaptureTray classroomId="c1" students={STUDENTS} loading={false} onSubmit={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Select Ari" }));
    await user.click(screen.getByRole("button", { name: "Select Bea" }));
    await user.click(screen.getByRole("button", { name: "Break" }));
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.value).toContain("Ari and Bea");
  });

  it("submit payload matches the selected student and chip", async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<QuickCaptureTray classroomId="test-class" students={STUDENTS} loading={false} onSubmit={spy} />);
    await user.click(screen.getByRole("button", { name: "Select Ari" }));
    await user.click(screen.getByRole("button", { name: "Redirect" }));
    const submit = screen.getByRole("button", { name: /log intervention|submit/i });
    await user.click(submit);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        classroom_id: "test-class",
        student_refs: ["Ari"],
        context: "Quick-capture: redirect",
      }),
    );
    expect(spy.mock.calls[0][0].teacher_note).toContain("Ari");
  });

  it("post-submit state is reset", async () => {
    const user = userEvent.setup();
    render(<QuickCaptureTray classroomId="c1" students={STUDENTS} loading={false} onSubmit={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Select Ari" }));
    await user.click(screen.getByRole("button", { name: "Redirect" }));
    await user.click(screen.getByRole("button", { name: /log intervention|submit/i }));
    expect(screen.getByRole("button", { name: "Select Ari" })).toHaveAttribute("aria-pressed", "false");
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.value).toBe("");
  });

  it("mic button is absent when speech is unsupported", () => {
    render(<QuickCaptureTray classroomId="c1" students={STUDENTS} loading={false} onSubmit={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /dictation/i })).not.toBeInTheDocument();
  });

  it("mic button appears when speech is supported", () => {
    class FakeSR {
      continuous = false;
      interimResults = false;
      lang = "";
      onresult: any = null;
      onerror: any = null;
      onend: any = null;
      start = vi.fn();
      stop = vi.fn();
      abort = vi.fn();
    }
    vi.stubGlobal("SpeechRecognition", FakeSR);
    render(<QuickCaptureTray classroomId="c1" students={STUDENTS} loading={false} onSubmit={vi.fn()} />);
    expect(screen.getByRole("button", { name: /start dictation/i })).toBeInTheDocument();
  });

  it("ArrowRight on a chip moves focus to the next chip", async () => {
    const user = userEvent.setup();
    render(<QuickCaptureTray classroomId="c1" students={STUDENTS} loading={false} onSubmit={vi.fn()} />);
    const firstChip = screen.getByRole("button", { name: "Redirect" });
    firstChip.focus();
    expect(document.activeElement).toBe(firstChip);
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Calm corner" }));
  });
});
