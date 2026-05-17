import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DOC_UPDATES = [
  {
    relPath: "docs/hackathon-submission-checklist.md",
    pattern: /^-\s*Live demo deploy:/i,
    buildLine: ({ previousLine, evidenceSentence }) => replaceCellularStatus({
      previousLine,
      evidenceSentence,
      relPath: "docs/hackathon-submission-checklist.md",
    }),
  },
  {
    relPath: "docs/public-demo-operations.md",
    pattern: /^-\s*\*\*(Not yet complete|Verified):\*\*.*(public video URL|Kaggle URL|true cellular-browser smoke)/i,
    buildLine: ({ previousLine, evidenceSentence }) => buildPublicDemoOperationsLine({
      previousLine,
      evidenceSentence,
      relPath: "docs/public-demo-operations.md",
    }),
  },
];

const CELLULAR_PENDING_PATTERNS = [
  /true cellular-browser smoke is still pending\./i,
  /true cellular-browser smoke remains pending\./i,
  /public video URL, Kaggle URL, and true cellular-browser smoke are still pending\./i,
];

const CELLULAR_VERIFIED_PATTERN = /true cellular-browser smoke verified[^.]*\./i;

export function validateCellularSmokeEvidence({
  checkedAt,
  device,
  browser,
  carrier,
  screenshots,
  notes,
  result,
} = {}) {
  const issues = [];
  if (!checkedAt) issues.push("Missing --checked-at");
  if (!device) issues.push("Missing --device");
  if (!browser) issues.push("Missing --browser");
  if (!carrier) issues.push("Missing --carrier");
  if (!screenshots) issues.push("Missing --screenshots");
  if (!notes) issues.push("Missing --notes");
  if (!result) {
    issues.push("Missing --result");
  } else if (!/^pass(?:ed)?$/i.test(result)) {
    issues.push(`--result must be pass/passed to close cellular smoke evidence: ${result}`);
  }
  return issues;
}

export function buildCellularSmokeEvidenceSentence({
  checkedAt,
  device,
  browser,
  carrier,
  screenshots = "",
  notes = "",
}) {
  const details = [
    `True cellular-browser smoke verified on ${cleanInline(device)}`,
    `via ${cleanInline(carrier)}`,
    `using ${cleanInline(browser)}`,
    `at ${cleanInline(checkedAt)}`,
  ];
  if (screenshots) details.push(`screenshots: ${cleanInline(screenshots)}`);
  if (notes) details.push(`notes: ${cleanInline(notes)}`);
  return `${details.join("; ")}.`;
}

export async function applyCellularSmokeEvidence({
  rootDir = process.cwd(),
  checkedAt,
  device,
  browser,
  carrier,
  screenshots = "",
  notes = "",
  result = "",
  dryRun = false,
} = {}) {
  const issues = validateCellularSmokeEvidence({
    checkedAt,
    device,
    browser,
    carrier,
    screenshots,
    notes,
    result,
  });
  if (issues.length > 0) {
    throw new Error(issues.join("\n"));
  }

  const evidenceSentence = buildCellularSmokeEvidenceSentence({
    checkedAt,
    device,
    browser,
    carrier,
    screenshots,
    notes,
  });
  const files = new Map();
  const changes = [];

  for (const update of DOC_UPDATES) {
    const absolutePath = path.join(rootDir, update.relPath);
    let file = files.get(update.relPath);
    if (!file) {
      file = {
        relPath: update.relPath,
        absolutePath,
        originalContent: await readFile(absolutePath, "utf8"),
        content: "",
      };
      file.content = file.originalContent;
      files.set(update.relPath, file);
    }

    const resultForLine = replaceMatchingLine({
      content: file.content,
      pattern: update.pattern,
      buildReplacement: (previousLine) => update.buildLine({ previousLine, evidenceSentence }),
      relPath: update.relPath,
    });

    file.content = resultForLine.content;
    if (resultForLine.previousLine !== resultForLine.nextLine) {
      changes.push({
        relPath: update.relPath,
        previousLine: resultForLine.previousLine,
        nextLine: resultForLine.nextLine,
      });
    }
  }

  if (!dryRun) {
    for (const file of files.values()) {
      if (file.content !== file.originalContent) {
        await writeFile(file.absolutePath, file.content, "utf8");
      }
    }
  }

  return { dryRun, changes };
}

function cleanInline(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/[.;\s]+$/g, "")
    .trim();
}

function replaceMatchingLine({ content, pattern, buildReplacement, relPath }) {
  const lines = content.split(/\r?\n/);
  const matches = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => pattern.test(line));

  if (matches.length !== 1) {
    throw new Error(`${relPath}: expected exactly one matching line, found ${matches.length}`);
  }

  const [{ index, line: previousLine }] = matches;
  const replacement = buildReplacement(previousLine);
  lines[index] = replacement;

  return {
    content: lines.join("\n"),
    previousLine,
    nextLine: replacement,
  };
}

function replaceCellularStatus({ previousLine, evidenceSentence, relPath }) {
  let nextLine = previousLine.replace(CELLULAR_VERIFIED_PATTERN, evidenceSentence);
  if (nextLine !== previousLine) return nextLine;

  for (const pattern of CELLULAR_PENDING_PATTERNS) {
    nextLine = nextLine.replace(pattern, (match) => {
      if (/public video URL, Kaggle URL/i.test(match)) {
        return `public video URL and Kaggle URL remain pending. ${evidenceSentence}`;
      }
      return evidenceSentence;
    });
  }

  if (nextLine === previousLine) {
    throw new Error(`${relPath}: matching line did not contain cellular smoke pending or verified text`);
  }
  return nextLine;
}

function buildPublicDemoOperationsLine({ previousLine, evidenceSentence, relPath }) {
  let nextLine = previousLine.replace(CELLULAR_VERIFIED_PATTERN, evidenceSentence);
  if (nextLine !== previousLine) return nextLine;

  nextLine = previousLine.replace(
    /^-\s*\*\*Not yet complete:\*\* public video URL, Kaggle URL, and true cellular-browser smoke are still pending\./i,
    `- **Not yet complete:** public video URL and Kaggle URL remain pending. ${evidenceSentence}`,
  );
  if (nextLine !== previousLine) return nextLine;

  nextLine = previousLine.replace(
    /^-\s*\*\*Not yet complete:\*\* true cellular-browser smoke remains pending\./i,
    "- **Verified:** public video URL, Kaggle URL, and true cellular-browser smoke are recorded.",
  );
  if (nextLine !== previousLine) {
    return nextLine.replace(
      / Vercel production stores/i,
      ` ${evidenceSentence} Vercel production stores`,
    );
  }

  throw new Error(`${relPath}: matching line did not contain cellular smoke pending or verified text`);
}
