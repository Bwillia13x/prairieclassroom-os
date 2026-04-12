import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const TARGETS = [
  path.join(ROOT, "README.md"),
  path.join(ROOT, "docs"),
];

const BANNED_PATTERNS = [
  {
    label: "unsupported human validation claim",
    pattern: /\bteachers tested it\b/i,
  },
  {
    label: "unsupported human validation claim",
    pattern: /\beas tested it\b/i,
  },
  {
    label: "unsupported human validation claim",
    pattern: /\bparents approved messages\b/i,
  },
  {
    label: "unsupported human validation claim",
    pattern: /\bteacher\/ea\/parent validation\b/i,
  },
];

function walk(filePath, results) {
  const stats = statSync(filePath);
  if (stats.isDirectory()) {
    for (const entry of readdirSync(filePath)) {
      walk(path.join(filePath, entry), results);
    }
    return;
  }

  if (!/\.(md|mdx|txt)$/i.test(filePath)) {
    return;
  }

  results.push(filePath);
}

function findViolations(filePath) {
  const contents = readFileSync(filePath, "utf8");
  const lines = contents.split("\n");
  const violations = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    for (const rule of BANNED_PATTERNS) {
      if (rule.pattern.test(line)) {
        violations.push({
          line: index + 1,
          label: rule.label,
          text: line.trim(),
        });
      }
    }
  }

  return violations;
}

const files = [];
for (const target of TARGETS) {
  walk(target, files);
}

const violations = files.flatMap((filePath) =>
  findViolations(filePath).map((violation) => ({ filePath, ...violation })),
);

if (violations.length > 0) {
  console.error("Claims check failed. Unsupported public claims found:");
  for (const violation of violations) {
    console.error(
      `- ${path.relative(ROOT, violation.filePath)}:${violation.line} [${violation.label}] ${violation.text}`,
    );
  }
  process.exit(1);
}

console.log("Claims check passed.");
