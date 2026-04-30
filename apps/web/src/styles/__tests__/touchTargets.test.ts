import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const srcDir = resolve(__dirname, "../..");
const stylesDir = resolve(__dirname, "..");

function read(relativePath: string): string {
  return readFileSync(resolve(srcDir, relativePath), "utf8");
}

const shellCss = read("styles/shell.css");
const nothingThemeCss = read("styles/nothing-theme.css");
const dataVizCss = read("components/DataVisualizations.css");
const outputFeedbackCss = read("components/OutputFeedback.css");
const popoverCss = read("components/popover/Popover.css");
const indexHtml = readFileSync(resolve(stylesDir, "../../index.html"), "utf8");

describe("mobile release polish", () => {
  it("keeps the shell wordmark on the preloaded accessible reading face", () => {
    expect(indexHtml).toMatch(/href="\/fonts\/atkinson-hyperlegible-400\.ttf"/);
    expect(indexHtml).not.toMatch(/instrument-sans-500\.woff2/);
    expect(shellCss).toMatch(
      /\.brand-mark__wordmark\s*{[^}]*font-family:\s*var\(--font-sans\)[^}]*letter-spacing:\s*0/s,
    );
  });

  it("keeps phone shell and icon controls at the 44px touch tier", () => {
    expect(shellCss).toMatch(
      /@media\s*\(max-width:\s*600px\)[\s\S]*\.shell-classroom-pill\s*{[^}]*min-height:\s*var\(--control-h-md\)/,
    );
    expect(nothingThemeCss).toMatch(
      /@media\s*\(pointer:\s*coarse\),\s*\(max-width:\s*640px\)[\s\S]*\.page-intro-info__trigger[\s\S]*min-height:\s*var\(--control-h-md\)/,
    );
  });

  it("raises dense chart and form affordances to touch size on phones", () => {
    expect(dataVizCss).toMatch(
      /@media\s*\(pointer:\s*coarse\),\s*\(max-width:\s*640px\)[\s\S]*\.viz-composition__header-action\s*{[^}]*min-height:\s*var\(--control-h-md\)/,
    );
    expect(dataVizCss).toMatch(
      /@media\s*\(pointer:\s*coarse\),\s*\(max-width:\s*640px\)[\s\S]*\.viz-complexity-cal__cell--clickable\s*{[^}]*min-height:\s*var\(--control-h-md\)/,
    );
    expect(outputFeedbackCss).toMatch(/\.output-feedback-submit[\s\S]*min-height:\s*var\(--control-h-md\)/);
    expect(popoverCss).toMatch(/\.popover-menu-item\s*{[^}]*min-height:\s*var\(--control-h-md\)/s);
  });
});
