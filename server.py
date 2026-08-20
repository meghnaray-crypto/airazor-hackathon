#!/usr/bin/env python3
from __future__ import annotations

import argparse
import http.server
import json
import os
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

AIRAZOR_SYSTEM_PROMPT = """You are AIRazor, a Razorpay merchant discovery assistant.
Your job is to understand the merchant's complete business requirement before recommending a product.
Preserve multiple intents. Ask concise qualification questions when important information is missing.
Never invent Razorpay product features, pricing, commercials, eligibility, serviceability, URLs, or approvals.
Until verified Supabase retrieval is attached, do not make definitive product claims from memory.
If verified product context is not supplied, focus on understanding and summarising the requirement and clearly say product fit must be verified against Razorpay data.
When the merchant asks whether you understood them, recap all requirements instead of continuing a sales pitch.
Be concise, natural, professional, and close each turn with the single most useful next question or next step.
"""


def json_bytes(value: Any) -> bytes:
    return json.dumps(value).encode("utf-8")


def read_context() -> str:
    path = ROOT / "tavus_conversational_context.txt"
    return path.read_text(encoding="utf-8") if path.exists() else ""


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


def chat_prompt(body: dict[str, Any]) -> str:
    message = str(body.get("message", "")).strip()
    history = body.get("history") or []
    context = str(body.get("verified_context", "")).strip()
    lines = []
    if history:
        lines.append("Conversation so far:")
        for item in history[-12:]:
            if isinstance(item, dict):
                role = str(item.get("role", "unknown"))
                content = str(item.get("content", ""))
                lines.append(f"{role}: {content}")
    if context:
        lines.append("\nVerified Razorpay context supplied by backend retrieval:\n" + context)
    else:
        lines.append("\nNo verified Razorpay product context has been supplied yet. Do not invent product facts.")
    lines.append("\nMerchant's latest message:\n" + message)
    return "\n".join(lines)


class AIRazorHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt: str, *values: object) -> None:
        print("[AIRazor]", fmt % values)

    def _read_json(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0") or 0)
        if length <= 0:
            return {}
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def _json_response(self, status: int, payload: dict[str, Any]) -> None:
        data = json_bytes(payload)
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self) -> None:
        if self.path == "/health":
            self._json_response(200, {"ok": True, "service": "AIRazor"})
            return
        if self.path == "/api/status":
            providers = configured_providers()
            self._json_response(200, {
                "ok": True,
                "llm_providers": providers,
                "llm_order": provider_order(),
                "llm_ready": any(providers.values()),
                "tavus_configured": bool(os.getenv("TAVUS_API_KEY", "").strip()),
                "database": "team_work_in_progress",
                "brain_mode": "llm_ready_waiting_for_verified_supabase_retrieval",
            })
            return
        return super().do_GET()

    def do_POST(self) -> None:
        try:
            if self.path == "/api/chat":
                body = self._read_json()
                message = str(body.get("message", "")).strip()
                if not message:
                    self._json_response(400, {"error": "message is required"})
                    return
                result = generate(AIRAZOR_SYSTEM_PROMPT, chat_prompt(body))
                self._json_response(200, {
                    "ok": True,
                    "reply": result.text,
                    "provider": result.provider,
                    "model": result.model,
                    "fallback_attempts": result.attempts,
                    "grounding": "verified_context" if body.get("verified_context") else "qualification_only",
                })
                return

            if self.path == "/api/tavus/start":
                body = self._read_json()
                payload: dict[str, Any] = {
                    "replica_id": os.getenv("TAVUS_REPLICA_ID", DEFAULT_REPLICA_ID),
                    "persona_id": os.getenv("TAVUS_PERSONA_ID", DEFAULT_PERSONA_ID),
                    "conversation_name": body.get("conversation_name", "AIRazor merchant demo"),
                    "custom_greeting": "Hi, I'm AIRazor. I'll understand what matters to your business and keep this demo focused on exactly that.",
                    "conversational_context": read_context(),
                    "test_mode": bool(body.get("test_mode", False)),
                }
                self._json_response(200, tavus_request("POST", "/conversations", payload))
                return

            if self.path == "/api/tavus/end":
                body = self._read_json()
                conversation_id = str(body.get("conversation_id", "")).strip()
                if not conversation_id:
                    self._json_response(400, {"error": "conversation_id is required"})
                    return
                result = tavus_request("POST", f"/conversations/{conversation_id}/end", None)
                self._json_response(200, result or {"ok": True})
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
    if hosted_port:
        port, host = int(hosted_port), "0.0.0.0"
    else:
        port, host = choose_port(args.port), "127.0.0.1"
    url = f"http://{host}:{port}"
    server = http.server.ThreadingHTTPServer((host, port), AIRazorHandler)
    print("=" * 72)
    print("AIRazor shared backend")
    print(f"Serving on: {url}")
    print(f"LLM providers: {configured_providers()}")
    print("=" * 72)
    if not hosted_port:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping AIRazor.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
