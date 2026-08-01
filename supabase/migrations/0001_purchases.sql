-- Keel: digital product purchases and gated downloads.
--
-- Written by the Stripe webhook (service role) and read by the download route
-- (service role). No client ever touches this table, so RLS is enabled with
-- zero policies: deny-all for anon and authenticated.

create table if not exists public.purchases (
  id                    uuid primary key default gen_random_uuid(),
  email                 text not null,
  product               text not null,
  stripe_session_id     text not null unique,
  stripe_payment_intent text,
  stripe_customer_id    text,
  amount_cents          integer not null check (amount_cents >= 0),
  currency              text not null default 'usd',
  -- download gate
  download_token        text not null unique,
  token_expires_at      timestamptz not null,
  downloads_used        integer not null default 0 check (downloads_used >= 0),
  download_limit        integer not null default 5 check (download_limit > 0),
  -- delivery
  delivered_at          timestamptz,
  delivery_error        text,
  created_at            timestamptz not null default now()
);

create index if not exists purchases_email_idx   on public.purchases (email);
create index if not exists purchases_token_idx   on public.purchases (download_token);
create index if not exists purchases_created_idx on public.purchases (created_at desc);

alter table public.purchases enable row level security;

-- Deliberately no policies. Service role bypasses RLS; everyone else is denied.
-- If you ever add a policy here, it must not expose download_token — that column
-- is a bearer secret.
