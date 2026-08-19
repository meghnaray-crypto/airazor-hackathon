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


ROOT = Path(__file__).resolve().parent
TAVUS_BASE_URL = "https://tavusapi.com/v2"

# Stock values used in Tavus official docs for quick prototyping.
DEFAULT_REPLICA_ID = "r90bbd427f71"
DEFAULT_PERSONA_ID = "pcb7a34da5fe"


def json_bytes(value: Any) -> bytes:
    return json.dumps(value).encode("utf-8")


def read_context() -> str:
    path = ROOT / "tavus_conversational_context.txt"
    if path.exists():
        return path.read_text(encoding="utf-8")
    return ""


def tavus_request(
    method: str,
    path: str,
    payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    api_key = os.getenv("TAVUS_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError(
            "TAVUS_API_KEY is not configured. Set it in Terminal before starting the server."
        )

    body = None if payload is None else json_bytes(payload)
    request = urllib.request.Request(
        f"{TAVUS_BASE_URL}{path}",
        data=body,
        method=method,
        headers={
            "x-api-key": api_key,
            "Content-Type": "application/json",
        },
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
        raise RuntimeError(
            detail.get("message")
            or detail.get("error")
            or f"Tavus returned HTTP {exc.code}"
        ) from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Could not reach Tavus: {exc.reason}") from exc


class AIRazorHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt: str, *values: object) -> None:
        print("[AIRazor]", fmt % values)

    def _read_json(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0") or 0)
        if length <= 0:
            return {}
        raw = self.rfile.read(length)
        return json.loads(raw.decode("utf-8"))

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
            self._json_response(
                200,
                {
                    "ok": True,
                    "tavus_configured": bool(os.getenv("TAVUS_API_KEY", "").strip()),
                    "tavus_replica_id": os.getenv("TAVUS_REPLICA_ID", DEFAULT_REPLICA_ID),
                    "tavus_persona_id": os.getenv("TAVUS_PERSONA_ID", DEFAULT_PERSONA_ID),
                    "database": "pending_team_confirmation",
                    "brain_mode": "frontend_mock_until_backend_is_connected",
                },
            )
            return

        return super().do_GET()

    def do_POST(self) -> None:
        try:
            if self.path == "/api/tavus/start":
                body = self._read_json()
                test_mode = bool(body.get("test_mode", False))

                payload: dict[str, Any] = {
                    "replica_id": os.getenv(
                        "TAVUS_REPLICA_ID", DEFAULT_REPLICA_ID
                    ),
                    "persona_id": os.getenv(
                        "TAVUS_PERSONA_ID", DEFAULT_PERSONA_ID
                    ),
                    "conversation_name": body.get(
                        "conversation_name", "AIRazor merchant demo"
                    ),
                    "custom_greeting": (
                        "Hi, I'm AIRazor. I'll understand what matters to your "
                        "business and keep this demo focused on exactly that."
                    ),
                    "conversational_context": read_context(),
                    "test_mode": test_mode,
                }

                result = tavus_request("POST", "/conversations", payload)
                self._json_response(200, result)
                return

            if self.path == "/api/tavus/end":
                body = self._read_json()
                conversation_id = str(body.get("conversation_id", "")).strip()
                if not conversation_id:
                    self._json_response(
                        400, {"error": "conversation_id is required"}
                    )
                    return

                result = tavus_request(
                    "POST",
                    f"/conversations/{conversation_id}/end",
                    None,
                )
                self._json_response(200, result or {"ok": True})
                return

            if self.path == "/api/chat":
                # Deliberately not pretending the final AIRazor brain exists yet.
                # This endpoint is the future hand-off point for:
                # conversation state -> Supabase retrieval -> qualification -> LLM.
                self._json_response(
                    501,
                    {
                        "error": (
                            "AIRazor backend brain is not connected yet. "
                            "Confirm the Supabase status first, then wire this "
                            "endpoint to the database and LLM."
                        )
                    },
                )
                return

            self._json_response(404, {"error": "Unknown API endpoint"})
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
    parser = argparse.ArgumentParser(
        description="Run AIRazor with server-side Tavus CVI integration."
    )
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()

    hosted_port = os.getenv("PORT")
    if hosted_port:
        port = int(hosted_port)
        host = "0.0.0.0"
        url = f"http://{host}:{port}"
    else:
        port = choose_port(args.port)
        host = "127.0.0.1"
        url = f"http://127.0.0.1:{port}"

    address = (host, port)
    server = http.server.ThreadingHTTPServer(address, AIRazorHandler)

    print("=" * 72)
    print("AIRazor Tavus-ready prototype")
    print(f"Serving on: {url}")
    print(f"Tavus API key configured: {bool(os.getenv('TAVUS_API_KEY', '').strip())}")
    if not hosted_port and port != args.port:
        print(f"Port {args.port} was busy, so AIRazor automatically selected {port}.")
    print("Press Ctrl+C to stop.")
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
