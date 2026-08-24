# Keel

**A $149 Next.js starter kit for developers who want to take payments this week.**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fdev55acc-ai%2Fkeel)

Keel includes:
- Stripe Checkout (one-time payments, no subscriptions).
- Signature-verified, idempotent Stripe webhook.
- Supabase with Row-Level Security (RLS) enabled.
- Resend for email delivery (download link).
- One-command deploy to Vercel.

## Why Keel?
Most starters get the happy path right. Keel gets the **production edge cases** right:
- **Amount is never accepted from the browser**: Stripe Price ID is hardcoded in `src/app/api/checkout/route.ts`.
- **Webhook verifies the signature against the raw body**: `src/app/api/stripe/webhook/route.ts` reads `await req.text()` before parsing.
- **Idempotent webhook**: Stripe retries are handled gracefully.
- **Failed email does not lose the sale**: Purchase row is written first; Resend failures are stored for retry.
- **Download link is a bearer secret**: 32-byte token, 30-day expiry, 5 uses, never logged.

## Usage

1. **Buy Keel**: [https://keel-kappa-six.vercel.app](https://keel-kappa-six.vercel.app)
2. **Deploy**:
   ```bash
   npx vercel --prod
   ```
3. **Set environment variables** (see [Environment](#environment)).
4. **Test**: Buy your own product with Stripe's test card (`4242 4242 4242 4242`).

## Environment

| Variable | Required | Description |
|---|---|---|
| `STRIPE_SECRET_KEY` | yes | `sk_...` |
| `STRIPE_PRICE_ID` | yes | `price_...` (one-time price) |
| `STRIPE_WEBHOOK_SECRET` | yes | `whsec_...` (per endpoint) |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-only key |
| `KEEL_PURCHASES_TABLE` | no | Defaults to `purchases` |
| `RESEND_API_KEY` | yes | `re_...` |
| `KEEL_FROM_EMAIL` | no | Defaults to placeholder |
| `NEXT_PUBLIC_SITE_URL` | no | Inferred from Vercel |

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fdev55acc-ai%2Fkeel)

## Layout

```
src/app/
  page.tsx                     # Sales page
  thanks/page.tsx              # Receipt (fallback if email fails)
  api/checkout/route.ts        # Creates Stripe Checkout session
  api/stripe/webhook/route.ts  # Verifies, records, delivers
  download/[token]/route.ts    # Redeems token for signed URL
src/lib/
  env.ts       # Validates environment variables
  product.ts   # Catalogue (display copy only)
  stripe.ts    # Pinned Stripe API version
  db.ts        # Supabase client, idempotent insert, signed URLs
  email.ts     # Delivery email (text + HTML)
supabase/migrations/
  0000_purchases.sql  # Table schema
```

## License

One license per developer. Use in unlimited projects (including commercial). Do not resell or redistribute the source.