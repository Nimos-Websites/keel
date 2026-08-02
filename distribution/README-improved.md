# Keel

> **Stripe + Supabase + Resend on Next.js — wired correctly, deployed in 15 minutes.**  
> Stop debugging webhooks. Stop finding out your `amount` field is spoofable. Stop losing sales because Resend was down for two minutes.

Next.js 16 · TypeScript · Tailwind 4 · Stripe Checkout · Supabase · Resend · Vercel

[![Live demo](https://img.shields.io/badge/live%20demo-keel--kappa--six.vercel.app-blue)](https://keel-kappa-six.vercel.app)
[![Buy Keel — $149](https://img.shields.io/badge/buy-$149-brightgreen)](https://keel-kappa-six.vercel.app)

---

Most starters get you to a landing page.  
This one gets you to a bank transfer.

Every tutorial wires Stripe in 10 minutes and ships five silent production bugs:

| The bug | What Keel does instead |
|---|---|
| Amount accepted from the browser | Session built server-side from a Price ID — client never supplies a number |
| Webhook parsed before signature check | Reads raw body with `req.text()` first; parse after |
| Webhook not idempotent | `stripe_session_id` is `UNIQUE`; Stripe retries are caught and ignored |
| Email failure loses the sale | Purchase row written first; buyer self-serves from `/thanks` |
| Download token treated like a slug | 32 random bytes, 30-day expiry, 5 uses, never logged |

The site you are reading is running Keel. The buy button goes through the same checkout, webhook, and delivery email that you get in the zip.

---

## Take a payment in about fifteen minutes

### 1. Install

```bash
npm install
cp .env.example .env.local
```

### 2. Stripe

Create a product and a one-time price in the Stripe dashboard, then put the
**price** id in `.env.local` as `STRIPE_PRICE_ID` (it starts `price_`, not `prod_`).

Add your secret key as `STRIPE_SECRET_KEY`.

### 3. Supabase

Run `supabase/migrations/0001_purchases.sql` against your project — the SQL editor
is fine. It creates one table with row-level security **on** and no policies,
which is deny-by-default. The service role bypasses RLS; nothing else can read it.

Put `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.

Then create a **private** Storage bucket for whatever you are selling and set
`assetPath` in `src/lib/product.ts` to `bucket/path/to/file.zip`.

### 4. Resend

Verify your sending domain, then set `RESEND_API_KEY` and `KEEL_FROM_EMAIL`.

### 5. Webhook

```bash
npx stripe listen --forward-to localhost:3000/api/stripe/webhook
```

It prints a `whsec_…`. Put it in `.env.local` as `STRIPE_WEBHOOK_SECRET`.

In production, create the endpoint in the Stripe dashboard pointing at
`https://your-domain/api/stripe/webhook`, subscribe it to
`checkout.session.completed`, and use **that** endpoint's signing secret — it is
a different value from the CLI's.

### 6. Run it

```bash
npm run dev
```

Buy your own product with Stripe's `4242 4242 4242 4242`. You should get an email
with a download link within a couple of seconds.

---

## The five things this gets right

Most starters get the happy path right. These are the ones that bite in
production, and each is a specific line of code you can go read.

**The amount is never accepted from the browser.**
`src/app/api/checkout/route.ts` builds the session from a Stripe Price id. A
client that posts `amount: 1` changes nothing, because the client never supplies
an amount.

**The webhook verifies the signature against the raw body.**
`src/app/api/stripe/webhook/route.ts` reads `await req.text()` before anything
parses it. Parse it first and the signature will not match — and if you then
"fix" that by skipping verification, anyone on the internet can POST themselves
a free download.

**The webhook is idempotent.**
Stripe retries. `stripe_session_id` is `unique`, and a duplicate insert is caught
and treated as a retry rather than an error, so a retry cannot mint a second
token or send a second email.

**A failed email does not lose the sale.**
If Resend is down, the purchase row is already written and the reason is stored
on it. The buyer still gets their link from `/thanks`, and you have a row you can
query for everyone who needs a resend.

**The download link is a bearer secret and is treated like one.**
32 random bytes, 30-day expiry, five uses, never logged. Every failure returns
the same generic message, because telling someone the difference between "no such
token" and "expired token" tells them when they have guessed a real one.

---

## Layout

```
src/app/
  page.tsx                     the sales page
  thanks/page.tsx              receipt, and the fallback if email fails
  api/checkout/route.ts        creates the Stripe Checkout session
  api/stripe/webhook/route.ts  verifies, records, delivers
  download/[token]/route.ts    redeems a token for a signed URL
src/lib/
  env.ts       throws on a missing var at first use, not 500s three layers down
  product.ts   the catalogue; the price here is display copy only
  stripe.ts    pinned API version
  db.ts        service-role client, idempotent insert, signed URLs
  email.ts     the delivery email, text and HTML
supabase/migrations/
  0001_purchases.sql
```

## Environment

| Variable | Required | What it is |
|---|---|---|
| `STRIPE_SECRET_KEY` | yes | `sk_…` |
| `STRIPE_PRICE_ID` | yes | `price_…`, the one-time price |
| `STRIPE_WEBHOOK_SECRET` | yes | `whsec_…`, per endpoint |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | server-only, never `NEXT_PUBLIC_` |
| `KEEL_PURCHASES_TABLE` | no | defaults to `purchases`; rename it to share a database |
| `RESEND_API_KEY` | yes | `re_…` |
| `KEEL_FROM_EMAIL` | no | defaults to a placeholder; set it |
| `NEXT_PUBLIC_SITE_URL` | no | inferred from Vercel when deployed |

## Deploy

```bash
npx vercel --prod
```

Set the same variables in the Vercel project, create the production webhook
endpoint, and buy your own product once with a real card to prove the path.
Refund yourself afterwards.

## What this is not

- Not a UI kit. Two pages, four routes, styled plainly so you delete rather than untangle.
- Not subscriptions. One-time payments only.
- Not an auth system. Downloads are token-gated, which is what selling a file needs.

## Licence

One licence per developer. Use it in unlimited projects of your own, including
commercial ones. Do not resell or redistribute the source itself.

---

**[Buy Keel — $149](https://keel-kappa-six.vercel.app)**
