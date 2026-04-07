import { useState, useEffect } from "react";
import "./MobileNav.css";

type ActiveTab =
  | "today"
  | "differentiate"
  | "tomorrow-plan"
  | "family-message"
  | "log-intervention"
  | "language-tools"
  | "support-patterns"
  | "ea-briefing"
  | "complexity-forecast"
  | "survival-packet";

type TabGroup = "today" | "prep" | "ops" | "review";

interface TabItem {
  id: ActiveTab;
  label: string;
}

const GROUPS: { key: TabGroup; label: string; icon: string; tabs: TabItem[] }[] = [
  {
    key: "today" as TabGroup,
    label: "Today",
    icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-.83 0-1.5-.67-1.5-1.5h3c0 .83-.67 1.5-1.5 1.5zm5-2.5H7v-1l1-1V9.5C8 7.57 9.12 5.85 11 5.18V4.5c0-.55.45-1 1-1s1 .45 1 1v.68C14.88 5.85 16 7.57 16 9.5V12l1 1v1z",
    tabs: [
      { id: "today" as ActiveTab, label: "Today" },
    ],
  },
  {
    key: "prep",
    label: "Prep",
    icon: "M4 6h16M4 12h10",
    tabs: [
      { id: "differentiate", label: "Differentiate" },
      { id: "language-tools", label: "Language" },
    ],
  },
  {
    key: "ops",
    label: "Ops",
    icon: "M3 12h4l3-9 4 18 3-9h4",
    tabs: [
      { id: "tomorrow-plan", label: "Plan" },
      { id: "ea-briefing", label: "EA Brief" },
      { id: "complexity-forecast", label: "Forecast" },
      { id: "log-intervention", label: "Log" },
      { id: "survival-packet", label: "Sub Pkt" },
    ],
  },
  {
    key: "review",
    label: "Review",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    tabs: [
      { id: "family-message", label: "Message" },
      { id: "support-patterns", label: "Patterns" },
    ],
  },
];

function groupForTab(tab: ActiveTab): TabGroup {
  for (const g of GROUPS) {
    if (g.tabs.some((t) => t.id === tab)) return g.key;
  }
  return "prep";
}

interface Props {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  debtCounts?: Record<string, number>;
}

export default function MobileNav({ activeTab, onTabChange, debtCounts }: Props) {
  const [expandedGroup, setExpandedGroup] = useState<TabGroup>(groupForTab(activeTab));

  useEffect(() => {
    setExpandedGroup(groupForTab(activeTab));
  }, [activeTab]);

  function handleGroupClick(groupKey: TabGroup) {
    if (expandedGroup === groupKey) return;
    setExpandedGroup(groupKey);
    const group = GROUPS.find((g) => g.key === groupKey)!;
    const alreadyInGroup = group.tabs.some((t) => t.id === activeTab);
    if (!alreadyInGroup) {
      onTabChange(group.tabs[0].id);
    }
  }

  const activeGroup = GROUPS.find((g) => g.key === expandedGroup)!;

  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {/* Sub-tab row */}
      <div className="mobile-nav-subtabs">
        {activeGroup.tabs.map((tab) => (
          <button
            key={tab.id}
            className={`mobile-nav-subtab${activeTab === tab.id ? " mobile-nav-subtab--active" : ""}`}
            onClick={() => onTabChange(tab.id)}
            aria-current={activeTab === tab.id ? "page" : undefined}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Group bar */}
      <div className="mobile-nav-groups">
        {GROUPS.map((group) => {
          const isActive = expandedGroup === group.key;
          return (
            <button
              key={group.key}
              className={`mobile-nav-group${isActive ? " mobile-nav-group--active" : ""}`}
              onClick={() => handleGroupClick(group.key)}
              aria-label={group.label}
            >
              <svg className="mobile-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={group.icon} />
              </svg>
              <span className="mobile-nav-group-label">{group.label}</span>
              {group.key === "review" && debtCounts &&
                ((debtCounts["unapproved_message"] ?? 0) + (debtCounts["unaddressed_pattern"] ?? 0)) > 0 && (
                <span className="mobile-nav-badge" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
