# Supabase next step — do this only after the team confirms current status

## Slack handoff schema (added, ready to apply)

A standalone migration exists at `supabase/migrations/20260820000000_slack_handoff.sql`. It is **additive only** — it does not touch `knowledge_base` or any existing table, so it is safe to apply independently of the RAG work below.

It adds the two pieces the Slack specialist handoff needs on the Supabase side:

- `product_routing_rules` — approved source of truth for which products route to the Slack handoff (replaces hardcoded frontend values). Seeded from `PRODUCT_ROUTING.md`.
- `specialist_handoffs` — audit log of every handoff dispatched to Slack (one row per `/api/slack/handoff` call), satisfying the contract's "record the next onboarding action" requirement.
- `resolve_routing(product)` and `log_specialist_handoff(...)` RPCs, callable over the REST `/rpc/` endpoint the Python backend already uses.

Apply it in the Supabase SQL editor or via `supabase db push`. No code change is required for the current `/api/slack/handoff` to keep working — the backend already reads `SLACK_WEBHOOK_URL` / `SLACK_CHANNEL_ID` from Render env. Wiring `/api/slack/handoff` to read routing config from `product_routing_rules` and write to `specialist_handoffs` is the next backend step once the migration is applied.

---

Do not rebuild or delete the database yet.

Ask the team for these five answers:

1. Does the Supabase project still exist?
2. Does `knowledge_base` exist?
3. How many rows are currently in `knowledge_base`?
4. Does the `query_embedding vector(384)` column exist?
5. Does the `match_knowledge_base` RPC function exist?

If possible also confirm whether these newer tables already exist:

- `qualification_rules`
- `product_plans`
- `plan_features`
- `commercials`
- `onboarding_requirements`
- `action_links`

Once this is known, the next backend milestone is:

```text
POST /api/chat
  -> load session state
  -> extract all merchant intents
  -> query Supabase
  -> apply qualification/serviceability rules
  -> call LLM
  -> return structured UI response
```

Expected response shape:

```json
{
  "reply": "natural response",
  "stage": "qualification",
  "detected_needs": ["payroll", "payment_gateway"],
  "primary_requirement": "payroll",
  "secondary_needs": ["payment_gateway"],
  "merchant_profile": {},
  "missing_fields": [],
  "recommendation": null,
  "retrieval": []
}
```

Tavus should remain the presentation layer. Do not move product pricing, serviceability, payment-link logic, or the source of truth into Tavus.
