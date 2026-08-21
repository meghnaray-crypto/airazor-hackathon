"""AIRazor runtime hooks.

This module is imported automatically by Python's site initialization when the
repository directory is on sys.path. It adds Tavus account failover without
exposing any API keys to the browser.
"""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from typing import Any

_TAVUS_HOST = "tavusapi.com"
_original_urlopen = urllib.request.urlopen


def _env(name: str) -> str:
    return os.getenv(name, "").strip()


def _configure_primary_aliases() -> None:
    """Keep existing server.py compatible with the new primary variable names."""
    primary_key = _env("TAVUS_API_KEY_PRIMARY")
    if primary_key:
        os.environ["TAVUS_API_KEY"] = primary_key

    primary_replica = _env("TAVUS_REPLICA_ID_PRIMARY")
    if primary_replica:
        os.environ["TAVUS_REPLICA_ID"] = primary_replica

    primary_persona = _env("TAVUS_PERSONA_ID_PRIMARY")
    if primary_persona:
        os.environ["TAVUS_PERSONA_ID"] = primary_persona


def _is_tavus_request(request: Any) -> bool:
    url = getattr(request, "full_url", "") or str(request)
    return _TAVUS_HOST in url


def _secondary_key() -> str:
    return _env("TAVUS_API_KEY_SECONDARY")


def _secondary_body(request: urllib.request.Request) -> bytes | None:
    data = request.data
    if not data:
        return data

    url = request.full_url
    # Only conversation creation needs replica/persona substitution.
    if not url.rstrip("/").endswith("/conversations"):
        return data

    secondary_replica = _env("TAVUS_REPLICA_ID_SECONDARY")
    secondary_persona = _env("TAVUS_PERSONA_ID_SECONDARY")
    if not secondary_replica and not secondary_persona:
        return data

    try:
        payload = json.loads(data.decode("utf-8"))
    except Exception:
        return data

    if secondary_replica:
        payload["replica_id"] = secondary_replica
    if secondary_persona:
        payload["persona_id"] = secondary_persona
    return json.dumps(payload).encode("utf-8")


def _secondary_request(request: urllib.request.Request) -> urllib.request.Request:
    headers = dict(request.header_items())
    # urllib normalizes the header name, so remove any existing Tavus key safely.
    for key in list(headers):
        if key.lower() == "x-api-key":
            headers.pop(key, None)
    headers["x-api-key"] = _secondary_key()

    return urllib.request.Request(
        request.full_url,
        data=_secondary_body(request),
        headers=headers,
        method=request.get_method(),
    )


def urlopen_with_tavus_failover(request: Any, *args: Any, **kwargs: Any):
    try:
        return _original_urlopen(request, *args, **kwargs)
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as primary_error:
        if not isinstance(request, urllib.request.Request) or not _is_tavus_request(request):
            raise
        if not _secondary_key():
            raise

        # Avoid retrying if the original request is already using the secondary key.
        current_key = ""
        for key, value in request.header_items():
            if key.lower() == "x-api-key":
                current_key = value
                break
        if current_key == _secondary_key():
            raise

        print(
            f"[AIRazor] Tavus primary account failed ({type(primary_error).__name__}); trying secondary Tavus account.",
            flush=True,
        )
        retry_request = _secondary_request(request)
        return _original_urlopen(retry_request, *args, **kwargs)


_configure_primary_aliases()
urllib.request.urlopen = urlopen_with_tavus_failover
