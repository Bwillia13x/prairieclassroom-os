import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

export const GEMINI_API_KEY_ENV_VARS = ["PRAIRIE_GEMINI_API_KEY", "GEMINI_API_KEY"];
export const GEMINI_RUN_GUARD_ENV_VAR = "PRAIRIE_ENABLE_GEMINI_RUNS";
export const DEFAULT_GEMINI_MODEL_IDS = {
  live: "gemma-4-26b-a4b-it",
  planning: "gemma-4-31b-it",
};

function truthyFlag(value) {
  return ["1", "true", "yes", "on"].includes((value ?? "").trim().toLowerCase());
}

export function resolveGeminiConfig(env = process.env) {
  const apiKeyEnvVar = GEMINI_API_KEY_ENV_VARS.find((name) => {
    const value = env[name];
    return typeof value === "string" && value.trim().length > 0;
  }) ?? null;
  const apiKey = apiKeyEnvVar ? env[apiKeyEnvVar].trim() : "";
  const runGuardEnabled = truthyFlag(env[GEMINI_RUN_GUARD_ENV_VAR]);

  return {
    apiKey,
    apiKeyEnvVar,
    authPresent: apiKey.length > 0,
    runGuardEnabled,
    modelIds: {
      live: env.PRAIRIE_GEMINI_MODEL_ID_LIVE?.trim() || DEFAULT_GEMINI_MODEL_IDS.live,
      planning: env.PRAIRIE_GEMINI_MODEL_ID_PLANNING?.trim() || DEFAULT_GEMINI_MODEL_IDS.planning,
    },
  };
}

export function assertGeminiRunsAllowed(env = process.env, action = "Hosted Gemini run") {
  const config = resolveGeminiConfig(env);
  if (!config.authPresent) {
    throw new Error("Gemini API key is not configured. Set PRAIRIE_GEMINI_API_KEY or GEMINI_API_KEY.");
  }
  if (!config.runGuardEnabled) {
    throw new Error(
      `${action} is disabled by default. Export ${GEMINI_RUN_GUARD_ENV_VAR}=true to allow a hosted Gemini run intentionally.`,
    );
  }
  return config;
}

export async function writeGeminiPreflight({ artifactPath, env = process.env, now = new Date() }) {
  const config = resolveGeminiConfig(env);
  const missingAuth = !config.authPresent;
  const guardDisabled = config.authPresent && !config.runGuardEnabled;
  const artifact = {
    generated_at: now.toISOString(),
    artifact_path: artifactPath,
    status: missingAuth ? "missing_api_key" : guardDisabled ? "runs_disabled" : "ok",
    category: missingAuth ? "auth" : guardDisabled ? "operator" : null,
    summary: missingAuth
      ? "Gemini API key is not configured. Set PRAIRIE_GEMINI_API_KEY or GEMINI_API_KEY."
      : guardDisabled
        ? `Hosted Gemini runs are disabled by default. Export ${GEMINI_RUN_GUARD_ENV_VAR}=true to enable a hosted run intentionally.`
        : "Gemini API key is configured and hosted Gemini runs are explicitly enabled.",
    auth_present: config.authPresent,
    api_key_env_var: config.apiKeyEnvVar,
    run_guard_env_var: GEMINI_RUN_GUARD_ENV_VAR,
    run_guard_enabled: config.runGuardEnabled,
    model_ids: config.modelIds,
  };

  await mkdir(path.dirname(artifactPath), { recursive: true });
  await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  return artifact;
}
