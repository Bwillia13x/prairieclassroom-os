"""
PrairieClassroom OS — Ollama Inference Backend

Calls a locally running Ollama instance (default: http://localhost:11434) via
the /api/chat endpoint.  Follows the same interface as VertexAIBackend so the
GemmaHarness can swap backends transparently.

Environment variables:
  OLLAMA_URL                   — base URL for the Ollama server (default: http://localhost:11434)
  PRAIRIE_OLLAMA_LIVE          — model tag for the LIVE tier   (default: gemma4:4b)
  PRAIRIE_OLLAMA_PLANNING      — model tag for the PLANNING tier (default: gemma4:27b)
"""

from __future__ import annotations

import base64
import json
import os
import time
from typing import Any

import requests

from harness import (
    GenerationRequest,
    GenerationResponse,
    ModelTier,
    extract_json,
)


class OllamaBackend:
    """Calls a local Ollama server for zero-cost Gemma 4 inference."""

    # Delimiters that separate system instruction from user content —
    # mirrors the list used by VertexAIBackend._split_prompt.
    _PROMPT_DELIMITERS = [
        "\n\nCLASSROOM CONTEXT:",
        "\n\nARTIFACT:",
        "\n\nTEACHER INPUT:",
        "\n\nSTUDENT TEXT:",
        "\n\nINTERVENTION NOTE:",
        "\n\nSOURCE TEXT:",
        "\n\nCLASSROOM MEMORY:",
        "\n\nWORKSHEET IMAGE:",
    ]

    def __init__(
        self,
        ollama_url: str | None = None,
        live_model: str | None = None,
        planning_model: str | None = None,
    ) -> None:
        self.ollama_url = (
            ollama_url
            or os.environ.get("OLLAMA_URL", "http://localhost:11434")
        ).rstrip("/")
        self.live_model = (
            live_model
            or os.environ.get("PRAIRIE_OLLAMA_LIVE", "gemma4:4b")
        )
        self.planning_model = (
            planning_model
            or os.environ.get("PRAIRIE_OLLAMA_PLANNING", "gemma4:27b")
        )

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def generate(self, request: GenerationRequest) -> GenerationResponse:
        model = self._model_for_tier(request.model_tier)
        messages = self._build_messages(request)

        payload: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "stream": False,
            "options": {
                "num_predict": request.max_tokens,
                "temperature": 0.7,
            },
        }

        if request.thinking:
            payload["think"] = True

        if request.images:
            encoded_images = self._encode_images(request.images)
            if encoded_images:
                payload["images"] = encoded_images

        start = time.perf_counter()
        try:
            response = requests.post(
                f"{self.ollama_url}/api/chat",
                json=payload,
                timeout=300,
            )
        except Exception as exc:
            latency_ms = (time.perf_counter() - start) * 1000
            return GenerationResponse(
                text=json.dumps({"error": str(exc)}),
                model_id=model,
                latency_ms=latency_ms,
            )

        latency_ms = (time.perf_counter() - start) * 1000

        if response.status_code >= 400:
            return GenerationResponse(
                text=json.dumps(
                    {"error": f"HTTP {response.status_code}: {response.text}"}
                ),
                model_id=model,
                latency_ms=latency_ms,
            )

        try:
            response_payload = response.json()
        except Exception:
            response_payload = {"message": {"content": response.text}}

        output_text, thinking_text = self._extract_generation(response_payload)
        output_text = extract_json(output_text)

        return GenerationResponse(
            text=output_text,
            thinking_text=thinking_text,
            model_id=model,
            latency_ms=latency_ms,
        )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _model_for_tier(self, tier: ModelTier) -> str:
        if tier == ModelTier.PLANNING:
            return self.planning_model
        return self.live_model

    @staticmethod
    def _split_prompt(prompt: str) -> tuple[str | None, str]:
        """Split a prompt into (system_instruction, user_text) at the first delimiter."""
        for delimiter in OllamaBackend._PROMPT_DELIMITERS:
            idx = prompt.find(delimiter)
            if idx > 0:
                system_instruction = prompt[:idx].strip()
                user_text = prompt[idx:].strip()
                return system_instruction, user_text
        return None, prompt

    def _build_messages(self, request: GenerationRequest) -> list[dict[str, Any]]:
        system_instruction, user_text = self._split_prompt(request.prompt)
        messages: list[dict[str, Any]] = []

        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})

        messages.append({"role": "user", "content": user_text})
        return messages

    @staticmethod
    def _encode_images(image_paths: list[str]) -> list[str]:
        """Read image files and return base64-encoded strings."""
        encoded: list[str] = []
        for path in image_paths:
            try:
                with open(path, "rb") as fh:
                    encoded.append(base64.b64encode(fh.read()).decode("ascii"))
            except OSError:
                continue
        return encoded

    @staticmethod
    def _extract_generation(payload: dict[str, Any]) -> tuple[str, str | None]:
        """Extract (content, thinking) from an Ollama /api/chat response."""
        message = payload.get("message", {})
        if isinstance(message, dict):
            content = message.get("content", "")
            thinking = message.get("thinking") or None
            return str(content), thinking
        return json.dumps(payload), None
