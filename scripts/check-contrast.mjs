#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TOKENS_PATH = path.join(ROOT, "apps/web/src/styles/tokens.css");
const REPORT_PATH = path.join(ROOT, "output/contrast-report.md");

const SMALL_TEXT = 4.5;
const LARGE_TEXT = 3.0;
const UI_COMPONENT = 3.0;

const PAIRS = [
  { fg: "color-text",            bg: "color-bg",                target: SMALL_TEXT,   kind: "body text on bg" },
  { fg: "color-text",            bg: "color-surface",           target: SMALL_TEXT,   kind: "body text on surface" },
  { fg: "color-text",            bg: "color-surface-elevated",  target: SMALL_TEXT,   kind: "body text on elevated" },
  { fg: "color-text",            bg: "color-surface-muted",     target: SMALL_TEXT,   kind: "body text on muted" },
  { fg: "color-text-secondary",  bg: "color-bg",                target: SMALL_TEXT,   kind: "secondary on bg" },
  { fg: "color-text-secondary",  bg: "color-surface",           target: SMALL_TEXT,   kind: "secondary on surface" },
  { fg: "color-text-secondary",  bg: "color-surface-muted",     target: SMALL_TEXT,   kind: "secondary on muted" },
  { fg: "color-text-tertiary",   bg: "color-bg",                target: SMALL_TEXT,   kind: "tertiary on bg" },
  { fg: "color-text-tertiary",   bg: "color-surface",           target: SMALL_TEXT,   kind: "tertiary on surface" },

  { fg: "color-text-info",       bg: "color-bg-info",           target: SMALL_TEXT,   kind: "info family" },
  { fg: "color-text-success",    bg: "color-bg-success",        target: SMALL_TEXT,   kind: "success family" },
  { fg: "color-text-warning",    bg: "color-bg-warning",        target: SMALL_TEXT,   kind: "warning family" },
  { fg: "color-text-danger",     bg: "color-bg-danger",         target: SMALL_TEXT,   kind: "danger family" },
  { fg: "color-text-accent",     bg: "color-bg-accent",         target: SMALL_TEXT,   kind: "accent family" },
  { fg: "color-text-analysis",   bg: "color-bg-analysis",       target: SMALL_TEXT,   kind: "analysis family" },
  { fg: "color-text-provenance", bg: "color-bg-provenance",     target: SMALL_TEXT,   kind: "provenance family" },
  { fg: "color-text-pending",    bg: "color-bg-pending",        target: SMALL_TEXT,   kind: "pending family" },
  { fg: "color-text-sun",        bg: "color-bg-sun",            target: SMALL_TEXT,   kind: "sun family" },
  { fg: "color-text-sage",       bg: "color-bg-sage",           target: SMALL_TEXT,   kind: "sage family" },
  { fg: "color-text-slate",      bg: "color-bg-slate",          target: SMALL_TEXT,   kind: "slate family" },
  { fg: "color-text-forest",     bg: "color-bg-forest",         target: SMALL_TEXT,   kind: "forest family" },

  { fg: "color-text-success",    bg: "color-bg",                target: SMALL_TEXT,   kind: "success badge on bg" },
  { fg: "color-text-warning",    bg: "color-bg",                target: SMALL_TEXT,   kind: "warning badge on bg" },
  { fg: "color-text-danger",     bg: "color-bg",                target: SMALL_TEXT,   kind: "danger badge on bg" },
  { fg: "color-text-accent",     bg: "color-bg",                target: SMALL_TEXT,   kind: "accent badge on bg" },
  { fg: "color-text-pending",    bg: "color-bg",                target: SMALL_TEXT,   kind: "pending badge on bg" },

  { fg: "color-text-on-accent",  bg: "color-accent",            target: SMALL_TEXT,   kind: "button text on accent" },

  { fg: "color-forecast-low-text",    bg: "color-forecast-low-bg",    target: SMALL_TEXT, kind: "forecast low" },
  { fg: "color-forecast-medium-text", bg: "color-forecast-medium-bg", target: SMALL_TEXT, kind: "forecast medium" },
  { fg: "color-forecast-high-text",   bg: "color-forecast-high-bg",   target: SMALL_TEXT, kind: "forecast high" },

  { fg: "color-border-input",    bg: "color-surface",           target: UI_COMPONENT, kind: "form input border on surface" },
  { fg: "color-border-input",    bg: "color-bg",                target: UI_COMPONENT, kind: "form input border on bg" },
  { fg: "color-border-strong",   bg: "color-bg",                target: UI_COMPONENT, kind: "border-strong on bg (decorative)", advisory: true },
  { fg: "color-border-strong",   bg: "color-surface",           target: UI_COMPONENT, kind: "border-strong on surface (decorative)", advisory: true },
  { fg: "color-border",          bg: "color-surface",           target: UI_COMPONENT, kind: "border on surface (decorative)", advisory: true },

  { fg: "color-accent",          bg: "color-bg",                target: LARGE_TEXT,   kind: "accent on bg (large/UI)" },
  { fg: "color-accent",          bg: "color-surface",           target: LARGE_TEXT,   kind: "accent on surface (large/UI)" },
  { fg: "color-success",         bg: "color-bg",                target: UI_COMPONENT, kind: "success indicator (UI)" },
  { fg: "color-warning",         bg: "color-bg",                target: UI_COMPONENT, kind: "warning indicator (UI)" },
  { fg: "color-danger",          bg: "color-bg",                target: UI_COMPONENT, kind: "danger indicator (UI)" },
];

function splitTopLevel(str, sep) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (c === sep && depth === 0) {
      parts.push(str.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(str.slice(start).trim());
  return parts;
}

function parseColor(s) {
  s = s.trim();
  if (s.startsWith("#")) {
    const hex = s.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: 1,
      };
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: 1,
      };
    }
    if (hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: parseInt(hex.slice(6, 8), 16) / 255,
      };
    }
    return null;
  }
  const rgbMatch = s.match(/^rgba?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/);
  if (rgbMatch) {
    return {
      r: Math.round(parseFloat(rgbMatch[1])),
      g: Math.round(parseFloat(rgbMatch[2])),
      b: Math.round(parseFloat(rgbMatch[3])),
      a: rgbMatch[4] === undefined ? 1 : parseFloat(rgbMatch[4]),
    };
  }
  return null;
}

function parseTokens(css) {
  const tokens = {};
  const aliases = {};
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const lines = stripped.split("\n");

  // Only capture declarations inside the first top-level :root {} block.
  // Once that block closes we hard-stop, so @media / [data-theme] / nested
  // :root overrides that come later cannot replace the canonical base palette.
  let done = false;
  let started = false;
  let depth = 0;

  for (const line of lines) {
    if (done) break;
    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;

    if (!started) {
      if (/^\s*:root\s*\{\s*$/.test(line)) {
        started = true;
        depth = 1;
      }
      continue;
    }

    if (depth === 1) {
      const ld = line.match(/^\s*--([\w-]+):\s*light-dark\(([\s\S]+)\);?\s*$/);
      if (ld) {
        const name = ld[1];
        const inside = ld[2].trim().replace(/;\s*$/, "");
        const parts = splitTopLevel(inside.replace(/\)\s*$/, ""), ",");
        if (parts.length === 2) {
          tokens[name] = { light: parts[0], dark: parts[1] };
        }
      } else {
        // Capture single-var aliases like `--name: var(--other);` so the
        // contrast checker can follow one or more levels of indirection.
        // Anything more complex (color-mix, multi-arg fallbacks, gradients)
        // is intentionally skipped — those values are not directly contrast-
        // checkable without a CSS engine.
        const al = line.match(/^\s*--([\w-]+):\s*var\(--([\w-]+)\)\s*;?\s*$/);
        if (al) aliases[al[1]] = al[2];
      }
    }

    depth += opens - closes;
    if (depth <= 0) done = true;
  }

  // Resolve aliases. Walk the chain up to a small depth so cycles or missing
  // targets fail safely instead of looping. Resolved tokens are written into
  // the same map so PAIRS lookups treat them like ordinary light-dark()
  // declarations.
  const MAX_DEPTH = 5;
  for (const name of Object.keys(aliases)) {
    let target = aliases[name];
    for (let i = 0; i < MAX_DEPTH; i++) {
      if (tokens[target]) {
        tokens[name] = tokens[target];
        break;
      }
      if (!aliases[target]) break;
      target = aliases[target];
    }
  }

  return tokens;
}

function srgbToLinear(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function relativeLuminance({ r, g, b }) {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function contrastRatio(c1, c2) {
  const l1 = relativeLuminance(c1);
  const l2 = relativeLuminance(c2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function alphaBlend(fg, bg) {
  const a = fg.a;
  return {
    r: Math.round(fg.r * a + bg.r * (1 - a)),
    g: Math.round(fg.g * a + bg.g * (1 - a)),
    b: Math.round(fg.b * a + bg.b * (1 - a)),
    a: 1,
  };
}

function evaluateMode(tokens, mode) {
  const rows = [];
  for (const pair of PAIRS) {
    const fgRaw = tokens[pair.fg]?.[mode];
    const bgRaw = tokens[pair.bg]?.[mode];
    if (!fgRaw || !bgRaw) {
      rows.push({ pair, mode, status: "missing", note: !fgRaw ? `missing --${pair.fg}` : `missing --${pair.bg}` });
      continue;
    }
    const fgParsed = parseColor(fgRaw);
    const bgParsed = parseColor(bgRaw);
    if (!fgParsed || !bgParsed) {
      rows.push({ pair, mode, status: "unparseable", fgRaw, bgRaw });
      continue;
    }
    const fgEff = fgParsed.a < 1 ? alphaBlend(fgParsed, bgParsed) : fgParsed;
    const ratio = contrastRatio(fgEff, bgParsed);
    const passed = ratio >= pair.target;
    let status;
    if (passed) status = "pass";
    else if (pair.advisory) status = "advisory";
    else status = "fail";
    rows.push({ pair, mode, ratio, passed, fgRaw, bgRaw, status });
  }
  return rows;
}

function fmtRatio(r) {
  return r === undefined ? "—" : r.toFixed(2);
}

function buildReport(rows) {
  const lines = [];
  lines.push("# Dark Mode Contrast Report");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Source: \`${path.relative(ROOT, TOKENS_PATH)}\``);
  lines.push("");
  lines.push("WCAG 2.1 targets:");
  lines.push("- 4.5:1 — small text (Level AA)");
  lines.push("- 3.0:1 — large text and UI components (Level AA, SC 1.4.3 / 1.4.11)");
  lines.push("");

  for (const mode of ["light", "dark"]) {
    lines.push(`## ${mode === "light" ? "Light" : "Dark"} mode`);
    lines.push("");
    lines.push("| Foreground | Background | Ratio | Target | Status | Use |");
    lines.push("|---|---|---:|---:|---|---|");
    for (const r of rows.filter((x) => x.mode === mode)) {
      let status;
      if (r.status === "pass") status = "✓";
      else if (r.status === "fail") status = "✗ FAIL";
      else if (r.status === "advisory") status = "⚠ advisory";
      else status = `⚠ ${r.status}`;
      lines.push(
        `| \`--${r.pair.fg}\` | \`--${r.pair.bg}\` | ${fmtRatio(r.ratio)} | ${r.pair.target.toFixed(1)} | ${status} | ${r.pair.kind} |`,
      );
    }
    lines.push("");
  }

  const fails = rows.filter((r) => r.status === "fail");
  const advisories = rows.filter((r) => r.status === "advisory");
  const missing = rows.filter((r) => r.status === "missing");
  const unparseable = rows.filter((r) => r.status === "unparseable");

  lines.push("## Summary");
  lines.push("");
  if (fails.length === 0) {
    lines.push("All required pairs meet WCAG AA. ✓");
  } else {
    lines.push(`**${fails.length} contrast failure${fails.length === 1 ? "" : "s"}** (see ✗ rows above):`);
    lines.push("");
    for (const f of fails) {
      lines.push(
        `- \`${f.mode}\` — \`--${f.pair.fg}\` (${f.fgRaw}) on \`--${f.pair.bg}\` (${f.bgRaw}) = **${fmtRatio(f.ratio)}** (need ${f.pair.target.toFixed(1)} for ${f.pair.kind})`,
      );
    }
  }
  if (advisories.length > 0) {
    lines.push("");
    lines.push(`**${advisories.length} advisory pair${advisories.length === 1 ? "" : "s"}** — decorative, below ${UI_COMPONENT}:1 (informational, not blocking):`);
    lines.push("");
    for (const a of advisories) {
      lines.push(
        `- \`${a.mode}\` — \`--${a.pair.fg}\` on \`--${a.pair.bg}\` = ${fmtRatio(a.ratio)} (${a.pair.kind})`,
      );
    }
  }
  if (missing.length > 0) {
    lines.push("");
    lines.push(`Missing tokens: ${missing.length} (pair definitions reference tokens not declared with light-dark()).`);
  }
  if (unparseable.length > 0) {
    lines.push("");
    lines.push(`Unparseable values: ${unparseable.length} (color-mix or other computed forms — skipped).`);
  }
  lines.push("");
  return lines.join("\n");
}

function main() {
  const css = readFileSync(TOKENS_PATH, "utf8");
  const tokens = parseTokens(css);
  const rows = [...evaluateMode(tokens, "light"), ...evaluateMode(tokens, "dark")];

  const report = buildReport(rows);
  mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, report);

  const fails = rows.filter((r) => r.status === "fail");
  console.log(`Contrast report: ${path.relative(ROOT, REPORT_PATH)}`);
  console.log(`Pairs evaluated: ${rows.length} (light + dark)`);

  if (fails.length === 0) {
    console.log("All pairs meet WCAG AA. ✓");
    process.exit(0);
  }

  console.error(`\n${fails.length} WCAG AA failure${fails.length === 1 ? "" : "s"}:`);
  for (const f of fails) {
    console.error(
      `  ${f.mode.padEnd(5)} --${f.pair.fg} on --${f.pair.bg} = ${fmtRatio(f.ratio)} (need ${f.pair.target.toFixed(1)}) — ${f.pair.kind}`,
    );
  }
  console.error("");
  process.exit(1);
}

main();
