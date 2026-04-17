"""
PrairieClassroom OS — Inference HTTP Server

Wraps the Gemma harness as a lightweight HTTP API (Flask) so the
TypeScript orchestrator can call it over HTTP.

Endpoints:
  POST /generate   — generate text from a prompt
  GET  /health     — health check

Usage:
  python server.py --mode mock --port 3200
"""

from __future__ import annotations

import json
import time
from flask import Flask, request, jsonify
from harness import GemmaHarness, InferenceMode, GenerationRequest, ModelTier, require_gemini_run_guard

app = Flask(__name__)
harness: GemmaHarness | None = None

def _apply_eval_behavior(body: dict) -> tuple[object, int] | None:
    if harness is None or harness.mode.value != "mock":
        return None

    context = body.get("mock_context") or {}
    behavior = context.get("__test_behavior")
    if not isinstance(behavior, str) or not behavior:
        return None

    if behavior.startswith("sleep_ms:"):
        try:
            delay_ms = max(0, int(behavior.split(":", 1)[1]))
            time.sleep(delay_ms / 1000)
        except ValueError:
            pass
        return None

    if behavior == "invalid_json":
        return "{not-json", 200
    if behavior == "empty_text":
        return jsonify({"error": "Empty model response — simulated for eval", "latency_ms": 0}), 502
    if behavior == "http_503":
        return jsonify({"error": "Simulated retryable inference error", "latency_ms": 0}), 503

    return None


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "mode": harness.mode.value if harness else "uninitialized"})


@app.route("/generate", methods=["POST"])
def generate():
    if harness is None:
        return jsonify({"error": "Harness not initialized"}), 503

    body = request.get_json(force=True)
    if not body or "prompt" not in body:
        return jsonify({"error": "Missing 'prompt' in request body"}), 400

    test_behavior_resp = _apply_eval_behavior(body)
    if test_behavior_resp is not None:
        return test_behavior_resp

    tier_str = body.get("model_tier", "live")
    try:
        tier = ModelTier(tier_str)
    except ValueError:
        return jsonify({"error": f"Invalid model_tier: {tier_str}"}), 400

    gen_req = GenerationRequest(
        prompt=body["prompt"],
        images=body.get("images", []),
        thinking=body.get("thinking", False),
        tools=body.get("tools"),
        tool_interactions=body.get("tool_interactions"),
        model_tier=tier,
        max_tokens=body.get("max_tokens", 2048),
        prompt_class=body.get("prompt_class"),
        mock_context=body.get("mock_context"),  # optional dev-only fixture context; ignored outside mock mode
    )

    start = time.perf_counter()
    try:
        resp = harness.generate(gen_req)
    except Exception as e:
        total_ms = (time.perf_counter() - start) * 1000
        return jsonify({"error": str(e), "latency_ms": total_ms}), 502
    total_ms = (time.perf_counter() - start) * 1000

    # Check for empty response (safety filter / no candidates) or embedded error
    if not resp.text or not resp.text.strip():
        return jsonify({"error": "Empty model response — possible safety filter or refusal", "latency_ms": resp.latency_ms or total_ms}), 502
    if resp.text.startswith('{"error"'):
        return jsonify({"error": resp.text, "latency_ms": resp.latency_ms or total_ms}), 502

    return jsonify({
        "text": resp.text,
        "tool_calls": resp.tool_calls,
        "thinking_text": resp.thinking_text,
        "model_id": resp.model_id,
        "latency_ms": resp.latency_ms or total_ms,
        "prompt_tokens": resp.prompt_tokens,
        "output_tokens": resp.output_tokens,
        "total_tokens": resp.total_tokens,
    })


def create_app(mode: str = "mock", model_id: str | None = None, port: int = 3200) -> None:
    global harness
    if mode == InferenceMode.GEMINI.value:
        require_gemini_run_guard()
    harness = GemmaHarness(mode=InferenceMode(mode), model_id=model_id)
    print(f"Inference server starting — mode={mode}, port={port}")
    app.run(host="127.0.0.1", port=port, debug=False)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Inference HTTP server")
    parser.add_argument("--mode", choices=["mock", "api", "local", "ollama", "gemini"], default="mock")
    parser.add_argument("--model-id", type=str, default=None)
    parser.add_argument("--port", type=int, default=3200)
    args = parser.parse_args()
    create_app(mode=args.mode, model_id=args.model_id, port=args.port)
