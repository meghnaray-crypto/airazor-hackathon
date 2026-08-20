from __future__ import annotations

import json
import os
import socket
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


def _post_json(url: str, headers: dict[str, str], payload: dict[str, Any], timeout: int = 14) -> dict[str, Any]:
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
    except (urllib.error.URLError, TimeoutError, socket.timeout) as exc:
        reason = getattr(exc, "reason", str(exc))
        raise RuntimeError(f"Network error: {reason}") from exc


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


PROVIDERS = {"groq": _groq, "gemini": _gemini}


def configured_providers() -> dict[str, bool]:
    return {
        "groq": bool(os.getenv("GROQ_API_KEY", "").strip()),
        "gemini": bool(os.getenv("GEMINI_API_KEY", "").strip()),
    }


def provider_order() -> list[str]:
    raw = os.getenv("LLM_PROVIDER_ORDER", "groq,gemini")
    order = [item.strip().lower() for item in raw.split(",") if item.strip()]
    return [item for item in order if item in PROVIDERS]


def _latest_message(user_prompt: str) -> str:
    marker = "Merchant's latest message:"
    if marker in user_prompt:
        return user_prompt.rsplit(marker, 1)[-1].strip()
    return user_prompt.strip()[-1200:]


def _grounded_fallback(user_prompt: str) -> str:
    """Deterministic continuity layer used only when external LLMs are unavailable.

    It intentionally makes no pricing, serviceability, SLA or unsupported feature claims.
    It keeps discovery moving so the merchant never sees provider/network errors.
    """
    message = _latest_message(user_prompt)
    text = message.lower()

    if any(k in text for k in ("payroll", "salary", "employee", "attendance", "full and final", "f&f", "payslip")):
        return (
            "I’ve captured this as an employee/payroll requirement. To make the recommendation useful, "
            "tell me roughly how many employees you have and what is most painful today—payroll processing, "
            "attendance/leave inputs, compliance work, salary disbursement, or full-and-final settlement?"
        )

    if any(k in text for k in ("vendor", "supplier", "contractor", "payout", "beneficiary", "disbursement")):
        return (
            "Got it—you need to send money out to business recipients. Roughly how many payouts do you make "
            "in a month, and do you want to run them manually, upload them in bulk, or trigger them through APIs? "
            "I’ll use that to narrow the right RazorpayX payout setup."
        )

    if any(k in text for k in ("reconcile", "reconciliation", "bank transfer", "neft", "rtgs", "imps", "virtual account", "incoming transfer")):
        return (
            "It sounds like the bigger problem may be identifying and reconciling incoming customer transfers, "
            "not just accepting a payment. How do customers pay you today—UPI, NEFT/RTGS/IMPS, cards, or a mix—"
            "and do you need a unique identifier per customer or invoice?"
        )

    if "current account" in text or "business bank account" in text:
        return (
            "Understood—you’re looking for a business banking setup. What is your legal entity type, what does "
            "the business do, and is the account mainly for day-to-day banking, payouts, collections, or a combination?"
        )

    if "marketplace" in text or "seller" in text or "hold funds" in text or "escrow" in text:
        if any(k in text for k in ("website", "card", "checkout", "credit card", "debit card", "international")):
            return (
                "I’ve captured that you run an online marketplace and customers pay on your website. I would not "
                "assume you need escrow just because you are a marketplace. Do you actually need to hold customer "
                "funds before releasing them to sellers, or is your immediate need simply accepting and settling online payments?"
            )
        return (
            "I’ve captured the marketplace model. Before I suggest an escrow-style setup, do customer funds genuinely "
            "need to be held before release to sellers, and what event should trigger that release?"
        )

    if any(k in text for k in ("international", "foreign currency", "overseas")):
        return (
            "I’ve captured that international customers are part of the requirement. I need to verify the exact supported "
            "international payment setup from approved product context rather than guess. Are you selling from an India-based "
            "entity, and which countries or currencies matter most?"
        )

    if any(k in text for k in ("website", "checkout", "accept payments", "card", "customer payments", "online payments")):
        return (
            "Understood—you want customers to pay online. Are they paying on a website or app, are the payments one-time "
            "or recurring, and which payment modes matter most? I’ll keep collections separate from any payout or marketplace requirement."
        )

    return (
        "I’ve captured that requirement. To avoid recommending the wrong product, tell me whether the money is coming "
        "in from customers, going out to vendors or employees, or needs to be held and released between parties."
    )


def generate(system_prompt: str, user_prompt: str) -> LLMResult:
    attempts: list[dict[str, str]] = []
    for provider in provider_order():
        max_tries = 2
        for attempt_no in range(max_tries):
            try:
                text, model = PROVIDERS[provider](system_prompt, user_prompt)
                return LLMResult(text=text, provider=provider, model=model, attempts=attempts)
            except Exception as exc:
                error = str(exc)[:300]
                attempts.append({"provider": provider, "error": error})
                transient = any(token in error.lower() for token in ("timed out", "timeout", "network error", "temporarily"))
                if not transient or attempt_no == max_tries - 1:
                    break

    # Never expose provider/network failures to the merchant. Keep the conversation
    # moving with a conservative, qualification-first local response.
    return LLMResult(
        text=_grounded_fallback(user_prompt),
        provider="grounded_fallback",
        model="qualification-rules-v1",
        attempts=attempts,
    )
