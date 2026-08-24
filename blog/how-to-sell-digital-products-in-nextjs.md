# How to Sell Digital Products in Next.js in 1 Hour (Without Wiring Stripe from Scratch)

You want to take payments in Next.js, but Stripe integration is tedious and error-prone. You’ve spent days wiring up checkout sessions, webhooks, and delivery emails—only to realize you forgot to handle retries, idempotency, or row-level security. 

**What if you could skip all that and start taking payments today?**

## The Problem: Stripe is Tedious

Stripe’s documentation is thorough, but it’s not a starter kit. You still need to:
- Create a checkout session without exposing your secret key.
- Handle webhook retries and idempotency (because Stripe retries, and a retry must not charge twice or email twice).
- Set up row-level security in Supabase (most starters ship it off).
- Deliver a download link that survives after the customer closes the tab.
- Handle failure states (e.g., if the delivery email fails, the customer should still get their download).

This is why I built **Keel**: a $149 Next.js starter kit that ships with the money already wired.

## The Solution: Keel

Keel is a Next.js starter kit with:
- **Stripe Checkout**: Session created server-side from a Price ID. The amount is never accepted from the browser, so a tampered request cannot undercharge you.
- **Signature-verified webhook**: Idempotent on the session ID, because Stripe retries and a retry must not charge twice or email twice.
- **Supabase with RLS**: The purchases table ships with row-level security enabled and zero policies—deny by default, service role only.
- **Resend delivery**: A real email carrying a signed, expiring, use-limited download link. The customer keeps it after they close the tab.
- **Failure states**: If the delivery email fails, the reason lands on the purchase row instead of a log nobody reads, and the buyer can still self-serve the link.

### What’s in the Zip?
```
keel/
├── src/app/
│   ├── page.tsx            # The page you’re reading
│   ├── thanks/page.tsx     # Receipt + fallback download link
│   ├── api/checkout/route.ts       # Creates the Stripe session
│   ├── api/stripe/webhook/route.ts # Verified, idempotent, records + delivers
│   └── download/[token]/route.ts  # Redeems a token for a signed URL
├── src/lib/
│   ├── env.ts              # Throws on a missing var instead of a 500
│   ├── product.ts          # The catalogue; price here is display copy only
│   ├── stripe.ts           # Pinned API version
│   ├── db.ts               # Service-role client, idempotent insert, signed URLs
│   └── email.ts            # The delivery email, text and HTML
└── supabase/migrations/    # The purchases table, RLS on, no policies
```

That’s the whole thing. You can read all of it in an afternoon—which is the point. A starter you cannot audit is a liability you paid for.

## Why Keel?

- **No UI kit**: Two pages and four routes, styled plainly so you delete rather than untangle.
- **No subscriptions**: One-time payments only—that’s the whole surface it claims.
- **No auth system**: Downloads are token-gated, which is what selling a file needs.

The site you’re on right now is running Keel. The button below goes through the same checkout, the same webhook, and the same delivery email that you get in the zip.

## Start Taking Payments Today

Buy Keel for $149 and start taking payments this week:

[Buy Keel — $149](https://keel-kappa-six.vercel.app)