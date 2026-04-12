function normalize(text) {
  return text.toLowerCase();
}

export function categorizeEvalFailure(result) {
  const joined = normalize((result.failures ?? []).join(" "));

  if (/host preflight|ollama cli|missing required ollama models|ollama_unavailable|missing_models/.test(joined)) {
    return "host_preflight";
  }
  if (/validation|request_body_invalid|body invalid|oversized|too long/.test(joined)) {
    return "validation";
  }
  if (/timed out|inference_timeout|timeout/.test(joined)) {
    return "timeout";
  }
  if (/transport|unavailable|econnrefused|network|fetch failed|inference_transport_error/.test(joined)) {
    return "transport";
  }
  if (/parse|invalid json|raw_output|parse failed/.test(joined)) {
    return "parse";
  }
  if (/schema|missing required key|missing key|required key|response missing text/.test(joined)) {
    return "schema";
  }
  if (/retrieval|pattern report found|no retrieval context|cold memory|latest pattern/.test(joined) || result.category === "retrieval_relevance") {
    return "retrieval";
  }
  return "schema";
}

export function buildEvalFailureSummary(results, hostPreflight = null) {
  const groups = {
    validation: [],
    transport: [],
    timeout: [],
    parse: [],
    schema: [],
    retrieval: [],
    host_preflight: [],
  };

  for (const result of results) {
    if (result.passed) {
      continue;
    }
    const bucket = categorizeEvalFailure(result);
    groups[bucket].push({
      case_id: result.case_id,
      endpoint: result.endpoint ?? null,
      prompt_class: result.prompt_class ?? null,
      source_file: result.source_file ?? null,
      failures: result.failures ?? [],
    });
  }

  if (hostPreflight && hostPreflight.status !== "ok") {
    groups.host_preflight.push({
      case_id: null,
      endpoint: null,
      prompt_class: null,
      source_file: hostPreflight.artifact_path ?? null,
      failures: [hostPreflight.summary ?? "Host preflight failed"],
    });
  }

  return {
    generated_at: new Date().toISOString(),
    total_failures: Object.values(groups).reduce((sum, entries) => sum + entries.length, 0),
    groups,
  };
}
