# AIRazor Backend Contract

This contract is the stable boundary between the shared AIRazor frontend and the real backend brain. The current frontend may still fall back to mock logic until `/api/chat` is connected to Supabase + the LLM.

## Target flow

```text
Frontend
  -> POST /api/chat
  -> session / conversation state
  -> intent + multi-intent extraction
  -> qualification / decision rules
  -> Supabase official knowledge retrieval
  -> approved learning-case retrieval
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
  "message": "I have 120 employees and attendance and F&F are painful.",
  "selected_plan_id": null,
  "action": null
}
```

### Response

```json
{
  "reply": "Understood. I will keep the Payroll demo focused on attendance and employee exits.",
  "conversation_status": "active",
  "stage": "qualification",
  "detected_needs": [
    {"type": "payroll", "label": "Payroll"}
  ],
  "primary_requirement": "payroll",
  "secondary_needs": [],
  "merchant_profile": {
    "business_model": null,
    "employee_count": 120,
    "pain_points": ["attendance", "f_and_f"],
    "existing_setup": null,
    "serviceability": "Qualification in progress"
  },
  "missing_fields": ["existing_payroll_setup"],
  "recommendation": null,
  "plans": [],
  "commercials": [],
  "required_details": [],
  "payment_link": null,
  "demo": {
    "should_start": false,
    "focus_modules": ["attendance", "f_and_f"],
    "current_module": null
  },
  "handoff": {
    "required": false,
    "type": null,
    "reason": null,
    "sla_hours": null
  },
  "next_actions": [],
  "retrieval": []
}
```

## Conversation rules

- Preserve all merchant requirements in session state. A new requirement must not silently overwrite an earlier one.
- If the merchant asks whether AIRazor understood them, summarize every active need, captured fact, missing fact, and current recommendation before moving forward.
- If the merchant changes topics, keep the previous need as an open/secondary need unless the merchant explicitly discards it.
- A recommendation is allowed only after enough qualification data has been collected.
- Product facts, pricing, serviceability, product URLs and payment links must come from approved backend data or approved actions. The LLM must never invent them.
- If a product requires specialist support, return a structured `handoff` object instead of pretending the flow is self-serve.

## Supported conversation outcomes

- `needs_more_information`
- `needs_priority`
- `not_serviceable`
- `recommendation_ready`
- `demo_ready`
- `commercials_ready`
- `handoff_ready`
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

The backend must validate serviceability and qualification, retrieve the latest approved commercial, confirm mandatory merchant details, call the approved internal payment-link service, return the verified URL, and record the next onboarding action.

## Magic Checkout specialist handoff example

```json
{
  "handoff": {
    "required": true,
    "type": "specialist_slack",
    "reason": "Magic Checkout specialist support required",
    "sla_hours": 48
  }
}
```

Keep the SLA configurable in backend data. Do not hardcode it in the LLM prompt.
