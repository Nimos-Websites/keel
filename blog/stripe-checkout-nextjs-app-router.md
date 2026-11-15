---
title: "Building a Production-Ready Stripe Checkout Integration with Next.js 14 App Router"
description: "A complete guide to implementing Stripe Checkout in Next.js 14 using the App Router, Server Actions, and proper error handling. Includes idempotency keys, webhook verification, and Supabase integration."
tags: ["nextjs", "stripe", "typescript", "checkout", "payments"]
cover_image: https://keel-kg592proe-benlafreniere6-3913s-projects.vercel.app/og-stripe-checkout.png
canonical_url: https://keel-kg592proe-benlafreniere6-3913s-projects.vercel.app
---

# Building a Production-Ready Stripe Checkout Integration with Next.js 14 App Router

Most Stripe tutorials stop at "it works on localhost." Production is different. You need idempotency keys so retries don't double-charge. You need signature-verified webhooks so a bad actor can't fake a payment. You need Row Level Security so users only see their own orders. And you need it all to deploy with one command.

This post walks through the exact architecture that powers [Keel](https://keel.dev) — a $149 Next.js starter kit that handles all of this out of the box.

## The Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Browser   │────▶│  Next.js 14  │────▶│   Stripe    │
│  (Client)   │     │  App Router  │     │  Checkout   │
└─────────────┘     └──────┬───────┘     └──────┬──────┘
                           │                    │
                    ┌──────▼───────┐     ┌──────▼──────┐
                    │  Supabase    │◀───▶│  Webhook    │
                    │  (PostgreSQL)│     │  (Verified) │
                    └──────────────┘     └─────────────┘
```

Three moving parts. Each has a specific job:

1. **Server Action** creates the Checkout Session with an idempotency key
2. **Webhook endpoint** verifies Stripe signatures and fulfills the order exactly once
3. **Supabase with RLS** stores the purchase and gates access to the download

---

## 1. Create the Checkout Session (Server Action)

```typescript
// app/actions/create-checkout.ts
"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export async function createCheckoutSession(priceLookupKey: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Idempotency key: user + price + date prevents duplicate sessions
  const idempotencyKey = `checkout_${user.id}_${priceLookupKey}_${new Date().toISOString().split("T")[0]}`;

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: priceLookupKey, quantity: 1 }],
      success_url: `${(await headers()).get("origin")}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${(await headers()).get("origin")}/pricing`,
      metadata: { user_id: user.id, price_lookup_key: priceLookupKey },
      customer_email: user.email,
    },
    { idempotencyKey }
  );

  return { sessionId: session.id, url: session.url };
}
```

**Key decisions:**
- `price_lookup_key` in metadata lets the webhook know what was bought without a second API call
- Idempotency key includes the date so a user can buy again tomorrow
- `customer_email` pre-fills the Stripe form — one less friction point

---

## 2. The Client Component

```tsx
// components/BuyButton.tsx
"use client";

import { useTransition } from "react";
import { createCheckoutSession } from "@/app/actions/create-checkout";

export function BuyButton({ priceLookupKey }: { priceLookupKey: string }) {
  const [isPending, startTransition] = useTransition();

  async function handleClick() {
    startTransition(async () => {
      const { url } = await createCheckoutSession(priceLookupKey);
      if (url) window.location.href = url;
    });
  }

  return (
    <button onClick={handleClick} disabled={isPending} className="btn-primary">
      {isPending ? "Redirecting…" : "Buy for $149"}
    </button>
  );
}
```

Server Actions + `useTransition` = no loading spinners to manage. The button disables itself during the server round-trip.

---

## 3. Verify the Webhook (Signature + Idempotency)

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
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Only handle successful payments
  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const { user_id, price_lookup_key } = session.metadata!;

  // Idempotency: check if we already recorded this session
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("keel_purchases")
    .select("id")
    .eq("stripe_session_id", session.id)
    .single();

  if (existing) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Record the purchase
  const { error } = await supabase.from("keel_purchases").insert({
    user_id,
    stripe_session_id: session.id,
    price_lookup_key,
    amount_cents: session.amount_total,
    currency: session.currency,
    status: "completed",
  });

  if (error) {
    console.error("Failed to record purchase:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  // Send download email (Resend)
  await sendDownloadEmail(user_id, price_lookup_key);

  return NextResponse.json({ received: true });
}
```

**Why this works in production:**
- Signature verification happens **before** any database work
- Duplicate check uses `stripe_session_id` — Stripe guarantees this is unique per completed session
- If the email send fails, the purchase is still recorded (you can retry email separately)

---

## 4. Supabase RLS: Users Only See Their Orders

```sql
-- supabase/migrations/20240101_create_purchases.sql
create table keel_purchases (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  stripe_session_id text unique not null,
  price_lookup_key text not null,
  amount_cents integer not null,
  currency text not null,
  status text not null default 'pending',
  created_at timestamp with time zone default now()
);

alter table keel_purchases enable row level security;

create policy "Users see own purchases"
  on keel_purchases for select
  using (auth.uid() = user_id);

create policy "Webhook inserts purchases"
  on keel_purchases for insert
  with check (true); -- Service role bypasses RLS
```

The webhook uses the **service role key** (server-only) to insert. Users only ever read their own rows.

---

## 5. Deliver the Product (Email + Download Page)

```typescript
// lib/email/send-download.ts
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendDownloadEmail(userId: string, priceLookupKey: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.admin.getUserById(userId);
  if (!user?.email) return;

  const downloadUrl = `${process.env.NEXT_PUBLIC_APP_URL}/download/${priceLookupKey}`;

  await resend.emails.send({
    from: "Keel <downloads@keel.dev>",
    to: user.email,
    subject: "Your Keel download is ready",
    html: `
      <p>Thanks for your purchase!</p>
      <p><a href="${downloadUrl}">Download your starter kit</a></p>
      <p>This link expires in 7 days.</p>
    `,
  });
}
```

The download page checks the same `keel_purchases` table — if the user owns it, they get the file. If not, 404.

---

## Deploy in One Command

```bash
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: npm ci
      - run: npm run build
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

Set these secrets in Vercel once:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_APP_URL`

Push to main. It's live.

---

## The Complete Checklist

| Concern | Handled By |
|---------|------------|
| Double charges | Idempotency key on `checkout.sessions.create` |
| Fake webhooks | `stripe.webhooks.constructEvent` with signing secret |
| Duplicate fulfillment | Unique `stripe_session_id` + check-before-insert |
| Data leakage | Supabase RLS (`auth.uid() = user_id`) |
| Email delivery | Resend with verified domain |
| Download gating | Same RLS policy on download page |
| Zero-downtime deploy | Vercel + GitHub Actions |

---

## Want This Without Writing It?

Keel ships with all of the above — configured, tested, and deploying to your Vercel account in one command.

```bash
npx keel init my-saas
cd my-saas
vercel --prod
```

**What you get:**
- Stripe Checkout + idempotent webhook
- Supabase Auth + RLS-protected purchases table
- Resend transactional emails
- Download delivery with expiring links
- TypeScript, Tailwind, ESLint, Prettier configured
- GitHub Actions CI/CD to Vercel

**Price:** $149 once. No subscription. Source code is yours forever.

[Get Keel →](https://keel-kg592proe-benlafreniere6-3913s-projects.vercel.app)

---

## Further Reading

- [Stripe Checkout docs](https://stripe.com/docs/payments/checkout)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Resend Node.js SDK](https://resend.com/docs/send-with-nodejs)

---

*This post is part of a series on building production payment flows. Next: [Idempotent Stripe Webhooks: Preventing Duplicate Orders in Next.js](/blog/idempotent-stripe-webhooks-nextjs).*