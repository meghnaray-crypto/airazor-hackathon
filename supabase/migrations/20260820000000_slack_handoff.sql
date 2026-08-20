-- AIRazor → Slack specialist handoff
-- Additive only: creates the two tables the Slack handoff flow needs.
-- Does not touch knowledge_base, qualification_rules, product_plans, or any
-- existing table. Safe to run on a project that already has the RAG schema.
--
-- Purpose:
--   1. product_routing_rules  — the approved source of truth for which product
--      families route to the Slack specialist handoff (replaces hardcoded
--      frontend values). Mirrors PRODUCT_ROUTING.md.
--   2. specialist_handoffs    — audit log of every handoff sent to Slack, so the
--      "record the next onboarding action" contract requirement has a home.
--
-- The Python backend reads these over the Supabase REST API (no SDK), so the
-- helper functions return JSON/scalars that map cleanly to /rpc/ calls.

-- ============================================================================
-- 1. Product routing rules (source of truth for handoff routing)
-- ============================================================================
create table if not exists public.product_routing_rules (
    id              bigint generated always as identity primary key,
    product         text        not null,
    product_family  text        not null,          -- 'payment_gateway' | 'razorpayx' | 'payroll'
    demo_owner      text        not null,          -- 'airazor' | 'specialist'
    handoff_required boolean    not null default false,
    handoff_destination text,                      -- '#airazor-test-handoffs' when required, else null
    slack_channel_id    text,                      -- 'C0BS5MPCP7S' when required, else null
    sla_hours       integer,                       -- configurable SLA; null = pending internal confirmation
    is_active       boolean     not null default true,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

comment on table  public.product_routing_rules is 'Approved routing config: which products AIRazor handles vs. which route to the Slack specialist handoff.';
comment on column public.product_routing_rules.handoff_destination is 'Slack channel name shown to the merchant/used as the webhook target.';
comment on column public.product_routing_rules.sla_hours is 'Configurable SLA. Must not be invented by the LLM. null means pending internal confirmation.';

create unique index if not exists product_routing_rules_product_key
    on public.product_routing_rules (lower(product));

-- Seed with the routing rules from PRODUCT_ROUTING.md.
-- Uses ON CONFLICT so re-running the migration updates config without duplicating.
insert into public.product_routing_rules
    (product, product_family, demo_owner, handoff_required, handoff_destination, slack_channel_id, sla_hours)
values
    ('Magic Checkout',     'payment_gateway', 'specialist', true,  '#airazor-test-handoffs', 'C0BS5MPCP7S', null),
    ('Smart Collect',      'payment_gateway', 'specialist', true,  '#airazor-test-handoffs', 'C0BS5MPCP7S', null),
    ('Payment Gateway',    'payment_gateway', 'specialist', true,  '#airazor-test-handoffs', 'C0BS5MPCP7S', null),
    ('Smart Collect 2.0',  'razorpayx',       'airazor',    false, null,                     null,          null),
    ('Payroll',            'payroll',         'airazor',    false, null,                     null,          null)
on conflict (lower(product)) do update set
    product_family       = excluded.product_family,
    demo_owner           = excluded.demo_owner,
    handoff_required     = excluded.handoff_required,
    handoff_destination  = excluded.handoff_destination,
    slack_channel_id     = excluded.slack_channel_id,
    sla_hours            = excluded.sla_hours,
    is_active            = true,
    updated_at           = now();

-- ============================================================================
-- 2. Specialist handoffs (audit log of every Slack handoff sent)
-- ============================================================================
create table if not exists public.specialist_handoffs (
    id              bigint generated always as identity primary key,
    session_id      text,
    merchant        text        not null,
    product         text,
    product_family  text,
    handoff_destination text,                      -- '#airazor-test-handoffs'
    slack_channel_id    text,                      -- 'C0BS5MPCP7S'
    handoff_message text        not null,          -- full message body posted to Slack
    slack_response_ok boolean   not null default false,
    slack_response  text,                          -- raw Slack webhook reply ('ok' on success)
    status          text        not null default 'sent',  -- 'sent' | 'failed' | 'retrying'
    error_message   text,
    next_action     text,                          -- 'prepare_specialist_slack_handoff' etc.
    created_at      timestamptz not null default now()
);

comment on table public.specialist_handoffs is 'Audit log of every specialist handoff dispatched to Slack. One row per /api/slack/handoff call.';

create index if not exists specialist_handoffs_created_at_idx
    on public.specialist_handoffs (created_at desc);
create index if not exists specialist_handoffs_merchant_idx
    on public.specialist_handoffs (merchant);
create index if not exists specialist_handoffs_session_idx
    on public.specialist_handoffs (session_id) where session_id is not null;

-- ============================================================================
-- 3. Helper RPCs (callable via Supabase REST /rpc/)
-- ============================================================================

-- resolve_routing(product_name) -> one JSON row describing the approved route.
-- The backend uses this instead of trusting LLM-invented product families.
create or replace function public.resolve_routing(p_product text)
returns json
language sql
stable
as $$
    select to_jsonb(r)
    from public.product_routing_rules r
    where lower(r.product) = lower(p_product)
      and r.is_active = true
    limit 1;
$$;

comment on function public.resolve_routing is 'Look up the approved routing rule for a product. Returns null if the product is unknown, so the backend can fall back to qualification rather than inventing a route.';

-- log_specialist_handoff(...) -> the new row id. The backend calls this after
-- (or alongside) posting to the Slack webhook so the action is recorded.
create or replace function public.log_specialist_handoff(
    p_session_id          text,
    p_merchant            text,
    p_product             text,
    p_product_family      text,
    p_handoff_destination text,
    p_slack_channel_id    text,
    p_handoff_message     text,
    p_slack_response_ok   boolean,
    p_slack_response      text,
    p_status              text,
    p_error_message       text,
    p_next_action         text
)
returns bigint
language sql
as $$
    insert into public.specialist_handoffs
        (session_id, merchant, product, product_family, handoff_destination,
         slack_channel_id, handoff_message, slack_response_ok, slack_response,
         status, error_message, next_action)
    values
        (p_session_id, p_merchant, p_product, p_product_family, p_handoff_destination,
         p_slack_channel_id, p_handoff_message, p_slack_response_ok, p_slack_response,
         p_status, p_error_message, p_next_action)
    returning id;
$$;

comment on function public.log_specialist_handoff is 'Record one Slack specialist handoff dispatch. Call from /api/slack/handoff after posting to the webhook.';

-- ============================================================================
-- 4. Row-level security
-- ============================================================================
-- The backend talks to Supabase with the service-role key (server-side only),
-- which bypasses RLS. These policies cover the anon/authenticated keys so the
-- tables are never accidentally exposed through the public REST surface.

alter table public.product_routing_rules enable row level security;
alter table public.specialist_handoffs   enable row level security;

-- Routing config is readable by authenticated backend callers; no public reads.
create policy "routing read authenticated" on public.product_routing_rules
    for select to authenticated using (true);

-- Handoff log is read/write only via service role (RLS denies anon/authenticated
-- by default — no policy = no access). Do not add an anon policy.
