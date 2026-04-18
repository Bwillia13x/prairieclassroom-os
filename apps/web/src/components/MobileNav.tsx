import { useEffect, useState } from "react";
import {
  getGroupForTab,
  getTabBadgeCount,
  getVisibleNavGroups,
  getVisibleTabsForGroup,
  isTabVisibleForRole,
  NAV_GROUP_META,
  TAB_META,
  type ActiveTab,
  type ClassroomRole,
  type NavGroup,
} from "../appReducer";
import { useApp } from "../AppContext";
import SectionIcon from "./SectionIcon";
import "./MobileNav.css";

interface Props {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  debtCounts?: Record<string, number>;
}

export default function MobileNav({ activeTab, onTabChange, debtCounts }: Props) {
  const { activeRole } = useApp();
  const role: ClassroomRole = activeRole;
  const visibleGroups = getVisibleNavGroups(role);
  const initialGroup = isTabVisibleForRole(activeTab, role)
    ? getGroupForTab(activeTab)
    : visibleGroups[0] ?? "today";
  const [expandedGroup, setExpandedGroup] = useState<NavGroup>(initialGroup);

  useEffect(() => {
    // `role` is the stable identity here; `visibleGroups` is recomputed from
    // `role` each render but never changes unless `role` does, so it's safe
    // to depend on `role` only.
    setExpandedGroup(
      isTabVisibleForRole(activeTab, role)
        ? getGroupForTab(activeTab)
        : getVisibleNavGroups(role)[0] ?? "today",
    );
  }, [activeTab, role]);

  function handleGroupClick(group: NavGroup) {
    const tabs = getVisibleTabsForGroup(group, role);
    if (tabs.length === 0) return;
    setExpandedGroup(group);
    if (!tabs.includes(activeTab)) {
      onTabChange(tabs[0]);
    }
  }

  const visibleTabs = getVisibleTabsForGroup(expandedGroup, role);
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
        {visibleGroups.map((group) => {
          const meta = NAV_GROUP_META[group];
          const isActive = expandedGroup === group;
          const groupBadge = getVisibleTabsForGroup(group, role).reduce(
            (total, tab) => total + getTabBadgeCount(tab, debtCounts ?? {}),
            0,
          );

          return (
            <button
              key={group}
              data-testid={`mobile-nav-group-${group}`}
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
