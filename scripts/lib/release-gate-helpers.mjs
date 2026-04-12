export const RELEASE_GATE_MODES = ["mock", "ollama", "api", "gemini"];

export function parseReleaseGateArgs(argv) {
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

  if (!RELEASE_GATE_MODES.includes(options.inferenceMode)) {
    throw new Error(`Unsupported inference mode: ${options.inferenceMode}`);
  }

  return options;
}

export function releaseGateCommandForMode(inferenceMode) {
  if (inferenceMode === "api") {
    return "release:gate:real";
  }
  if (inferenceMode === "ollama") {
    return "release:gate:ollama";
  }
  if (inferenceMode === "gemini") {
    return "release:gate:gemini";
  }
  return "release:gate";
}

export function releaseGateEvalLabelForMode(inferenceMode) {
  if (inferenceMode === "api") {
    return "real";
  }
  return inferenceMode;
}
