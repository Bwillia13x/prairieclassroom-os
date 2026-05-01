import {
  getTabBadgeCount,
  getVisibleTabs,
  TAB_META,
  type ActiveTab,
  type ClassroomRole,
  type NavTarget,
} from "../appReducer";
import { useApp } from "../AppContext";
import SectionIcon from "./SectionIcon";
import "./MobileNav.css";

interface Props {
  activeTab: ActiveTab;
  onTabChange: (target: NavTarget) => void;
  debtCounts?: Record<string, number>;
}

/**
 * Mobile navigation — flat row of the seven standalone top-level views.
 *
 * The pre-reorg mobile nav modeled groups + a secondary sub-tab row;
 * with the flat seven-view shell we expose exactly one button per page
 * and let the host page's own tool switcher handle embedded surfaces.
 */
export default function MobileNav({ activeTab, onTabChange, debtCounts }: Props) {
  const { activeRole, tomorrowNotes } = useApp();
  const role: ClassroomRole = activeRole;
  const visibleTabs = getVisibleTabs(role);

  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      <div className="mobile-nav-groups">
        {visibleTabs.map((tab) => {
          const meta = TAB_META[tab];
          const isActive = activeTab === tab;
          const badge = getTabBadgeCount(tab, debtCounts ?? {}, tomorrowNotes.length);

          return (
            <button
              key={tab}
              data-testid={`mobile-nav-group-${tab}`}
              className={`mobile-nav-group mobile-nav-group--${meta.sectionTone}${isActive ? " mobile-nav-group--active" : ""}`}
              onClick={() => onTabChange(tab)}
              type="button"
              aria-label={`${meta.label}: ${meta.taskLabel}${badge > 0 ? `, ${badge} pending` : ""}`}
              aria-pressed={isActive}
            >
              <SectionIcon name={meta.icon} className="mobile-nav-icon" />
              <span className="mobile-nav-group-label">{meta.shortLabel}</span>
              {badge > 0 ? <span className="mobile-nav-badge">{badge}</span> : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
