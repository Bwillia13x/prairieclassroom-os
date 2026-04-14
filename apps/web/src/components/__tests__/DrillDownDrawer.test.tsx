import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import AppContext, { type AppContextValue } from "../../AppContext";
import DrillDownDrawer from "../DrillDownDrawer";
import type { DrillDownContext } from "../../types";

vi.mock("../../api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api")>();
  return {
    ...actual,
    fetchInterventionHistoryForStudent: vi.fn().mockResolvedValue([]),
    fetchMessageHistoryForStudent: vi.fn().mockResolvedValue([]),
  };
});

function makeAppContext(): AppContextValue {
  return {
    classrooms: [],
    activeClassroom: "demo-classroom",
    activeTab: "today",
    setActiveClassroom: vi.fn(),
    setActiveTab: vi.fn(),
    profile: {
      classroom_id: "demo-classroom",
      grade_band: "3-4",
      subject_focus: "cross_curricular",
      classroom_notes: [],
      students: [],
      is_demo: true,
    },
    students: [],
    classroomAccessCodes: {},
    classroomRoles: {},
    activeRole: "teacher" as const,
    setClassroomRole: vi.fn(),
    authPrompt: null,
    showSuccess: vi.fn(),
    dispatch: vi.fn(),
    streaming: {
      active: false,
      phase: "idle",
      thinkingText: "",
      partialSections: [],
      progress: 0,
      elapsedSeconds: 0,
    },
    toasts: [],
    featuresSeen: {},
    submitFeedback: vi.fn(),
    showUndo: vi.fn(),
    dismissToast: vi.fn(),
  };
}

function renderDrawer(context: DrillDownContext | null, onContextChange?: (next: DrillDownContext) => void) {
  return render(
    <AppContext.Provider value={makeAppContext()}>
      <DrillDownDrawer
        context={context}
        onClose={vi.fn()}
        onNavigate={vi.fn()}
        onContextChange={onContextChange}
      />
    </AppContext.Provider>,
  );
}

describe("DrillDownDrawer — new context types", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("plan-coverage-section: heading shows label and count, body shows each item", () => {
    const context: DrillDownContext = {
      type: "plan-coverage-section",
      section: "watchpoints",
      label: "Watchpoints",
      items: ["A", "B", "C"],
    };

    renderDrawer(context);

    const title = screen.getByRole("heading", { level: 2 });
    expect(title.textContent).toContain("Watchpoints");
    expect(title.textContent).toContain("3");

    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.getByText("C")).toBeInTheDocument();
  });

  it("student-tag-group escalation: clicking a student alias renders StudentDetailView", async () => {
    const user = userEvent.setup();

    function Harness() {
      const [ctx, setCtx] = useState<DrillDownContext | null>({
        type: "student-tag-group",
        groupKind: "eal",
        tag: "eal_level_2",
        label: "EAL Level 2",
        students: [
          { alias: "Amira", eal_flag: true, support_tags: ["eal_level_2"] },
          { alias: "Ben", eal_flag: true, support_tags: ["eal_level_2"] },
          { alias: "Chen", eal_flag: true, support_tags: ["eal_level_2"] },
        ],
      });
      return (
        <AppContext.Provider value={makeAppContext()}>
          <DrillDownDrawer
            context={ctx}
            onClose={() => setCtx(null)}
            onNavigate={vi.fn()}
            onContextChange={setCtx}
          />
        </AppContext.Provider>
      );
    }

    render(<Harness />);

    // Drawer heading contains label and count
    const title = screen.getByRole("heading", { level: 2 });
    expect(title.textContent).toContain("EAL Level 2");
    expect(title.textContent).toContain("3");

    // All 3 alias buttons render
    expect(screen.getByRole("button", { name: "Amira" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ben" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Chen" })).toBeInTheDocument();

    // Click first alias button — context escalates to student
    await user.click(screen.getByRole("button", { name: "Amira" }));

    // Drawer now shows StudentDetailView content (student detail heading)
    await waitFor(() => {
      const newTitle = screen.getByRole("heading", { level: 2 });
      expect(newTitle.textContent).toContain("Student Detail");
    });

    // Backdrop remains mounted (drawer was not closed)
    expect(document.querySelector(".drill-down-backdrop")).toBeInTheDocument();
  });

  it("variant-lane: heading shows label and filtered variant count (excludes core)", () => {
    const context: DrillDownContext = {
      type: "variant-lane",
      variantType: "eal_supported",
      label: "EAL Supported",
      variants: [
        { variant_type: "core", estimated_minutes: 25, title: "Original lesson" },
        { variant_type: "eal_supported", estimated_minutes: 20, title: "EAL v1" },
        { variant_type: "eal_supported", estimated_minutes: 18, title: "EAL v2" },
      ],
    };

    renderDrawer(context);

    const title = screen.getByRole("heading", { level: 2 });
    expect(title.textContent).toContain("EAL Supported");
    expect(title.textContent).toContain("2");
  });

  it("trend with highlightIndex: renders without regression", () => {
    const context: DrillDownContext = {
      type: "trend",
      trendKey: "debt",
      data: [1, 2, 3, 4, 5],
      label: "Debt trend",
      highlightIndex: 5,
    };

    renderDrawer(context);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    const title = screen.getByRole("heading", { level: 2 });
    expect(title.textContent).toContain("Debt trend");
  });
});
