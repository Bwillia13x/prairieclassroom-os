import { spawn } from "node:child_process";
import { createWriteStream, existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildBaselineMarkdown } from "./lib/eval-baseline-doc.mjs";
import { extractMarkdownSection, isBlockedHostedSection } from "./lib/markdown-section.mjs";
import { DEFAULT_GEMINI_MODEL_IDS, GEMINI_RUN_GUARD_ENV_VAR, writeGeminiPreflight } from "./lib/gemini-api-preflight.mjs";
import { REQUIRED_OLLAMA_MODELS, buildHostSummary, readLatestHostPreflight, runOllamaHostPreflight } from "./lib/ollama-host-preflight.mjs";
import { resolvePrairiePythonBin } from "./lib/python-bin.mjs";
import { updateProofStatusDoc } from "./lib/proof-status.mjs";
import {
  nodeMajorFromVersion,
  nodeMajorVersionMatches,
  parseReleaseGateArgs,
  releaseGateCommandForMode,
  releaseGateEvalLabelForMode,
} from "./lib/release-gate-helpers.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const INFERENCE_DIR = path.join(ROOT, "services", "inference");
const OUTPUT_ROOT = path.join(ROOT, "output", "release-gate");
const RUN_ID = `${new Date().toISOString().replace(/[:.]/g, "-")}-${process.pid}`;
const RUN_DIR = path.join(OUTPUT_ROOT, RUN_ID);
const RUN_SUMMARY_FILE = path.join(RUN_DIR, "summary.json");
function latestResultsPath(mode) {
  return path.join(OUTPUT_ROOT, `latest-results-${mode}.json`);
}

const HOST = "127.0.0.1";
const INFERENCE_PORT = 3200;
const ORCHESTRATOR_PORT = 3100;
const WEB_PORT = 5173;
const INFERENCE_URL = `http://${HOST}:${INFERENCE_PORT}`;
const ORCHESTRATOR_URL = `http://${HOST}:${ORCHESTRATOR_PORT}`;
const WEB_URL = `http://localhost:${WEB_PORT}`;
const DEMO_CLASSROOM_FILE = path.join(ROOT, "data", "synthetic_classrooms", "classroom_demo.json");
const PAID_SERVICES_ENV = "PRAIRIE_ALLOW_PAID_SERVICES";

const managedChildren = [];

const OPTIONS = parseReleaseGateArgs(process.argv.slice(2));
const IS_REAL_MODE = OPTIONS.inferenceMode === "api";
const IS_OLLAMA_MODE = OPTIONS.inferenceMode === "ollama";
const IS_GEMINI_MODE = OPTIONS.inferenceMode === "gemini";
const EVAL_DATE = new Date().toISOString().slice(0, 10);
const EVAL_MODE_LABEL = releaseGateEvalLabelForMode(OPTIONS.inferenceMode);
const EVAL_OUTPUT_DIR = path.join(ROOT, "output", "evals", `${EVAL_DATE}-${EVAL_MODE_LABEL}`);
const EVAL_OUTPUT_BASENAME = `${RUN_ID}-${EVAL_MODE_LABEL}`;
const EVAL_RESULTS_FILE = path.join(EVAL_OUTPUT_DIR, `${EVAL_OUTPUT_BASENAME}-results.json`);
const GEMINI_EVAL_SUITE_LABEL = "Hosted Gemini proof suite";
const GEMINI_EVAL_CASE_IDS_FILE = path.join(ROOT, "evals", "suites", "hosted-gemini-proof.txt");
const EVAL_BASELINE_DOC = path.join(ROOT, "docs", "eval-baseline.md");
const REAL_PREFLIGHT_FILE = path.join(RUN_DIR, "real-preflight.json");
const GEMINI_PREFLIGHT_FILE = path.join(RUN_DIR, "gemini-preflight.json");
const HOST_PREFLIGHT_DIR = path.join(ROOT, "output", "host-preflight");
const REAL_BACKEND = process.env.PRAIRIE_VERTEX_BACKEND?.trim() || "";
const REAL_MODEL_IDS = {
  live: process.env.PRAIRIE_VERTEX_MODEL_ID_LIVE?.trim() || "google/gemma-4-4b-it",
  planning: process.env.PRAIRIE_VERTEX_MODEL_ID_PLANNING?.trim() || "google/gemma-4-27b-it",
};
const REAL_ENDPOINTS = {
  live: process.env.PRAIRIE_VERTEX_ENDPOINT_LIVE?.trim() || "",
  planning: process.env.PRAIRIE_VERTEX_ENDPOINT_PLANNING?.trim() || "",
};
const PYTHON_BIN = resolvePrairiePythonBin(ROOT);

function currentGateCommand() {
  return releaseGateCommandForMode(OPTIONS.inferenceMode);
}

function paidServicesEnabled() {
  return ["1", "true", "yes", "on"].includes((process.env[PAID_SERVICES_ENV] ?? "").trim().toLowerCase());
}

function assertPaidServicesAllowed(action) {
  if (paidServicesEnabled()) {
    return;
  }
  throw new Error(
    `${action} is blocked unless ${PAID_SERVICES_ENV}=true. This repo defaults to zero-cloud-spend for local development.`,
  );
}

const runSummary = {
  generated_at: new Date().toISOString(),
  run_id: RUN_ID,
  run_dir: path.relative(ROOT, RUN_DIR),
  inference_mode: OPTIONS.inferenceMode,
  command: `npm run ${currentGateCommand()}`,
  status: "pending",
  zero_cost_enforced: !paidServicesEnabled(),
  host: buildHostSummary(ROOT),
};

function bin(name) {
  return process.platform === "win32" ? `${name}.cmd` : name;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runLabel(step) {
  return `${step}`.replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
}

async function ensureRunDir() {
  await mkdir(RUN_DIR, { recursive: true });
}

async function writeRunSummary(patch = {}) {
  Object.assign(runSummary, patch);
  await writeFile(RUN_SUMMARY_FILE, `${JSON.stringify(runSummary, null, 2)}\n`, "utf8");
}

async function verifyNodeVersion() {
  const expected = (await readFile(path.join(ROOT, ".nvmrc"), "utf8")).trim();
  // Match on the major version only. Rationale: native modules
  // (better-sqlite3) ABI compatibility is keyed to Node's NODE_MODULE_VERSION,
  // which advances on majors, not minors or patches. nvm-managed hosts
  // commonly install the latest minor/patch in a major series, so requiring
  // exact major.minor match created brittle false failures (e.g. .nvmrc
  // pinned v25.8.2 but the host had v25.9.0). Major drift still fails fast
  // with a clear remediation hint.
  const expectedMajor = nodeMajorFromVersion(expected);
  if (!nodeMajorVersionMatches(expected, process.version)) {
    throw new Error(
      `Node major version mismatch. Expected v${expectedMajor}.x from .nvmrc, got ${process.version}. Run \`nvm use\` before \`npm run ${currentGateCommand()}\`.`,
    );
  }
}

async function assertPortFree(port) {
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", (error) => {
      if (error && typeof error === "object" && "code" in error && error.code === "EADDRINUSE") {
        reject(new Error(`Port ${port} is already in use. Stop the existing process before running the release gate.`));
        return;
      }
      reject(error);
    });
    server.listen(port, () => {
      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }
        resolve(undefined);
      });
    });
  });
}

function makeLogFile(step) {
  return path.join(RUN_DIR, `${runLabel(step)}.log`);
}

async function writeLog(step, content) {
  const logFile = makeLogFile(step);
  await writeFile(logFile, content, "utf8");
  return logFile;
}

function pipeChildOutput(child, logFile, label, cwd) {
  const stream = createWriteStream(logFile, { flags: "a" });
  stream.write(`# ${label}\n`);
  stream.write(`# cwd: ${cwd}\n`);
  stream.write(`# started: ${new Date().toISOString()}\n\n`);

  child.stdout?.on("data", (chunk) => {
    stream.write(chunk);
  });
  child.stderr?.on("data", (chunk) => {
    stream.write(chunk);
  });
  child.on("close", (code, signal) => {
    stream.write(`\n# exited code=${code} signal=${signal}\n`);
    stream.end();
  });
}

function spawnManaged(step, command, args, options = {}) {
  const logFile = makeLogFile(step);
  const cwd = options.cwd ?? ROOT;
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...options.env },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let exitCode = null;
  let exitSignal = null;
  child.on("exit", (code, signal) => {
    exitCode = code;
    exitSignal = signal;
  });

  pipeChildOutput(child, logFile, `${command} ${args.join(" ")}`, cwd);
  managedChildren.push({ child, logFile, getExit: () => ({ exitCode, exitSignal }) });

  return { child, logFile, getExit: () => ({ exitCode, exitSignal }) };
}

async function runStep(step, command, args, options = {}) {
  const logFile = makeLogFile(step);
  await new Promise((resolve, reject) => {
    const cwd = options.cwd ?? ROOT;
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...options.env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    pipeChildOutput(child, logFile, `${command} ${args.join(" ")}`, cwd);

    child.on("error", (error) => {
      reject(new Error(`${step} failed to start. See ${logFile}\n${error instanceof Error ? error.message : String(error)}`));
    });

    child.on("close", (code, signal) => {
      if (code === 0) {
        resolve(undefined);
        return;
      }
      reject(
        new Error(
          `${step} failed with code ${code ?? "null"}${signal ? ` (signal ${signal})` : ""}. See ${logFile}`,
        ),
      );
    });
  });
}

async function waitForUrl(step, url, options = {}) {
  const timeoutMs = options.timeoutMs ?? 45_000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (options.processInfo) {
      const { exitCode, exitSignal } = options.processInfo.getExit();
      if (exitCode !== null || exitSignal !== null) {
        throw new Error(`${step} exited before ${url} became ready. See ${options.processInfo.logFile}`);
      }
    }

    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // keep polling until timeout
    }

    await sleep(1000);
  }

  throw new Error(`${step} did not become ready at ${url} within ${timeoutMs / 1000}s.`);
}

async function verifyPlaywrightBrowser() {
  const { chromium } = await import("playwright");
  const executable = chromium.executablePath();
  if (!existsSync(executable)) {
    throw new Error(
      `Playwright Chromium is not installed at ${executable}. Run \`npx playwright install chromium\` before \`npm run ${currentGateCommand()}\`.`,
    );
  }
}

async function readJsonFileIfPresent(filePath) {
  if (!existsSync(filePath)) {
    return null;
  }

  return JSON.parse(await readFile(filePath, "utf8"));
}

function classifyProbeFailure(text) {
  const normalized = text.toLowerCase();
  if (/prairie_vertex_backend|prairie_vertex_endpoint|missing required vertex endpoint/i.test(text)) {
    return "missing_endpoint_config";
  }
  if (/aiplatform\.endpoints\.predict|permission_denied/.test(normalized)) {
    return "permission_denied";
  }
  if (/quota project/.test(normalized)) {
    return "quota_project";
  }
  if (/endpoint.*not found|requested entity was not found|404/.test(normalized)) {
    return "endpoint_not_found";
  }
  if (/deployed model|no deployed model|traffic split|dedicated endpoint dns is empty/i.test(text)) {
    return "endpoint_not_ready";
  }
  if (/chatcompletions|requestformat|messages|raw_predict|invalid argument|400 bad request|shared vertex ai domain/i.test(normalized)) {
    return "prediction_protocol";
  }
  if (/missing or broken python dependencies/.test(normalized)) {
    return "missing_dependency";
  }
  return "other";
}

function inferFailureModel(text) {
  const match = text.match(/(google\/gemma-4-[^'"`\s,]+)/i);
  return match?.[1] ?? null;
}

function inferRouteModel(route) {
  if ([
    "prepare_tomorrow_plan",
    "detect_support_patterns",
    "forecast_complexity",
    "detect_scaffold_decay",
    "generate_survival_packet",
  ].includes(route)) {
    return REAL_MODEL_IDS.planning;
  }

  return REAL_MODEL_IDS.live;
}

function formatProbeFailureSummary(details) {
  const status = details?.status;
  const project = details?.configured_project ?? "<unset>";
  const principal = details?.principal_email ?? "<unknown principal>";

  if (status === "missing_endpoint_config") {
    return "real endpoint configuration is incomplete; export PRAIRIE_VERTEX_BACKEND=endpoint and both PRAIRIE_VERTEX_ENDPOINT_* values";
  }

  if (status === "missing_dependency") {
    return "Python dependencies for the endpoint-backed Vertex client are missing or broken";
  }

  if (status === "adc_refresh_failed") {
    return `ADC refresh failed for project ${project}`;
  }

  if (status === "client_init_failed") {
    return `Vertex prediction client failed to initialize for project ${project}`;
  }

  const probes = details?.probes ?? [];
  const failures = probes.filter((probe) => probe.status !== "ok");
  if (failures.length === 0) {
    return "unknown real preflight failure";
  }

  const categories = [...new Set(failures.map((probe) => classifyProbeFailure(probe.error ?? "")))];

  if (categories.length === 1 && categories[0] === "permission_denied") {
    return `ADC principal ${principal} is authenticated, but lacks Vertex predict access in project ${project}`;
  }

  if (categories.length === 1 && categories[0] === "quota_project") {
    return `ADC principal ${principal} is missing a usable quota project for project ${project}`;
  }

  if (categories.length === 1 && categories[0] === "endpoint_not_found") {
    return `ADC principal ${principal} authenticated successfully, but one or more configured Vertex endpoints were not found in project ${project}`;
  }

  if (categories.length === 1 && categories[0] === "endpoint_not_ready") {
    return `ADC principal ${principal} can reach Vertex AI, but one or more configured endpoints do not have a ready deployed model in project ${project}`;
  }

  if (categories.length === 1 && categories[0] === "prediction_protocol") {
    return `ADC principal ${principal} can reach Vertex AI, but the configured endpoint request format does not match the deployed container protocol in project ${project}`;
  }

  return `real preflight endpoint probe failed for project ${project}`;
}

function makePreflightError(details, fallbackMessage, logFile) {
  const summary = details ? formatProbeFailureSummary(details) : fallbackMessage;
  const error = new Error(`Real inference preflight failed: ${summary}. See ${logFile}`);
  error.preflightDetails = details;
  return error;
}

async function runRealPreflight() {
  const project = process.env.GOOGLE_CLOUD_PROJECT?.trim();
  if (!project) {
    const logFile = await writeLog(
      "05-real-preflight",
      [
        "# Real inference preflight",
        `# started: ${new Date().toISOString()}`,
        "",
        "GOOGLE_CLOUD_PROJECT is not set.",
        "Export GOOGLE_CLOUD_PROJECT before running npm run release:gate:real.",
      ].join("\n"),
    );
    throw new Error(`Real inference preflight failed: GOOGLE_CLOUD_PROJECT is not set. See ${logFile}`);
  }

  const location = process.env.GOOGLE_CLOUD_LOCATION?.trim() || "us-central1";
  const endpointConfig = {
    live: {
      endpoint: REAL_ENDPOINTS.live,
      model_id: REAL_MODEL_IDS.live,
    },
    planning: {
      endpoint: REAL_ENDPOINTS.planning,
      model_id: REAL_MODEL_IDS.planning,
    },
  };
  const summaryLog = await writeLog(
    "05-real-preflight-summary",
    [
      "# Real inference preflight summary",
      `# started: ${new Date().toISOString()}`,
      "",
      `GOOGLE_CLOUD_PROJECT=${project}`,
      `GOOGLE_CLOUD_LOCATION=${location}`,
      `PRAIRIE_VERTEX_BACKEND=${REAL_BACKEND || "<unset>"}`,
      `PYTHON_BIN=${PYTHON_BIN}`,
      `PRAIRIE_VERTEX_ENDPOINT_LIVE=${endpointConfig.live.endpoint || "<unset>"}`,
      `PRAIRIE_VERTEX_ENDPOINT_PLANNING=${endpointConfig.planning.endpoint || "<unset>"}`,
      `PRAIRIE_VERTEX_MODEL_ID_LIVE=${endpointConfig.live.model_id}`,
      `PRAIRIE_VERTEX_MODEL_ID_PLANNING=${endpointConfig.planning.model_id}`,
    ].join("\n"),
  );
  console.log(`Real inference preflight summary: ${summaryLog}`);

  const pythonScript = String.raw`
import importlib
import json
import os
import sys
import time
import urllib.request

details = {
    "configured_project": os.environ.get("GOOGLE_CLOUD_PROJECT", ""),
    "configured_location": os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1"),
    "configured_backend": os.environ.get("PRAIRIE_VERTEX_BACKEND", ""),
    "configured_endpoints": json.loads(os.environ["PRAIRIE_VERTEX_ENDPOINTS"]),
    "configured_model_ids": json.loads(os.environ["PRAIRIE_VERTEX_MODEL_IDS"]),
    "python_executable": sys.executable,
    "principal_email": None,
    "detected_project": None,
    "quota_project": None,
    "service_account_email": None,
    "dependency_failures": [],
    "probes": [],
}
details_path = os.environ["PRAIRIE_REAL_PREFLIGHT_FILE"]

def write_details(status, summary):
    details["status"] = status
    details["summary"] = summary
    with open(details_path, "w", encoding="utf-8") as handle:
        json.dump(details, handle, indent=2)

def fail(status, summary, exit_code=1):
    write_details(status, summary)
    print(summary)
    sys.exit(exit_code)

if details["configured_backend"] != "endpoint":
    fail("missing_endpoint_config", "Missing required Vertex endpoint environment variables")

for tier, endpoint in details["configured_endpoints"].items():
    if not endpoint:
        fail("missing_endpoint_config", "Missing required Vertex endpoint environment variables")

modules = [
    "flask",
    "google.auth",
    "google.auth.transport.requests",
    "google.cloud.aiplatform",
]
for name in modules:
    try:
        importlib.import_module(name)
    except Exception as exc:
        details["dependency_failures"].append(f"{name}: {exc}")
if details["dependency_failures"]:
    fail("missing_dependency", "Missing or broken Python dependencies")

try:
    import google.auth
    from google.auth.transport.requests import Request
    credentials, detected_project = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
    details["detected_project"] = detected_project
    details["quota_project"] = getattr(credentials, "quota_project_id", None)
    details["service_account_email"] = getattr(credentials, "service_account_email", None)
    credentials.refresh(Request())
except Exception as exc:
    details["adc_error"] = str(exc)
    fail("adc_refresh_failed", f"ADC refresh failed: {exc}")

try:
    request = urllib.request.Request(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        headers={"Authorization": f"Bearer {credentials.token}"},
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        details["principal_email"] = json.loads(response.read().decode()).get("email")
except Exception as exc:
    details["principal_lookup_error"] = str(exc)
    if details["service_account_email"]:
        details["principal_email"] = details["service_account_email"]
if details["principal_email"] is None:
    details["principal_email"] = "<unknown>"

try:
    from google.cloud import aiplatform
    aiplatform.init(
        project=details["configured_project"],
        location=details["configured_location"],
    )
except Exception as exc:
    details["client_error"] = str(exc)
    fail("client_init_failed", f"Vertex client init failed: {exc}")

def response_preview(payload):
    if isinstance(payload, dict):
        if isinstance(payload.get("choices"), list) and payload["choices"]:
            choice = payload["choices"][0]
            if isinstance(choice, dict):
                message = choice.get("message", {})
                content = message.get("content")
                if isinstance(content, str):
                    return content[:80]
                if isinstance(content, list):
                    parts = [part.get("text", "") for part in content if isinstance(part, dict)]
                    return " ".join([part for part in parts if part])[:80]
        if isinstance(payload.get("predictions"), list) and payload["predictions"]:
            return response_preview(payload["predictions"][0])
        if isinstance(payload.get("text"), str):
            return payload["text"][:80]
    if isinstance(payload, str):
        return payload[:80]
    return json.dumps(payload)[:80]

for tier, endpoint in details["configured_endpoints"].items():
    started = time.perf_counter()
    probe = {
        "tier": tier,
        "endpoint": endpoint,
        "model_id": details["configured_model_ids"].get(tier, ""),
    }
    request_payload = {
        "instances": [
            {
                "@requestFormat": "chatCompletions",
                "messages": [
                    {
                        "role": "system",
                        "content": [{"type": "text", "text": "Reply with exactly ok."}],
                    },
                    {
                        "role": "user",
                        "content": [{"type": "text", "text": "Reply with exactly ok."}],
                    },
                ],
                "max_tokens": 8,
                "temperature": 0,
            }
        ]
    }
    try:
        endpoint_client = aiplatform.Endpoint(endpoint_name=endpoint)
        probe["dedicated_endpoint_dns"] = endpoint_client.dedicated_endpoint_dns
        response = endpoint_client.raw_predict(
            body=json.dumps(request_payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        if response.status_code >= 400:
            raise RuntimeError(f"HTTP {response.status_code}: {response.text}")
        payload = json.loads(response.text)
        probe["status"] = "ok"
        probe["latency_ms"] = round((time.perf_counter() - started) * 1000, 2)
        probe["response_preview"] = response_preview(payload)
    except Exception as exc:
        probe["status"] = "error"
        probe["latency_ms"] = round((time.perf_counter() - started) * 1000, 2)
        probe["error"] = str(exc)
    details["probes"].append(probe)

if any(probe["status"] != "ok" for probe in details["probes"]):
    fail("endpoint_probe_failed", "Vertex endpoint access probe failed")

write_details("ok", "Vertex endpoint access probe succeeded")
print(json.dumps(details, indent=2))
`;

  const logFile = makeLogFile("06-real-preflight-python");
  try {
    await runStep("06-real-preflight-python", PYTHON_BIN, ["-c", pythonScript], {
      env: {
        GOOGLE_CLOUD_PROJECT: project,
        GOOGLE_CLOUD_LOCATION: location,
        PRAIRIE_VERTEX_BACKEND: REAL_BACKEND,
        PRAIRIE_REAL_PREFLIGHT_FILE: REAL_PREFLIGHT_FILE,
        PRAIRIE_VERTEX_ENDPOINTS: JSON.stringify({
          live: endpointConfig.live.endpoint,
          planning: endpointConfig.planning.endpoint,
        }),
        PRAIRIE_VERTEX_MODEL_IDS: JSON.stringify({
          live: endpointConfig.live.model_id,
          planning: endpointConfig.planning.model_id,
        }),
      },
    });
  } catch (error) {
    const details = await readJsonFileIfPresent(REAL_PREFLIGHT_FILE);
    throw makePreflightError(
      details,
      error instanceof Error ? error.message : String(error),
      logFile,
    );
  }

  return readJsonFileIfPresent(REAL_PREFLIGHT_FILE);
}

async function runOllamaPreflight() {
  const logFile = makeLogFile("05-ollama-preflight");
  const details = await runOllamaHostPreflight({
    rootDir: ROOT,
    outputDir: HOST_PREFLIGHT_DIR,
  });

  await writeLog(
    "05-ollama-preflight",
    [
      "# Ollama host preflight",
      `# started: ${new Date().toISOString()}`,
      "",
      details.summary,
      "",
      `artifact_path=${details.artifact_path}`,
      `status=${details.status}`,
      `required_models=${(details.required_models ?? []).join(", ")}`,
      `available_models=${(details.available_models ?? []).join(", ")}`,
      `disk_available=${details.host?.disk?.available_human ?? "unknown"}`,
      `memory_total=${details.host?.hardware?.total_memory_human ?? "unknown"}`,
      `cpu=${details.host?.hardware?.cpu_model ?? "unknown"}`,
    ].join("\n"),
  );

  if (details.status !== "ok") {
    const error = new Error(`${details.summary} See ${logFile}`);
    error.ollamaPreflightDetails = details;
    throw error;
  }

  return details;
}

async function runGeminiPreflight() {
  const logFile = makeLogFile("05-gemini-preflight");
  const details = await writeGeminiPreflight({
    artifactPath: GEMINI_PREFLIGHT_FILE,
    env: process.env,
  });

  await writeLog(
    "05-gemini-preflight",
    [
      "# Gemini API preflight",
      `# started: ${new Date().toISOString()}`,
      "",
      details.summary,
      "",
      `artifact_path=${details.artifact_path}`,
      `status=${details.status}`,
      `auth_present=${details.auth_present}`,
      `api_key_env_var=${details.api_key_env_var ?? "<unset>"}`,
      `run_guard_enabled=${details.run_guard_enabled}`,
      `model_live=${details.model_ids?.live ?? DEFAULT_GEMINI_MODEL_IDS.live}`,
      `model_planning=${details.model_ids?.planning ?? DEFAULT_GEMINI_MODEL_IDS.planning}`,
    ].join("\n"),
  );

  if (details.status !== "ok") {
    const error = new Error(`${details.summary} See ${logFile}`);
    error.geminiPreflightDetails = details;
    throw error;
  }

  return details;
}

function parseFailureBuckets(results) {
  const buckets = {
    auth_startup: [],
    parse_schema: [],
    safety: [],
    content_quality: [],
  };

  for (const result of results) {
    if (result.passed) {
      continue;
    }

    const joinedFailures = result.failures.join(" ").toLowerCase();
    let bucketName = "content_quality";
    if (/(adc|credential|authentication|required|invalid classroom code|401|403|404|502|503|harness not initialized|project|token|vertex|endpoint|raw_predict|empty model response|inference service error)/.test(joinedFailures)) {
      bucketName = "auth_startup";
    } else if (/(schema|parse|json|required key|missing|required packet|required plan|expected status|type)/.test(joinedFailures)) {
      bucketName = "parse_schema";
    } else if (/(forbidden|observational|boundary|safety)/.test(joinedFailures) || result.category === "safety_boundaries") {
      bucketName = "safety";
    }
    buckets[bucketName].push(result);
  }

  return buckets;
}

function summarizeByRoute(results) {
  const summary = new Map();
  for (const result of results) {
    const key = result.prompt_class ?? result.endpoint ?? "differentiate";
    const current = summary.get(key) ?? { total: 0, passed: 0 };
    current.total += 1;
    if (result.passed) {
      current.passed += 1;
    }
    summary.set(key, current);
  }
  return [...summary.entries()].sort(([left], [right]) => left.localeCompare(right));
}

function renderFailureList(results) {
  if (results.length === 0) {
    return "- None";
  }
  return results
    .map((result) => {
      const target = result.source_file ? path.relative(ROOT, result.source_file) : result.case_id;
      const failureText = result.failures.join("; ");
      const sourcePath = result.source_file ?? EVAL_BASELINE_DOC;
      return `- \`${result.case_id}\` ([${target}](${sourcePath})) on \`${result.endpoint}\`: ${failureText}`;
    })
    .join("\n");
}

function renderAuthStartupList(results) {
  if (results.length === 0) {
    return "- None";
  }

  const grouped = new Map();
  for (const result of results) {
    const joined = result.failures.join(" ");
    const model = inferFailureModel(joined) ?? inferRouteModel(result.prompt_class ?? result.endpoint ?? "");
    let summary;

    switch (classifyProbeFailure(joined)) {
      case "missing_endpoint_config":
        summary = "Endpoint env configuration is incomplete.";
        break;
      case "permission_denied":
        summary = "ADC principal is missing `aiplatform.endpoints.predict`.";
        break;
      case "quota_project":
        summary = "ADC quota project is missing or unusable for Vertex AI.";
        break;
      case "endpoint_not_found":
        summary = "Configured endpoint resource was not found.";
        break;
      case "endpoint_not_ready":
        summary = "Configured endpoint has no ready deployed model.";
        break;
      case "prediction_protocol":
        summary = "Endpoint request format does not match the deployed container protocol.";
        break;
      default:
        summary = joined;
        break;
    }

    const key = `${result.endpoint}|${model}|${summary}`;
    const current = grouped.get(key) ?? {
      endpoint: result.endpoint,
      model,
      summary,
      cases: [],
    };
    current.cases.push(result.case_id);
    grouped.set(key, current);
  }

  return [...grouped.values()]
    .sort((left, right) => left.endpoint.localeCompare(right.endpoint))
    .map(
      (group) =>
        `- \`${group.endpoint}\` (${group.cases.length} cases, model \`${group.model}\`): ${group.summary} Cases: ${group.cases.map((caseId) => `\`${caseId}\``).join(", ")}`,
    )
    .join("\n");
}

function renderPreflightProbeList(details) {
  const probes = details?.probes ?? [];
  if (probes.length === 0) {
    return "- No endpoint probes recorded";
  }

  return probes
    .map((probe) => {
      const status = probe.status === "ok" ? "ok" : "error";
      const message = probe.status === "ok" ? probe.response_preview || "response received" : probe.error;
      return `- \`${probe.tier}\` (\`${probe.model_id}\`, \`${probe.endpoint}\`) — ${status} (${probe.latency_ms} ms): ${message}`;
    })
    .join("\n");
}

async function readEvalPayload() {
  if (!existsSync(EVAL_RESULTS_FILE)) {
    throw new Error(`Eval results file not found at ${EVAL_RESULTS_FILE}. The eval runner did not produce artifacts.`);
  }
  return JSON.parse(await readFile(EVAL_RESULTS_FILE, "utf8"));
}

async function findLatestRunSummary({ inferenceMode, status } = {}) {
  if (!existsSync(OUTPUT_ROOT)) {
    return null;
  }

  const entries = (await readDirSafe(OUTPUT_ROOT)).sort().reverse();
  for (const entry of entries) {
    const summaryPath = path.join(OUTPUT_ROOT, entry, "summary.json");
    if (!existsSync(summaryPath)) {
      continue;
    }
    const summary = JSON.parse(await readFile(summaryPath, "utf8"));
    if (inferenceMode && summary.inference_mode !== inferenceMode) {
      continue;
    }
    if (status && summary.status !== status) {
      continue;
    }
    return summary;
  }

  return null;
}

async function readDirSafe(targetDir) {
  try {
    return await readdir(targetDir);
  } catch {
    return [];
  }
}

function renderRouteSummaryTable(results) {
  const routeSummary = summarizeByRoute(results);
  return [
    "| Route | Cases | Passed |",
    "|-------|-------|--------|",
    ...routeSummary.map(([route, summary]) => `| ${route} | ${summary.total} | ${summary.passed}/${summary.total} |`),
  ].join("\n");
}

function renderResultsLedger(results) {
  const buckets = parseFailureBuckets(results);
  return [
    "### Failure Ledger",
    "",
    "#### Auth / Startup",
    renderAuthStartupList(buckets.auth_startup),
    "",
    "#### Parse / Schema",
    renderFailureList(buckets.parse_schema),
    "",
    "#### Safety",
    renderFailureList(buckets.safety),
    "",
    "#### Content Quality",
    renderFailureList(buckets.content_quality),
  ].join("\n");
}

function renderMockSection({ runDate = null, artifactsPath = null } = {}) {
  if (!runDate || !artifactsPath) {
    return [
      "## Mock Baseline",
      "",
      "**Status:** Structural validation path available locally.",
      "**What it proves:** Typecheck, lint, Python tests, TS tests, claims check, harness smoke, API smoke, and browser smoke all pass without paid services.",
      "**How to run:** `npm run release:gate`",
      "**Limits:** Mock mode validates prompt contracts and response handling, not live Gemma quality.",
    ].join("\n");
  }

  return [
    "## Mock Baseline",
    "",
    "**Status:** Passing structural gate with no paid services.",
    `**Run date:** ${runDate}`,
    "**Backend:** `mock`",
    "**What it proves:** Typecheck, lint, Python tests, TS tests, claims check, harness smoke, API smoke, and browser smoke all pass without paid services.",
    `**Raw artifacts:** \`${artifactsPath}\``,
    "",
    "### Commands",
    "",
    "```bash",
    "npm run release:gate",
    "```",
    "",
    "**Limits:** Mock mode validates prompt contracts and response handling, not live Gemma quality.",
  ].join("\n");
}

async function renderLatestMockSection() {
  const summary = await findLatestRunSummary({ inferenceMode: "mock", status: "passed" });
  if (!summary) {
    return renderMockSection();
  }
  return renderMockSection({
    runDate: summary.completed_at ?? summary.generated_at ?? null,
    artifactsPath: summary.run_dir ?? null,
  });
}

async function readEvalPayloadForRunSummary(summary) {
  if (!summary) {
    return null;
  }

  if (summary.eval_results_file) {
    return readJsonFileIfPresent(path.join(ROOT, summary.eval_results_file));
  }

  const evalLabel = releaseGateEvalLabelForMode(summary.inference_mode);
  const evalRoots = (await readDirSafe(path.join(ROOT, "output", "evals"))).sort().reverse();
  for (const entry of evalRoots) {
    const candidate = path.join(ROOT, "output", "evals", entry, `${summary.run_id}-${evalLabel}-results.json`);
    if (existsSync(candidate)) {
      return readJsonFileIfPresent(candidate);
    }
  }

  return null;
}

function renderResultsSection({
  title,
  status,
  runDate,
  backend,
  artifactsPath,
  models,
  commands,
  results,
  extraLines = [],
}) {
  return [
    `## ${title}`,
    "",
    `**Status:** ${status}`,
    `**Run date:** ${runDate}`,
    `**Backend:** \`${backend}\``,
    ...extraLines,
    `**Model identifiers observed:** ${models.length > 0 ? models.map((model) => `\`${model}\``).join(", ") : "_No model identifiers recorded_"}`,
    `**Raw artifacts:** \`${artifactsPath}\``,
    "",
    "### Commands",
    "",
    "```bash",
    ...commands,
    "```",
    "",
    "### Route Summary",
    "",
    renderRouteSummaryTable(results),
    "",
    renderResultsLedger(results),
  ].join("\n");
}

function summarizeGateFailure(message) {
  const text = String(message ?? "");
  if (text.includes("80-smoke-api")) {
    return "API smoke";
  }
  if (text.includes("90-smoke-browser")) {
    return "browser smoke";
  }
  if (text.includes("70-harness-smoke")) {
    return "harness smoke";
  }
  if (text.includes("75-gemini-evals")) {
    return "the curated hosted eval suite";
  }
  return "a later release-gate step";
}

function renderBlockedSection({
  title,
  status,
  backend,
  artifactsPath,
  commands,
  bodyLines,
}) {
  return [
    `## ${title}`,
    "",
    `**Status:** ${status}`,
    `**Backend:** \`${backend}\``,
    artifactsPath ? `**Raw artifacts:** \`${artifactsPath}\`` : "**Raw artifacts:** _none recorded in this sprint_",
    "",
    "### Commands",
    "",
    "```bash",
    ...commands,
    "```",
    "",
    ...bodyLines,
  ].join("\n");
}

function renderBlockedOllamaSection(details = null) {
  return renderBlockedSection({
    title: "Ollama Baseline",
    status: details?.status === "ok"
      ? "Pending — Ollama evals have not been run yet."
      : "Blocked before evals — Ollama preflight failed.",
    backend: "ollama",
    artifactsPath: path.relative(ROOT, details?.artifact_path ?? HOST_PREFLIGHT_DIR),
    commands: [
      "npm run host:preflight:ollama",
      "npm run release:gate:ollama",
    ],
    bodyLines: [
      "**Role in proof story:** Privacy-first self-hosted school deployment lane.",
      "",
      "### Preflight",
      "",
      `- ${details?.summary ?? "Ollama baseline has not been executed yet."}`,
      ...(details?.required_models ? [`- Required models: ${details.required_models.map((model) => `\`${model}\``).join(", ")}`] : []),
      ...(Array.isArray(details?.available_models)
        ? [
            `- Available models: ${details.available_models.length > 0 ? details.available_models.map((model) => `\`${model}\``).join(", ") : "none"}`,
          ]
        : []),
      ...(details?.host?.disk?.available_human ? [`- Available disk on host: ${details.host.disk.available_human}`] : []),
      ...(details?.host?.hardware?.total_memory_human ? [`- Total host memory: ${details.host.hardware.total_memory_human}`] : []),
    ],
  });
}

function renderBlockedGeminiSection(details = null) {
  return renderBlockedSection({
    title: "Hosted Gemini API Baseline",
    status: details?.status === "ok"
      ? "Pending — Hosted Gemini API evals have not been run yet."
      : details?.status === "runs_disabled"
        ? "Blocked before evals — hosted Gemini runs are disabled by policy."
      : "Blocked before evals — Gemini API preflight failed.",
    backend: "gemini",
    artifactsPath: path.relative(ROOT, details?.artifact_path ?? GEMINI_PREFLIGHT_FILE),
    commands: [
      "export PRAIRIE_GEMINI_API_KEY=<your-ai-studio-key>",
      `export ${GEMINI_RUN_GUARD_ENV_VAR}=true`,
      "npm run release:gate:gemini",
    ],
    bodyLines: [
      "### Preflight",
      "",
      `- ${details?.summary ?? "Hosted Gemini API baseline has not been executed yet."}`,
      `- API key present: ${details?.auth_present ? "yes" : "no"}`,
      `- Key source: ${details?.api_key_env_var ? `\`${details.api_key_env_var}\`` : "not configured"}`,
      `- Hosted run guard: ${details?.run_guard_enabled ? "enabled" : "disabled"}`,
      `- Hosted live model: \`${details?.model_ids?.live ?? DEFAULT_GEMINI_MODEL_IDS.live}\``,
      `- Hosted planning model: \`${details?.model_ids?.planning ?? DEFAULT_GEMINI_MODEL_IDS.planning}\``,
    ],
  });
}

function renderBlockedVertexSection() {
  return renderBlockedSection({
    title: "Paid Vertex Endpoint Baseline",
    status: "Not run in this zero-cost sprint.",
    backend: "vertex",
    artifactsPath: null,
    commands: [
      "export PRAIRIE_ALLOW_PAID_SERVICES=true",
      "export GOOGLE_CLOUD_PROJECT=<your-project-id>",
      "export GOOGLE_CLOUD_LOCATION=us-central1",
      "export PRAIRIE_VERTEX_BACKEND=endpoint",
      "export PRAIRIE_VERTEX_ENDPOINT_LIVE=projects/<project>/locations/us-central1/endpoints/<live-endpoint>",
      "export PRAIRIE_VERTEX_ENDPOINT_PLANNING=projects/<project>/locations/us-central1/endpoints/<planning-endpoint>",
      "npm run release:gate:real",
    ],
    bodyLines: [
      "### Notes",
      "",
      "- This section is intentionally left unexecuted during the no-cost sprint.",
      "- Vertex-backed validation remains available for later paid testing, but it is blocked unless `PRAIRIE_ALLOW_PAID_SERVICES=true`.",
    ],
  });
}

async function renderLatestGeminiSection() {
  const summary = await findLatestRunSummary({ inferenceMode: "gemini", status: "passed" });
  if (!summary) {
    return renderBlockedGeminiSection();
  }

  const payload = await readEvalPayloadForRunSummary(summary);
  if (payload) {
    const results = payload.results ?? [];
    const models = payload.models ?? [];
    const passedCases = payload.passed_cases ?? 0;
    const totalCases = payload.total_cases ?? results.length;
    const suiteLabel = payload.suite_label;
    const selectedCaseCount = payload.selected_case_count;
    const availableCaseCount = payload.available_case_count;
    const commands = [
      "export PRAIRIE_GEMINI_API_KEY=<your-ai-studio-key>",
      `export ${GEMINI_RUN_GUARD_ENV_VAR}=true`,
      "npm run release:gate:gemini",
    ];

    const keySourceLine = `**Key source:** ${summary.gemini_api_key_env_var ? `\`${summary.gemini_api_key_env_var}\`` : "_not recorded_"}`;
    const runGuardLine = `**Hosted run guard:** ${summary.gemini_run_guard_enabled ? "enabled" : "disabled"}`;

    if (summary.status === "passed") {
      return renderResultsSection({
        title: "Hosted Gemini API Baseline",
        status: `${passedCases === totalCases ? "Passing" : "Failing"} baseline — ${passedCases}/${totalCases} evals passed and the full hosted release gate completed.`,
        runDate: payload.generated_at ?? summary.completed_at ?? summary.generated_at ?? new Date().toISOString(),
        backend: "gemini",
        artifactsPath: summary.run_dir ?? path.relative(ROOT, RUN_DIR),
        models,
        results,
        commands,
        extraLines: [
          keySourceLine,
          runGuardLine,
          ...(suiteLabel
            ? [`**Eval suite:** ${suiteLabel}${selectedCaseCount && availableCaseCount ? ` (${selectedCaseCount}/${availableCaseCount} cases from the full corpus)` : ""}.`]
            : []),
          "**Usage scope:** Synthetic/demo evaluation only.",
        ],
      });
    }

    return renderResultsSection({
      title: "Hosted Gemini API Baseline",
      status: `Partial proof — hosted eval suite passed ${passedCases}/${totalCases}, but the full hosted release gate is still blocked at ${summarizeGateFailure(summary.error_message)}.`,
      runDate: payload.generated_at ?? summary.failed_at ?? summary.generated_at ?? new Date().toISOString(),
      backend: "gemini",
      artifactsPath: summary.run_dir ?? path.relative(ROOT, RUN_DIR),
      models,
      results,
      commands,
      extraLines: [
        keySourceLine,
        runGuardLine,
        ...(suiteLabel
          ? [`**Eval suite:** ${suiteLabel}${selectedCaseCount && availableCaseCount ? ` (${selectedCaseCount}/${availableCaseCount} cases from the full corpus)` : ""}.`]
          : []),
        "**Usage scope:** Synthetic/demo evaluation only.",
        `**Current blocker:** ${summary.error_message ?? "Latest hosted gate failure not recorded."}`,
      ],
    });
  }

  const details = summary.gemini_preflight_artifact
    ? await readJsonFileIfPresent(path.join(ROOT, summary.gemini_preflight_artifact))
    : null;
  return renderBlockedGeminiSection(details);
}

async function writeBaselineDoc({
  mockSection = renderMockSection(),
  ollamaSection,
  geminiSection,
  vertexSection,
}) {
  let markdown = buildBaselineMarkdown({
    mockSection,
    ollamaSection,
    geminiSection,
    vertexSection,
  });

  markdown = await preserveHostedSectionFromExisting(markdown, EVAL_BASELINE_DOC);

  await writeFile(EVAL_BASELINE_DOC, `${markdown}\n`, "utf8");
}

async function preserveHostedSectionFromExisting(candidate, docPath) {
  if (!existsSync(docPath)) {
    return candidate;
  }
  const newHosted = extractMarkdownSection(candidate, "Hosted Gemini API Baseline");
  if (!newHosted || !isBlockedHostedSection(newHosted)) {
    return candidate;
  }
  let existing;
  try {
    existing = await readFile(docPath, "utf8");
  } catch {
    return candidate;
  }
  const existingHosted = extractMarkdownSection(existing, "Hosted Gemini API Baseline");
  if (!existingHosted || isBlockedHostedSection(existingHosted)) {
    return candidate;
  }
  return candidate.replace(newHosted, existingHosted);
}

async function updateOllamaBaselineDoc(ollamaPreflight = null) {
  let ollamaSection;

  if (existsSync(EVAL_RESULTS_FILE)) {
    const payload = await readEvalPayload();
    const results = payload.results ?? [];
    const models = payload.models ?? [];
    const passedCases = payload.passed_cases ?? 0;
    const totalCases = payload.total_cases ?? results.length;
    const status = `${passedCases === totalCases ? "Passing" : "Failing"} baseline — ${passedCases}/${totalCases} evals passed.`;

    ollamaSection = renderResultsSection({
      title: "Ollama Baseline",
      status,
      runDate: payload.generated_at ?? new Date().toISOString(),
      backend: "ollama",
      artifactsPath: path.relative(ROOT, EVAL_OUTPUT_DIR),
      models,
      results,
      commands: [
        "npm run host:preflight:ollama",
        "npm run release:gate:ollama",
      ],
      extraLines: [
        `**Required local models:** ${REQUIRED_OLLAMA_MODELS.map((model) => `\`${model}\``).join(", ")}`,
      ],
    });
  } else {
    const details = ollamaPreflight ?? await readLatestHostPreflight(HOST_PREFLIGHT_DIR);
    ollamaSection = renderBlockedOllamaSection(details);
  }

  const geminiSection = await renderLatestGeminiSection();
  const vertexSection = renderBlockedVertexSection();

  await writeBaselineDoc({
    mockSection: await renderLatestMockSection(),
    ollamaSection,
    geminiSection,
    vertexSection,
  });
}

async function updateMockBaselineDoc({
  runDate = new Date().toISOString(),
  artifactsPath = path.relative(ROOT, RUN_DIR),
} = {}) {
  const mockSection = renderMockSection({
    runDate,
    artifactsPath,
  });
  const ollamaSection = renderBlockedOllamaSection(await readLatestHostPreflight(HOST_PREFLIGHT_DIR));
  const geminiSection = await renderLatestGeminiSection();
  const vertexSection = renderBlockedVertexSection();
  await writeBaselineDoc({ mockSection, ollamaSection, geminiSection, vertexSection });
}

async function updateGeminiBaselineDoc(geminiPreflight = null, options = {}) {
  let geminiSection;
  const gateStatus = options.gateStatus ?? "passed";
  const failureMessage = options.failureMessage ?? null;
  const artifactsPath = options.artifactsPath ?? path.relative(ROOT, EVAL_OUTPUT_DIR);

  if (existsSync(EVAL_RESULTS_FILE)) {
    const payload = await readEvalPayload();
    const results = payload.results ?? [];
    const models = payload.models ?? [];
    const passedCases = payload.passed_cases ?? 0;
    const totalCases = payload.total_cases ?? results.length;
    const status = gateStatus === "failed"
      ? `Partial proof — hosted eval suite passed ${passedCases}/${totalCases}, but the full hosted release gate is still blocked at ${summarizeGateFailure(failureMessage)}.`
      : `${passedCases === totalCases ? "Passing" : "Failing"} baseline — ${passedCases}/${totalCases} evals passed and the full hosted release gate completed.`;
    const suiteLabel = payload.suite_label;
    const selectedCaseCount = payload.selected_case_count;
    const availableCaseCount = payload.available_case_count;

    geminiSection = renderResultsSection({
      title: "Hosted Gemini API Baseline",
      status,
      runDate: payload.generated_at ?? new Date().toISOString(),
      backend: "gemini",
      artifactsPath,
      models,
      results,
      commands: [
        "export PRAIRIE_GEMINI_API_KEY=<your-ai-studio-key>",
        `export ${GEMINI_RUN_GUARD_ENV_VAR}=true`,
        "npm run release:gate:gemini",
      ],
      extraLines: [
        `**Key source:** ${geminiPreflight?.api_key_env_var ? `\`${geminiPreflight.api_key_env_var}\`` : "_not recorded_"}`,
        `**Hosted run guard:** ${geminiPreflight?.run_guard_enabled ? "enabled" : "disabled"}`,
        ...(suiteLabel
          ? [`**Eval suite:** ${suiteLabel}${selectedCaseCount && availableCaseCount ? ` (${selectedCaseCount}/${availableCaseCount} cases from the full corpus)` : ""}.`]
          : []),
        "**Usage scope:** Synthetic/demo evaluation only.",
        ...(failureMessage ? [`**Current blocker:** ${failureMessage}`] : []),
      ],
    });
  } else {
    geminiSection = renderBlockedGeminiSection(geminiPreflight ?? await readJsonFileIfPresent(GEMINI_PREFLIGHT_FILE));
  }

  await writeBaselineDoc({
    mockSection: await renderLatestMockSection(),
    ollamaSection: renderBlockedOllamaSection(await readLatestHostPreflight(HOST_PREFLIGHT_DIR)),
    geminiSection,
    vertexSection: renderBlockedVertexSection(),
  });
}

async function updateVertexBaselineDoc(realPreflight = null) {
  let vertexSection;

  if (existsSync(EVAL_RESULTS_FILE)) {
    const payload = await readEvalPayload();
    const results = payload.results ?? [];
    const models = payload.models ?? [];
    const passedCases = payload.passed_cases ?? 0;
    const totalCases = payload.total_cases ?? results.length;
    const status = `${passedCases === totalCases ? "Passing" : "Failing"} baseline — ${passedCases}/${totalCases} evals passed.`;

    vertexSection = renderResultsSection({
      title: "Paid Vertex Endpoint Baseline",
      status,
      runDate: payload.generated_at ?? new Date().toISOString(),
      backend: realPreflight?.configured_backend ?? (REAL_BACKEND || "vertex"),
      artifactsPath: path.relative(ROOT, EVAL_OUTPUT_DIR),
      models,
      results,
      commands: [
        "export PRAIRIE_ALLOW_PAID_SERVICES=true",
        "export GOOGLE_CLOUD_PROJECT=<your-project-id>",
        "export GOOGLE_CLOUD_LOCATION=us-central1",
        "export PRAIRIE_VERTEX_BACKEND=endpoint",
        "export PRAIRIE_VERTEX_ENDPOINT_LIVE=projects/<project>/locations/us-central1/endpoints/<live-endpoint>",
        "export PRAIRIE_VERTEX_ENDPOINT_PLANNING=projects/<project>/locations/us-central1/endpoints/<planning-endpoint>",
        "npm run release:gate:real",
      ],
      extraLines: [
        `**ADC principal:** \`${realPreflight?.principal_email ?? "<unknown>"}\``,
        `**Configured live endpoint:** \`${realPreflight?.configured_endpoints?.live ?? REAL_ENDPOINTS.live ?? "<unset>"}\``,
        `**Configured planning endpoint:** \`${realPreflight?.configured_endpoints?.planning ?? REAL_ENDPOINTS.planning ?? "<unset>"}\``,
      ],
    });
  } else {
    const details = realPreflight ?? await readJsonFileIfPresent(REAL_PREFLIGHT_FILE);
    vertexSection = renderBlockedSection({
      title: "Paid Vertex Endpoint Baseline",
      status: "Blocked before evals — paid preflight failed.",
      backend: details?.configured_backend ?? (REAL_BACKEND || "vertex"),
      artifactsPath: path.relative(ROOT, RUN_DIR),
      commands: [
        "export PRAIRIE_ALLOW_PAID_SERVICES=true",
        "export GOOGLE_CLOUD_PROJECT=<your-project-id>",
        "export GOOGLE_CLOUD_LOCATION=us-central1",
        "export PRAIRIE_VERTEX_BACKEND=endpoint",
        "export PRAIRIE_VERTEX_ENDPOINT_LIVE=projects/<project>/locations/us-central1/endpoints/<live-endpoint>",
        "export PRAIRIE_VERTEX_ENDPOINT_PLANNING=projects/<project>/locations/us-central1/endpoints/<planning-endpoint>",
        "npm run release:gate:real",
      ],
      bodyLines: [
        "### Preflight",
        "",
        `- ${formatProbeFailureSummary(details)}`,
        "",
        "### Endpoint probes",
        "",
        renderPreflightProbeList(details),
      ],
    });
  }

  await writeBaselineDoc({
    mockSection: await renderLatestMockSection(),
    ollamaSection: renderBlockedOllamaSection(await readLatestHostPreflight(HOST_PREFLIGHT_DIR)),
    geminiSection: await renderLatestGeminiSection(),
    vertexSection,
  });
}

async function withRestoredDemoClassroom(fn) {
  const original = await readFile(DEMO_CLASSROOM_FILE);
  try {
    return await fn();
  } finally {
    await writeFile(DEMO_CLASSROOM_FILE, original);
  }
}

/**
 * Compare current eval results against the previous run's results.
 * Returns an array of regression objects for cases that previously
 * passed but now fail. Silently returns [] if the previous results
 * file is missing or unreadable.
 */
async function detectRegressions(currentResults, previousResultsPath) {
  if (!previousResultsPath || !existsSync(previousResultsPath)) {
    return [];
  }

  let previousPayload;
  try {
    previousPayload = JSON.parse(await readFile(previousResultsPath, "utf8"));
  } catch {
    // Corrupted or unreadable JSON — skip regression detection.
    return [];
  }

  const previousResults = previousPayload?.results;
  if (!Array.isArray(previousResults)) {
    return [];
  }

  // Index previous results by case_id for O(1) lookup.
  const previousById = new Map();
  for (const result of previousResults) {
    if (result.case_id) {
      previousById.set(result.case_id, result);
    }
  }

  const regressions = [];
  for (const current of currentResults) {
    if (current.passed) {
      continue;
    }
    const previous = previousById.get(current.case_id);
    if (previous && previous.passed) {
      regressions.push({
        id: current.case_id,
        description: current.failures?.join("; ") ?? "unknown failure",
        previousStatus: "passed",
        currentStatus: "failed",
      });
    }
  }

  return regressions;
}

function printRegressionWarnings(regressions) {
  if (regressions.length === 0) {
    return;
  }
  console.log("");
  console.log(`\u26a0 REGRESSIONS DETECTED (${regressions.length} case${regressions.length === 1 ? "" : "s"} that previously passed now fail${regressions.length === 1 ? "s" : ""}):`);
  for (const reg of regressions) {
    console.log(`  - ${reg.id}: ${reg.description}`);
  }
  console.log("");
}

/**
 * Persist current eval results at the stable latest-results path so the
 * next run can compare against them. Only called when the gate passes —
 * a failing gate must not become the new baseline.
 */
async function saveLatestResults(inferenceMode) {
  if (!existsSync(EVAL_RESULTS_FILE)) {
    return;
  }
  try {
    const content = await readFile(EVAL_RESULTS_FILE, "utf8");
    await writeFile(latestResultsPath(inferenceMode), content, "utf8");
  } catch {
    // Non-fatal — regression detection is a convenience, not a gate blocker.
  }
}

async function cleanup() {
  await Promise.allSettled(
    managedChildren.map(async ({ child }) => {
      if (child.killed || child.exitCode !== null) {
        return;
      }

      child.kill("SIGTERM");
      await Promise.race([
        new Promise((resolve) => child.once("close", resolve)),
        sleep(3000),
      ]);

      if (child.exitCode === null) {
        child.kill("SIGKILL");
        await new Promise((resolve) => child.once("close", resolve));
      }
    }),
  );
}

async function main() {
  await ensureRunDir();
  await writeRunSummary();
  console.log(`Release gate logs: ${RUN_DIR}`);
  console.log(`Release gate Python: ${PYTHON_BIN}`);

  if (IS_REAL_MODE) {
    assertPaidServicesAllowed("release:gate:real");
  }

  await verifyNodeVersion();
  await verifyPlaywrightBrowser();
  await runStep("07-demo-fixture-check", bin("npm"), ["run", "demo:fixture:check"]);

  let realPreflight = null;
  let ollamaPreflight = null;
  let geminiPreflight = null;
  if (IS_REAL_MODE) {
    try {
      realPreflight = await runRealPreflight();
      await writeRunSummary({
        real_preflight_artifact: path.relative(ROOT, REAL_PREFLIGHT_FILE),
      });
    } catch (error) {
      if (OPTIONS.updateBaseline && error && typeof error === "object" && "preflightDetails" in error && error.preflightDetails) {
        await updateVertexBaselineDoc(error.preflightDetails);
      }
      throw error;
    }
  }
  if (IS_OLLAMA_MODE) {
    try {
      ollamaPreflight = await runOllamaPreflight();
      await writeRunSummary({
        ollama_preflight_artifact: path.relative(ROOT, ollamaPreflight.artifact_path),
        host_preflight_status: ollamaPreflight.status,
      });
    } catch (error) {
      if (OPTIONS.updateBaseline && error && typeof error === "object" && "ollamaPreflightDetails" in error && error.ollamaPreflightDetails) {
        await updateOllamaBaselineDoc(error.ollamaPreflightDetails);
      }
      throw error;
    }
  }
  if (IS_GEMINI_MODE) {
    try {
      geminiPreflight = await runGeminiPreflight();
      await writeRunSummary({
        gemini_preflight_artifact: path.relative(ROOT, geminiPreflight.artifact_path),
        gemini_auth_present: geminiPreflight.auth_present,
        gemini_api_key_env_var: geminiPreflight.api_key_env_var,
        gemini_run_guard_enabled: geminiPreflight.run_guard_enabled,
        gemini_model_ids: geminiPreflight.model_ids,
      });
    } catch (error) {
      if (OPTIONS.updateBaseline && error && typeof error === "object" && "geminiPreflightDetails" in error && error.geminiPreflightDetails) {
        await updateGeminiBaselineDoc(error.geminiPreflightDetails);
      }
      throw error;
    }
  }

  await assertPortFree(INFERENCE_PORT);
  await assertPortFree(ORCHESTRATOR_PORT);
  await assertPortFree(WEB_PORT);

  const inference = spawnManaged(
    "10-inference",
    PYTHON_BIN,
    ["server.py", "--mode", OPTIONS.inferenceMode, "--port", String(INFERENCE_PORT)],
    {
      cwd: INFERENCE_DIR,
      env: IS_REAL_MODE
        ? {
            GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
            GOOGLE_CLOUD_LOCATION: process.env.GOOGLE_CLOUD_LOCATION,
            PRAIRIE_VERTEX_BACKEND: process.env.PRAIRIE_VERTEX_BACKEND,
            PRAIRIE_VERTEX_ENDPOINT_LIVE: process.env.PRAIRIE_VERTEX_ENDPOINT_LIVE,
            PRAIRIE_VERTEX_ENDPOINT_PLANNING: process.env.PRAIRIE_VERTEX_ENDPOINT_PLANNING,
            PRAIRIE_VERTEX_MODEL_ID_LIVE: process.env.PRAIRIE_VERTEX_MODEL_ID_LIVE,
            PRAIRIE_VERTEX_MODEL_ID_PLANNING: process.env.PRAIRIE_VERTEX_MODEL_ID_PLANNING,
          }
        : IS_GEMINI_MODE
          ? {
              PRAIRIE_GEMINI_API_KEY: process.env.PRAIRIE_GEMINI_API_KEY,
              GEMINI_API_KEY: process.env.GEMINI_API_KEY,
              PRAIRIE_ENABLE_GEMINI_RUNS: process.env.PRAIRIE_ENABLE_GEMINI_RUNS,
              PRAIRIE_GEMINI_MODEL_ID_LIVE: process.env.PRAIRIE_GEMINI_MODEL_ID_LIVE,
              PRAIRIE_GEMINI_MODEL_ID_PLANNING: process.env.PRAIRIE_GEMINI_MODEL_ID_PLANNING,
            }
        : undefined,
    },
  );
  await waitForUrl("Inference service", `${INFERENCE_URL}/health`, { processInfo: inference });

  const orchestrator = spawnManaged("20-orchestrator", bin("npx"), ["tsx", "services/orchestrator/server.ts"], {
    env: {
      INFERENCE_URL,
      PRAIRIE_INFERENCE_PROVIDER: OPTIONS.inferenceMode,
    },
  });
  await waitForUrl("Orchestrator", `${ORCHESTRATOR_URL}/health`, { processInfo: orchestrator });

  const web = spawnManaged("30-web", bin("npm"), ["run", "dev", "-w", "apps/web"]);
  await waitForUrl("Web app", `${WEB_URL}/?demo=true`, { processInfo: web });

  await runStep("40-typecheck", bin("npm"), ["run", "typecheck"]);
  await runStep("45-lint", bin("npm"), ["run", "lint"]);
  await runStep("50-python-tests", bin("npm"), ["run", "test:python"]);
  await runStep("55-ts-tests", bin("npm"), ["run", "test"]);
  await runStep("60-claims-check", bin("npm"), ["run", "claims:check"]);
  await runStep("65-py-compile", PYTHON_BIN, ["-m", "py_compile", "services/inference/harness.py", "services/inference/server.py"]);
  let harnessSmokeError = null;
  try {
    await runStep("70-harness-smoke", PYTHON_BIN, ["services/inference/harness.py", "--mode", OPTIONS.inferenceMode, "--smoke-test"], {
      env: IS_REAL_MODE
        ? {
            GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
            GOOGLE_CLOUD_LOCATION: process.env.GOOGLE_CLOUD_LOCATION,
            PRAIRIE_VERTEX_BACKEND: process.env.PRAIRIE_VERTEX_BACKEND,
            PRAIRIE_VERTEX_ENDPOINT_LIVE: process.env.PRAIRIE_VERTEX_ENDPOINT_LIVE,
            PRAIRIE_VERTEX_ENDPOINT_PLANNING: process.env.PRAIRIE_VERTEX_ENDPOINT_PLANNING,
            PRAIRIE_VERTEX_MODEL_ID_LIVE: process.env.PRAIRIE_VERTEX_MODEL_ID_LIVE,
            PRAIRIE_VERTEX_MODEL_ID_PLANNING: process.env.PRAIRIE_VERTEX_MODEL_ID_PLANNING,
          }
        : IS_GEMINI_MODE
          ? {
              PRAIRIE_GEMINI_API_KEY: process.env.PRAIRIE_GEMINI_API_KEY,
              GEMINI_API_KEY: process.env.GEMINI_API_KEY,
              PRAIRIE_ENABLE_GEMINI_RUNS: process.env.PRAIRIE_ENABLE_GEMINI_RUNS,
              PRAIRIE_GEMINI_MODEL_ID_LIVE: process.env.PRAIRIE_GEMINI_MODEL_ID_LIVE,
              PRAIRIE_GEMINI_MODEL_ID_PLANNING: process.env.PRAIRIE_GEMINI_MODEL_ID_PLANNING,
            }
        : undefined,
    });
  } catch (error) {
    if (!IS_REAL_MODE && !IS_GEMINI_MODE) {
      throw error;
    }
    harnessSmokeError = error;
  }

  if (IS_REAL_MODE) {
    let evalError = null;
    await withRestoredDemoClassroom(async () => {
      try {
        await runStep("75-real-evals", bin("npx"), ["tsx", "evals/runner.ts"], {
          env: {
            API_BASE: ORCHESTRATOR_URL,
            EVAL_OUTPUT_DIR,
            EVAL_OUTPUT_BASENAME,
          },
        });
      } catch (error) {
        evalError = error;
      }
    });

    if (OPTIONS.updateBaseline) {
      await updateVertexBaselineDoc(realPreflight);
    }

    if (harnessSmokeError || evalError) {
      const messages = [harnessSmokeError, evalError]
        .filter(Boolean)
        .map((error) => error instanceof Error ? error.message : String(error));
      throw new Error(messages.join("\n"));
    }
  }
  if (IS_OLLAMA_MODE) {
    let evalError = null;
    await withRestoredDemoClassroom(async () => {
      try {
        await runStep("75-ollama-evals", bin("npx"), ["tsx", "evals/runner.ts"], {
          env: {
            API_BASE: ORCHESTRATOR_URL,
            EVAL_OUTPUT_DIR,
            EVAL_OUTPUT_BASENAME,
          },
        });
      } catch (error) {
        evalError = error;
      }
    });
    if (existsSync(EVAL_RESULTS_FILE)) {
      await writeRunSummary({
        eval_results_file: path.relative(ROOT, EVAL_RESULTS_FILE),
      });
    }

    if (OPTIONS.updateBaseline) {
      await updateOllamaBaselineDoc(ollamaPreflight);
    }

    if (evalError) {
      throw evalError;
    }
  }
  if (IS_GEMINI_MODE) {
    let evalError = null;
    await withRestoredDemoClassroom(async () => {
      try {
        await runStep("75-gemini-evals", bin("npx"), ["tsx", "evals/runner.ts"], {
          env: {
            API_BASE: ORCHESTRATOR_URL,
            EVAL_OUTPUT_DIR,
            EVAL_OUTPUT_BASENAME,
            EVAL_SUITE_LABEL: GEMINI_EVAL_SUITE_LABEL,
            EVAL_CASE_IDS_FILE: GEMINI_EVAL_CASE_IDS_FILE,
          },
        });
      } catch (error) {
        evalError = error;
      }
    });
    if (existsSync(EVAL_RESULTS_FILE)) {
      await writeRunSummary({
        eval_results_file: path.relative(ROOT, EVAL_RESULTS_FILE),
      });
    }

    if (harnessSmokeError || evalError) {
      const messages = [harnessSmokeError, evalError]
        .filter(Boolean)
        .map((error) => error instanceof Error ? error.message : String(error));
      throw new Error(messages.join("\n"));
    }
  }

  // --- Regression detection: compare current eval results against the last passing run ---
  if (existsSync(EVAL_RESULTS_FILE)) {
    try {
      const currentPayload = JSON.parse(await readFile(EVAL_RESULTS_FILE, "utf8"));
      const currentResults = currentPayload?.results ?? [];
      const regressions = await detectRegressions(currentResults, latestResultsPath(OPTIONS.inferenceMode));
      printRegressionWarnings(regressions);
      if (regressions.length > 0) {
        await writeRunSummary({ regressions: regressions.map((r) => r.id) });
      }
    } catch {
      // Non-fatal — regression detection must not block the gate.
    }
  }

  await runStep("80-smoke-api", bin("npm"), ["run", "smoke:api"], {
    env: {
      PRAIRIE_API_BASE: ORCHESTRATOR_URL,
      PRAIRIE_INFERENCE_PROVIDER: OPTIONS.inferenceMode,
      PRAIRIE_ENABLE_GEMINI_RUNS: process.env.PRAIRIE_ENABLE_GEMINI_RUNS,
    },
  });
  await runStep("90-smoke-browser", bin("npm"), ["run", "smoke:browser"], {
    env: {
      PRAIRIE_API_BASE: ORCHESTRATOR_URL,
      PRAIRIE_WEB_BASE: WEB_URL,
      PRAIRIE_INFERENCE_PROVIDER: OPTIONS.inferenceMode,
      PRAIRIE_ENABLE_GEMINI_RUNS: process.env.PRAIRIE_ENABLE_GEMINI_RUNS,
    },
  });

  if (!IS_REAL_MODE && !IS_OLLAMA_MODE && !IS_GEMINI_MODE && OPTIONS.updateBaseline) {
    await updateMockBaselineDoc({
      runDate: new Date().toISOString(),
      artifactsPath: path.relative(ROOT, RUN_DIR),
    });
  }

  await writeRunSummary({
    status: "passed",
    completed_at: new Date().toISOString(),
    eval_results_file: existsSync(EVAL_RESULTS_FILE) ? path.relative(ROOT, EVAL_RESULTS_FILE) : null,
    baseline_doc: path.relative(ROOT, EVAL_BASELINE_DOC),
  });
  // Snapshot passing results as the new regression baseline.
  await saveLatestResults(OPTIONS.inferenceMode);
  if (IS_GEMINI_MODE && OPTIONS.updateBaseline) {
    await updateGeminiBaselineDoc(geminiPreflight, {
      gateStatus: "passed",
      artifactsPath: path.relative(ROOT, RUN_DIR),
    });
  }
  await updateProofStatusDoc({ rootDir: ROOT });

  console.log(`Release gate passed (${OPTIONS.inferenceMode}).`);
}

process.on("SIGINT", () => {
  cleanup().finally(() => process.exit(130));
});
process.on("SIGTERM", () => {
  cleanup().finally(() => process.exit(143));
});

main()
  .catch(async (error) => {
    await ensureRunDir();
    const failurePatch = {
      status: "failed",
      failed_at: new Date().toISOString(),
      error_message: error instanceof Error ? error.message : String(error),
    };
    if (error && typeof error === "object" && "ollamaPreflightDetails" in error && error.ollamaPreflightDetails) {
      failurePatch.ollama_preflight_artifact = path.relative(ROOT, error.ollamaPreflightDetails.artifact_path);
      failurePatch.host_preflight_status = error.ollamaPreflightDetails.status;
    }
    if (error && typeof error === "object" && "preflightDetails" in error && error.preflightDetails) {
      failurePatch.real_preflight_artifact = path.relative(ROOT, REAL_PREFLIGHT_FILE);
    }
    if (error && typeof error === "object" && "geminiPreflightDetails" in error && error.geminiPreflightDetails) {
      failurePatch.gemini_preflight_artifact = path.relative(ROOT, error.geminiPreflightDetails.artifact_path);
      failurePatch.gemini_auth_present = error.geminiPreflightDetails.auth_present;
      failurePatch.gemini_run_guard_enabled = error.geminiPreflightDetails.run_guard_enabled;
      failurePatch.gemini_model_ids = error.geminiPreflightDetails.model_ids;
    }
    if (existsSync(EVAL_RESULTS_FILE)) {
      failurePatch.eval_results_file = path.relative(ROOT, EVAL_RESULTS_FILE);
    }
    await writeRunSummary(failurePatch);
    // Preserve the latest passing hosted proof as the canonical baseline.
    // Failed Gemini reruns stay in artifacts/logs until a later passing rerun replaces them.
    await updateProofStatusDoc({ rootDir: ROOT });
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
  });
