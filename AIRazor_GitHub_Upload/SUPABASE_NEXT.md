# Supabase next step — do this only after the team confirms current status

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
