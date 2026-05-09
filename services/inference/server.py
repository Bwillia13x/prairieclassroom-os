"""
PrairieClassroom OS — Inference HTTP Server

Wraps the Gemma harness as a lightweight HTTP API (Flask) so the
TypeScript orchestrator can call it over HTTP.

Endpoints:
  POST /generate   — generate text from a prompt
  GET  /health     — health check

Usage:
  python server.py --mode mock --port 3200
  python server.py --mode mock --host 0.0.0.0 --port 3200
"""

from __future__ import annotations

import json
import hmac
import os
import time
from flask import Flask, Response, request, jsonify, stream_with_context
from harness import GemmaHarness, InferenceMode, GenerationRequest, ModelTier, require_gemini_run_guard

app = Flask(__name__)
harness: GemmaHarness | None = None

INFERENCE_AUTH_TOKEN_ENV = "PRAIRIE_INFERENCE_AUTH_TOKEN"
MAX_IMAGE_PAYLOADS = 4
MAX_IMAGE_BASE64_BYTES = 12 * 1024 * 1024
DEFAULT_MAX_TOKENS_CAP = 8192


def _configured_auth_token() -> str:
    return os.environ.get(INFERENCE_AUTH_TOKEN_ENV, "").strip()


def _requires_configured_auth(mode: str) -> bool:
    return mode in {InferenceMode.GEMINI.value, InferenceMode.API.value}


def _request_auth_token() -> str:
    header = request.headers.get("Authorization", "").strip()
    if header.lower().startswith("bearer "):
        return header[7:].strip()
    return request.headers.get("X-Prairie-Inference-Token", "").strip()


def _authorize_inference_request():
    token = _configured_auth_token()
    if not token:
        return None
    if not hmac.compare_digest(_request_auth_token(), token):
        return jsonify({
            "error": "Inference authorization required.",
            "category": "auth",
            "retryable": False,
            "detail_code": "inference_auth_required",
        }), 401
    return None


def _read_json_body():
    try:
        body = request.get_json(force=True)
    except Exception:
        return None, (jsonify({"error": "Invalid JSON request body"}), 400)
    if not isinstance(body, dict):
        return None, (jsonify({"error": "Request body must be a JSON object"}), 400)
    return body, None


def _parse_max_tokens(value) -> tuple[int | None, object | None]:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None, (jsonify({"error": "max_tokens must be an integer"}), 400)
    cap = int(os.environ.get("PRAIRIE_INFERENCE_MAX_TOKENS", str(DEFAULT_MAX_TOKENS_CAP)))
    if parsed < 1 or parsed > cap:
        return None, (jsonify({"error": f"max_tokens must be between 1 and {cap}"}), 400)
    return parsed, None


def _parse_image_payloads(body: dict) -> tuple[list[dict[str, str]] | None, object | None]:
    if "images" in body:
        return None, (jsonify({
            "error": "Path-based images are not accepted over the inference HTTP API. Use image_payloads.",
            "category": "validation",
            "retryable": False,
            "detail_code": "path_images_rejected",
        }), 400)

    raw_payloads = body.get("image_payloads", [])
    if raw_payloads is None:
        raw_payloads = []
    if not isinstance(raw_payloads, list) or len(raw_payloads) > MAX_IMAGE_PAYLOADS:
        return None, (jsonify({"error": f"image_payloads must be a list of at most {MAX_IMAGE_PAYLOADS} items"}), 400)

    payloads: list[dict[str, str]] = []
    for raw in raw_payloads:
        if not isinstance(raw, dict):
            return None, (jsonify({"error": "Each image_payloads item must be an object"}), 400)
        mime_type = str(raw.get("mime_type", "")).strip()
        data_base64 = str(raw.get("data_base64", "")).strip()
        if not mime_type.startswith("image/"):
            return None, (jsonify({"error": "image_payloads items must declare an image/* mime_type"}), 400)
        if not data_base64 or len(data_base64) > MAX_IMAGE_BASE64_BYTES:
            return None, (jsonify({"error": "image_payloads data_base64 is missing or too large"}), 400)
        payloads.append({"mime_type": mime_type, "data_base64": data_base64})
    return payloads, None


def _generation_request_from_body(body: dict) -> tuple[GenerationRequest | None, object | None]:
    if "prompt" not in body:
        return None, (jsonify({"error": "Missing 'prompt' in request body"}), 400)
    if not isinstance(body["prompt"], str):
        return None, (jsonify({"error": "prompt must be a string"}), 400)

    tier_str = body.get("model_tier", "live")
    try:
        tier = ModelTier(tier_str)
    except ValueError:
        return None, (jsonify({"error": f"Invalid model_tier: {tier_str}"}), 400)

    max_tokens, max_tokens_error = _parse_max_tokens(body.get("max_tokens", 2048))
    if max_tokens_error is not None:
        return None, max_tokens_error

    image_payloads, image_payloads_error = _parse_image_payloads(body)
    if image_payloads_error is not None:
        return None, image_payloads_error

    return GenerationRequest(
        prompt=body["prompt"],
        image_payloads=image_payloads or [],
        thinking=body.get("thinking", False),
        tools=body.get("tools"),
        tool_interactions=body.get("tool_interactions"),
        model_tier=tier,
        max_tokens=max_tokens or 2048,
        prompt_class=body.get("prompt_class"),
        mock_context=body.get("mock_context"),
    ), None

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
    auth_error = _authorize_inference_request()
    if auth_error is not None:
        return auth_error

    if harness is None:
        return jsonify({"error": "Harness not initialized"}), 503

    body, body_error = _read_json_body()
    if body_error is not None:
        return body_error

    test_behavior_resp = _apply_eval_behavior(body)
    if test_behavior_resp is not None:
        return test_behavior_resp

    gen_req, gen_req_error = _generation_request_from_body(body)
    if gen_req_error is not None:
        return gen_req_error

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


def _sse_event(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def _response_payload(resp, total_ms: float) -> dict:
    return {
        "text": resp.text,
        "tool_calls": resp.tool_calls,
        "thinking_text": resp.thinking_text,
        "model_id": resp.model_id,
        "latency_ms": resp.latency_ms or total_ms,
        "prompt_tokens": resp.prompt_tokens,
        "output_tokens": resp.output_tokens,
        "total_tokens": resp.total_tokens,
    }


@app.route("/generate/stream", methods=["POST"])
def generate_stream():
    auth_error = _authorize_inference_request()
    if auth_error is not None:
        return auth_error

    if harness is None:
        return jsonify({"error": "Harness not initialized"}), 503

    body, body_error = _read_json_body()
    if body_error is not None:
        return body_error

    test_behavior_resp = _apply_eval_behavior(body)
    if test_behavior_resp is not None:
        return test_behavior_resp

    gen_req, gen_req_error = _generation_request_from_body(body)
    if gen_req_error is not None:
        return gen_req_error

    @stream_with_context
    def event_stream():
        start = time.perf_counter()
        yield _sse_event("ready", {"mode": harness.mode.value})
        try:
            for event in harness.generate_stream(gen_req):
                if event.type == "chunk" and event.text:
                    yield _sse_event("chunk", {"text": event.text})
                    continue
                if event.type == "thinking" and event.text:
                    yield _sse_event("thinking", {"text": event.text})
                    continue
                if event.type != "complete" or event.response is None:
                    continue

                total_ms = (time.perf_counter() - start) * 1000
                resp = event.response
                if not resp.text or not resp.text.strip():
                    yield _sse_event("error", {
                        "error": "Empty model response — possible safety filter or refusal",
                        "latency_ms": resp.latency_ms or total_ms,
                    })
                    return
                if resp.text.startswith('{"error"'):
                    yield _sse_event("error", {
                        "error": resp.text,
                        "latency_ms": resp.latency_ms or total_ms,
                    })
                    return

                yield _sse_event("complete", _response_payload(resp, total_ms))
                return
        except Exception as e:
            total_ms = (time.perf_counter() - start) * 1000
            yield _sse_event("error", {"error": str(e), "latency_ms": total_ms})

    return Response(
        event_stream(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


def create_app(mode: str = "mock", model_id: str | None = None, port: int = 3200, host: str = "127.0.0.1") -> None:
    global harness
    if mode == InferenceMode.GEMINI.value:
        require_gemini_run_guard()
    if _requires_configured_auth(mode) and not _configured_auth_token():
        raise RuntimeError(
            f"{INFERENCE_AUTH_TOKEN_ENV} is required when running inference mode '{mode}'."
        )
    harness = GemmaHarness(mode=InferenceMode(mode), model_id=model_id)
    print(f"Inference server starting — mode={mode}, host={host}, port={port}")
    app.run(host=host, port=port, debug=False)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Inference HTTP server")
    parser.add_argument("--mode", choices=["mock", "api", "local", "ollama", "gemini"], default="mock")
    parser.add_argument("--model-id", type=str, default=None)
    parser.add_argument("--host", type=str, default=os.environ.get("PRAIRIE_INFERENCE_HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("PRAIRIE_INFERENCE_PORT", "3200")))
    args = parser.parse_args()
    create_app(mode=args.mode, model_id=args.model_id, port=args.port, host=args.host)
