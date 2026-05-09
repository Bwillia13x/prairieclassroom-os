"""Security boundary tests for the inference HTTP server."""
from __future__ import annotations

from types import SimpleNamespace

import pytest

import server as inference_server
from harness import GenerationResponse


class StubHarness:
    mode = SimpleNamespace(value="mock")

    def __init__(self) -> None:
        self.last_request = None

    def generate(self, request):
        self.last_request = request
        return GenerationResponse(text='{"ok":true}', model_id="stub")

    def generate_stream(self, request):
        self.last_request = request
        yield SimpleNamespace(type="complete", response=GenerationResponse(text='{"ok":true}', model_id="stub"))


@pytest.fixture()
def client(monkeypatch: pytest.MonkeyPatch):
    stub = StubHarness()
    monkeypatch.setattr(inference_server, "harness", stub)
    return inference_server.app.test_client(), stub


def test_generate_requires_configured_auth_token(client, monkeypatch: pytest.MonkeyPatch) -> None:
    http, _stub = client
    monkeypatch.setenv("PRAIRIE_INFERENCE_AUTH_TOKEN", "internal-secret")

    missing = http.post("/generate", json={"prompt": "hello"})
    assert missing.status_code == 401
    assert missing.get_json()["detail_code"] == "inference_auth_required"

    wrong = http.post("/generate", json={"prompt": "hello"}, headers={"Authorization": "Bearer wrong"})
    assert wrong.status_code == 401

    allowed = http.post("/generate", json={"prompt": "hello"}, headers={"Authorization": "Bearer internal-secret"})
    assert allowed.status_code == 200


def test_generate_rejects_path_based_images(client, monkeypatch: pytest.MonkeyPatch) -> None:
    http, _stub = client
    monkeypatch.delenv("PRAIRIE_INFERENCE_AUTH_TOKEN", raising=False)

    res = http.post("/generate", json={"prompt": "hello", "images": ["/etc/passwd"]})
    assert res.status_code == 400
    assert res.get_json()["detail_code"] == "path_images_rejected"


def test_generate_accepts_inline_image_payloads(client, monkeypatch: pytest.MonkeyPatch) -> None:
    http, stub = client
    monkeypatch.delenv("PRAIRIE_INFERENCE_AUTH_TOKEN", raising=False)

    res = http.post("/generate", json={
        "prompt": "extract",
        "image_payloads": [{"mime_type": "image/png", "data_base64": "iVBORw0KGgo="}],
    })
    assert res.status_code == 200
    assert stub.last_request.image_payloads == [{"mime_type": "image/png", "data_base64": "iVBORw0KGgo="}]


def test_hosted_modes_fail_closed_without_inference_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PRAIRIE_ENABLE_GEMINI_RUNS", "true")
    monkeypatch.delenv("PRAIRIE_INFERENCE_AUTH_TOKEN", raising=False)

    with pytest.raises(RuntimeError, match="PRAIRIE_INFERENCE_AUTH_TOKEN"):
        inference_server.create_app(mode="gemini")
