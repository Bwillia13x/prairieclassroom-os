"""Tests for GeminiAPIBackend."""
from __future__ import annotations

import base64
import json
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

import harness as harness_module
from harness import (
    GeminiAPIBackend,
    GenerationRequest,
    GenerationResponse,
    ModelTier,
    VertexAIBackend,
    extract_tool_calls,
    require_gemini_run_guard,
)


TOOL_DEF = {
    "name": "lookup_curriculum_outcome",
    "description": "Look up Alberta curriculum focus items.",
    "parameters": {
        "type": "object",
        "properties": {
            "grade": {"type": "string"},
            "subject": {"type": "string"},
            "keyword": {"type": "string"},
        },
        "required": ["grade", "subject", "keyword"],
    },
}


class FakeClient:
    def __init__(self, api_key: str, http_options=None) -> None:
        self.api_key = api_key
        self.http_options = http_options
        self.models = MagicMock()


class FakeHttpOptions:
    def __init__(self, timeout=None) -> None:
        self.timeout = timeout


def test_missing_api_key_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("PRAIRIE_GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    with pytest.raises(RuntimeError, match="Gemini API key is required"):
        GeminiAPIBackend(client=None)


def test_env_key_lookup_prefers_prairie_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PRAIRIE_GEMINI_API_KEY", "prairie-key")
    monkeypatch.setenv("GEMINI_API_KEY", "fallback-key")
    monkeypatch.setattr(
        harness_module,
        "genai",
        SimpleNamespace(Client=FakeClient, types=SimpleNamespace(HttpOptions=FakeHttpOptions)),
    )

    backend = GeminiAPIBackend()

    assert backend.api_key == "prairie-key"
    assert isinstance(backend.client, FakeClient)
    assert backend.client.api_key == "prairie-key"
    assert backend.client.http_options.timeout == 100_000
    assert backend.http_timeout_ms_by_tier[ModelTier.LIVE] == 100_000
    assert backend.http_timeout_ms_by_tier[ModelTier.PLANNING] == 120_000
    assert backend.client_by_tier[ModelTier.PLANNING].http_options.timeout == 120_000


def test_http_timeout_prefers_env_override(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PRAIRIE_GEMINI_API_KEY", "prairie-key")
    monkeypatch.setenv("PRAIRIE_GEMINI_HTTP_TIMEOUT_MS", "45000")
    monkeypatch.setattr(
        harness_module,
        "genai",
        SimpleNamespace(Client=FakeClient, types=SimpleNamespace(HttpOptions=FakeHttpOptions)),
    )

    backend = GeminiAPIBackend()

    assert backend.http_timeout_ms_by_tier[ModelTier.LIVE] == 45_000
    assert backend.http_timeout_ms_by_tier[ModelTier.PLANNING] == 45_000
    assert backend.client.http_options.timeout == 45_000


def test_model_for_tier_uses_hosted_defaults() -> None:
    backend = GeminiAPIBackend(api_key="demo-key", client=MagicMock())

    assert backend._model_for_tier(ModelTier.LIVE) == "gemma-4-26b-a4b-it"
    assert backend._model_for_tier(ModelTier.PLANNING) == "gemma-4-31b-it"


def test_build_contents_and_config_for_text_prompt() -> None:
    backend = GeminiAPIBackend(api_key="demo-key", client=MagicMock())
    req = GenerationRequest(
        prompt="You are a helper.\n\nCLASSROOM CONTEXT:\nGrade 4 split class",
        model_tier=ModelTier.LIVE,
        max_tokens=321,
    )

    contents = backend._build_contents(req)
    config = backend._build_config(req)

    assert contents == [{"role": "user", "parts": [{"text": "CLASSROOM CONTEXT:\nGrade 4 split class"}]}]
    assert config["system_instruction"] == "You are a helper."
    assert config["max_output_tokens"] == 321
    # Structured-output mode locks Gemini into JSON for every PrairieClassroom call.
    assert config["response_mime_type"] == "application/json"


def test_build_config_forwards_function_declarations() -> None:
    backend = GeminiAPIBackend(api_key="demo-key", client=MagicMock())
    req = GenerationRequest(
        prompt="You are a helper.\n\nCLASSROOM CONTEXT:\nGrade 3",
        model_tier=ModelTier.LIVE,
        tools=[TOOL_DEF],
    )

    config = backend._build_config(req)

    assert config["tools"] == [{
        "function_declarations": [TOOL_DEF],
    }]


def test_build_contents_adds_gemini_function_response_history() -> None:
    backend = GeminiAPIBackend(api_key="demo-key", client=MagicMock())
    req = GenerationRequest(
        prompt="You are a helper.\n\nCLASSROOM CONTEXT:\nGrade 3",
        model_tier=ModelTier.LIVE,
        tool_interactions=[{
            "tool_call_id": "call_1",
            "tool_name": "lookup_curriculum_outcome",
            "arguments": {"grade": "3", "subject": "math", "keyword": "multiplication"},
            "result": {"ok": True, "matches": [{"outcome_id": "ab-math-3"}]},
            "thought_signature": "opaque-signature",
        }],
    )

    contents = backend._build_contents(req)

    assert contents[0] == {"role": "user", "parts": [{"text": "CLASSROOM CONTEXT:\nGrade 3"}]}
    assert contents[1] == {
        "role": "model",
        "parts": [{
            "function_call": {
                "name": "lookup_curriculum_outcome",
                "args": {"grade": "3", "subject": "math", "keyword": "multiplication"},
                "id": "call_1",
            },
            "thought_signature": "opaque-signature",
        }],
    }
    assert contents[2] == {
        "role": "user",
        "parts": [{
            "function_response": {
                "name": "lookup_curriculum_outcome",
                "response": {"result": {"ok": True, "matches": [{"outcome_id": "ab-math-3"}]}},
                "id": "call_1",
            }
        }],
    }


def test_build_contents_for_image_prompt(tmp_path: Path) -> None:
    fake_image = tmp_path / "worksheet.png"
    fake_image.write_bytes(b"\x89PNG\r\n\x1a\n" + b"\x00" * 16)

    backend = GeminiAPIBackend(api_key="demo-key", client=MagicMock())
    req = GenerationRequest(
        prompt="Extract the worksheet text",
        images=[str(fake_image)],
        model_tier=ModelTier.LIVE,
    )

    contents = backend._build_contents(req)
    parts = contents[0]["parts"]

    assert parts[0]["inline_data"]["mime_type"] == "image/png"
    assert base64.b64decode(parts[0]["inline_data"]["data"]) == fake_image.read_bytes()
    assert parts[1] == {"text": "Extract the worksheet text"}


def test_extract_generation_reads_text_and_thoughts() -> None:
    payload = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {"thought": True, "text": "First, inspect the classroom memory."},
                        {"text": '{"answer": "ok"}'},
                    ]
                }
            }
        ]
    }

    text, thinking = GeminiAPIBackend._extract_generation(payload)

    assert text == '{"answer": "ok"}'
    assert thinking == "First, inspect the classroom memory."


def test_extract_tool_calls_reads_gemini_function_call_parts() -> None:
    payload = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {
                            "thought_signature": "opaque-signature",
                            "function_call": {
                                "id": "call_1",
                                "name": "lookup_curriculum_outcome",
                                "args": {
                                    "grade": "3",
                                    "subject": "math",
                                    "keyword": "multiplication",
                                },
                            }
                        }
                    ]
                }
            }
        ]
    }

    assert extract_tool_calls(payload) == [{
        "id": "call_1",
        "thought_signature": "opaque-signature",
        "name": "lookup_curriculum_outcome",
        "arguments": {
            "grade": "3",
            "subject": "math",
            "keyword": "multiplication",
        },
    }]


def test_vertex_payload_forwards_openai_style_tools() -> None:
    backend = VertexAIBackend.__new__(VertexAIBackend)
    payload = backend._build_payload(GenerationRequest(
        prompt="You are a helper.\n\nCLASSROOM CONTEXT:\nGrade 3",
        model_tier=ModelTier.LIVE,
        tools=[TOOL_DEF],
    ))

    instance = payload["instances"][0]
    assert instance["tools"] == [{
        "type": "function",
        "function": TOOL_DEF,
    }]
    assert instance["tool_choice"] == "auto"


def test_vertex_payload_adds_openai_tool_result_messages() -> None:
    backend = VertexAIBackend.__new__(VertexAIBackend)
    payload = backend._build_payload(GenerationRequest(
        prompt="You are a helper.\n\nCLASSROOM CONTEXT:\nGrade 3",
        model_tier=ModelTier.LIVE,
        tools=[TOOL_DEF],
        tool_interactions=[{
            "tool_call_id": "call_1",
            "tool_name": "lookup_curriculum_outcome",
            "arguments": {"grade": "3"},
            "result": {"ok": True},
        }],
    ))

    messages = payload["instances"][0]["messages"]
    assert messages[2] == {
        "role": "assistant",
        "content": None,
        "tool_calls": [{
            "id": "call_1",
            "type": "function",
            "function": {
                "name": "lookup_curriculum_outcome",
                "arguments": "{\"grade\":\"3\"}",
            },
        }],
    }
    assert messages[3] == {
        "role": "tool",
        "tool_call_id": "call_1",
        "content": "{\"ok\":true}",
    }


def test_generate_returns_error_response_when_client_raises() -> None:
    client = MagicMock()
    client.models.generate_content.side_effect = RuntimeError("bad api key")
    backend = GeminiAPIBackend(api_key="demo-key", client=client)
    req = GenerationRequest(prompt="Hello", model_tier=ModelTier.LIVE)

    resp = backend.generate(req)

    assert isinstance(resp, GenerationResponse)
    payload = json.loads(resp.text)
    assert payload["error"] == "bad api key"


def test_require_gemini_run_guard_rejects_missing_flag() -> None:
    with pytest.raises(RuntimeError, match="PRAIRIE_ENABLE_GEMINI_RUNS=true"):
        require_gemini_run_guard({})


def test_require_gemini_run_guard_accepts_truthy_flag() -> None:
    require_gemini_run_guard({"PRAIRIE_ENABLE_GEMINI_RUNS": "true"})


def test_extract_usage_reads_snake_case_metadata() -> None:
    response = SimpleNamespace(
        usage_metadata=SimpleNamespace(
            prompt_token_count=120,
            candidates_token_count=80,
            total_token_count=200,
        )
    )

    prompt_t, output_t, total_t = GeminiAPIBackend._extract_usage(response)

    assert (prompt_t, output_t, total_t) == (120, 80, 200)


def test_extract_usage_falls_back_to_camel_case_dict() -> None:
    response = {"usageMetadata": {"promptTokenCount": 17, "candidatesTokenCount": 33}}

    prompt_t, output_t, total_t = GeminiAPIBackend._extract_usage(response)

    assert (prompt_t, output_t, total_t) == (17, 33, 50)


def test_extract_usage_returns_nones_when_missing() -> None:
    assert GeminiAPIBackend._extract_usage(SimpleNamespace()) == (None, None, None)
    assert GeminiAPIBackend._extract_usage({"candidates": []}) == (None, None, None)


def test_generate_populates_token_counts() -> None:
    response = SimpleNamespace(
        text='{"answer": "ok"}',
        candidates=[SimpleNamespace(content=SimpleNamespace(parts=[SimpleNamespace(text='{"answer": "ok"}')]))],
        usage_metadata=SimpleNamespace(prompt_token_count=10, candidates_token_count=5, total_token_count=15),
    )
    client = MagicMock()
    client.models.generate_content.return_value = response

    backend = GeminiAPIBackend(api_key="demo-key", client=client)
    resp = backend.generate(GenerationRequest(prompt="Hello", model_tier=ModelTier.LIVE))

    assert resp.prompt_tokens == 10
    assert resp.output_tokens == 5
    assert resp.total_tokens == 15
