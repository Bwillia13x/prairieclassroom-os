import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// TypeScript does not infer declarations for these repo-local .mjs utility modules.
// They are runtime-covered here by Vitest and stay isolated to test code.
// @ts-expect-error test-only import of repo-local .mjs helper without declarations
const evalSummaryModule = await import("../../../scripts/lib/eval-summary.mjs");
// @ts-expect-error test-only import of repo-local .mjs helper without declarations
const ollamaPreflightModule = await import("../../../scripts/lib/ollama-host-preflight.mjs");
// @ts-expect-error test-only import of repo-local .mjs helper without declarations
const proofStatusModule = await import("../../../scripts/lib/proof-status.mjs");
// @ts-expect-error test-only import of repo-local .mjs helper without declarations
const releaseGateHelpersModule = await import("../../../scripts/lib/release-gate-helpers.mjs");
// @ts-expect-error test-only import of repo-local .mjs helper without declarations
const geminiPreflightModule = await import("../../../scripts/lib/gemini-api-preflight.mjs");
// @ts-expect-error test-only import of repo-local .mjs helper without declarations
const evalBaselineDocModule = await import("../../../scripts/lib/eval-baseline-doc.mjs");
// @ts-expect-error test-only import of repo-local .mjs helper without declarations
const requestLogsModule = await import("../../../scripts/lib/request-logs.mjs");
// @ts-expect-error test-only import of repo-local .mjs helper without declarations
const smokeApiCasesModule = await import("../../../scripts/lib/smoke-api-cases.mjs");
// @ts-expect-error test-only import of repo-local .mjs helper without declarations
const hackathonProofModule = await import("../../../scripts/lib/hackathon-proof.mjs");
// @ts-expect-error test-only import of repo-local .mjs helper without declarations
const systemInventoryModule = await import("../../../scripts/lib/system-inventory.mjs");
// @ts-expect-error test-only import of repo-local .mjs helper without declarations
const memoryAdminModule = await import("../../../scripts/lib/memory-admin.mjs");

const { categorizeEvalFailure, buildEvalFailureSummary } = evalSummaryModule;
const { categorizeOllamaPreflight, parseOllamaListOutput } = ollamaPreflightModule;
const { buildProofStatusMarkdown } = proofStatusModule;
const { parseReleaseGateArgs, releaseGateCommandForMode } = releaseGateHelpersModule;
const { GEMINI_RUN_GUARD_ENV_VAR, assertGeminiRunsAllowed, resolveGeminiConfig } = geminiPreflightModule;
const { buildBaselineMarkdown } = evalBaselineDocModule;
const { pruneRequestLogFiles, summarizeRequestLogs } = requestLogsModule;
const { SUPPORTED_SMOKE_CASES, parseSmokeCaseSelection } = smokeApiCasesModule;
const {
  APPROVED_RERUN_ORDER,
  HOSTED_PROOF_RUN_DIR,
  PROOF_DOC_PATHS,
  buildGeminiReadycheck,
  formatGeminiReadycheckReport,
  validateProofSurfaces,
} = hackathonProofModule;
const { buildSystemInventory, validateCanonicalInventoryClaims, formatInventoryMarkdown, formatApiSurfaceMarkdown } = systemInventoryModule;
const {
  anonymizeClassroomExport,
  purgeClassroomMemory,
} = memoryAdminModule;

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function makeTempDir() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "prairie-ops-tests-"));
  tempDirs.push(dir);
  return dir;
}

function makeConsistentProofSurfaces() {
  const content = [
    `Hosted Gemini proof lane: passing`,
    `- **Latest passing hosted gate:** \`${HOSTED_PROOF_RUN_DIR}\``,
    `Models: gemma-4-26b-a4b-it and gemma-4-31b-it`,
    `Use the hosted lane for synthetic/demo data only.`,
    `The privacy-first future deployment path remains local/self-hosted Gemma 4 via Ollama.`,
    `Primary rerun command: npm run release:gate:gemini`,
  ].join("\n");

  return Object.fromEntries(PROOF_DOC_PATHS.map((docPath: string) => [docPath, content]));
}

describe("ollama host preflight helpers", () => {
  it("parses ollama list output into unique model names", () => {
    const output = [
      "NAME            ID              SIZE   MODIFIED",
      "gemma4:4b       abc123          5 GB   2 days ago",
      "gemma4:27b      def456          17 GB  2 days ago",
      "gemma4:4b       abc123          5 GB   2 days ago",
    ].join("\n");

    expect(parseOllamaListOutput(output)).toEqual(["gemma4:4b", "gemma4:27b"]);
  });

  it("categorizes non-ok preflight states as host_preflight", () => {
    expect(categorizeOllamaPreflight({ status: "missing_models" })).toBe("host_preflight");
    expect(categorizeOllamaPreflight({ status: "ollama_unavailable" })).toBe("host_preflight");
    expect(categorizeOllamaPreflight({ status: "ok" })).toBeNull();
  });
});

describe("release gate helpers", () => {
  it("accepts gemini as a supported inference mode", () => {
    expect(parseReleaseGateArgs(["--inference-mode", "gemini"])).toEqual({
      inferenceMode: "gemini",
      updateBaseline: false,
    });
  });

  it("maps gemini mode to the hosted gate command label", () => {
    expect(releaseGateCommandForMode("gemini")).toBe("release:gate:gemini");
  });

  it("resolves Gemini env and prefers the Prairie-specific API key", () => {
    const config = resolveGeminiConfig({
      PRAIRIE_GEMINI_API_KEY: "prairie-key",
      GEMINI_API_KEY: "fallback-key",
      PRAIRIE_GEMINI_MODEL_ID_LIVE: "custom-live",
    });

    expect(config.authPresent).toBe(true);
    expect(config.apiKey).toBe("prairie-key");
    expect(config.apiKeyEnvVar).toBe("PRAIRIE_GEMINI_API_KEY");
    expect(config.runGuardEnabled).toBe(false);
    expect(config.modelIds.live).toBe("custom-live");
    expect(config.modelIds.planning).toBe("gemma-4-31b-it");
  });

  it("fails fast when a Gemini API key is present but the hosted-run guard is absent", () => {
    expect(() => assertGeminiRunsAllowed({
      PRAIRIE_GEMINI_API_KEY: "prairie-key",
    }, "Hosted Gemini smoke")).toThrow(`${GEMINI_RUN_GUARD_ENV_VAR}=true`);
  });

  it("fails fast when the hosted-run guard is present but the API key is absent", () => {
    expect(() => assertGeminiRunsAllowed({
      [GEMINI_RUN_GUARD_ENV_VAR]: "true",
    }, "Hosted Gemini smoke")).toThrow("Gemini API key is not configured");
  });

  it("allows hosted execution only when both the API key and guard are present", () => {
    const config = assertGeminiRunsAllowed({
      PRAIRIE_GEMINI_API_KEY: "prairie-key",
      [GEMINI_RUN_GUARD_ENV_VAR]: "true",
    });

    expect(config.authPresent).toBe(true);
    expect(config.runGuardEnabled).toBe(true);
  });

  it("keeps mock and Ollama sections when building a Gemini-refreshed baseline doc", () => {
    const markdown = buildBaselineMarkdown({
      mockSection: "## Mock Baseline\n\nmock",
      ollamaSection: "## Ollama Baseline\n\nollama",
      geminiSection: "## Hosted Gemini API Baseline\n\ngemini",
      vertexSection: "## Paid Vertex Endpoint Baseline\n\nvertex",
    });

    expect(markdown).toContain("## Mock Baseline");
    expect(markdown).toContain("## Ollama Baseline");
    expect(markdown).toContain("## Hosted Gemini API Baseline");
    expect(markdown).toContain("## Paid Vertex Endpoint Baseline");
  });

  it("parses a valid smoke case subset", () => {
    expect(parseSmokeCaseSelection({
      PRAIRIE_SMOKE_CASES: "ea-briefing,support-patterns,ea-briefing",
    })).toEqual(["ea-briefing", "support-patterns"]);
  });

  it("rejects unknown smoke case names", () => {
    expect(() => parseSmokeCaseSelection({
      PRAIRIE_SMOKE_CASES: "ea-briefing,unknown-case",
    })).toThrow("Unknown PRAIRIE_SMOKE_CASES value(s): unknown-case");
  });

  it("defaults to the full smoke suite when no selector is provided", () => {
    expect(parseSmokeCaseSelection({})).toEqual(SUPPORTED_SMOKE_CASES);
  });
});

describe("request log helpers", () => {
  it("aggregates route, category, retryable, and injection counts", () => {
    const summary = summarizeRequestLogs([
      {
        timestamp: "2026-04-07T10:00:00.000Z",
        request_id: "req-1",
        route: "POST /api/differentiate",
        status_code: 200,
        category: null,
        retryable: false,
        injection_suspected: false,
      },
      {
        timestamp: "2026-04-07T10:01:00.000Z",
        request_id: "req-2",
        route: "POST /api/differentiate",
        status_code: 502,
        category: "inference",
        detail_code: "inference_timeout",
        retryable: true,
        injection_suspected: true,
      },
      {
        timestamp: "2026-04-07T10:02:00.000Z",
        request_id: "req-3",
        route: "POST /api/support-patterns",
        status_code: 422,
        category: "validation",
        detail_code: "request_body_invalid",
        retryable: false,
        injection_suspected: false,
      },
    ]);

    expect(summary.total_records).toBe(3);
    expect(summary.counts_by_route).toEqual({
      "POST /api/differentiate": 2,
      "POST /api/support-patterns": 1,
    });
    expect(summary.counts_by_category).toEqual({
      uncategorized: 1,
      inference: 1,
      validation: 1,
    });
    expect(summary.retryable).toBe(1);
    expect(summary.non_retryable).toBe(2);
    expect(summary.injection_suspected).toBe(1);
    expect(summary.recent_non_200).toHaveLength(2);
    expect(summary.recent_non_200[0]?.request_id).toBe("req-3");
    expect(summary.recent_non_200[1]?.request_id).toBe("req-2");
  });

  it("prunes only request log files older than the cutoff", async () => {
    const dir = await makeTempDir();
    const oldFile = path.join(dir, "2026-03-01.jsonl");
    const keptFile = path.join(dir, "2026-03-30.jsonl");

    await writeFile(oldFile, "", "utf8");
    await writeFile(keptFile, "", "utf8");

    const removed = await pruneRequestLogFiles(dir, {
      days: 14,
      now: new Date("2026-04-07T12:00:00.000Z"),
    });

    expect(removed).toEqual([oldFile]);
    expect(await readdir(dir)).toEqual(["2026-03-30.jsonl"]);
  });
});

describe("eval failure summary helpers", () => {
  it("categorizes degraded-path failures into fixed buckets", () => {
    expect(categorizeEvalFailure({ failures: ["Inference service timed out"] })).toBe("timeout");
    expect(categorizeEvalFailure({ failures: ["Inference service returned invalid JSON"] })).toBe("parse");
    expect(categorizeEvalFailure({ failures: ["Classroom validation rejected oversized input"] })).toBe("validation");
    expect(categorizeEvalFailure({ failures: ["Pattern report found when cold retrieval should be empty"], category: "retrieval_relevance" })).toBe("retrieval");
  });

  it("includes host preflight failures in the summary output", () => {
    const summary = buildEvalFailureSummary(
      [
        {
          case_id: "diff-012",
          passed: false,
          failures: ["Inference service timed out"],
          endpoint: "POST /api/differentiate",
          prompt_class: "differentiate_material",
          source_file: "evals/cases/diff-012-timeout-retry-exhaustion.json",
        },
      ],
      {
        status: "missing_models",
        artifact_path: "output/host-preflight/example.json",
        summary: "Missing required Ollama models: gemma4:27b",
      },
    );

    expect(summary.total_failures).toBe(2);
    expect(summary.groups.timeout).toHaveLength(1);
    expect(summary.groups.host_preflight).toHaveLength(1);
  });
});

describe("proof status helpers", () => {
  it("reports blocked reference hosts until an Ollama gate passes", () => {
    const markdown = buildProofStatusMarkdown({
      rootDir: "/repo",
      preflights: [
        {
          generated_at: "2026-04-08T02:18:27.924Z",
          artifact_path: "/repo/output/host-preflight/current.json",
          status: "ollama_unavailable",
          summary: "Ollama CLI is not available or `ollama list` failed.",
          host: {
            os: { hostname: "air.local", platform: "darwin", arch: "arm64" },
            hardware: { cpu_model: "Apple M1", total_memory_bytes: 8589934592, total_memory_human: "8.00 GiB" },
          },
        },
      ],
      runSummaries: [
        {
          generated_at: "2026-04-08T02:17:19.635Z",
          completed_at: "2026-04-08T02:17:40.000Z",
          inference_mode: "mock",
          status: "passed",
          run_dir: "output/release-gate/mock-pass",
          host: {
            os: { hostname: "air.local", platform: "darwin", arch: "arm64" },
            hardware: { cpu_model: "Apple M1", total_memory_bytes: 8589934592, total_memory_human: "8.00 GiB" },
          },
        },
      ],
    });

    expect(markdown).toContain("Blocked pending a viable zero-cost Ollama host.");
    expect(markdown).toContain("Blocked Reference Hosts");
    expect(markdown).toContain("air.local");
    expect(markdown).toContain("Ollama CLI is not available");
  });

  it("reports a proven host when an Ollama gate passes", () => {
    const markdown = buildProofStatusMarkdown({
      rootDir: "/repo",
      preflights: [
        {
          generated_at: "2026-04-08T03:00:00.000Z",
          artifact_path: "/repo/output/host-preflight/viable.json",
          status: "ok",
          summary: "Required Ollama Gemma 4 models are available locally.",
          host: {
            os: { hostname: "workstation.local", platform: "linux", arch: "x64" },
            hardware: { cpu_model: "Ryzen", total_memory_bytes: 34359738368, total_memory_human: "32.00 GiB" },
          },
        },
      ],
      runSummaries: [
        {
          generated_at: "2026-04-08T03:05:00.000Z",
          completed_at: "2026-04-08T03:20:00.000Z",
          inference_mode: "mock",
          status: "passed",
          run_dir: "output/release-gate/mock-pass",
          host: {
            os: { hostname: "workstation.local", platform: "linux", arch: "x64" },
            hardware: { cpu_model: "Ryzen", total_memory_bytes: 34359738368, total_memory_human: "32.00 GiB" },
          },
        },
        {
          generated_at: "2026-04-08T03:21:00.000Z",
          completed_at: "2026-04-08T03:40:00.000Z",
          inference_mode: "ollama",
          status: "passed",
          run_dir: "output/release-gate/ollama-pass",
          host: {
            os: { hostname: "workstation.local", platform: "linux", arch: "x64" },
            hardware: { cpu_model: "Ryzen", total_memory_bytes: 34359738368, total_memory_human: "32.00 GiB" },
          },
        },
      ],
    });

    expect(markdown).toContain("Proven on at least one zero-cost host.");
    expect(markdown).toContain("Proven Hosts");
    expect(markdown).toContain("workstation.local");
    expect(markdown).toContain("output/release-gate/ollama-pass");
  });

  it("uses the failed gate summary when preflight passed but the Ollama gate failed later", () => {
    const markdown = buildProofStatusMarkdown({
      rootDir: "/repo",
      preflights: [
        {
          generated_at: "2026-04-08T03:00:00.000Z",
          artifact_path: "/repo/output/host-preflight/viable.json",
          status: "ok",
          summary: "Required Ollama Gemma 4 models are available locally.",
          host: {
            os: { hostname: "workstation.local", platform: "linux", arch: "x64" },
            hardware: { cpu_model: "Ryzen", total_memory_bytes: 34359738368, total_memory_human: "32.00 GiB" },
          },
        },
      ],
      runSummaries: [
        {
          generated_at: "2026-04-08T03:05:00.000Z",
          completed_at: "2026-04-08T03:20:00.000Z",
          inference_mode: "mock",
          status: "passed",
          run_dir: "output/release-gate/mock-pass",
          host: {
            os: { hostname: "workstation.local", platform: "linux", arch: "x64" },
            hardware: { cpu_model: "Ryzen", total_memory_bytes: 34359738368, total_memory_human: "32.00 GiB" },
          },
        },
        {
          generated_at: "2026-04-08T03:21:00.000Z",
          failed_at: "2026-04-08T03:27:00.000Z",
          inference_mode: "ollama",
          status: "failed",
          summary_path: "/repo/output/release-gate/ollama-failed/summary.json",
          ollama_preflight_artifact: "output/host-preflight/viable.json",
          host_preflight_status: "ok",
          error_message: "75-ollama-evals failed with code 1.",
          host: {
            os: { hostname: "workstation.local", platform: "linux", arch: "x64" },
            hardware: { cpu_model: "Ryzen", total_memory_bytes: 34359738368, total_memory_human: "32.00 GiB" },
          },
        },
      ],
    });

    expect(markdown).toContain("75-ollama-evals failed with code 1.");
    expect(markdown).toContain("output/release-gate/ollama-failed/summary.json");
    expect(markdown).not.toContain("output/host-preflight/viable.json` |");
  });
});

describe("system inventory helpers", () => {
  it("derives the current UI and prompt surface from code", async () => {
    const rootDir = path.resolve(__dirname, "../../..");
    const inventory = await buildSystemInventory(rootDir);

    expect(inventory.ui.panel_count).toBe(12);
    expect(inventory.ui.panels.map((panel: { label: string }) => panel.label)).toContain("Usage Insights");
    // 2026-04-19 OPS audit phase 1.1: "EA Load" → "EA Load Balance" (full nav label).
    expect(inventory.ui.panels.map((panel: { label: string }) => panel.label)).toContain("EA Load Balance");
    expect(inventory.prompts.prompt_class_count).toBe(13);
    expect(inventory.prompts.live_count).toBe(7);
    expect(inventory.prompts.planning_count).toBe(6);
    expect(inventory.prompts.classes.map((entry: { name: string }) => entry.name)).toContain("extract_worksheet");
    expect(inventory.prompts.classes.map((entry: { name: string }) => entry.name)).toContain("balance_ea_load");
    expect(inventory.api.endpoint_count).toBe(52);
    expect(inventory.api.endpoints).toEqual(expect.arrayContaining([
      expect.objectContaining({ method: "PUT", path: "/api/classrooms/:id/schedule" }),
      expect.objectContaining({ method: "GET", path: "/api/curriculum/subjects", role_scope: null }),
      expect.objectContaining({ method: "GET", path: "/api/curriculum/entries/:entryId", role_scope: null }),
      expect.objectContaining({ method: "POST", path: "/api/family-message/approve" }),
      expect.objectContaining({ method: "GET", path: "/api/classrooms/:id/student-summary", role_scope: ["teacher"] }),
      expect.objectContaining({ method: "GET", path: "/api/today/:classroomId", role_scope: ["teacher", "ea", "substitute"] }),
    ]));
    expect(inventory.evals.case_count).toBeGreaterThanOrEqual(90);
  });

  it("flags canonical doc inventory drift", async () => {
    const rootDir = await makeTempDir();
    await mkdir(path.join(rootDir, "docs"), { recursive: true });
    await writeFile(path.join(rootDir, "README.md"), "teacher command center with 10 primary panels", "utf8");
    await writeFile(path.join(rootDir, "CLAUDE.md"), [
      "The repo has 12 model-routed prompt classes, a real web UI with 10 teacher-facing panels.",
      "### Model-routed prompt classes",
      "",
      "- `differentiate_material`",
      "",
      "### Additional deterministic",
      "",
      "### Primary UI panels",
      "",
      "- Today",
      "",
      "`extract_worksheet`",
    ].join("\n"), "utf8");
    await writeFile(path.join(rootDir, "docs/architecture.md"), "**Live tier (7 classes)**\n\n**Planning tier (5 classes)**", "utf8");
    const fakeInventory = {
      ui: {
        panel_count: 11,
        panels: [{ label: "Today" }, { label: "Usage Insights" }],
      },
      prompts: {
        prompt_class_count: 2,
        live_count: 1,
        planning_count: 1,
        classes: [{ name: "differentiate_material" }, { name: "extract_worksheet" }],
      },
      api: {
        mount_count: 1,
        endpoint_count: 1,
        endpoints: [{ method: "GET", path: "/api/example", route_file: "services/orchestrator/routes/example.ts" }],
      },
    };
    await writeFile(path.join(rootDir, "docs/prompt-contracts.md"), "", "utf8");
    await writeFile(path.join(rootDir, "docs/development-gaps.md"), "", "utf8");
    await writeFile(path.join(rootDir, "docs/api-surface.md"), formatApiSurfaceMarkdown(fakeInventory), "utf8");

    const validation = await validateCanonicalInventoryClaims(rootDir, fakeInventory);

    expect(validation.ok).toBe(false);
    expect(validation.issues).toEqual(expect.arrayContaining([
      expect.stringContaining("README.md primary panel count is 10"),
      expect.stringContaining("CLAUDE.md teacher-facing panel count is 10"),
      expect.stringContaining("CLAUDE.md prompt class count is 12"),
      expect.stringContaining("CLAUDE.md prompt-class list missing: extract_worksheet"),
      expect.stringContaining("CLAUDE.md panel list missing: Usage Insights"),
    ]));
  });

  it("formats a markdown inventory artifact", async () => {
    const rootDir = path.resolve(__dirname, "../../..");
    const inventory = await buildSystemInventory(rootDir);
    const markdown = formatInventoryMarkdown(inventory);

    expect(markdown).toContain("# System Inventory");
    expect(markdown).toContain("- Primary panels: 12");
    expect(markdown).toContain("- Exact endpoints: 52");
    expect(markdown).toContain("| `prepare_tomorrow_plan` | planning | yes | yes | yes |");
  });

  it("formats a deterministic API surface artifact", async () => {
    const rootDir = path.resolve(__dirname, "../../..");
    const inventory = await buildSystemInventory(rootDir);
    const markdown = formatApiSurfaceMarkdown(inventory);

    expect(markdown).toContain("# API Surface Inventory");
    expect(markdown).toContain("- Exact endpoints: 52");
    expect(markdown).toContain("| GET | `/api/curriculum/subjects` | `services/orchestrator/routes/curriculum.ts` | open/demo metadata | none |");
    expect(markdown).toContain("| POST | `/api/family-message/approve` | `services/orchestrator/routes/family-message.ts` | classroom-code | teacher |");
    expect(markdown).toContain("| GET | `/api/today/:classroomId` | `services/orchestrator/routes/today.ts` | classroom-code | teacher, ea, substitute |");
  });
});

describe("memory admin helpers", () => {
  it("structurally anonymizes classroom and student references", () => {
    const exported = {
      generated_at: "2026-04-11T10:00:00.000Z",
      export_type: "classroom-memory",
      classroom_id: "room-one",
      source_db: "/tmp/room-one.sqlite",
      table_counts: {
        interventions: 1,
        feedback: 1,
      },
      tables: {
        interventions: [
          {
            record_id: "rec-1",
            classroom_id: "room-one",
            student_refs: ["Ada", "Ben"],
            record_json: {
              classroom_id: "room-one",
              student_refs: ["Ada"],
              observation: "Ada and Ben worked together during math.",
            },
          },
        ],
        feedback: [
          {
            id: "fb-1",
            classroom_id: "room-one",
            comment: "Ada follow-up was clear.",
          },
        ],
      },
    };
    const anonymized = anonymizeClassroomExport(exported);
    const serialized = JSON.stringify(anonymized);

    expect(anonymized.classroom_id).toBe("classroom-001");
    expect(anonymized.anonymization.student_ref_count).toBe(2);
    expect(anonymized.source_db).toBe("redacted-source.sqlite");
    expect(serialized).toContain("student-001");
    expect(serialized).not.toContain("room-one");
    expect(serialized).not.toContain("Ada");
    expect(serialized).not.toContain("Ben");
  });

  it("refuses and then performs confirmed classroom memory purge", async () => {
    const dir = await makeTempDir();
    const dbPath = path.join(dir, "room-one.sqlite");
    const walPath = `${dbPath}-wal`;
    const shmPath = `${dbPath}-shm`;
    await writeFile(dbPath, "", "utf8");
    await writeFile(walPath, "", "utf8");
    await writeFile(shmPath, "", "utf8");

    await expect(purgeClassroomMemory({ dbPath })).rejects.toThrow("--confirm");
    const removed = await purgeClassroomMemory({ dbPath, confirm: true });
    expect(removed).toEqual([dbPath, walPath, shmPath]);
    expect(await readdir(dir)).toEqual([]);
  });
});

describe("hackathon proof consistency helpers", () => {
  it("passes when all proof surfaces agree on the passing hosted state", () => {
    const result = validateProofSurfaces(makeConsistentProofSurfaces());

    expect(result).toEqual({
      ok: true,
      issues: [],
    });
  });

  it("fails when a proof surface drifts back to the old partial hosted state", () => {
    const surfaces = makeConsistentProofSurfaces();
    surfaces["README.md"] = `${surfaces["README.md"]}\nHosted Gemini proof lane: partial`;

    const result = validateProofSurfaces(surfaces);

    expect(result.ok).toBe(false);
    expect(result.issues.join("\n")).toContain("stale hosted-proof language");
  });

  it("fails when a proof surface drifts to a different hosted artifact path", () => {
    const surfaces = makeConsistentProofSurfaces();
    surfaces["docs/hackathon-proof-brief.md"] = surfaces["docs/hackathon-proof-brief.md"].replace(
      HOSTED_PROOF_RUN_DIR,
      "output/release-gate/2099-01-01T00-00-00-000Z-99999",
    );

    const result = validateProofSurfaces(surfaces);

    expect(result.ok).toBe(false);
    expect(result.issues.join("\n")).toContain("missing hosted proof artifact path");
  });
});

describe("gemini readycheck helpers", () => {
  it("fails when the API key is missing", () => {
    const report = buildGeminiReadycheck({
      env: {},
      surfaces: makeConsistentProofSurfaces(),
      hostedProofSummary: null,
    });

    expect(report.exitCode).toBe(1);
    expect(report.issues).toContain("Gemini API key is missing.");
  });

  it("fails when the run guard is missing", () => {
    const report = buildGeminiReadycheck({
      env: {
        PRAIRIE_GEMINI_API_KEY: "test-key",
      },
      surfaces: makeConsistentProofSurfaces(),
      hostedProofSummary: null,
    });

    expect(report.exitCode).toBe(1);
    expect(report.issues).toContain("Hosted Gemini runs are disabled.");
  });

  it("succeeds only when both the API key and run guard are present", () => {
    const report = buildGeminiReadycheck({
      env: {
        PRAIRIE_GEMINI_API_KEY: "test-key",
        PRAIRIE_ENABLE_GEMINI_RUNS: "true",
      },
      surfaces: makeConsistentProofSurfaces(),
      hostedProofSummary: {
        status: "passed",
      },
    });

    expect(report.exitCode).toBe(0);
    expect(report.apiKeyPresent).toBe(true);
    expect(report.runGuardEnabled).toBe(true);
  });

  it("prints the exact approved rerun order without starting any service", () => {
    const report = buildGeminiReadycheck({
      env: {
        PRAIRIE_GEMINI_API_KEY: "test-key",
      },
      surfaces: makeConsistentProofSurfaces(),
      hostedProofSummary: {
        status: "passed",
      },
    });

    const output = formatGeminiReadycheckReport(report);

    expect(output).toContain(`Latest hosted artifact: ${HOSTED_PROOF_RUN_DIR}`);
    expect(output).toContain("Latest hosted status: passed");
    APPROVED_RERUN_ORDER.forEach((step: string, index: number) => {
      const expectedLine = `${index + 1}. ${step}`;
      expect(output).toContain(expectedLine);
    });
  });
});
