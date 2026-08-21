# AIRazor — RazorpayX Assist

AIRazor is a hackathon prototype for an AI-led RazorpayX sales and onboarding assistant. It is designed to understand a merchant's business problem in natural language, qualify the requirement conversationally, map it to the right RazorpayX journey, demonstrate relevant product capabilities, and guide the merchant toward the next approved action.

AIRazor is intentionally focused on RazorpayX. Payment Gateway requirements can be identified and summarized, but should be redirected to the relevant PG specialist flow with the merchant context preserved rather than handled end-to-end by AIRazor.

## What problem are we solving?

Merchants usually know their business problem, but they may not know the exact Razorpay product they need.

Examples:

- "I pay 300 vendors every month and the process is manual."
- "Customers pay us through bank transfers and reconciliation takes too much time."
- "We have 120 employees and attendance plus full-and-final settlement are painful."
- "We need a current account and want to automate payouts."

AIRazor translates these business problems into a guided RazorpayX journey without forcing the merchant to first understand internal product terminology.

## Merchant journey

The prototype follows this high-level flow:

**Understand → Qualify → Recommend → Demonstrate → Commercials → Details → Payment / Next Action**

The experience is designed to feel like one normal conversation rather than a long qualification form. AIRazor asks a small number of high-value questions, preserves multiple requirements, and only recommends once enough context is available.

## RazorpayX use cases currently represented

### RazorpayX Payouts

For merchants making outgoing payments to vendors, suppliers, contractors or other beneficiaries. AIRazor qualifies scale, frequency, payout mode, manual vs bulk vs API execution, approval needs, reconciliation and status tracking.

### Smart Collect 2.0

For merchants receiving direct bank-transfer or UPI collections and struggling to identify or reconcile incoming payments. AIRazor can explore Customer Identifiers, VPAs and reconciliation-oriented flows using verified Razorpay context.

### RazorpayX Current Account

For merchants looking for a business banking layer alongside RazorpayX workflows. Final serviceability, banking-partner approval, KYC and commercials must come from approved backend data rather than LLM assumptions.

### RazorpayX Escrow

Explored only when there is a genuine controlled hold-and-release requirement. AIRazor should not infer Escrow simply because the merchant runs a marketplace.

### RazorpayX Payroll

Our primary personalized-demo use case. AIRazor can understand employee scale, current payroll setup and pain points such as attendance, leave, payroll processing, compliance operations and full-and-final settlement, then prioritize the relevant demo modules.

### Payment Gateway boundary

AIRazor is RazorpayX Assist. If a merchant asks about checkout, website payments, Magic Checkout or another PG requirement, AIRazor should preserve the existing context and route the PG query to the appropriate specialist flow rather than independently owning the PG journey.

## How we built it

### 1. Supabase knowledge base first

We started by building the RazorpayX knowledge layer in Supabase and enabling vector-based retrieval using pgvector. This lets AIRazor retrieve semantically relevant product context even when the merchant describes a problem without naming a Razorpay product.

We also separated:

- **Official / verified knowledge** — product facts used for answers and recommendations.
- **Learning cases** — approved behavioral lessons about how AIRazor should conduct conversations.

### 2. RAG architecture

Instead of relying on an LLM alone, AIRazor uses Retrieval-Augmented Generation:

```text
Merchant message
      |
      v
Supabase retrieval
      |
      v
Verified RazorpayX context
      |
      v
LLM reasoning
      |
      v
AIRazor response
```

This reduces hallucination risk and keeps product truth separate from language generation.

### 3. Local prototype

We first built a lightweight HTML/CSS/JavaScript frontend and Python backend locally to prove the merchant journey.

The early prototype helped expose important behavioral requirements such as preserving multiple intents, avoiding premature recommendation and keeping discovery conversational.

### 4. AI-assisted development

We used:

- **Codex** for code generation, implementation and iterative changes.
- **CoWork** for product reasoning, architecture, prompting and workflow design.
- **Gemini** for additional prompting, debugging and experimentation.

### 5. GitHub

GitHub became the source of truth for the application code, product routing, knowledge files, demo flows and deployment configuration.

### 6. Render

Localhost was not enough for team collaboration, so we moved the shared backend and application to Render.

Render is used for:

- Public hosting
- Python backend execution
- Environment variables and API credentials
- Shared access for teammates
- Backend endpoints such as `/api/chat` and `/api/status`

### 7. LLM routing

The backend is configured to use multiple LLM providers, including Gemini and Groq. The router allows provider fallback so the entire product is not dependent on a single model provider.

### 8. Live merchant frontend

The merchant UI sends messages to `/api/chat`, receives grounded responses, updates the live merchant profile and surfaces relevant next actions.

### 9. Personalized Payroll demo

Payroll became the main proof case for personalized demonstrations. Discovery identifies the merchant's pain points; the demo then focuses only on the relevant modules instead of showing a generic product tour.

### 10. AI presenter layer

Tavus is used as the primary human-like AI demo presenter. The presenter is only the face and voice layer — product facts, routing and decisions remain controlled by AIRazor's backend.

A 3D browser-based presenter exists as a fallback so the demo can still continue if the premium avatar layer is unavailable.

### 11. Specialist handoff

For journeys that AIRazor should not own end-to-end, especially PG queries, the system can preserve merchant context and prepare a specialist handoff rather than restarting discovery.

### 12. Payment / next-action prototype

For eligible RazorpayX flows, the prototype can surface an approved payment / next-action URL and move the merchant toward activation. The current demo uses acknowledgement rather than a real payment-status callback, so it must not claim automated verification.

### 13. Razorpay design language

The UI was refined using Razorpay Blade / RazorSense as the design reference so the prototype feels closer to a Razorpay-native experience.

## Architecture

```text
Merchant
   |
   v
AIRazor Frontend
   |
   v
Render Python Backend
   |
   +---- Supabase RAG / RazorpayX knowledge
   |
   +---- Gemini / Groq LLM routing
   |
   +---- Product routing and next-action logic
   |
   +---- Tavus / 3D presenter layer
   |
   +---- Specialist handoff / payment actions
```

## Frontend responsibilities

The frontend handles:

- Merchant conversation
- Journey progress
- Live merchant profile
- Recommendations
- Personalized demos
- Commercial / onboarding surfaces
- Payment / next-action CTAs
- AI presenter interface

The merchant should be able to describe the problem naturally without knowing RazorpayX product names in advance.

## Backend responsibilities

The backend handles:

- `/api/chat`
- `/api/status`
- Retrieval and RAG context
- LLM provider routing
- Product-family routing
- Tavus endpoints
- Slack handoff endpoints
- Safe control over links, serviceability, commercials and actions

The LLM should reason and communicate, but should not independently invent pricing, serviceability, eligibility, SLAs, activation state or action URLs.

## Control Room

The AIRazor Control Room is an internal operational and debugging surface. It is used to inspect system health and verify that key components are connected.

It can show or test areas such as:

- Backend availability
- Supabase RAG readiness
- LLM provider configuration
- Provider order
- Tavus configuration
- Slack handoff readiness
- Direct `/api/chat` testing

Long term, the Control Room could evolve into a place for Sales / Ops / Product teams to manage approved knowledge, routing rules, commercials, learning cases and test scenarios without code changes.

## Tools used

| Tool | Purpose |
| --- | --- |
| Supabase | RazorpayX knowledge base, vector retrieval and RAG |
| Codex | Development and implementation |
| CoWork | Product reasoning, architecture, prompting and iteration |
| Gemini | LLM provider and development assistance |
| Groq | Secondary LLM provider |
| GitHub | Version control and shared source of truth |
| Render | Public backend hosting and environment configuration |
| AI Sites | Razorpay-hosted frontend surface |
| Tavus | Human-like AI presenter |
| Three.js / browser APIs | 3D presenter fallback |
| Slack | Specialist handoff flow |
| Google Apps Script | Prototype payment / next-action link |
| Blade / RazorSense | UI and design reference |

## Core product principles

- Start from the merchant's business problem, not a product name.
- Preserve multiple requirements across topic switches.
- Ask one high-value qualification question at a time.
- Do not recommend too early.
- Do not invent Razorpay product facts, pricing, serviceability, eligibility, links or SLAs.
- Treat discovery as diagnosis and demos as proof of fit.
- Redirect PG queries with context preserved.
- Keep actions backend-controlled.

## Suggested demo narrative

A strong demo flow is:

1. Merchant: "We have 120 employees. Payroll is manual, attendance reconciliation takes too long and full-and-final settlements are painful."
2. AIRazor captures Payroll, scale and pain points and asks one focused follow-up question.
3. Open the personalized Payroll walkthrough, with Attendance and F&F prioritized.
4. Merchant adds a second requirement such as vendor payouts; AIRazor preserves the Payroll context and qualifies the new need.
5. Merchant mentions a PG / checkout requirement; AIRazor recognizes it and routes it to the relevant specialist flow rather than handling it end-to-end.
6. For an eligible RazorpayX journey, move toward the approved onboarding / payment next action.

## Business impact hypothesis

The hackathon prototype is designed around the hypothesis that AI-assisted qualification and personalized demos can improve conversion while reducing repetitive sales work.

Suggested experiment targets for a next-quarter pilot:

- **10–15% relative uplift in qualified RazorpayX onboarding conversion** for AIRazor-assisted journeys.
- **15–20% increase in Payroll demo coverage** for suitable self-serve opportunities.
- Lower time-to-next-action.
- Reduced repetitive RM / AM effort on early discovery and standard demos.

These are experiment targets, not guaranteed production outcomes.

## One-line pitch

> **From “I have a business problem” to the right RazorpayX action — in one conversation.**

## Prototype note

AIRazor is a hackathon prototype. Some product journeys, commercials, serviceability rules and activation steps require approved production integrations and verified Razorpay data before real-world rollout.
