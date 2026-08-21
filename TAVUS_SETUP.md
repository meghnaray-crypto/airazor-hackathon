# AIRazor + Tavus CVI setup

AIRazor uses Tavus CVI as the primary live avatar layer. The backend keeps Tavus keys server-side and can now fail over across two Tavus accounts before dropping to the visual fallback layer.

## Recommended Render setup

Keep both Tavus accounts as separate environment variables. Do not overwrite one account with the other.

Primary account:

```text
TAVUS_API_KEY_PRIMARY
<primary Tavus key>
```

Secondary account:

```text
TAVUS_API_KEY_SECONDARY
<secondary Tavus key>
```

For backward compatibility, the existing variable is still supported:

```text
TAVUS_API_KEY
<existing Tavus key>
```

If `TAVUS_API_KEY_PRIMARY` is present, AIRazor automatically uses it as the primary key. If it is absent, the existing `TAVUS_API_KEY` remains the primary account.

## Replica and Persona IDs

If both Tavus accounts can use the same stock/default Replica and Persona IDs, no additional variables are needed.

If the two accounts have different Replica or Persona IDs, add:

```text
TAVUS_REPLICA_ID_PRIMARY
<primary replica id>

TAVUS_PERSONA_ID_PRIMARY
<primary persona id>

TAVUS_REPLICA_ID_SECONDARY
<secondary replica id>

TAVUS_PERSONA_ID_SECONDARY
<secondary persona id>
```

The original aliases remain supported:

```text
TAVUS_REPLICA_ID
TAVUS_PERSONA_ID
```

## Failover order

When the merchant clicks **Start live AIRazor demo**, the runtime now follows this sequence:

```text
Primary Tavus account
        |
        | quota / credits / auth / network failure
        v
Secondary Tavus account
        |
        | unavailable
        v
D-ID when configured
        |
        v
AIRazor 3D presenter fallback
```

The merchant does not need to choose an account. Failover happens server-side.

## How the automatic failover works

`sitecustomize.py` is loaded by Python when the AIRazor server starts. It keeps the existing `server.py` Tavus integration intact while adding a secure server-side retry layer.

For Tavus requests it:

1. Uses `TAVUS_API_KEY_PRIMARY` when configured, otherwise the existing `TAVUS_API_KEY`.
2. Sends the normal Tavus request.
3. If the primary account fails because of an HTTP/API/network error, retries once with `TAVUS_API_KEY_SECONDARY`.
4. When secondary Replica/Persona IDs are configured, substitutes those IDs for secondary conversation creation.
5. Never sends either Tavus API key to the AIRazor browser UI.

Render logs may show:

```text
[AIRazor] Tavus primary account failed (HTTPError); trying secondary Tavus account.
```

No secret values are logged.

## Current architecture

```text
AIRazor browser UI
        |
        v
Render Python backend
        |
        +---- Supabase RAG / RazorpayX knowledge
        +---- Gemini / Groq LLM routing
        +---- Tavus primary account
        |          |
        |          +----> Tavus secondary account on failure
        |
        +---- D-ID / 3D visual fallback
```

## Files to know

- `server.py` — AIRazor backend and Tavus endpoints
- `sitecustomize.py` — secure Tavus multi-account failover layer
- `tavus.js` — frontend presenter controls and avatar-provider fallback
- `tavus_conversational_context.txt` — live presenter conversation behaviour
