import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import "./PageAnchorRail.css";

export interface PageAnchor {
  id: string;
  number: string;
  label: string;
}

export interface PageAnchorRailProps {
  anchors: PageAnchor[];
  topAnchorId: string;
  label: string;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  className?: string;
}

const OBSERVATION_OFFSET_RATIO = 0.18;
const OBSERVATION_OFFSET_MIN_PX = 96;
const GAP_INSIDE_WORKSPACE_PX = 18;

function findScrollContainer(el: HTMLElement | null): HTMLElement | null {
  let node: HTMLElement | null = el?.parentElement ?? null;
  while (node) {
    const style = window.getComputedStyle(node);
    const overflowY = style.overflowY;
    if (
      (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
      node.scrollHeight > node.clientHeight
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

function updateHash(id: string) {
  if (typeof history === "undefined" || !history.replaceState) return;
  history.replaceState(null, "", `#${id}`);
}

export default function PageAnchorRail({
  anchors,
  topAnchorId,
  label,
  collapsed = false,
  onToggleCollapsed,
  className,
}: PageAnchorRailProps) {
  const listId = useId();
  const [activeId, setActiveId] = useState<string>(anchors[0]?.id ?? topAnchorId);
  const navRef = useRef<HTMLElement | null>(null);
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  useEffect(() => {
    setActiveId(anchors[0]?.id ?? topAnchorId);
  }, [anchors, topAnchorId]);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const nav = navRef.current;
    if (!nav) return;

    const measure = () => {
      const main = document.querySelector<HTMLElement>(".app-main");
      if (!main) return;
      const rect = main.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      nav.style.setProperty("--page-rail-top-edge", `${Math.round(rect.top + GAP_INSIDE_WORKSPACE_PX)}px`);
      nav.style.setProperty("--page-rail-left-edge", `${Math.round(rect.left)}px`);
    };

    measure();
    window.addEventListener("resize", measure);

    const main = document.querySelector<HTMLElement>(".app-main");
    let observer: ResizeObserver | null = null;
    if (main && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(measure);
      observer.observe(main);
    }

    return () => {
      window.removeEventListener("resize", measure);
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const navEl = navRef.current;
    const scrollContainer = findScrollContainer(navEl);
    const scrollTarget: HTMLElement | Window = scrollContainer ?? window;
    const allAnchors = [{ id: topAnchorId }, ...anchors];

    const getContainerTop = () => scrollContainer?.getBoundingClientRect().top ?? 0;
    const getContainerHeight = () => scrollContainer?.clientHeight ?? window.innerHeight;

    let frame = 0;
    const compute = () => {
      frame = 0;
      const observationLine =
        getContainerTop() +
        Math.max(OBSERVATION_OFFSET_MIN_PX, getContainerHeight() * OBSERVATION_OFFSET_RATIO);

      let bestId = topAnchorId;
      let foundAnyTarget = false;
      for (const anchor of allAnchors) {
        const el = document.getElementById(anchor.id);
        if (!el) continue;
        foundAnyTarget = true;
        const top = el.getBoundingClientRect().top;
        if (top <= observationLine) {
          bestId = anchor.id;
        } else {
          break;
        }
      }

      if (!foundAnyTarget) return;

      if (scrollContainer) {
        if (scrollContainer.scrollTop <= 2) {
          bestId = topAnchorId;
        }
        const atBottom =
          scrollContainer.scrollTop + scrollContainer.clientHeight >=
          scrollContainer.scrollHeight - 2;
        if (atBottom) bestId = anchors[anchors.length - 1]?.id ?? bestId;
      }

      if (bestId && bestId !== activeIdRef.current) {
        setActiveId(bestId);
      }
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(compute);
    };

    compute();
    scrollTarget.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      scrollTarget.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [anchors, topAnchorId]);

  const handleLinkClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>, id: string) => {
      if (e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      setActiveId(id);
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      updateHash(id);
    },
    [],
  );

  const toggleLabel = collapsed
    ? `Expand ${label.toLowerCase()} navigation`
    : `Collapse ${label.toLowerCase()} navigation`;
  const navClassName = [
    "page-anchor-rail",
    collapsed ? "page-anchor-rail--collapsed" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const activeMarker =
    activeId === topAnchorId
      ? "▲"
      : (anchors.find((a) => a.id === activeId)?.number ?? "");

  return (
    <nav
      ref={navRef}
      className={navClassName}
      aria-label={label}
      data-page-anchor-rail=""
      data-collapsed={collapsed ? "true" : "false"}
    >
      {onToggleCollapsed ? (
        <button
          type="button"
          className="page-anchor-rail__toggle"
          onClick={onToggleCollapsed}
          aria-expanded={!collapsed}
          aria-controls={listId}
          aria-label={toggleLabel}
          title={toggleLabel}
        >
          {activeMarker ? (
            <span className="page-anchor-rail__toggle-marker" aria-hidden="true">
              {activeMarker}
            </span>
          ) : null}
          <svg
            className="page-anchor-rail__toggle-icon"
            viewBox="0 0 16 16"
            width="12"
            height="12"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M10 3 L5 8 L10 13"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="page-anchor-rail__toggle-text">
            {collapsed ? "Sections" : "Collapse"}
          </span>
        </button>
      ) : null}
      <ol
        id={listId}
        className="page-anchor-rail__list"
        aria-hidden={collapsed}
      >
        {anchors.map((anchor) => {
          const isActive = activeId === anchor.id;
          return (
            <li key={anchor.id}>
              <a
                href={`#${anchor.id}`}
                className={`page-anchor-rail__link${isActive ? " page-anchor-rail__link--active" : ""}`}
                aria-current={isActive ? "location" : undefined}
                tabIndex={collapsed ? -1 : undefined}
                onClick={(e) => handleLinkClick(e, anchor.id)}
              >
                <span className="page-anchor-rail__number">{anchor.number}</span>
                <span className="page-anchor-rail__label">{anchor.label}</span>
              </a>
            </li>
          );
        })}
        <li>
          <a
            href={`#${topAnchorId}`}
            className={`page-anchor-rail__back-to-top${activeId === topAnchorId ? " page-anchor-rail__back-to-top--active" : ""}`}
            aria-current={activeId === topAnchorId ? "location" : undefined}
            tabIndex={collapsed ? -1 : undefined}
            onClick={(e) => handleLinkClick(e, topAnchorId)}
          >
            <span className="page-anchor-rail__back-to-top-icon" aria-hidden="true">
              ↑
            </span>
            <span className="page-anchor-rail__back-to-top-text">Back to top</span>
          </a>
        </li>
      </ol>
    </nav>
  );
}
