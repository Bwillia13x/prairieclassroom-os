/**
 * dataviz/composition.tsx — Classroom composition rings.
 *
 * Concentric donut rings showing EAL levels, support tag clusters,
 * and family language diversity.
 * Answers: "Who is in my room?"
 */

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, KeyboardEvent, ReactElement } from "react";
import SourceTag from "../SourceTag";

interface CompositionRingsStudent {
  alias: string;
  eal_flag?: boolean;
  support_tags?: string[];
  family_language?: string;
}

interface CompositionRingsProps {
  students: CompositionRingsStudent[];
  onSegmentClick?: (payload: {
    groupKind: "eal" | "support_cluster" | "family_language";
    tag: string;
    label: string;
    students: CompositionRingsStudent[];
  }) => void;
}

type CompositionGroupKind = "eal" | "support_cluster" | "family_language";

interface CompositionGroupItem {
  groupKind: CompositionGroupKind;
  tag: string;
  label: string;
  value: number;
  color: string;
  students: CompositionRingsStudent[];
}

interface DonutSegment {
  label: string;
  value: number;
  color: string;
  /**
   * Audit #20: `pairKey` links a donut segment to its paired bar row
   * so hovering either tints both. Set independently of `clickable`
   * because non-interactive segments (e.g. "No EAL tag") still need to
   * exit any active hover state cleanly.
   */
  pairKey?: string;
  onHover?: (hovered: boolean) => void;
  active?: boolean;
  clickable?: {
    testid: string;
    ariaLabel: string;
    onClick: () => void;
    onKeyDown: (e: KeyboardEvent<SVGCircleElement>) => void;
  };
}

function drawDonutRing(
  cx: number, cy: number, radius: number, strokeWidth: number,
  segments: DonutSegment[],
): ReactElement[] {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return [];

  const elements: ReactElement[] = [];
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  for (const seg of segments) {
    const pct = seg.value / total;
    const dashLength = pct * circumference;
    const baseClass = "viz-composition__segment";
    const modifiers = [
      seg.clickable ? "viz-composition__segment--clickable" : "",
      seg.active ? "viz-composition__segment--active" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const className = [baseClass, modifiers].filter(Boolean).join(" ");
    const clickProps = seg.clickable
      ? {
          role: "button" as const,
          tabIndex: 0,
          "data-testid": seg.clickable.testid,
          "aria-label": seg.clickable.ariaLabel,
          onClick: seg.clickable.onClick,
          onKeyDown: seg.clickable.onKeyDown,
        }
      : {};
    const hoverProps = seg.onHover
      ? {
          onMouseEnter: () => seg.onHover!(true),
          onMouseLeave: () => seg.onHover!(false),
          onFocus: () => seg.onHover!(true),
          onBlur: () => seg.onHover!(false),
        }
      : {};
    elements.push(
      <circle
        key={`${seg.label}-${radius}`}
        cx={cx} cy={cy} r={radius}
        fill="none" stroke={seg.color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${dashLength} ${circumference - dashLength}`}
        strokeDashoffset={-offset}
        transform={`rotate(-90 ${cx} ${cy})`}
        opacity={0.85}
        className={className}
        data-pair-key={seg.pairKey}
        {...clickProps}
        {...hoverProps}
      >
        <title>{seg.label}: {seg.value}</title>
      </circle>,
    );
    offset += dashLength;
  }
  return elements;
}

const LANG_COLORS: Record<string, string> = {
  en: "var(--color-section-ea)",
  tl: "var(--color-section-watchpoint)",
  ar: "var(--color-section-trend)",
  ur: "var(--color-section-family)",
  so: "var(--color-danger)",
  pa: "var(--color-analysis)",
  es: "var(--color-provenance)",
  vi: "var(--color-pending)",
};

const LANG_LABELS: Record<string, string> = {
  en: "English", tl: "Tagalog", ar: "Arabic", ur: "Urdu",
  so: "Somali", pa: "Punjabi", es: "Spanish", vi: "Vietnamese",
};

export function ClassroomCompositionRings({ students, onSegmentClick }: CompositionRingsProps) {
  const [mounted, setMounted] = useState(false);
  /**
   * Audit #20: cross-highlight state shared between donut segments and
   * right-side bar rows. `${groupKind}:${tag}` is the pair key. A null
   * value means no hover is active.
   */
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const stats = useMemo(() => {
    const ealLevels: Record<string, number> = {};
    const tagClusters: Record<string, number> = {};
    const languages: Record<string, number> = {};

    for (const s of students) {
      const lang = s.family_language ?? "en";
      languages[lang] = (languages[lang] ?? 0) + 1;

      for (const tag of s.support_tags ?? []) {
        if (tag.startsWith("eal_level")) {
          ealLevels[tag] = (ealLevels[tag] ?? 0) + 1;
        } else {
          // Cluster related tags
          const cluster = tagToCluster(tag);
          tagClusters[cluster] = (tagClusters[cluster] ?? 0) + 1;
        }
      }
    }

    return { ealLevels, tagClusters, languages };
  }, [students]);

  const cx = 90;
  const cy = 90;

  function familyLanguageLabel(student: CompositionRingsStudent): string {
    const rawLanguage = student.family_language ?? "en";
    return LANG_LABELS[rawLanguage] ?? rawLanguage;
  }

  function makeClickable(
    groupKind: "eal" | "support_cluster" | "family_language",
    tag: string,
    label: string,
    count: number,
    filterFn: (s: CompositionRingsStudent) => boolean,
  ): DonutSegment["clickable"] | undefined {
    if (!onSegmentClick) return undefined;
    const filtered = students.filter(filterFn);
    return {
      testid: `viz-composition-segment-${groupKind}-${tag}`,
      ariaLabel: `${label}: ${count} students`,
      onClick: () => onSegmentClick({ groupKind, tag, label, students: filtered }),
      onKeyDown: (e: KeyboardEvent<SVGCircleElement>) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSegmentClick({ groupKind, tag, label, students: filtered });
        }
      },
    };
  }

  const EAL_TAGS: { tag: string; label: string; color: string }[] = [
    { tag: "eal_level_1", label: "EAL Level 1", color: "var(--color-danger)" },
    { tag: "eal_level_2", label: "EAL Level 2", color: "var(--color-warning)" },
    { tag: "eal_level_3", label: "EAL Level 3", color: "var(--color-success)" },
  ];

  const clusterOrder = ["transition", "sensory", "academic", "extension", "social", "executive", "other"];
  const clusterColors: Record<string, string> = {
    transition: "var(--color-warning)",
    sensory: "var(--color-danger)",
    academic: "var(--color-analysis)",
    extension: "var(--color-success)",
    social: "var(--color-provenance)",
    executive: "var(--color-section-watchpoint)",
    other: "var(--color-section-ea)",
  };

  const ealGroups: CompositionGroupItem[] = EAL_TAGS
    .map(({ tag, label, color }) => ({
      groupKind: "eal" as const,
      tag,
      label,
      value: stats.ealLevels[tag] ?? 0,
      color,
      students: students.filter((s) => (s.support_tags ?? []).includes(tag)),
    }))
    .filter((s) => s.value > 0);

  const ealTotal = ealGroups.reduce((sum, group) => sum + group.value, 0);
  const nonEalCount = Math.max(0, students.length - ealTotal);

  const ealSegments: DonutSegment[] = [
    ...ealGroups.map((group) => {
      const pairKey = `${group.groupKind}:${group.tag}`;
      return {
        label: group.label,
        value: group.value,
        color: group.color,
        pairKey,
        onHover: (h: boolean) => setHoveredKey(h ? pairKey : null),
        active: hoveredKey === pairKey,
        clickable: makeClickable(group.groupKind, group.tag, group.label, group.value, (s) => (s.support_tags ?? []).includes(group.tag)),
      };
    }),
    { label: "No EAL tag", value: nonEalCount, color: "var(--color-border)" },
  ].filter((s) => s.value > 0);

  function formatClusterLabel(cluster: string): string {
    const labels: Record<string, string> = {
      transition: "Transition",
      sensory: "Sensory",
      academic: "Academic",
      extension: "Extension",
      social: "Social",
      executive: "Executive function",
      other: "Other",
    };
    return labels[cluster] ?? cluster;
  }

  const supportGroups: CompositionGroupItem[] = clusterOrder
    .filter((c) => (stats.tagClusters[c] ?? 0) > 0)
    .map((c) => ({
      groupKind: "support_cluster" as const,
      tag: c,
      label: formatClusterLabel(c),
      value: stats.tagClusters[c],
      color: clusterColors[c] ?? "var(--color-border)",
      students: students.filter((s) => (s.support_tags ?? []).some((t) => tagToCluster(t) === c)),
    }));

  const tagSegments: DonutSegment[] = clusterOrder
    .filter((c) => (stats.tagClusters[c] ?? 0) > 0)
    .map((c) => {
      const pairKey = `support_cluster:${c}`;
      return {
        label: formatClusterLabel(c),
        value: stats.tagClusters[c],
        color: clusterColors[c] ?? "var(--color-border)",
        pairKey,
        onHover: (h: boolean) => setHoveredKey(h ? pairKey : null),
        active: hoveredKey === pairKey,
        clickable: makeClickable("support_cluster", c, formatClusterLabel(c), stats.tagClusters[c], (s) => (s.support_tags ?? []).some((t) => tagToCluster(t) === c)),
      };
    });

  const languageGroups: CompositionGroupItem[] = Object.entries(stats.languages)
    .sort((a, b) => b[1] - a[1])
    .map(([code, count]) => {
      const langLabel = LANG_LABELS[code] ?? code;
      const langName = LANG_LABELS[code] ?? code;
      return {
        groupKind: "family_language" as const,
        tag: langName,
        label: langLabel,
        value: count,
        color: LANG_COLORS[code] ?? "var(--color-section-ea)",
        students: students.filter((s) => familyLanguageLabel(s) === langName),
      };
    });

  const langSegments: DonutSegment[] = languageGroups.map((group) => {
    const pairKey = `${group.groupKind}:${group.tag}`;
    return {
      label: group.label,
      value: group.value,
      color: group.color,
      pairKey,
      onHover: (h: boolean) => setHoveredKey(h ? pairKey : null),
      active: hoveredKey === pairKey,
      clickable: makeClickable(group.groupKind, group.tag, group.label, group.value, (s) => familyLanguageLabel(s) === group.tag),
    };
  });

  const langCount = Object.keys(stats.languages).length;
  const namedSupportGroups = supportGroups
    .filter((group) => group.tag !== "other")
    .sort((a, b) => b.value - a.value);
  const supportDisplayGroups = [
    ...namedSupportGroups,
    ...supportGroups.filter((group) => group.tag === "other"),
  ];
  const topNeed = supportDisplayGroups[0];
  const homeLanguageGroups = languageGroups.filter((group) => group.label !== "English");
  const languageDisplayGroups = homeLanguageGroups.length > 0 ? homeLanguageGroups.slice(0, 6) : languageGroups.slice(0, 1);

  const topLang = langSegments[0];
  const ariaLabel =
    `Classroom composition: ${students.length} students, ${ealTotal} English language learners across ${Object.keys(stats.ealLevels).length} levels, ` +
    `${langCount} home ${langCount === 1 ? "language" : "languages"}` +
    (topLang && topLang.label !== "English" ? ` (${topLang.label} most common)` : "") +
    `, ${tagSegments.length} support clusters.`;

  function handleGroupKeyDown(e: KeyboardEvent<HTMLElement>, group: CompositionGroupItem) {
    if (!onSegmentClick) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSegmentClick({
        groupKind: group.groupKind,
        tag: group.tag,
        label: group.label,
        students: group.students,
      });
    }
  }

  function renderProfileGroup(title: string, groups: CompositionGroupItem[]) {
    if (groups.length === 0) return null;
    const maxValue = Math.max(1, ...groups.map((group) => group.value));
    return (
      <div className="viz-composition__group">
        <span className="viz-composition__group-title">{title}</span>
        <div className="viz-composition__group-list">
          {groups.map((group, index) => {
            // Audit #20: rows pair with donut segments by `${groupKind}:${tag}`.
            // Either surface can drive the shared `hoveredKey` state.
            const pairKey = `${group.groupKind}:${group.tag}`;
            const isActive = hoveredKey === pairKey;
            const rowClass = `viz-composition__row${
              isActive ? " viz-composition__row--active" : ""
            }`;
            const hoverHandlers = {
              onMouseEnter: () => setHoveredKey(pairKey),
              onMouseLeave: () => setHoveredKey(null),
              onFocus: () => setHoveredKey(pairKey),
              onBlur: () => setHoveredKey(null),
            };
            const rowContent = (
              <>
                <span className="viz-composition__dot" style={{ background: group.color }} />
                <span className="viz-composition__row-label">{group.label}</span>
                <span className="viz-composition__row-bar" aria-hidden="true">
                  <span
                    style={{
                      "--composition-row-pct": `${Math.max(0.08, group.value / maxValue)}`,
                      "--composition-row-delay": `${index * 55}ms`,
                      background: group.color,
                    } as CSSProperties}
                  />
                </span>
                <strong>{group.value}</strong>
              </>
            );
            return onSegmentClick ? (
              <button
                key={`${group.groupKind}-${group.tag}`}
                type="button"
                className={rowClass}
                data-testid={`viz-composition-row-${group.groupKind}-${group.tag}`}
                data-pair-key={pairKey}
                aria-label={`${group.label}: ${group.value} ${group.value === 1 ? "student" : "students"}. Open group.`}
                onClick={() => onSegmentClick({
                  groupKind: group.groupKind,
                  tag: group.tag,
                  label: group.label,
                  students: group.students,
                })}
                onKeyDown={(e) => handleGroupKeyDown(e, group)}
                {...hoverHandlers}
                style={{ "--composition-row-delay": `${index * 55}ms` } as CSSProperties}
              >
                {rowContent}
              </button>
            ) : (
              <div
                key={`${group.groupKind}-${group.tag}`}
                className={rowClass}
                data-testid={`viz-composition-row-${group.groupKind}-${group.tag}`}
                data-pair-key={pairKey}
                aria-label={`${group.label}: ${group.value} ${group.value === 1 ? "student" : "students"}.`}
                {...hoverHandlers}
                style={{ "--composition-row-delay": `${index * 55}ms` } as CSSProperties}
              >
                {rowContent}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={`viz-composition${mounted ? " viz-composition--mounted" : ""}`}>
      <div className="viz-header viz-composition__header">
        <div>
          <h4 className="t-eyebrow viz-title">Classroom Profile <SourceTag kind="record" /></h4>
          <span className="viz-composition__summary">
            {students.length} students · {ealTotal} EAL · {langCount} languages
          </span>
        </div>
        {/* Audit #21: the old `N NEED GROUPS` / `LEADS` chips read as
            ambient metadata but were actually inviting a click. Promote
            them to labeled action buttons with verb+noun phrasing. */}
        <div className="viz-composition__stats">
          {supportGroups.length > 0 && onSegmentClick ? (
            <button
              type="button"
              className="viz-composition__header-action"
              aria-label={`View ${supportGroups.length} need ${supportGroups.length === 1 ? "group" : "groups"}`}
              data-testid="viz-composition-view-needs"
              onClick={() =>
                onSegmentClick({
                  groupKind: "support_cluster",
                  tag: "all",
                  label: "All need groups",
                  students: students.filter(
                    (s) => (s.support_tags ?? []).length > 0,
                  ),
                })
              }
            >
              View {supportGroups.length} need {supportGroups.length === 1 ? "group" : "groups"}
            </button>
          ) : supportGroups.length > 0 ? (
            <span className="viz-composition__header-caption">
              {supportGroups.length} need {supportGroups.length === 1 ? "group" : "groups"}
            </span>
          ) : null}
          {topNeed && onSegmentClick ? (
            <button
              type="button"
              className="viz-composition__header-action"
              aria-label={`View ${topNeed.label.toLowerCase()} leads`}
              data-testid="viz-composition-view-top-need"
              onClick={() =>
                onSegmentClick({
                  groupKind: topNeed.groupKind,
                  tag: topNeed.tag,
                  label: `${topNeed.label} leads`,
                  students: topNeed.students,
                })
              }
            >
              View {topNeed.label.toLowerCase()} leads
            </button>
          ) : topNeed ? (
            <span className="viz-composition__header-caption">{topNeed.label} leads</span>
          ) : null}
        </div>
      </div>
      <div className="viz-composition__body">
        <div className="viz-composition__visual">
          <svg width="190" height="190" viewBox="0 0 180 180" className="viz-svg"
            role={onSegmentClick ? "group" : "img"}
            aria-label={ariaLabel}>
            <circle className="viz-composition__track" cx={cx} cy={cy} r={78} />
            <circle className="viz-composition__track" cx={cx} cy={cy} r={58} />
            <circle className="viz-composition__track" cx={cx} cy={cy} r={40} />
            <g className="viz-composition__ring viz-composition__ring--outer">
              {drawDonutRing(cx, cy, 78, 14, ealSegments)}
            </g>
            <g className="viz-composition__ring viz-composition__ring--middle">
              {drawDonutRing(cx, cy, 58, 12, tagSegments)}
            </g>
            <g className="viz-composition__ring viz-composition__ring--inner">
              {drawDonutRing(cx, cy, 40, 10, langSegments)}
            </g>
            <text x={cx} y={cy - 4} textAnchor="middle" className="viz-composition__center-number">{students.length}</text>
            <text x={cx} y={cy + 11} textAnchor="middle" className="viz-composition__center-label">students</text>
          </svg>
          <div className="viz-composition__metrics" aria-hidden="true">
            <span><strong>{ealTotal}</strong><em>EAL</em></span>
            <span><strong>{supportGroups.length}</strong><em>needs</em></span>
            <span><strong>{langCount}</strong><em>languages</em></span>
          </div>
        </div>
        <div className="viz-composition__profile">
          {renderProfileGroup("EAL", ealGroups)}
          {renderProfileGroup("Needs", supportDisplayGroups.slice(0, 4))}
          {renderProfileGroup("Languages", languageDisplayGroups)}
        </div>
      </div>
    </div>
  );
}

function tagToCluster(tag: string): string {
  if (/transition|routine|pre_correction/.test(tag)) return "transition";
  if (/sensory|movement|standing|break/.test(tag)) return "sensory";
  if (/math|reading|literacy|vocab|articulation/.test(tag)) return "academic";
  if (/extension|mentor|strong|writer/.test(tag)) return "extension";
  if (/social|peer|quiet/.test(tag)) return "social";
  if (/executive|checklist|materials/.test(tag)) return "executive";
  return "other";
}
