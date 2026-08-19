# AIRazor Product Routing Rules

These rules capture the current hackathon routing context supplied by the team. They should become backend configuration rather than LLM-invented behaviour.

## Payment Gateway family

Payment Gateway / checkout products that require specialist involvement route to the shared Slack handoff destination:

`#airazor-test-handoffs`

Examples currently called out:

- Magic Checkout -> Payment Gateway / checkout specialist route -> Slack handoff
- Smart Collect -> Payment Gateway product -> Slack handoff
- Other Payment Gateway products -> Slack handoff when AIRazor identifies that the PG specialist route is required

The handoff must preserve the full merchant context and must not restart discovery.

## RazorpayX family

- Smart Collect 2.0 -> RazorpayX product
- AIRazor can conduct the Smart Collect 2.0 demo itself
- Do not route Smart Collect 2.0 to the Payment Gateway Slack handoff merely because its name resembles Smart Collect
- Escalate only when a separate RazorpayX specialist rule or unresolved case requires it

## Payroll

- AIRazor can conduct the Payroll demo
- Current hackathon demo priorities include Attendance, F&F / employee exit, and automatic compliance
- Continue to onboarding / approved next action when the merchant is suitable; do not default Payroll to the Payment Gateway Slack channel

## Backend rule

The LLM should identify candidate intent/product, but the backend must resolve the final product family and action using approved routing configuration.

Suggested structured fields:

```json
{
  "product": "Magic Checkout",
  "product_family": "payment_gateway",
  "demo_owner": "specialist",
  "handoff_required": true,
  "handoff_destination": "#airazor-test-handoffs",
  "sla_hours": null
}
```

For Smart Collect 2.0:

```json
{
  "product": "Smart Collect 2.0",
  "product_family": "razorpayx",
  "demo_owner": "airazor",
  "handoff_required": false,
  "handoff_destination": null,
  "sla_hours": null
}
```

SLA wording must remain configurable and must not be invented by the LLM.
