import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUTPUT_ROOT = path.join(ROOT, "output", "vertex-endpoints");
const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-");
const RUN_DIR = path.join(OUTPUT_ROOT, RUN_ID);

const TARGETS = [
  {
    tier: "live",
    modelId: "google/gemma3@gemma-3-4b-it",
    modelEnvKey: "PRAIRIE_VERTEX_MODEL_ID_LIVE",
    endpointEnvKey: "PRAIRIE_VERTEX_ENDPOINT_LIVE",
    endpointDisplayName: "prairieclassroom-live-gemma-3-4b-it",
  },
  {
    tier: "planning",
    modelId: "google/gemma3@gemma-3-27b-it",
    modelEnvKey: "PRAIRIE_VERTEX_MODEL_ID_PLANNING",
    endpointEnvKey: "PRAIRIE_VERTEX_ENDPOINT_PLANNING",
    endpointDisplayName: "prairieclassroom-planning-gemma-3-27b-it",
  },
];

const QUOTA_IDS = [
  "CustomModelServingL4GPUsPerProjectPerRegion",
  "CustomModelServingA10080GBGPUsPerProjectPerRegion",
  "CustomModelServingH100GPUsPerProjectPerRegion",
];

function parseArgs(argv) {
  const options = {
    project: process.env.GOOGLE_CLOUD_PROJECT?.trim() || "",
    region: process.env.GOOGLE_CLOUD_LOCATION?.trim() || "us-central1",
    listOnly: false,
    forceDeploy: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--list-only") {
      options.listOnly = true;
      continue;
    }
    if (token === "--force-deploy") {
      options.forceDeploy = true;
      continue;
    }
    if (token === "--project" && argv[index + 1]) {
      options.project = argv[index + 1];
      index += 1;
      continue;
    }
    if (token.startsWith("--project=")) {
      options.project = token.slice("--project=".length);
      continue;
    }
    if (token === "--region" && argv[index + 1]) {
      options.region = argv[index + 1];
      index += 1;
      continue;
    }
    if (token.startsWith("--region=")) {
      options.region = token.slice("--region=".length);
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  if (!options.project) {
    throw new Error("GOOGLE_CLOUD_PROJECT is required. Export it or pass --project.");
  }

  return options;
}

const OPTIONS = parseArgs(process.argv.slice(2));

async function ensureRunDir() {
  await mkdir(RUN_DIR, { recursive: true });
}

function runLabel(step) {
  return `${step}`.replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
}

async function writeArtifact(name, content) {
  const filePath = path.join(RUN_DIR, name);
  await writeFile(filePath, content, "utf8");
  return filePath;
}

function stripJsonPreamble(stdout) {
  const objectIndex = stdout.indexOf("{");
  const arrayIndex = stdout.indexOf("[");
  const start = [objectIndex, arrayIndex]
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0];
  if (start === undefined) {
    throw new Error(`Command did not emit JSON:\n${stdout}`);
  }
  return stdout.slice(start);
}

async function runCommand(command, args, { allowFailure = false } = {}) {
  const stdout = [];
  const stderr = [];
  let exitCode = null;
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      env: { ...process.env, CLOUDSDK_CORE_DISABLE_PROMPTS: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      exitCode = code;
      if (code === 0 || allowFailure) {
        resolve(undefined);
        return;
      }
      reject(
        new Error(
          `${command} ${args.join(" ")} failed with code ${code}\n${Buffer.concat(stderr).toString("utf8")}`,
        ),
      );
    });
  });

  return {
    code: exitCode,
    stdout: Buffer.concat(stdout).toString("utf8"),
    stderr: Buffer.concat(stderr).toString("utf8"),
  };
}

async function runJsonCommand(command, args, artifactName) {
  const result = await runCommand(command, args);
  await writeArtifact(artifactName, `${result.stdout}${result.stderr}`);
  return JSON.parse(stripJsonPreamble(result.stdout));
}

function extractOperationName(text) {
  const fullMatch = text.match(/projects\/[0-9]+\/locations\/[a-z0-9-]+\/operations\/[0-9]+/i);
  if (fullMatch) {
    return fullMatch[0];
  }

  const idMatch = text.match(/gcloud ai operations describe ([0-9]+)/i);
  if (idMatch) {
    return `projects/${process.env.GOOGLE_CLOUD_PROJECT || OPTIONS.project}/locations/${OPTIONS.region}/operations/${idMatch[1]}`;
  }

  return null;
}

function rankDeploymentConfigs(target, configs) {
  return configs
    .map((config, index) => {
      const sampleRequest = config.deployMetadata?.sampleRequest || "";
      const machineSpec = config.dedicatedResources?.machineSpec || {};
      let score = 0;
      const isGenerateRoute = config.containerSpec?.predictRoute === "/generate";
      const isChatCompletions = sampleRequest.includes('"@requestFormat": "chatCompletions"');
      const acceleratorType = machineSpec.acceleratorType ?? "";
      const acceleratorCount = machineSpec.acceleratorCount ?? 99;
      const machineType = machineSpec.machineType ?? "";

      if (!String(config.deployTaskName || "").toLowerCase().includes("vllm")) {
        score += 1000;
      }
      if (!isGenerateRoute) {
        score += 5_000;
      }
      if (!isChatCompletions) {
        score += 5_000;
      }
      if (acceleratorType === "NVIDIA_RTX_PRO_6000") {
        score += 10_000;
      }
      if (target.tier === "live") {
        if (acceleratorType === "NVIDIA_L4" && acceleratorCount === 2 && machineType === "g2-standard-24") {
          score -= 10_000;
        }
      }
      if (target.tier === "planning") {
        if (acceleratorType === "NVIDIA_L4" && acceleratorCount === 4 && machineType === "g2-standard-48") {
          score -= 10_000;
        } else if (acceleratorType === "NVIDIA_L4" && acceleratorCount === 8 && machineType === "g2-standard-96") {
          score -= 9_000;
        }
      }

      score += acceleratorCount * 10;
      score += machineType === "g4-standard-48" ? 0 : 1;
      return { config, index, score };
    })
    .sort((left, right) => left.score - right.score);
}

function readyReplicaCount(endpoint) {
  if (!Array.isArray(endpoint.deployedModels)) {
    return 0;
  }
  return endpoint.deployedModels.reduce(
    (count, model) => count + Number(model?.status?.availableReplicaCount ?? 0),
    0,
  );
}

function findExistingEndpoint(endpoints, displayName, { requireReady = false } = {}) {
  const matches = endpoints
    .filter((endpoint) => endpoint.displayName === displayName && endpoint.name)
    .sort((left, right) => {
      const readyDelta = readyReplicaCount(right) - readyReplicaCount(left);
      if (readyDelta !== 0) {
        return readyDelta;
      }
      return String(right.updateTime ?? "").localeCompare(String(left.updateTime ?? ""));
    });

  if (requireReady) {
    return matches.find((endpoint) => readyReplicaCount(endpoint) > 0) ?? null;
  }

  return matches[0] ?? null;
}

function endpointExports(entries) {
  const lines = [
    `export GOOGLE_CLOUD_PROJECT=${OPTIONS.project}`,
    `export GOOGLE_CLOUD_LOCATION=${OPTIONS.region}`,
    "export PRAIRIE_VERTEX_BACKEND=endpoint",
  ];

  for (const entry of entries) {
    if (entry.endpointResourceName) {
      lines.push(`export ${entry.endpointEnvKey}=${entry.endpointResourceName}`);
    }
    lines.push(`export ${entry.modelEnvKey}=${entry.modelId}`);
  }

  return lines;
}

function operationId(operationName) {
  return operationName.split("/").pop() ?? operationName;
}

async function describeOperation(operationName, artifactName) {
  const result = await runCommand(
    "gcloud",
    [
      "ai",
      "operations",
      "describe",
      operationId(operationName),
      "--region",
      OPTIONS.region,
      "--project",
      OPTIONS.project,
      "--billing-project",
      OPTIONS.project,
      "--format=json",
    ],
    { allowFailure: true },
  );

  await writeArtifact(artifactName, `${result.stdout}${result.stderr}`);
  if (result.code !== 0) {
    return {
      status: "error",
      error: result.stderr.trim() || result.stdout.trim() || `Operation describe failed with code ${result.code}`,
    };
  }

  return JSON.parse(stripJsonPreamble(result.stdout));
}

function operationErrorSummary(operation) {
  if (!operation || typeof operation !== "object") {
    return null;
  }
  if ("status" in operation && operation.status === "error") {
    return operation.error;
  }
  if (operation.error?.message) {
    return operation.error.message;
  }
  const partialFailures = operation.metadata?.partialFailures;
  if (Array.isArray(partialFailures) && partialFailures.length > 0) {
    return partialFailures
      .map((failure) => failure.message || JSON.stringify(failure))
      .join("; ");
  }
  return null;
}

async function waitForEndpoint(displayName, options = {}) {
  const startedAt = Date.now();
  let lastOperation = null;

  while (Date.now() - startedAt < 90 * 60 * 1000) {
    const endpoints = await listEndpoints();
    const endpoint = findExistingEndpoint(endpoints, displayName, { requireReady: true });
    if (endpoint?.name) {
      return { endpoint, operation: lastOperation };
    }

    if (options.operationName) {
      lastOperation = await describeOperation(
        options.operationName,
        `${options.artifactPrefix ?? runLabel(displayName)}-operation.json`,
      );
      const operationError = operationErrorSummary(lastOperation);
      if (operationError) {
        throw new Error(
          `Deployment operation ${options.operationName} failed before endpoint ${displayName} appeared: ${operationError}`,
        );
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 30_000));
  }

  const operationError = operationErrorSummary(lastOperation);
  if (operationError) {
    throw new Error(
      `Deployment operation ${options.operationName} did not yield endpoint ${displayName}: ${operationError}`,
    );
  }

  throw new Error(`Timed out waiting for endpoint ${displayName} to appear`);
}

async function listEndpoints() {
  return runJsonCommand(
      "gcloud",
    [
      "ai",
      "endpoints",
      "list",
      "--region",
      OPTIONS.region,
      "--project",
      OPTIONS.project,
      "--billing-project",
      OPTIONS.project,
      "--format=json",
    ],
    "endpoints.json",
  );
}

async function captureQuotaState(prefix) {
  await runJsonCommand(
    "gcloud",
    [
      "beta",
      "quotas",
      "preferences",
      "list",
      "--project",
      OPTIONS.project,
      "--format=json",
    ],
    `${prefix}-quota-preferences.json`,
  );

  for (const quotaId of QUOTA_IDS) {
    await runJsonCommand(
      "gcloud",
      [
        "beta",
        "quotas",
        "info",
        "describe",
        quotaId,
        "--service=aiplatform.googleapis.com",
        "--project",
        OPTIONS.project,
        "--format=json",
      ],
      `${prefix}-${quotaId}.json`,
    );
  }
}

async function main() {
  await ensureRunDir();
  console.log(`Vertex endpoint artifacts: ${RUN_DIR}`);
  await captureQuotaState("before");

  const manifest = {
    generated_at: new Date().toISOString(),
    project: OPTIONS.project,
    region: OPTIONS.region,
    list_only: OPTIONS.listOnly,
    force_deploy: OPTIONS.forceDeploy,
    endpoints: [],
    failures: [],
  };

  let endpoints = await listEndpoints();

  for (const target of TARGETS) {
    const configs = await runJsonCommand(
      "gcloud",
      [
        "ai",
        "model-garden",
        "models",
        "list-deployment-config",
        `--model=${target.modelId}`,
        "--project",
        OPTIONS.project,
        "--billing-project",
        OPTIONS.project,
        "--format=json",
      ],
      `${target.tier}-deployment-configs.json`,
    );

    const rankedConfigs = rankDeploymentConfigs(target, configs).map((item) => item.config);
    const recommendedConfig = rankedConfigs[0] ?? null;
    if (!recommendedConfig) {
      const failure = `No verified deployment config found for ${target.modelId}`;
      manifest.failures.push({ tier: target.tier, modelId: target.modelId, error: failure });
      manifest.endpoints.push({
        tier: target.tier,
        modelId: target.modelId,
        endpointEnvKey: target.endpointEnvKey,
        modelEnvKey: target.modelEnvKey,
        endpointDisplayName: target.endpointDisplayName,
        selectedConfig: null,
        failedAttempts: [],
        endpointResourceName: null,
        operationName: null,
        operationDone: false,
        action: "failed",
        blockingError: failure,
      });
      continue;
    }

    const existing = !OPTIONS.forceDeploy
      ? findExistingEndpoint(endpoints, target.endpointDisplayName, { requireReady: true })
      : null;

    const entry = {
      tier: target.tier,
      modelId: target.modelId,
      endpointEnvKey: target.endpointEnvKey,
      modelEnvKey: target.modelEnvKey,
      endpointDisplayName: target.endpointDisplayName,
      selectedConfig: {
        deployTaskName: recommendedConfig.deployTaskName,
        machineType: recommendedConfig.dedicatedResources?.machineSpec?.machineType,
        acceleratorType: recommendedConfig.dedicatedResources?.machineSpec?.acceleratorType,
        acceleratorCount: recommendedConfig.dedicatedResources?.machineSpec?.acceleratorCount,
        predictRoute: recommendedConfig.containerSpec?.predictRoute,
        healthRoute: recommendedConfig.containerSpec?.healthRoute,
      },
      failedAttempts: [],
      endpointResourceName: existing?.name ?? null,
      operationName: null,
      operationDone: existing ? true : null,
      action: existing ? "reused" : OPTIONS.listOnly ? "listed" : "deploy",
      blockingError: null,
    };

    if (!existing && !OPTIONS.listOnly) {
      let deploymentSucceeded = false;
      let lastError = null;

      for (const config of rankedConfigs) {
        const machineSpec = config.dedicatedResources?.machineSpec || {};
        try {
          const deployArgs = [
            "ai",
            "model-garden",
            "models",
            "deploy",
            `--model=${target.modelId}`,
            "--project",
            OPTIONS.project,
            "--billing-project",
            OPTIONS.project,
            "--region",
            OPTIONS.region,
            "--accept-eula",
            "--asynchronous",
            `--endpoint-display-name=${target.endpointDisplayName}`,
            `--machine-type=${machineSpec.machineType}`,
            `--accelerator-type=${machineSpec.acceleratorType}`,
            `--accelerator-count=${machineSpec.acceleratorCount}`,
            "--format=json",
          ];
          const deployOutput = await runCommand("gcloud", deployArgs);
          const artifactName = `${target.tier}-${machineSpec.machineType}-${machineSpec.acceleratorType ?? "cpu"}-deploy.json`;
          await writeArtifact(artifactName, `${deployOutput.stdout}${deployOutput.stderr}`);

          let deployResult = null;
          try {
            deployResult = JSON.parse(stripJsonPreamble(deployOutput.stdout));
          } catch {
            deployResult = null;
          }

          const operationName =
            deployResult?.name ||
            deployResult?.operation?.name ||
            extractOperationName(`${deployOutput.stdout}\n${deployOutput.stderr}`);
          if (!operationName) {
            throw new Error(`Could not determine deployment operation for ${target.modelId}`);
          }

          entry.selectedConfig = {
            deployTaskName: config.deployTaskName,
            machineType: machineSpec.machineType,
            acceleratorType: machineSpec.acceleratorType,
            acceleratorCount: machineSpec.acceleratorCount,
            predictRoute: config.containerSpec?.predictRoute,
            healthRoute: config.containerSpec?.healthRoute,
          };
          entry.operationName = operationName;
          const { endpoint: deployedEndpoint, operation } = await waitForEndpoint(target.endpointDisplayName, {
            operationName,
            artifactPrefix: `${target.tier}-${machineSpec.machineType}-${machineSpec.acceleratorType ?? "cpu"}`,
          });
          entry.operationDone = operation?.done ?? true;
          endpoints = await listEndpoints();
          entry.endpointResourceName = deployedEndpoint.name;
          deploymentSucceeded = true;
          break;
        } catch (error) {
          lastError = error;
          entry.failedAttempts.push({
            machineType: machineSpec.machineType,
            acceleratorType: machineSpec.acceleratorType,
            acceleratorCount: machineSpec.acceleratorCount,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      if (!deploymentSucceeded) {
        entry.action = "failed";
        entry.operationDone = false;
        entry.blockingError = lastError instanceof Error ? lastError.message : String(lastError);
        manifest.failures.push({
          tier: target.tier,
          modelId: target.modelId,
          error: entry.blockingError,
          failedAttempts: entry.failedAttempts,
        });
      }
    }

    manifest.endpoints.push(entry);
  }

  await writeArtifact("manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
  const exportsBlock = endpointExports(manifest.endpoints).join("\n");
  await writeArtifact("exports.sh", `${exportsBlock}\n`);
  await captureQuotaState("after");

  console.log("\nProvisioning summary:");
  for (const entry of manifest.endpoints) {
    const status = entry.blockingError ? `${entry.action}: ${entry.blockingError}` : entry.action;
    console.log(`- ${entry.tier}: ${entry.endpointResourceName ?? "<not provisioned>"} (${status})`);
  }

  console.log("\nExports for release:gate:real:");
  console.log(exportsBlock);

  if (manifest.failures.length > 0) {
    const summary = manifest.failures
      .map((failure) => `${failure.tier}: ${failure.error}`)
      .join("\n");
    throw new Error(`One or more endpoint tiers remain blocked.\n${summary}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
