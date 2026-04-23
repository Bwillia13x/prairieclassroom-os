import {
  getTabBadgeCount,
  getVisibleTabs,
  isTabVisibleForRole,
  TAB_META,
  resolveLegacyPanel,
  type ActiveTab,
  type ClassroomRole,
  type NavTarget,
} from "../appReducer";
import { useApp } from "../AppContext";
import { pickRecommendedPanelStatus } from "./TriageSurfaces";
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
  const { activeRole, latestTodaySnapshot, tomorrowNotes } = useApp();
  const role: ClassroomRole = activeRole;
  const visibleTabs = getVisibleTabs(role);

  const recommended = pickRecommendedPanelStatus(latestTodaySnapshot?.panel_statuses ?? [], role);
  const recommendedTarget = recommended ? resolveLegacyPanel(recommended.panel_id) : null;
  const recommendedVisible = recommendedTarget && isTabVisibleForRole(recommendedTarget.tab, role);
  const showRecommended = activeTab !== "today" && activeTab !== "tomorrow" && Boolean(recommended && recommendedVisible);

  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {showRecommended && recommended ? (
        <div className="mobile-nav-recommended">
          <button
            type="button"
            className="mobile-nav-recommended__btn"
            onClick={() => recommendedTarget && onTabChange(recommendedTarget.tool ?? recommendedTarget.tab)}
          >
            <span className="mobile-nav-recommended__eyebrow">Recommended now</span>
            <span className="mobile-nav-recommended__label">{recommended.label}</span>
            <span className="mobile-nav-recommended__detail">
              {recommended.pending_count > 0 ? `${recommended.pending_count} pending` : recommended.state.replace(/_/g, " ")}
            </span>
          </button>
        </div>
      ) : null}

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
              aria-pressed={isActive}
            >
              <SectionIcon name={meta.icon} className="mobile-nav-icon" />
              <span className="mobile-nav-group-label">{meta.label}</span>
              {badge > 0 ? <span className="mobile-nav-badge">{badge}</span> : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
