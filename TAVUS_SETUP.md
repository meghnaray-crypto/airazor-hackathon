# AIRazor + Tavus CVI setup

This build adds a server-side Tavus CVI connector to the existing AIRazor localhost UI.

## Important naming note

The human-like real-time video platform discussed for AIRazor is **Tavus CVI**.
There is also a company called **Torus**, but that product is focused on Voice AI.
This package integrates Tavus CVI.

## What already works

- Existing AIRazor localhost frontend
- Merchant profile / qualification demo
- Plans / commercials demo
- Developer view
- Tavus server-side connection status
- Tavus test-mode conversation creation
- Live Tavus conversation creation
- Tavus conversation embedded inside AIRazor
- End-conversation endpoint
- Automatic fallback to the next free localhost port if 8000 is busy

## What deliberately remains pending

- Supabase connection
- Real RAG
- Real qualification engine
- Real LLM-driven AIRazor conversation state
- Payment-link API
- Production onboarding action

Do not fake these until the team confirms the current database state.

## 1. Create your Tavus API key

In the Tavus Developer Portal, create an API key.

Do **not** paste the key into `app.js`, `index.html`, screenshots, or chat messages.

## 2. Set the key in Terminal

From the AIRazor project folder:

```bash
export TAVUS_API_KEY='YOUR_TAVUS_API_KEY'
```

The prototype defaults to the stock Replica and Persona IDs shown in Tavus's official quickstart documentation.

If your Tavus account gives you your own IDs, set them too:

```bash
export TAVUS_REPLICA_ID='YOUR_REPLICA_ID'
export TAVUS_PERSONA_ID='YOUR_PERSONA_ID'
```

## 3. Start AIRazor

```bash
python3 server.py
```

The server automatically picks the next free port if 8000 is already occupied.

For example:

```text
Open: http://127.0.0.1:8001
```

Open that URL in Chrome.

## 4. First use `Test Tavus connection`

This sends Tavus a conversation request with `test_mode=true`.

In Tavus test mode, a conversation object is created but the replica does not join the call. Use this first so you can verify credentials and configuration without starting a live avatar session.

## 5. Then use `Start live AIRazor demo`

AIRazor will:

1. Ask the local Python backend to create a Tavus CVI conversation.
2. Keep the API key on the server.
3. Receive the Tavus `conversation_url`.
4. Embed the live session in the AIRazor UI.

## Architecture

```text
AIRazor browser UI
        |
        | same-origin API
        v
local Python backend
        |
        | x-api-key kept server-side
        v
Tavus CVI
```

Later, after the database is confirmed:

```text
AIRazor UI
   |
   v
AIRazor backend
   |---- conversation state
   |---- Supabase / RAG
   |---- qualification + serviceability
   |---- LLM
   |---- demo controller
   |
   +---- Tavus CVI (human face / voice)
   |
   +---- approved payment/onboarding actions
```

## Files to know

- `server.py` — localhost server + secure Tavus API proxy
- `tavus.js` — frontend Tavus controls
- `tavus_conversational_context.txt` — AIRazor live-demo behavior
- `SUPABASE_NEXT.md` — exact database work to do once the team confirms status
