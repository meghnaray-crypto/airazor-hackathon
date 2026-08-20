from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any


@dataclass
class LLMResult:
    text: str
    provider: str
    model: str
    attempts: list[dict[str, str]]


class LLMRouterError(RuntimeError):
    pass


def _post_json(url: str, headers: dict[str, str], payload: dict[str, Any], timeout: int = 25) -> dict[str, Any]:
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={"Content-Type": "application/json", **headers},
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code}: {body[:500]}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Network error: {exc.reason}") from exc


def _groq(system_prompt: str, user_prompt: str) -> tuple[str, str]:
    key = os.getenv("GROQ_API_KEY", "").strip()
    if not key:
        raise RuntimeError("GROQ_API_KEY not configured")
    model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile").strip()
    data = _post_json(
        "https://api.groq.com/openai/v1/chat/completions",
        {"Authorization": f"Bearer {key}"},
        {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.2,
        },
    )
    text = (((data.get("choices") or [{}])[0].get("message") or {}).get("content") or "").strip()
    if not text:
        raise RuntimeError("Groq returned an empty response")
    return text, model


def _gemini(system_prompt: str, user_prompt: str) -> tuple[str, str]:
    key = os.getenv("GEMINI_API_KEY", "").strip()
    if not key:
        raise RuntimeError("GEMINI_API_KEY not configured")
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
    data = _post_json(
        url,
        {},
        {
            "systemInstruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
            "generationConfig": {"temperature": 0.2},
        },
    )
    candidates = data.get("candidates") or []
    parts = (((candidates[0] if candidates else {}).get("content") or {}).get("parts") or [])
    text = "".join(str(part.get("text", "")) for part in parts).strip()
    if not text:
        raise RuntimeError("Gemini returned an empty response")
    return text, model


def _bedrock(system_prompt: str, user_prompt: str) -> tuple[str, str]:
    try:
        import boto3
    except ImportError as exc:
        raise RuntimeError("boto3 is not installed") from exc

    region = os.getenv("AWS_REGION", "ap-south-1").strip()
    model = os.getenv("BEDROCK_MODEL_ID", "").strip()
    if not model:
        raise RuntimeError("BEDROCK_MODEL_ID not configured")

    client = boto3.client("bedrock-runtime", region_name=region)
    response = client.converse(
        modelId=model,
        system=[{"text": system_prompt}],
        messages=[{"role": "user", "content": [{"text": user_prompt}]}],
        inferenceConfig={"temperature": 0.2, "maxTokens": 1400},
    )
    text = (((response.get("output") or {}).get("message") or {}).get("content") or [{}])[0].get("text", "").strip()
    if not text:
        raise RuntimeError("Amazon Bedrock returned an empty response")
    return text, model


PROVIDERS = {"groq": _groq, "gemini": _gemini, "bedrock": _bedrock}


def configured_providers() -> dict[str, bool]:
    return {
        "groq": bool(os.getenv("GROQ_API_KEY", "").strip()),
        "gemini": bool(os.getenv("GEMINI_API_KEY", "").strip()),
        "bedrock": bool(
            os.getenv("BEDROCK_MODEL_ID", "").strip()
            and os.getenv("AWS_ACCESS_KEY_ID", "").strip()
            and os.getenv("AWS_SECRET_ACCESS_KEY", "").strip()
        ),
    }


def provider_order() -> list[str]:
    raw = os.getenv("LLM_PROVIDER_ORDER", "groq,gemini,bedrock")
    order = [item.strip().lower() for item in raw.split(",") if item.strip()]
    return [item for item in order if item in PROVIDERS]


def generate(system_prompt: str, user_prompt: str) -> LLMResult:
    attempts: list[dict[str, str]] = []
    for provider in provider_order():
        try:
            text, model = PROVIDERS[provider](system_prompt, user_prompt)
            return LLMResult(text=text, provider=provider, model=model, attempts=attempts)
        except Exception as exc:
            attempts.append({"provider": provider, "error": str(exc)[:300]})
    raise LLMRouterError("All configured LLM providers failed: " + json.dumps(attempts))
