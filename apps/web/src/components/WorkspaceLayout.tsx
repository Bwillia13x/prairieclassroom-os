import type { ReactNode } from "react";

/**
 * WorkspaceLayout — the canonical rail/canvas split used by every workspace
 * panel (Differentiate, EA Briefing, Tomorrow Plan, etc.).
 *
 * Two optional contract attributes drive responsive behavior, both consumed
 * by `.workspace-layout` rules in primitives.css:
 *
 * - `layout`     "split" (default) renders rail + canvas side-by-side at
 *                ≥960px and stacked below. "single" forces single-column at
 *                every width and skips the sticky rail (rail still renders,
 *                in document order, above the canvas).
 *
 * - `splitState` "input" (default) widens the rail (~42%) so form-driven
 *                intake breathes. "output" narrows the rail (~30%) so the
 *                generated canvas dominates once a result is rendered. Only
 *                takes effect when `layout="split"` and viewport ≥960px.
 *                Per-panel adoption is opt-in: panels typically derive this
 *                from `result ? "output" : "input"`.
 *
 * Width and breakpoint constants live in primitives.css; do not hardcode
 * them in panels.
 */
interface Props {
  rail: ReactNode;
  canvas: ReactNode;
  layout?: "split" | "single";
  splitState?: "input" | "output";
  className?: string;
  surface?: string;
}

export default function WorkspaceLayout({
  rail,
  canvas,
  layout = "split",
  splitState = "input",
  className,
  surface,
}: Props) {
  const classes = ["workspace-layout", className].filter(Boolean).join(" ");

  return (
    <div
      className={classes}
      data-layout={layout}
      data-split-state={splitState}
      data-surface={surface}
    >
      <aside className="workspace-rail">{rail}</aside>
      <div className="workspace-canvas">{canvas}</div>
    </div>
  );
}
