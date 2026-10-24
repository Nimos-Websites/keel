---
title: "Idempotent Stripe Webhooks: Preventing Duplicate Orders in Next.js"
description: "Why webhook idempotency matters, how Stripe's guarantees work, and a production-ready pattern for exactly-once fulfillment using Supabase unique constraints and transactional outbox."
tags: ["stripe", "webhooks", "nextjs", "idempotency", "payments", "supabase"]
cover_image: https://keel-kg592proe-benlafreniere6-3913s-projects.vercel.app/og-idempotent-webhooks.png
canonical_url: https://keel-kg592proe-benlafreniere6-3913s-projects.vercel.app
---

# Idempotent Stripe Webhooks: Preventing Duplicate Orders in Next.js

Stripe retries webhooks. Your code runs twice. If you fulfill the order both times, the customer gets two downloads, two license keys, two seats in your course. This post shows how to make fulfillment **exactly once** — the pattern used in [Keel](https://keel.dev).

---

## Why This Happens

Stripe's webhook delivery is **at-least-once**. If your endpoint returns anything other than 2xx within 10 seconds, Stripe retries with exponential backoff (up to 72 hours). Network blips, a slow DB query, a cold start — any of these can cause a retry.

```
Timeline of a duplicate:
─────────────────────────────────────────────────────────────▶
T+0s    Stripe sends webhook
T+0.8s  Your server starts processing
T+9.5s  DB write succeeds
T+10.1s Your 2xx response sent ← TOO LATE, Stripe already retried
T+10.2s Stripe sends SAME webhook again (retry #1)
T+11s   Your server processes AGAIN
```

---

## Stripe's Built-In Idempotency (And Why It's Not Enough)

Stripe includes `idempotency_key` on **API requests you make** (like `checkout.sessions.create`). But **webhooks Stripe sends to you** don't have an idempotency key you control.

What you *do* get: `event.id` (unique per event) and `session.id` (unique per Checkout Session). The session ID is your anchor.

---

## The Pattern: Unique Constraint + Check-Before-Insert

```typescript
// app/api/webhooks/stripe/route.ts
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const sessionId = session.id;
  const { user_id, price_lookup_key } = session.metadata!;

  const supabase = await createClient();

  // ─────────────────────────────────────────────────────────
  // IDEMPOTENCY: Try to insert. Unique constraint on
  // stripe_session_id makes this atomic.
  // ─────────────────────────────────────────────────────────
  const { data: purchase, error: insertError } = await supabase
    .from("keel_purchases")
    .insert({
      user_id,
      stripe_session_id: sessionId,
      price_lookup_key,
      amount_cents: session.amount_total,
      currency: session.currency,
      status: "completed",
    })
    .select()
    .single();

  // If unique constraint violated, we already processed this session
  if (insertError?.code === "23505") { // PostgreSQL unique_violation
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (insertError) {
    console.error("Purchase insert failed:", insertError);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  // ─────────────────────────────────────────────────────────
  // FULFILLMENT: Only runs if insert succeeded
  // ─────────────────────────────────────────────────────────
  await fulfillOrder(purchase);

  return NextResponse.json({ received: true });
}
```

**Why this works:**
- `stripe_session_id` has a **unique index** in the database
- `insert().single()` either creates the row or throws `23505` (unique violation)
- No race condition: the database is the source of truth
- If fulfillment fails after insert, the purchase exists — you can retry fulfillment separately

---

## The Schema

```sql
-- supabase/migrations/20240101_create_purchases.sql
create table keel_purchases (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  stripe_session_id text unique not null,  -- ← THE ANCHOR
  price_lookup_key text not null,
  amount_cents integer not null,
  currency text not null,
  status text not null default 'pending',
  fulfilled_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create index on keel_purchases (user_id);
create index on keel_purchases (price_lookup_key);

alter table keel_purchases enable row level security;

create policy "Users see own purchases"
  on keel_purchases for select
  using (auth.uid() = user_id);

-- Service role (webhook) inserts with elevated privileges
create policy "Service role inserts purchases"
  on keel_purchases for insert
  with check (true);
```

---

## What If Fulfillment Fails After Insert?

The purchase row exists. The customer paid. But the email didn't send, or the license key wasn't generated. Two options:

### Option 1: Transactional Outbox (Recommended)

```sql
-- Add to keel_purchases
fulfillment_status text not null default 'pending', -- pending | completed | failed
fulfillment_error text,
fulfillment_attempts integer not null default 0,
last_fulfillment_attempt timestamp with time zone;
```

```typescript
// Background job (cron, pg_cron, or Vercel Cron)
async function retryPendingFulfillments() {
  const supabase = createServiceClient();

  const { data: pending } = await supabase
    .from("keel_purchases")
    .select("*")
    .eq("fulfillment_status", "pending")
    .lt("fulfillment_attempts", 5)
    .order("created_at", { ascending: true })
    .limit(10);

  for (const purchase of pending ?? []) {
    try {
      await fulfillOrder(purchase);
      await supabase
        .from("keel_purchases")
        .update({
          fulfillment_status: "completed",
          fulfilled_at: new Date().toISOString(),
        })
        .eq("id", purchase.id);
    } catch (err) {
      await supabase
        .from("keel_purchases")
        .update({
          fulfillment_status: "failed",
          fulfillment_error: String(err),
          fulfillment_attempts: purchase.fulfillment_attempts + 1,
          last_fulfillment_attempt: new Date().toISOString(),
        })
        .eq("id", purchase.id);
    }
  }
}
```

### Option 2: Idempotent Fulfillment Functions

Make every fulfillment step idempotent by design:

```typescript
async function fulfillOrder(purchase: Purchase) {
  const { price_lookup_key, user_id } = purchase;

  // 1. Generate license key (idempotent: same input → same output)
  const licenseKey = await generateLicenseKey(user_id, price_lookup_key);

  // 2. Send email (idempotent: Resend deduplicates by `idempotency_key`)
  await resend.emails.send({
    idempotencyKey: `fulfill_${purchase.stripe_session_id}`,
    from: "Keel <downloads@keel.dev>",
    to: user.email,
    subject: "Your download is ready",
    html: `<a href="${downloadUrl}">Download</a>`,
  });

  // 3. Grant access (idempotent: upsert into access table)
  await supabase.from("user_access").upsert({
    user_id,
    product_key: price_lookup_key,
    granted_at: new Date().toISOString(),
  });
}
```

---

## Testing Idempotency Locally

```bash
# 1. Start Stripe CLI tunnel
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# 2. Trigger a test event
stripe trigger checkout.session.completed

# 3. In another terminal, send the SAME event again
stripe trigger checkout.session.completed --override id=evt_same_id
```

Check your logs: first request returns `received: true`, second returns `received: true, duplicate: true`.

---

## Common Mistakes

| Mistake | Why It Fails | Fix |
|---------|--------------|-----|
| Check `SELECT` then `INSERT` | Race condition between check and insert | Use unique constraint + `INSERT` |
| Rely on `event.id` only | Same session can generate multiple events | Use `session.id` (stable per payment) |
| Fulfill before insert | Retry = double fulfillment | Insert first, fulfill after |
| No retry mechanism | Failed fulfillment = stuck order | Outbox table + cron job |
| Swallow errors silently | You won't know orders are stuck | Alert on `fulfillment_status = 'failed'` |

---

## Production Checklist

- [ ] `stripe_session_id` has a **unique index**
- [ ] Webhook verifies signature **before** any DB work
- [ ] Insert uses `.single()` to catch unique violations
- [ ] Fulfillment runs **after** successful insert
- [ ] Failed fulfillments land in an outbox table
- [ ] Cron job retries pending fulfillments
- [ ] Alert on `fulfillment_status = 'failed'` for > 1 hour
- [ ] Tested with `stripe trigger` sending duplicate events

---

## Get This Pattern Pre-Built

Keel includes the complete idempotent webhook handler, the outbox table, the retry cron, and the download delivery — all wired together.

```bash
npx keel init my-saas
# Webhook handler at app/api/webhooks/stripe/route.ts
# Outbox at supabase/migrations/..._add_fulfillment_outbox.sql
# Cron at app/api/cron/fulfill-retry/route.ts
```

[Get Keel →](https://keel-kg592proe-benlafreniere6-3913s-projects.vercel.app)

---

## Further Reading

- [Stripe Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [PostgreSQL Error Codes](https://www.postgresql.org/docs/current/errcodes-appendix.html)
- [Resend Idempotency Keys](https://resend.com/docs/reference/emails/send#idempotency-key)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)

---

*Previous: [Building a Production-Ready Stripe Checkout Integration with Next.js 14 App Router](/blog/stripe-checkout-nextjs-app-router). Next: [One-Command Deploy: Shipping Next.js + Stripe + Supabase to Production](/blog/one-command-deploy-nextjs-stripe-supabase).*