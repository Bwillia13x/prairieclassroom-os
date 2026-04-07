"""Tests for OllamaBackend."""
from __future__ import annotations

import base64
import json
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from harness import GenerationRequest, GenerationResponse, ModelTier, extract_json
from ollama_backend import OllamaBackend


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _mock_response(content: str, thinking: str | None = None, status_code: int = 200) -> MagicMock:
    """Build a mock requests.Response for Ollama /api/chat."""
    message: dict = {"role": "assistant", "content": content}
    if thinking is not None:
        message["thinking"] = thinking
    payload = {"message": message, "done": True}
    mock_resp = MagicMock()
    mock_resp.status_code = status_code
    mock_resp.json.return_value = payload
    mock_resp.text = json.dumps(payload)
    return mock_resp


# ---------------------------------------------------------------------------
# Unit tests
# ---------------------------------------------------------------------------

class TestModelForTier:
    def test_live_tier_returns_small_model(self) -> None:
        backend = OllamaBackend(live_model="gemma4:4b", planning_model="gemma4:27b")
        assert backend._model_for_tier(ModelTier.LIVE) == "gemma4:4b"

    def test_planning_tier_returns_large_model(self) -> None:
        backend = OllamaBackend(live_model="gemma4:4b", planning_model="gemma4:27b")
        assert backend._model_for_tier(ModelTier.PLANNING) == "gemma4:27b"


class TestTextGeneration:
    @patch("ollama_backend.requests.post")
    def test_text_prompt_returns_valid_response(self, mock_post: MagicMock) -> None:
        mock_post.return_value = _mock_response('{"result": "ok"}')
        backend = OllamaBackend()
        req = GenerationRequest(prompt="Hello", model_tier=ModelTier.LIVE)
        resp = backend.generate(req)

        assert isinstance(resp, GenerationResponse)
        assert resp.text
        assert resp.latency_ms >= 0
        mock_post.assert_called_once()

    @patch("ollama_backend.requests.post")
    def test_response_model_id_is_set(self, mock_post: MagicMock) -> None:
        mock_post.return_value = _mock_response('{"answer": 42}')
        backend = OllamaBackend(live_model="gemma4:4b")
        req = GenerationRequest(prompt="Count to 1", model_tier=ModelTier.LIVE)
        resp = backend.generate(req)
        assert "gemma4:4b" in resp.model_id


class TestPlanningTier:
    @patch("ollama_backend.requests.post")
    def test_planning_tier_sends_think_true(self, mock_post: MagicMock) -> None:
        mock_post.return_value = _mock_response('{"plan": []}')
        backend = OllamaBackend()
        req = GenerationRequest(
            prompt="Plan tomorrow's lesson",
            model_tier=ModelTier.PLANNING,
            thinking=True,
        )
        backend.generate(req)

        _, kwargs = mock_post.call_args
        payload = kwargs.get("json") or mock_post.call_args[0][1] if len(mock_post.call_args[0]) > 1 else mock_post.call_args.kwargs.get("json")
        # Extract posted JSON
        posted_json = mock_post.call_args.kwargs.get("json") or mock_post.call_args[1].get("json")
        assert posted_json.get("think") is True

    @patch("ollama_backend.requests.post")
    def test_planning_tier_no_thinking_flag_omits_think(self, mock_post: MagicMock) -> None:
        mock_post.return_value = _mock_response('{"plan": []}')
        backend = OllamaBackend()
        req = GenerationRequest(
            prompt="Plan tomorrow's lesson",
            model_tier=ModelTier.PLANNING,
            thinking=False,
        )
        backend.generate(req)
        posted_json = mock_post.call_args.kwargs.get("json") or mock_post.call_args[1].get("json")
        assert "think" not in posted_json


class TestImagePrompt:
    @patch("ollama_backend.requests.post")
    def test_image_prompt_includes_base64_in_payload(
        self, mock_post: MagicMock, tmp_path: Path
    ) -> None:
        # Create a fake image file
        fake_image = tmp_path / "worksheet.png"
        fake_image.write_bytes(b"\x89PNG\r\n\x1a\n" + b"\x00" * 16)

        mock_post.return_value = _mock_response('{"extracted": "text"}')
        backend = OllamaBackend()
        req = GenerationRequest(
            prompt="Extract text from this worksheet",
            images=[str(fake_image)],
            model_tier=ModelTier.LIVE,
        )
        backend.generate(req)

        posted_json = mock_post.call_args.kwargs.get("json") or mock_post.call_args[1].get("json")
        assert "images" in posted_json
        assert len(posted_json["images"]) == 1
        # Verify it is valid base64
        decoded = base64.b64decode(posted_json["images"][0])
        assert decoded == fake_image.read_bytes()

    @patch("ollama_backend.requests.post")
    def test_no_images_omits_images_key(self, mock_post: MagicMock) -> None:
        mock_post.return_value = _mock_response('{"text": "hello"}')
        backend = OllamaBackend()
        req = GenerationRequest(prompt="No images here", model_tier=ModelTier.LIVE)
        backend.generate(req)
        posted_json = mock_post.call_args.kwargs.get("json") or mock_post.call_args[1].get("json")
        assert "images" not in posted_json


class TestErrorHandling:
    @patch("ollama_backend.requests.post")
    def test_connection_error_returns_error_response(self, mock_post: MagicMock) -> None:
        import requests as req_lib
        mock_post.side_effect = req_lib.exceptions.ConnectionError("Connection refused")
        backend = OllamaBackend()
        req = GenerationRequest(prompt="Hello", model_tier=ModelTier.LIVE)
        resp = backend.generate(req)

        assert isinstance(resp, GenerationResponse)
        assert "error" in resp.text
        error_data = json.loads(resp.text)
        assert "error" in error_data

    @patch("ollama_backend.requests.post")
    def test_http_error_returns_error_response(self, mock_post: MagicMock) -> None:
        mock_post.return_value = _mock_response("Internal Server Error", status_code=500)
        backend = OllamaBackend()
        req = GenerationRequest(prompt="Hello", model_tier=ModelTier.LIVE)
        resp = backend.generate(req)

        assert isinstance(resp, GenerationResponse)
        assert "error" in resp.text


class TestThinkingExtraction:
    @patch("ollama_backend.requests.post")
    def test_thinking_text_extracted_when_present(self, mock_post: MagicMock) -> None:
        mock_post.return_value = _mock_response(
            content='{"answer": "yes"}',
            thinking="Let me think about this carefully...",
        )
        backend = OllamaBackend()
        req = GenerationRequest(
            prompt="Is this a good plan?",
            thinking=True,
            model_tier=ModelTier.PLANNING,
        )
        resp = backend.generate(req)
        assert resp.thinking_text == "Let me think about this carefully..."

    @patch("ollama_backend.requests.post")
    def test_thinking_text_none_when_absent(self, mock_post: MagicMock) -> None:
        mock_post.return_value = _mock_response(content='{"answer": "yes"}')
        backend = OllamaBackend()
        req = GenerationRequest(prompt="Simple question", model_tier=ModelTier.LIVE)
        resp = backend.generate(req)
        assert resp.thinking_text is None


class TestSplitPrompt:
    def test_no_delimiter_returns_none_system(self) -> None:
        system, user = OllamaBackend._split_prompt("Just a plain prompt.")
        assert system is None
        assert user == "Just a plain prompt."

    def test_classroom_context_delimiter_splits_correctly(self) -> None:
        prompt = "You are a teacher assistant.\n\nCLASSROOM CONTEXT:\nGrade 5, 28 students."
        system, user = OllamaBackend._split_prompt(prompt)
        assert system == "You are a teacher assistant."
        assert "CLASSROOM CONTEXT" in user

    def test_worksheet_image_delimiter(self) -> None:
        prompt = "Analyze the worksheet.\n\nWORKSHEET IMAGE:\nimage data here"
        system, user = OllamaBackend._split_prompt(prompt)
        assert system == "Analyze the worksheet."
        assert "WORKSHEET IMAGE" in user
