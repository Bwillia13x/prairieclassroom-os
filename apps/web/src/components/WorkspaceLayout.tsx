import type { ReactNode } from "react";

interface Props {
  rail: ReactNode;
  canvas: ReactNode;
}

export default function WorkspaceLayout({ rail, canvas }: Props) {
  return (
    <div className="workspace-layout">
      <aside className="workspace-rail">{rail}</aside>
      <div className="workspace-canvas">{canvas}</div>
    </div>
  );
}
