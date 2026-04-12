import { useEffect, useState } from "react";
import {
  getGroupForTab,
  getTabBadgeCount,
  getTabsForGroup,
  NAV_GROUP_META,
  NAV_GROUP_ORDER,
  TAB_META,
  type ActiveTab,
  type NavGroup,
} from "../appReducer";
import SectionIcon from "./SectionIcon";
import "./MobileNav.css";

interface Props {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  debtCounts?: Record<string, number>;
}

export default function MobileNav({ activeTab, onTabChange, debtCounts }: Props) {
  const [expandedGroup, setExpandedGroup] = useState<NavGroup>(getGroupForTab(activeTab));

  useEffect(() => {
    setExpandedGroup(getGroupForTab(activeTab));
  }, [activeTab]);

  function handleGroupClick(group: NavGroup) {
    setExpandedGroup(group);
    const tabs = getTabsForGroup(group);
    if (!tabs.includes(activeTab)) {
      onTabChange(tabs[0]);
    }
  }

  const visibleTabs = getTabsForGroup(expandedGroup);
  const showSubtabs = visibleTabs.length > 1;

  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {showSubtabs ? (
        <div className="mobile-nav-subtabs">
          {visibleTabs.map((tab) => (
            <button
              key={tab}
              className={`mobile-nav-subtab${activeTab === tab ? " mobile-nav-subtab--active" : ""}`}
              onClick={() => onTabChange(tab)}
              aria-current={activeTab === tab ? "page" : undefined}
              type="button"
            >
              {TAB_META[tab].shortLabel}
              {getTabBadgeCount(tab, debtCounts ?? {}) > 0 ? (
                <span className="mobile-nav-subtab-badge">{getTabBadgeCount(tab, debtCounts ?? {})}</span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mobile-nav-groups">
        {NAV_GROUP_ORDER.map((group) => {
          const meta = NAV_GROUP_META[group];
          const isActive = expandedGroup === group;
          const groupBadge = getTabsForGroup(group).reduce(
            (total, tab) => total + getTabBadgeCount(tab, debtCounts ?? {}),
            0,
          );

          return (
            <button
              key={group}
              className={`mobile-nav-group mobile-nav-group--${meta.sectionTone}${isActive ? " mobile-nav-group--active" : ""}`}
              onClick={() => handleGroupClick(group)}
              aria-label={meta.label}
              type="button"
            >
              <SectionIcon name={meta.icon} className="mobile-nav-icon" />
              <span className="mobile-nav-group-label">{meta.label}</span>
              {groupBadge > 0 ? <span className="mobile-nav-badge">{groupBadge}</span> : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
