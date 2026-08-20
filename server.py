#!/usr/bin/env python3
from __future__ import annotations

import argparse
import http.server
import json
import os
import re
import socket
import threading
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path
from typing import Any

from llm_router import LLMRouterError, configured_providers, generate, provider_order

ROOT = Path(__file__).resolve().parent
TAVUS_BASE_URL = "https://tavusapi.com/v2"
DEFAULT_REPLICA_ID = "r90bbd427f71"
DEFAULT_PERSONA_ID = "pcb7a34da5fe"
DEFAULT_RAG_URL = "https://vtjyaafgmbvkzkanxujz.supabase.co/functions/v1/rag-search"
PAYROLL_KNOWLEDGE_PATH = ROOT / "payroll_knowledge.json"

AIRAZOR_SYSTEM_PROMPT = """You are AIRazor, a Razorpay merchant discovery assistant.
Understand the merchant's complete business requirement before recommending a product. Preserve multiple intents and never collapse distinct needs into one product.
Use ONLY the verified Razorpay context supplied by the backend for product facts, features, pricing, eligibility, serviceability, URLs and approvals.
Never invent Razorpay facts, pricing, plans, limits, serviceability, links or SLAs.
If verified context is sparse, say what is known, ask the single most useful qualification question, and avoid premature recommendation.
When the merchant asks whether you understood them, recap all requirements instead of continuing a sales pitch.
For Payroll conversations, think like a merchant advisor: first identify employee scale, the current payroll/HR setup, and the actual pain point (salary processing, attendance/leave, compliance operations, disbursement, onboarding, reimbursements, reporting, or full-and-final/exit). Then explain only the relevant verified capabilities. Do not force a generic demo.
When the merchant asks broadly what Payroll does, give a concise capability overview first and then ask one focused qualifier.
When a merchant gives employee count plus specific pain points, explicitly acknowledge both and explain which Payroll modules should be shown first.
Commercials must always come from approved retrieved context; if no approved price is present, say that pricing needs verification.
Be concise, natural, specific, and action-oriented.
"""


def json_bytes(value: Any) -> bytes:
    return json.dumps(value).encode("utf-8")


def read_context() -> str:
    path = ROOT / "tavus_conversational_context.txt"
    return path.read_text(encoding="utf-8") if path.exists() else ""


def read_payroll_knowledge() -> dict[str, Any]:
    if not PAYROLL_KNOWLEDGE_PATH.exists():
        return {}
    try:
        return json.loads(PAYROLL_KNOWLEDGE_PATH.read_text(encoding="utf-8"))
    except Exception as exc:
        print("[AIRazor] Payroll knowledge load failed:", exc, flush=True)
        return {}


def is_payroll_query(text: str) -> bool:
    return bool(re.search(
        r"\b(payroll|salary|salaries|employee|employees|attendance|leave|full[- ]?and[- ]?final|f&f|employee exit|statutory compliance|tds|pf|esi|esic|professional tax|reimbursement|payslip|form 16)\b",
        text,
        re.IGNORECASE,
    ))


def payroll_verified_context() -> tuple[str, list[str]]:
    data = read_payroll_knowledge()
    if not data:
        return "", []
    chunks = []
    sources = []
    for source in data.get("sources", []):
        title = source.get("title") or "Official Razorpay Payroll source"
        url = source.get("url") or ""
        facts = source.get("facts") or []
        if url:
            sources.append(url)
        if facts:
            chunks.append(f"OFFICIAL PAYROLL SOURCE: {title}\nURL: {url}\n" + "\n".join(f"- {fact}" for fact in facts))
    guidance = data.get("qualification_guidance") or []
    if guidance:
        chunks.append("PAYROLL QUALIFICATION GUIDANCE:\n" + "\n".join(f"- {item}" for item in guidance))
    demo = data.get("demo_guidance") or []
    if demo:
        chunks.append("PAYROLL DEMO GUIDANCE:\n" + "\n".join(f"- {item}" for item in demo))
    return "\n\n".join(chunks), sources


def rag_search(question: str) -> list[dict[str, Any]]:
    key = os.getenv("SUPABASE_PUBLISHABLE_KEY", "").strip()
    url = os.getenv("SUPABASE_RAG_URL", DEFAULT_RAG_URL).strip()
    if not key or not url:
        return []
    req = urllib.request.Request(
        url,
        data=json_bytes({"question": question}),
        method="POST",
        headers={
            "Authorization": f"Bearer {key}",
            "apikey": key,
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            payload = json.loads(response.read().decode("utf-8"))
            matches = payload.get("matches") or []
            return matches if isinstance(matches, list) else []
    except Exception as exc:
        print("[AIRazor] RAG retrieval failed:", exc, flush=True)
        return []


def verified_context(matches: list[dict[str, Any]]) -> str:
    if not matches:
        return ""
    safe = []
    for i, row in enumerate(matches[:5], 1):
        safe.append(f"VERIFIED RAG MATCH {i}:\n{json.dumps(row, ensure_ascii=False)}")
    return "\n\n".join(safe)


def combined_verified_context(message: str, matches: list[dict[str, Any]]) -> tuple[str, list[str], str]:
    parts = []
    rag = verified_context(matches)
    if rag:
        parts.append("VERIFIED SUPABASE VECTOR RETRIEVAL:\n" + rag)
    sources: list[str] = []
    used_payroll_fallback = False
    if is_payroll_query(message):
        payroll_context, sources = payroll_verified_context()
        if payroll_context:
            parts.append("VERIFIED OFFICIAL RAZORPAY PAYROLL CONTEXT:\n" + payroll_context)
            used_payroll_fallback = True
    if rag and used_payroll_fallback:
        grounding = "supabase_rag+official_payroll"
    elif rag:
        grounding = "supabase_rag"
    elif used_payroll_fallback:
        grounding = "official_payroll"
    else:
        grounding = "qualification_only"
    return "\n\n".join(parts), sources, grounding


def slack_webhook_url() -> str:
    return os.getenv("SLACK_WEBHOOK_URL", "").strip()


def slack_channel_id() -> str:
    return os.getenv("SLACK_CHANNEL_ID", "").strip()


def slack_configured() -> bool:
    return bool(slack_webhook_url() and slack_channel_id())


def build_slack_handoff_text(payload: dict[str, Any]) -> str:
    merchant = payload.get("merchant") or "Unknown merchant"
    requirement = payload.get("new_requirement") or payload.get("requirement") or "Not specified"
    product = payload.get("product") or "Payment Gateway"
    product_family = payload.get("product_family") or "payment_gateway"
    existing = payload.get("existing_context") or {}
    source = payload.get("source") or "AIRazor"

    context_lines = []
    if isinstance(existing, dict):
        for key, value in existing.items():
            if isinstance(value, list):
                value = ", ".join(str(v) for v in value) or "—"
            context_lines.append(f"• {key.replace('_', ' ').title()}: {value}")
    context_block = "\n".join(context_lines) if context_lines else "• Merchant context preserved from AIRazor qualification"

    return "\n".join([
        "🚨 AIRazor → Payment Gateway Specialist Handoff",
        "",
        f"Merchant: {merchant}",
        "",
        "Requirement:",
        requirement,
        "",
        "Business context:",
        context_block,
        "",
        "AIRazor:",
        f"PG specialist review required. (Product: {product}, family: {product_family})",
        "",
        "AI context:",
        "• Supabase RAG enabled",
        "• Merchant context preserved",
        "• Automated discovery completed",
        "",
        f"Source: {source}",
    ])


def send_slack_handoff(payload: dict[str, Any]) -> dict[str, Any]:
    url = slack_webhook_url()
    if not url:
        raise RuntimeError("SLACK_WEBHOOK_URL is not configured. Add it to the Render environment.")
    if not slack_channel_id():
        raise RuntimeError("SLACK_CHANNEL_ID is not configured. Add it to the Render environment.")

    text = build_slack_handoff_text(payload)
    body = json_bytes({"text": text, "channel": slack_channel_id()})
    request = urllib.request.Request(url, data=body, method="POST",
                                     headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            response.read()
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Slack rejected the handoff (HTTP {exc.code}): {raw or 'no detail'}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Could not reach Slack: {exc.reason}") from exc

    return {"ok": True, "channel": slack_channel_id(), "message": text}


def tavus_request(method: str, path: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    api_key = os.getenv("TAVUS_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("TAVUS_API_KEY is not configured.")
    body = None if payload is None else json_bytes(payload)
    request = urllib.request.Request(
        f"{TAVUS_BASE_URL}{path}", data=body, method=method,
        headers={"x-api-key": api_key, "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read()
            return json.loads(raw.decode("utf-8")) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            detail = json.loads(raw)
        except Exception:
            detail = {"message": raw or str(exc)}
        raise RuntimeError(detail.get("message") or detail.get("error") or f"Tavus returned HTTP {exc.code}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Could not reach Tavus: {exc.reason}") from exc


def chat_prompt(body: dict[str, Any], context: str) -> str:
    message = str(body.get("message", "")).strip()
    history = body.get("history") or []
    lines = []
    if history:
        lines.append("Conversation so far:")
        for item in history[-12:]:
            if isinstance(item, dict):
                lines.append(f"{item.get('role','unknown')}: {item.get('content','')}")
    if context:
        lines.append("\nVerified Razorpay context supplied by backend:\n" + context)
    else:
        lines.append("\nNo verified Razorpay product context was retrieved. Do not invent product facts.")
    lines.append("\nMerchant's latest message:\n" + message)
    return "\n".join(lines)


class AIRazorHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt: str, *values: object) -> None:
        print("[AIRazor]", fmt % values, flush=True)

    def end_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        super().end_headers()

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.end_headers()

    def _read_json(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0") or 0)
        return {} if length <= 0 else json.loads(self.rfile.read(length).decode("utf-8"))

    def _json_response(self, status: int, payload: dict[str, Any]) -> None:
        data = json_bytes(payload)
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self) -> None:
        path = self.path.split("?", 1)[0]
        if path == "/health":
            self._json_response(200, {"ok": True, "service": "AIRazor"})
            return
        if path == "/api/status":
            providers = configured_providers()
            rag_ready = bool(os.getenv("SUPABASE_PUBLISHABLE_KEY", "").strip())
            self._json_response(200, {
                "ok": True,
                "llm_providers": providers,
                "llm_order": provider_order(),
                "llm_ready": any(providers.values()),
                "tavus_configured": bool(os.getenv("TAVUS_API_KEY", "").strip()),
                "database": "connected" if rag_ready else "rag_key_missing",
                "rag_configured": rag_ready,
                "payroll_verified_context": PAYROLL_KNOWLEDGE_PATH.exists(),
                "slack_configured": slack_configured(),
                "slack_channel_id": slack_channel_id(),
                "handoff_connected": slack_configured(),
                "brain_mode": "rag_grounded" if rag_ready else "qualification_only",
            })
            return
        return super().do_GET()

    def do_POST(self) -> None:
        try:
            path = self.path.split("?", 1)[0]
            if path == "/api/chat":
                body = self._read_json()
                message = str(body.get("message", "")).strip()
                if not message:
                    self._json_response(400, {"error": "message is required"})
                    return
                matches = rag_search(message)
                context, source_urls, grounding = combined_verified_context(message, matches)
                result = generate(AIRAZOR_SYSTEM_PROMPT, chat_prompt(body, context))
                self._json_response(200, {
                    "ok": True,
                    "reply": result.text,
                    "provider": result.provider,
                    "model": result.model,
                    "fallback_attempts": result.attempts,
                    "grounding": grounding,
                    "retrieval_count": len(matches),
                    "retrieval_matches": matches,
                    "verified_source_urls": source_urls,
                    "payroll_context_used": is_payroll_query(message) and bool(source_urls),
                })
                return

            if path == "/api/slack/handoff":
                body = self._read_json()
                merchant = str(body.get("merchant", "")).strip()
                if not merchant:
                    self._json_response(400, {"error": "merchant is required"})
                    return
                result = send_slack_handoff(body)
                self._json_response(200, result)
                return

            if path == "/api/tavus/start":
                body = self._read_json()
                payload = {
                    "replica_id": os.getenv("TAVUS_REPLICA_ID", DEFAULT_REPLICA_ID),
                    "persona_id": os.getenv("TAVUS_PERSONA_ID", DEFAULT_PERSONA_ID),
                    "conversation_name": body.get("conversation_name", "AIRazor merchant demo"),
                    "custom_greeting": "Hi, I'm AIRazor. I'll understand what matters to your business and keep this demo focused on exactly that.",
                    "conversational_context": read_context(),
                    "test_mode": bool(body.get("test_mode", False)),
                }
                self._json_response(200, tavus_request("POST", "/conversations", payload))
                return

            if path == "/api/tavus/end":
                body = self._read_json()
                conversation_id = str(body.get("conversation_id", "")).strip()
                if not conversation_id:
                    self._json_response(400, {"error": "conversation_id is required"})
                    return
                self._json_response(200, tavus_request("POST", f"/conversations/{conversation_id}/end", None) or {"ok": True})
                return

            self._json_response(404, {"error": "Unknown API endpoint"})
        except LLMRouterError as exc:
            self._json_response(503, {"error": str(exc)})
        except RuntimeError as exc:
            self._json_response(503, {"error": str(exc)})
        except json.JSONDecodeError:
            self._json_response(400, {"error": "Invalid JSON body"})
        except Exception as exc:
            self._json_response(500, {"error": f"Server error: {exc}"})


def choose_port(preferred: int) -> int:
    for port in range(preferred, preferred + 20):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            try:
                sock.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    raise RuntimeError("Could not find a free localhost port.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Run AIRazor shared backend.")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    hosted_port = os.getenv("PORT")
    port, host = (int(hosted_port), "0.0.0.0") if hosted_port else (choose_port(args.port), "127.0.0.1")
    server = http.server.ThreadingHTTPServer((host, port), AIRazorHandler)
    print(f"AIRazor serving on http://{host}:{port} | providers={configured_providers()}", flush=True)
    if not hosted_port:
        threading.Timer(0.8, lambda: webbrowser.open(f"http://{host}:{port}")).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
