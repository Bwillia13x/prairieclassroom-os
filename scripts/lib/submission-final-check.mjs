import fs from "node:fs";
import path from "node:path";

export const PUBLICATION_PLACEHOLDERS = [
  {
    file: "docs/submission-copy-pack.md",
    patterns: [
      /add public deployed URL/i,
      /add Kaggle writeup URL/i,
      /after public clone test/i,
    ],
  },
  {
    file: "docs/kaggle-paste-block.md",
    patterns: [
      /add public deployed URL/i,
      /add public YouTube URL/i,
    ],
  },
  {
    file: "docs/hackathon-submission-checklist.md",
    patterns: [
      /Live demo deploy: NOT YET DEPLOYED/i,
      /external service creation, secret entry, and cellular smoke are still pending/i,
      /true cellular-browser smoke is still pending/i,
      /true cellular-browser smoke remains pending/i,
      /still fails on publication placeholders/i,
      /upload\/public YouTube URL still pending/i,
      /\*\*Video:\*\* public YouTube link/i,
      /missing public video and Kaggle writeup URLs/i,
      /Public video and Kaggle submission URLs are still missing/i,
      /blocked until the public video and Kaggle URLs are real/i,
    ],
  },
  {
    file: "docs/public-demo-operations.md",
    patterns: [
      /public video URL, Kaggle URL, and true cellular-browser smoke are still pending/i,
      /true cellular-browser smoke is still pending/i,
      /true cellular-browser smoke remains pending/i,
      /missing public YouTube and Kaggle writeup\/submission URLs/i,
      /missing public video URL and missing Kaggle writeup URL/i,
      /blocked until the public video URL and Kaggle writeup URL are real/i,
    ],
  },
];

export const CELLULAR_SMOKE_EVIDENCE = [
  {
    file: "docs/hackathon-submission-checklist.md",
    patterns: [
      /smoked from external network and cellular/i,
      /cellular-browser smoke (?:passed|verified|recorded|complete|completed)/i,
    ],
  },
  {
    file: "docs/public-demo-operations.md",
    patterns: [
      /cellular-browser smoke (?:passed|verified|recorded|complete|completed)/i,
      /cellular smoke (?:passed|verified|recorded|complete|completed)/i,
    ],
  },
];

const URL_PATTERN = /https?:\/\/[^\s)`\]]+/gi;
const DEFAULT_LINK_HEALTH_TIMEOUT_MS = 10_000;

export const REQUIRED_PUBLICATION_LINKS = [
  {
    file: "docs/submission-copy-pack.md",
    label: "Code",
    linePattern: /^-\s*Code:/i,
    description: "public GitHub repository URL",
    validators: [isPrairieClassroomGithubUrl],
  },
  {
    file: "docs/submission-copy-pack.md",
    label: "Live demo",
    linePattern: /^-\s*Live demo:/i,
    description: "public non-local live demo URL",
    validators: [isPublicHttpUrl, isNotRepositoryOrVideoUrl],
  },
  {
    file: "docs/submission-copy-pack.md",
    label: "Kaggle writeup",
    linePattern: /^-\s*Kaggle writeup:/i,
    description: "public Kaggle writeup URL",
    validators: [isKaggleUrl],
  },
  {
    file: "docs/kaggle-paste-block.md",
    label: "Public code repository",
    linePattern: /^-\s*Public code repository:/i,
    description: "public GitHub repository URL",
    validators: [isPrairieClassroomGithubUrl],
  },
  {
    file: "docs/kaggle-paste-block.md",
    label: "Public live demo",
    linePattern: /^-\s*Public live demo:/i,
    description: "public non-local live demo URL",
    validators: [isPublicHttpUrl, isNotRepositoryOrVideoUrl],
  },
  {
    file: "docs/kaggle-paste-block.md",
    label: "Public video",
    linePattern: /^-\s*Public video:/i,
    description: "public YouTube video URL",
    validators: [isYouTubeUrl],
  },
];

export function findPublicationPlaceholders({
  rootDir = process.cwd(),
  specs = PUBLICATION_PLACEHOLDERS,
} = {}) {
  const issues = new Set();

  for (const entry of specs) {
    const absolutePath = path.join(rootDir, entry.file);
    const content = fs.readFileSync(absolutePath, "utf8");
    const lines = content.split(/\r?\n/);

    for (const pattern of entry.patterns) {
      lines.forEach((line, index) => {
        if (pattern.test(line)) {
          issues.add(`${entry.file}:${index + 1}: ${line.trim()}`);
        }
      });
    }
  }

  return Array.from(issues);
}

function extractUrls(line) {
  return Array.from(line.matchAll(URL_PATTERN), (match) => match[0].replace(/[.,;:]+$/, ""));
}

function safeParseUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isPublicHttpUrl(value) {
  const url = safeParseUrl(value);
  if (!url || !["http:", "https:"].includes(url.protocol)) return false;
  const host = url.hostname.toLowerCase();
  return ![
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
  ].includes(host) && !host.endsWith(".local");
}

function isPrairieClassroomGithubUrl(value) {
  const url = safeParseUrl(value);
  return Boolean(
    url
    && url.hostname.toLowerCase() === "github.com"
    && /^\/Bwillia13x\/prairieclassroom-os\/?$/i.test(url.pathname),
  );
}

function isKaggleUrl(value) {
  const url = safeParseUrl(value);
  if (!url) return false;
  const host = url.hostname.toLowerCase();
  return host === "kaggle.com" || host.endsWith(".kaggle.com");
}

function isYouTubeUrl(value) {
  const url = safeParseUrl(value);
  if (!url) return false;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  return host === "youtube.com" || host === "youtu.be";
}

function isNotRepositoryOrVideoUrl(value) {
  const url = safeParseUrl(value);
  if (!url) return false;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  return ![
    "github.com",
    "youtube.com",
    "youtu.be",
    "kaggle.com",
  ].includes(host);
}

function findMatchingLine(lines, linePattern) {
  return lines.findIndex((line) => linePattern.test(line));
}

export function extractPublicationLinks({
  rootDir = process.cwd(),
  specs = REQUIRED_PUBLICATION_LINKS,
} = {}) {
  const links = [];

  for (const spec of specs) {
    const absolutePath = path.join(rootDir, spec.file);
    const content = fs.readFileSync(absolutePath, "utf8");
    const lines = content.split(/\r?\n/);
    const lineIndex = findMatchingLine(lines, spec.linePattern);

    if (lineIndex === -1) {
      continue;
    }

    const line = lines[lineIndex];
    const urls = extractUrls(line);
    const url = urls.find((candidate) => spec.validators.every((validator) => validator(candidate)));
    if (url) {
      links.push({
        file: spec.file,
        lineNumber: lineIndex + 1,
        label: spec.label,
        description: spec.description,
        url,
      });
    }
  }

  return links;
}

export function findPublicationLinkIssues({
  rootDir = process.cwd(),
  specs = REQUIRED_PUBLICATION_LINKS,
} = {}) {
  const issues = [];

  for (const spec of specs) {
    const absolutePath = path.join(rootDir, spec.file);
    const content = fs.readFileSync(absolutePath, "utf8");
    const lines = content.split(/\r?\n/);
    const lineIndex = findMatchingLine(lines, spec.linePattern);

    if (lineIndex === -1) {
      issues.push(`${spec.file}: missing ${spec.label} line (${spec.description})`);
      continue;
    }

    const line = lines[lineIndex];
    const urls = extractUrls(line);
    const hasValidUrl = urls.some((url) => spec.validators.every((validator) => validator(url)));
    if (!hasValidUrl) {
      issues.push(`${spec.file}:${lineIndex + 1}: ${spec.label} must include ${spec.description}: ${line.trim()}`);
    }
  }

  return issues;
}

export function findCellularSmokeEvidenceIssues({
  rootDir = process.cwd(),
  evidenceSpecs = CELLULAR_SMOKE_EVIDENCE,
} = {}) {
  for (const spec of evidenceSpecs) {
    const absolutePath = path.join(rootDir, spec.file);
    if (!fs.existsSync(absolutePath)) continue;

    const content = fs.readFileSync(absolutePath, "utf8");
    if (spec.patterns.some((pattern) => pattern.test(content))) {
      return [];
    }
  }

  return [
    "Cellular browser smoke evidence is missing: record a real cellular-device pass in docs/hackathon-submission-checklist.md or docs/public-demo-operations.md.",
  ];
}

async function fetchUrlStatus(fetchImpl, url, timeoutMs) {
  const requestOptions = {
    method: "HEAD",
    redirect: "follow",
    signal: globalThis.AbortSignal.timeout(timeoutMs),
  };
  let response = await fetchImpl(url, requestOptions);
  if (response.status === 405 || response.status === 403) {
    response = await fetchImpl(url, {
      ...requestOptions,
      method: "GET",
    });
  }
  return response;
}

export async function findPublicationLinkHealthIssues({
  rootDir = process.cwd(),
  specs = REQUIRED_PUBLICATION_LINKS,
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_LINK_HEALTH_TIMEOUT_MS,
} = {}) {
  const issues = [];
  if (typeof fetchImpl !== "function") {
    return ["Public-link health check cannot run because fetch is unavailable in this Node runtime."];
  }

  const links = extractPublicationLinks({ rootDir, specs });
  const seenUrls = new Set();
  for (const link of links) {
    if (seenUrls.has(link.url)) continue;
    seenUrls.add(link.url);
    try {
      const response = await fetchUrlStatus(fetchImpl, link.url, timeoutMs);
      if (!response.ok) {
        issues.push(`${link.file}:${link.lineNumber}: ${link.label} URL returned HTTP ${response.status}: ${link.url}`);
      }
    } catch (error) {
      issues.push(`${link.file}:${link.lineNumber}: ${link.label} URL was not reachable: ${link.url} (${error instanceof Error ? error.message : String(error)})`);
    }
  }

  return issues;
}

export function validatePublicationPlaceholders(options = {}) {
  const issues = [
    ...findPublicationPlaceholders(options),
    ...findPublicationLinkIssues(options),
    ...findCellularSmokeEvidenceIssues(options),
  ];
  return { ok: issues.length === 0, issues };
}

export async function validatePublicationReadiness(options = {}) {
  const staticResult = validatePublicationPlaceholders(options);
  if (!staticResult.ok) return staticResult;

  const healthIssues = await findPublicationLinkHealthIssues(options);
  return { ok: healthIssues.length === 0, issues: healthIssues };
}
