import { spawn, spawnSync } from "node:child_process";
import { createWriteStream, existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const INFERENCE_DIR = path.join(ROOT, "services", "inference");
const OUTPUT_ROOT = path.join(ROOT, "output", "release-gate");
const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-");
const RUN_DIR = path.join(OUTPUT_ROOT, RUN_ID);

const HOST = "127.0.0.1";
const INFERENCE_PORT = 3200;
const ORCHESTRATOR_PORT = 3100;
const WEB_PORT = 5173;
const INFERENCE_URL = `http://${HOST}:${INFERENCE_PORT}`;
const ORCHESTRATOR_URL = `http://${HOST}:${ORCHESTRATOR_PORT}`;
const WEB_URL = `http://localhost:${WEB_PORT}`;
const DEMO_CLASSROOM_FILE = path.join(ROOT, "data", "synthetic_classrooms", "classroom_demo.json");

const managedChildren = [];

function parseArgs(argv) {
  const options = {
    inferenceMode: "mock",
    updateBaseline: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--update-baseline") {
      options.updateBaseline = true;
      continue;
    }
    if (token === "--inference-mode" && argv[index + 1]) {
      options.inferenceMode = argv[index + 1];
      index += 1;
      continue;
    }
    if (token.startsWith("--inference-mode=")) {
      options.inferenceMode = token.slice("--inference-mode=".length);
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  if (!["mock", "api"].includes(options.inferenceMode)) {
    throw new Error(`Unsupported inference mode: ${options.inferenceMode}`);
  }

  return options;
}

const OPTIONS = parseArgs(process.argv.slice(2));
const IS_REAL_MODE = OPTIONS.inferenceMode === "api";
const EVAL_DATE = new Date().toISOString().slice(0, 10);
const EVAL_OUTPUT_DIR = path.join(ROOT, "output", "evals", `${EVAL_DATE}-real`);
const EVAL_OUTPUT_BASENAME = `${RUN_ID}-real`;
const EVAL_RESULTS_FILE = path.join(EVAL_OUTPUT_DIR, `${EVAL_OUTPUT_BASENAME}-results.json`);
const EVAL_BASELINE_DOC = path.join(ROOT, "docs", "eval-baseline.md");
const REAL_PREFLIGHT_FILE = path.join(RUN_DIR, "real-preflight.json");
const REAL_BACKEND = process.env.PRAIRIE_VERTEX_BACKEND?.trim() || "";
const REAL_MODEL_IDS = {
  live: process.env.PRAIRIE_VERTEX_MODEL_ID_LIVE?.trim() || "google/gemma-4-4b-it",
  planning: process.env.PRAIRIE_VERTEX_MODEL_ID_PLANNING?.trim() || "google/gemma-4-27b-it",
};
const REAL_ENDPOINTS = {
  live: process.env.PRAIRIE_VERTEX_ENDPOINT_LIVE?.trim() || "",
  planning: process.env.PRAIRIE_VERTEX_ENDPOINT_PLANNING?.trim() || "",
};
const PYTHON_BIN = resolvePythonBin();

function bin(name) {
  return process.platform === "win32" ? `${name}.cmd` : name;
}

function resolvePythonBin() {
  const configured = process.env.PRAIRIE_PYTHON?.trim();
  if (configured) {
    return configured;
  }

  const candidatePaths = [
    path.join(
      INFERENCE_DIR,
      ".venv",
      process.platform === "win32" ? "Scripts" : "bin",
      process.platform === "win32" ? "python.exe" : "python",
    ),
    path.join(
      INFERENCE_DIR,
      ".venv311",
      process.platform === "win32" ? "Scripts" : "bin",
      process.platform === "win32" ? "python.exe" : "python",
    ),
    "python3.11",
    "python3",
  ];

  for (const candidate of candidatePaths) {
    if (candidate.includes(path.sep) && !existsSync(candidate)) {
      continue;
    }

    const versionCheck = spawnSync(candidate, ["-c", "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"], {
      encoding: "utf8",
    });
    if (versionCheck.status === 0 && versionCheck.stdout.trim() === "3.11") {
      return candidate;
    }
  }

  return "python3";
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

async function verifyNodeVersion() {
  const expected = (await readFile(path.join(ROOT, ".nvmrc"), "utf8")).trim();
  if (process.version !== expected) {
    throw new Error(
      `Node version mismatch. Expected ${expected} from .nvmrc, got ${process.version}. Run \`nvm use\` before \`npm run ${IS_REAL_MODE ? "release:gate:real" : "release:gate"}\`.`,
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
      `Playwright Chromium is not installed at ${executable}. Run \`npx playwright install chromium\` before \`npm run ${IS_REAL_MODE ? "release:gate:real" : "release:gate"}\`.`,
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
  const match = text.match(/(google/gemma-4-[^'"`\s,]+)/i);
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

async function updateEvalBaselineDoc(realPreflight = null) {
  if (!existsSync(EVAL_RESULTS_FILE)) {
    throw new Error(`Eval results file not found at ${EVAL_RESULTS_FILE}. The eval runner did not produce artifacts.`);
  }

  const payload = JSON.parse(await readFile(EVAL_RESULTS_FILE, "utf8"));
  const results = payload.results ?? [];
  const models = payload.models ?? [];
  const passedCases = payload.passed_cases ?? 0;
  const totalCases = payload.total_cases ?? results.length;
  const statusLabel = passedCases === totalCases ? "Passing" : "Failing";
  const buckets = parseFailureBuckets(results);
  const routeSummary = summarizeByRoute(results);
  const project = process.env.GOOGLE_CLOUD_PROJECT?.trim() ?? "<unset>";
  const location = process.env.GOOGLE_CLOUD_LOCATION?.trim() || "us-central1";
  const principal = realPreflight?.principal_email ?? "<unknown>";
  const detectedProject = realPreflight?.detected_project ?? "<unknown>";
  const quotaProject = realPreflight?.quota_project ?? "<unset>";
  const configuredBackend = (realPreflight?.configured_backend ?? REAL_BACKEND) || "<unset>";
  const configuredEndpoints = realPreflight?.configured_endpoints ?? REAL_ENDPOINTS;
  const configuredModelIds = realPreflight?.configured_model_ids ?? REAL_MODEL_IDS;

  const markdown = [
    "# Eval Baseline — Real Inference",
    "",
    `**Status:** ${statusLabel} baseline — ${passedCases}/${totalCases} evals passed.`,
    `**Run date:** ${payload.generated_at ?? new Date().toISOString()}`,
    `**Project:** \`${project}\``,
    `**Location:** \`${location}\``,
    `**ADC principal:** \`${principal}\``,
    `**ADC detected project:** \`${detectedProject}\``,
    `**ADC quota project:** \`${quotaProject}\``,
    `**Backend mode:** \`${configuredBackend}\``,
    `**Configured live endpoint:** \`${configuredEndpoints.live ?? "<unset>"}\``,
    `**Configured planning endpoint:** \`${configuredEndpoints.planning ?? "<unset>"}\``,
    `**Requested model identifiers:** \`${configuredModelIds.live}\`, \`${configuredModelIds.planning}\``,
    `**Model identifiers observed:** ${models.length > 0 ? models.map((model) => `\`${model}\``).join(", ") : "_No model identifiers recorded_"}`,
    `**Raw artifacts:** \`${path.relative(ROOT, EVAL_OUTPUT_DIR)}\``,
    "",
    "## Commands",
    "",
    "```bash",
    `export GOOGLE_CLOUD_PROJECT=${project}`,
    `export GOOGLE_CLOUD_LOCATION=${location}`,
    `export PRAIRIE_VERTEX_BACKEND=${configuredBackend}`,
    `export PRAIRIE_VERTEX_ENDPOINT_LIVE=${configuredEndpoints.live ?? "<unset>"}`,
    `export PRAIRIE_VERTEX_ENDPOINT_PLANNING=${configuredEndpoints.planning ?? "<unset>"}`,
    `export PRAIRIE_VERTEX_MODEL_ID_LIVE=${configuredModelIds.live}`,
    `export PRAIRIE_VERTEX_MODEL_ID_PLANNING=${configuredModelIds.planning}`,
    "python3 services/inference/harness.py --mode api --smoke-test",
    "npm run release:gate:real",
    "```",
    "",
    "## Route Summary",
    "",
    "| Route | Cases | Passed |",
    "|-------|-------|--------|",
    ...routeSummary.map(([route, summary]) => `| ${route} | ${summary.total} | ${summary.passed}/${summary.total} |`),
    "",
    "## Failure Ledger",
    "",
    "### Auth / Startup",
    renderAuthStartupList(buckets.auth_startup),
    "",
    "### Parse / Schema",
    renderFailureList(buckets.parse_schema),
    "",
    "### Safety",
    renderFailureList(buckets.safety),
    "",
    "### Content Quality",
    renderFailureList(buckets.content_quality),
    "",
    "## Mock Reference",
    "",
    "Mock mode remains the structural reference path and should still pass `npm run release:gate` after any real-inference changes.",
  ].join("\n");

  await writeFile(EVAL_BASELINE_DOC, `${markdown}\n`, "utf8");
}

async function updateEvalBaselineDocFromPreflight(realPreflight) {
  const project = realPreflight?.configured_project ?? process.env.GOOGLE_CLOUD_PROJECT?.trim() ?? "<unset>";
  const location = realPreflight?.configured_location ?? (process.env.GOOGLE_CLOUD_LOCATION?.trim() || "us-central1");
  const principal = realPreflight?.principal_email ?? "<unknown>";
  const detectedProject = realPreflight?.detected_project ?? "<unknown>";
  const quotaProject = realPreflight?.quota_project ?? "<unset>";
  const configuredBackend = (realPreflight?.configured_backend ?? REAL_BACKEND) || "<unset>";
  const configuredEndpoints = realPreflight?.configured_endpoints ?? REAL_ENDPOINTS;
  const configuredModelIds = realPreflight?.configured_model_ids ?? REAL_MODEL_IDS;

  const markdown = [
    "# Eval Baseline — Real Inference",
    "",
    "**Status:** Blocked before evals — real preflight failed.",
    `**Run date:** ${new Date().toISOString()}`,
    `**Project:** \`${project}\``,
    `**Location:** \`${location}\``,
    `**ADC principal:** \`${principal}\``,
    `**ADC detected project:** \`${detectedProject}\``,
    `**ADC quota project:** \`${quotaProject}\``,
    `**Backend mode:** \`${configuredBackend}\``,
    `**Configured live endpoint:** \`${configuredEndpoints.live ?? "<unset>"}\``,
    `**Configured planning endpoint:** \`${configuredEndpoints.planning ?? "<unset>"}\``,
    `**Requested model identifiers:** \`${configuredModelIds.live}\`, \`${configuredModelIds.planning}\``,
    `**Raw artifacts:** \`${path.relative(ROOT, RUN_DIR)}\``,
    "",
    "## Commands",
    "",
    "```bash",
    `export GOOGLE_CLOUD_PROJECT=${project}`,
    `export GOOGLE_CLOUD_LOCATION=${location}`,
    `export PRAIRIE_VERTEX_BACKEND=${configuredBackend}`,
    `export PRAIRIE_VERTEX_ENDPOINT_LIVE=${configuredEndpoints.live ?? "<unset>"}`,
    `export PRAIRIE_VERTEX_ENDPOINT_PLANNING=${configuredEndpoints.planning ?? "<unset>"}`,
    `export PRAIRIE_VERTEX_MODEL_ID_LIVE=${configuredModelIds.live}`,
    `export PRAIRIE_VERTEX_MODEL_ID_PLANNING=${configuredModelIds.planning}`,
    "python services/inference/harness.py --mode api --smoke-test",
    "npm run release:gate:real",
    "```",
    "",
    "## Preflight Probes",
    "",
    renderPreflightProbeList(realPreflight),
    "",
    "## Failure Ledger",
    "",
    "### Auth / Startup",
    `- ${formatProbeFailureSummary(realPreflight)}`,
    "",
    "### Parse / Schema",
    "- None (evals did not run)",
    "",
    "### Safety",
    "- None (evals did not run)",
    "",
    "### Content Quality",
    "- None (evals did not run)",
    "",
    "## Mock Reference",
    "",
    "Mock mode remains the structural reference path and should still pass `npm run release:gate` after any real-inference changes.",
  ].join("\n");

  await writeFile(EVAL_BASELINE_DOC, `${markdown}\n`, "utf8");
}

async function withRestoredDemoClassroom(fn) {
  const original = await readFile(DEMO_CLASSROOM_FILE);
  try {
    return await fn();
  } finally {
    await writeFile(DEMO_CLASSROOM_FILE, original);
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
  console.log(`Release gate logs: ${RUN_DIR}`);
  console.log(`Release gate Python: ${PYTHON_BIN}`);

  await verifyNodeVersion();
  await verifyPlaywrightBrowser();

  let realPreflight = null;
  if (IS_REAL_MODE) {
    try {
      realPreflight = await runRealPreflight();
    } catch (error) {
      if (OPTIONS.updateBaseline && error && typeof error === "object" && "preflightDetails" in error && error.preflightDetails) {
        await updateEvalBaselineDocFromPreflight(error.preflightDetails);
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
        : undefined,
    },
  );
  await waitForUrl("Inference service", `${INFERENCE_URL}/health`, { processInfo: inference });

  const orchestrator = spawnManaged("20-orchestrator", bin("npx"), ["tsx", "services/orchestrator/server.ts"], {
    env: { INFERENCE_URL },
  });
  await waitForUrl("Orchestrator", `${ORCHESTRATOR_URL}/health`, { processInfo: orchestrator });

  const web = spawnManaged("30-web", bin("npm"), ["run", "dev", "-w", "apps/web"]);
  await waitForUrl("Web app", `${WEB_URL}/?demo=true`, { processInfo: web });

  await runStep("40-typecheck", bin("npm"), ["run", "typecheck"]);
  await runStep("50-lint", bin("npm"), ["run", "lint"]);
  await runStep("60-py-compile", PYTHON_BIN, ["-m", "py_compile", "services/inference/harness.py", "services/inference/server.py"]);
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
        : undefined,
    });
  } catch (error) {
    if (!IS_REAL_MODE) {
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
      await updateEvalBaselineDoc(realPreflight);
    }

    if (harnessSmokeError || evalError) {
      const messages = [harnessSmokeError, evalError]
        .filter(Boolean)
        .map((error) => error instanceof Error ? error.message : String(error));
      throw new Error(messages.join("\n"));
    }
  }

  await runStep("80-smoke-api", bin("npm"), ["run", "smoke:api"], {
    env: { PRAIRIE_API_BASE: ORCHESTRATOR_URL },
  });
  await runStep("90-smoke-browser", bin("npm"), ["run", "smoke:browser"], {
    env: {
      PRAIRIE_API_BASE: ORCHESTRATOR_URL,
      PRAIRIE_WEB_BASE: WEB_URL,
    },
  });

  console.log(`Release gate passed (${OPTIONS.inferenceMode}).`);
}

process.on("SIGINT", () => {
  cleanup().finally(() => process.exit(130));
});
process.on("SIGTERM", () => {
  cleanup().finally(() => process.exit(143));
});

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
  });
