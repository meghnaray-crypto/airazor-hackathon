# AIRazor Backend Contract

The browser currently uses deterministic mock logic so the UI can be reviewed before backend work begins.
For real conversational understanding, the frontend should call an AIRazor backend. Supabase is the knowledge source, but it is not the conversation engine.

## Target flow

```text
Frontend
  -> POST /api/chat
  -> session/conversation state
  -> intent + multi-intent extraction
  -> qualification/decision rules
  -> Supabase RAG retrieval
  -> LLM response generation
  -> structured response to frontend
```

## Chat endpoint

```http
POST /api/chat
Content-Type: application/json
```

### Request

```json
{
  "session_id": "8d2ac11d-...",
  "message": "I want payouts, customer collections, and I am hiring 50 employees.",
  "selected_plan_id": null,
  "action": null
}
```

### Response

```json
{
  "reply": "I picked up three separate needs: vendor payouts, customer payment collection, and payroll. Which one do you want to solve first?",
  "conversation_status": "needs_priority",
  "stage": "qualification",
  "detected_needs": [
    {"type": "vendor_payouts", "label": "Vendor / supplier payouts"},
    {"type": "payment_gateway", "label": "Customer payment collection"},
    {"type": "payroll", "label": "Employee / payroll requirement"}
  ],
  "merchant_profile": {
    "business_model": null,
    "primary_requirement": null,
    "secondary_needs": ["Customer payment collection", "Employee / payroll requirement"],
    "recipients": null,
    "scale": "50 employees",
    "frequency": null,
    "existing_setup": null,
    "serviceability": "Qualification in progress"
  },
  "missing_fields": ["priority_requirement"],
  "recommendation": null,
  "plans": [],
  "commercials": [],
  "required_details": [],
  "payment_link": null,
  "next_actions": [
    {"id": "vendor_payouts", "label": "Solve vendor payouts first"},
    {"id": "payment_gateway", "label": "Solve payment collection first"},
    {"id": "payroll", "label": "Solve payroll first"}
  ],
  "retrieval": []
}
```

## Conversation requirements

The backend must preserve all merchant requirements in session state. A new requirement must not silently overwrite an earlier one.

If the merchant asks "did you understand me?", the backend should summarize every active need, captured facts, missing facts, and the current recommendation instead of moving the journey forward.

If the merchant switches topics, store the old requirement as a secondary/open need unless the merchant explicitly asks to discard it.

A recommendation is allowed only when the relevant qualification fields are sufficient. Do not mark "recommendation ready" just because one product keyword was detected.

The backend should explicitly close each journey with one of these outcomes:

- `needs_more_information`
- `not_serviceable`
- `recommendation_ready`
- `commercials_ready`
- `payment_ready`
- `onboarding_ready`
- `completed`

## Plan-selection action

```json
{
  "session_id": "8d2ac11d-...",
  "message": "",
  "selected_plan_id": "pro_api",
  "action": "select_plan"
}
```

## Generate-payment-link action

```json
{
  "session_id": "8d2ac11d-...",
  "message": "",
  "action": "generate_payment_link"
}
```

The backend must:

1. Validate serviceability and qualification.
2. Fetch the latest approved product, plan and commercial data from Supabase.
3. Confirm all mandatory merchant details are available.
4. Call the approved internal payment-link service.
5. Return the generated URL.
6. Record the next onboarding action.

The LLM must never invent pricing, serviceability, product URLs or payment links.
