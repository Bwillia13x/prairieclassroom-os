import type { ActiveTab } from "./appReducer";
import type { PageAnchor } from "./components/PageAnchorRail";

interface PageAnchorConfig {
  label: string;
  topAnchorId: string;
  anchors: PageAnchor[];
}

export const PAGE_ANCHORS: Record<ActiveTab, PageAnchorConfig> = {
  classroom: {
    label: "Classroom sections",
    topAnchorId: "classroom-top",
    anchors: [
      { id: "classroom-command", number: "01", label: "Command" },
      { id: "classroom-health", number: "02", label: "Pulse" },
      { id: "classroom-watchlist", number: "03", label: "Watchlist" },
      { id: "classroom-dashboard", number: "04", label: "Operations" },
      { id: "classroom-intelligence", number: "05", label: "Intelligence" },
      { id: "classroom-roster", number: "06", label: "Roster" },
    ],
  },
  today: {
    label: "Today sections",
    topAnchorId: "today-top",
    anchors: [
      { id: "command-center", number: "01", label: "Command Center" },
      { id: "classroom-pulse", number: "02", label: "What to Watch" },
      { id: "day-arc", number: "03", label: "Today's Shape" },
      { id: "complexity-debt", number: "04", label: "Complexity Debt" },
      { id: "planning-health", number: "05", label: "Planning Health" },
      { id: "carry-forward", number: "06", label: "Carry Forward" },
      { id: "end-of-today", number: "07", label: "End of Today" },
    ],
  },
  tomorrow: {
    label: "Tomorrow sections",
    topAnchorId: "tomorrow-top",
    anchors: [
      { id: "tomorrow-hub", number: "01", label: "Planning Hub" },
      { id: "tomorrow-tools", number: "02", label: "Planning Tools" },
      { id: "tomorrow-workspace", number: "03", label: "Active Workspace" },
    ],
  },
  week: {
    label: "Week sections",
    topAnchorId: "week-top",
    anchors: [
      { id: "week-hub", number: "01", label: "Week Command" },
      { id: "week-overview", number: "02", label: "This Week" },
      { id: "week-events", number: "03", label: "Upcoming Events" },
      { id: "week-pressure", number: "04", label: "Pattern Pressure" },
    ],
  },
  prep: {
    label: "Prep sections",
    topAnchorId: "prep-top",
    anchors: [
      { id: "prep-command", number: "01", label: "Prep Command" },
      { id: "prep-tools", number: "02", label: "Prep Tools" },
      { id: "prep-workspace", number: "03", label: "Active Workspace" },
    ],
  },
  ops: {
    label: "Ops sections",
    topAnchorId: "ops-top",
    anchors: [
      { id: "ops-command", number: "01", label: "Ops Command" },
      { id: "ops-tools", number: "02", label: "Ops Tools" },
      { id: "ops-workspace", number: "03", label: "Active Workspace" },
    ],
  },
  review: {
    label: "Review sections",
    topAnchorId: "review-top",
    anchors: [
      { id: "review-command", number: "01", label: "Review Command" },
      { id: "review-tools", number: "02", label: "Review Tools" },
      { id: "review-workspace", number: "03", label: "Active Workspace" },
    ],
  },
};
