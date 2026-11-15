---
title: "One-Command Deploy: Shipping Next.js + Stripe + Supabase to Production"
description: "From git push to live payments in 3 minutes. The exact GitHub Actions workflow, Vercel configuration, and environment variable strategy used by Keel to deploy a full-stack Next.js payment app with zero manual steps."
tags: ["nextjs", "vercel", "github-actions", "stripe", "supabase", "deployment", "ci-cd"]
cover_image: https://keel-kg592proe-benlafreniere6-3913s-projects.vercel.app/og-one-command-deploy.png
canonical_url: https://keel-kg592proe-benlafreniere6-3913s-projects.vercel.app
---

# One-Command Deploy: Shipping Next.js + Stripe + Supabase to Production

Most "starter kits" give you code. You still spend hours wiring Vercel, Supabase, Stripe, Resend, and GitHub Actions together. Keel deploys with one command because the pipeline **is the product**.

This post shows the exact deployment architecture — copy it, or buy Keel and it's already done.

---

## The Goal

```bash
npx keel init my-saas
cd my-saas
vercel --prod
# 🎉 Live at https://my-saas.vercel.app with:
#   - Stripe Checkout working
#   - Webhook receiving events
#   - Supabase Auth + Database
#   - Resend emails sending
#   - CI/CD on every push to main
```

---

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   GitHub    │────▶│ GitHub       │────▶│   Vercel    │
│   (Push)    │     │ Actions      │     │   (Build +  │
└─────────────┘     │ (Test/Lint/  │     │   Deploy)   │
                    │  Typecheck)  │     └──────┬──────┘
                    └──────────────┘            │
                           │                    │
                    ┌──────▼───────┐     ┌──────▼──────┐
                    │  Supabase    │     │   Stripe    │
                    │  (Postgres + │     │  (Webhook   │
                    │   Auth +     │     │   → Vercel) │
                    │   RLS)       │     └─────────────┘
                    └──────────────┘
                           │
                    ┌──────▼───────┐
                    │   Resend     │
                    │  (Email API) │
                    └─────────────┘
```

---

## 1. GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run test
        env:
          # Test uses local Supabase/Stripe mocks
          NEXT_PUBLIC_SUPABASE_URL: http://localhost:54321
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}

  deploy-preview:
    needs: [lint-and-typecheck, test]
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--scope=${{ secrets.VERCEL_ORG_ID }}'

  deploy-production:
    needs: [lint-and-typecheck, test]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

**Key points:**
- PRs get preview deployments automatically
- Main branch deploys to production **only after** lint + typecheck + tests pass
- `vercel-action` handles the deploy — no `vercel` CLI in the workflow

---

## 2. Vercel Configuration

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm ci",
  "framework": "nextjs",
  "regions": ["iad1"],
  "functions": {
    "app/api/webhooks/stripe/route.ts": {
      "maxDuration": 30
    },
    "app/api/cron/**/*.ts": {
      "maxDuration": 60
    }
  },
  "crons": [
    {
      "path": "/api/cron/fulfill-retry",
      "schedule": "*/5 * * * *"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

**Why these settings:**
- `maxDuration: 30` for webhooks — Stripe retries after 10s, give yourself headroom
- Cron job runs every 5 minutes to retry failed fulfillments
- Security headers on every response

---

## 3. Environment Variables (The Strategy)

### Vercel Dashboard → Settings → Environment Variables

| Variable | Target | Description |
|----------|--------|-------------|
| `STRIPE_SECRET_KEY` | Production, Preview | `sk_live_…` / `sk_test_…` |
| `STRIPE_WEBHOOK_SECRET` | Production, Preview | `whsec_…` from Stripe Dashboard |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Production, Preview | `pk_live_…` / `pk_test_…` |
| `SUPABASE_URL` | Production, Preview | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Production, Preview | `eyJ…` (anon, client-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview | `eyJ…` (server-only, **never** in `NEXT_PUBLIC_`) |
| `RESEND_API_KEY` | Production, Preview | `re_…` |
| `NEXT_PUBLIC_APP_URL` | Production, Preview | `https://my-saas.vercel.app` / preview URL |

**Critical rule:** Only keys prefixed with `NEXT_PUBLIC_` are exposed to the browser. Service role keys, Stripe secret keys, Resend keys — **never** prefix them.

### Local Development (`.env.local`)

```bash
# .env.local (gitignored)
STRIPE_SECRET_KEY=sk_test_…
STRIPE_WEBHOOK_SECRET=whsec_…  # from `stripe listen --print-secret`
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_…
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=eyJ…  # from `supabase status`
SUPABASE_SERVICE_ROLE_KEY=eyJ…  # from `supabase status`
RESEND_API_KEY=re_…  # or skip for local
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Sync command** (run once after project creation):
```bash
# Pull Vercel env vars to local .env.local
npx vercel env pull .env.local
```

---

## 4. Stripe Webhook Configuration

### Production Webhook Endpoint
```
URL: https://your-domain.vercel.app/api/webhooks/stripe
Events: checkout.session.completed
Signing secret: whsec_live_… → Vercel env var STRIPE_WEBHOOK_SECRET
```

### Local Development
```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Forward webhooks to localhost
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Copy the "Webhook signing secret" output to .env.local
```

### Preview Deployments
Each Vercel preview deployment gets a unique URL. Add it as a **separate webhook endpoint** in Stripe Dashboard (or automate with Stripe CLI):
```bash
# In CI, after preview deploy:
stripe webhook_endpoints create \
  --url "https://preview-xyz.vercel.app/api/webhooks/stripe" \
  --enabled-events "checkout.session.completed"
```

---

## 5. Supabase Setup (One-Time)

```bash
# 1. Create project at supabase.com
# 2. Get URL + keys from Settings → API
# 3. Run migrations locally, then push

# Local development
supabase start
supabase db reset  # runs all migrations

# Push to remote (production)
supabase link --project-ref <your-ref>
supabase db push

# Generate TypeScript types
supabase gen types typescript --project-id <your-ref> > lib/supabase/database.types.ts
```

**Migrations included in Keel:**
- `keel_purchases` table with RLS
- `user_access` table for product entitlements
- `fulfillment_outbox` for retry logic
- Storage bucket for product files (private, signed URLs)

---

## 6. Resend Domain Verification

1. Add domain in Resend Dashboard
2. Add DNS records (Resend provides them)
3. Verify → `downloads@yourdomain.com` works
4. Add `RESEND_API_KEY` to Vercel

---

## 7. The `vercel --prod` Command

```bash
# First time: links project, prompts for org/project
vercel --prod

# Subsequent deploys: uses .vercel/project.json
vercel --prod
```

**What happens:**
1. Vercel reads `vercel.json` + `package.json`
2. Installs deps (`npm ci`)
3. Runs `npm run build` (Next.js compiles, typechecks)
4. Deploys to Edge + Serverless functions
5. Returns production URL

---

## 8. Smoke Test Checklist (Post-Deploy)

```bash
# 1. Homepage loads
curl -I https://your-domain.vercel.app

# 2. Auth works (Supabase)
curl https://your-domain.vercel.app/api/auth/callback

# 3. Stripe Checkout creates session
curl -X POST https://your-domain.vercel.app/api/checkout \
  -H "Content-Type: application/json" \
  -d '{"priceLookupKey": "keel"}'

# 4. Webhook endpoint responds
curl -X POST https://your-domain.vercel.app/api/webhooks/stripe \
  -H "Stripe-Signature: test" \
  -d '{}'
# Should return 400 (invalid signature) not 404

# 5. Cron job registered
# Check Vercel Dashboard → Functions → Crons
```

---

## The Complete `.github/workflows/ci.yml` (Copy-Paste Ready)

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  lint-and-typecheck:
    name: Lint & Typecheck
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - name: Install
        run: npm ci
      - name: Lint
        run: npm run lint
      - name: Typecheck
        run: npm run typecheck

  test:
    name: Tests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - name: Install
        run: npm ci
      - name: Test
        run: npm run test
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}
          RESEND_API_KEY: ${{ secrets.RESEND_API_KEY }}

  deploy-preview:
    name: Deploy Preview
    needs: [lint-and-typecheck, test]
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Deploy to Vercel Preview
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--scope=${{ secrets.VERCEL_ORG_ID }}'
        env:
          # Preview deployments get their own env vars from Vercel
          # No extra config needed

  deploy-production:
    name: Deploy Production
    needs: [lint-and-typecheck, test]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Deploy to Vercel Production
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## Secrets Checklist (Add to GitHub → Settings → Secrets → Actions)

| Secret | Source |
|--------|--------|
| `VERCEL_TOKEN` | `vercel tokens create` |
| `VERCEL_ORG_ID` | `vercel inspect <deployment> --output=json \| jq -r .orgId` |
| `VERCEL_PROJECT_ID` | `vercel inspect <deployment> --output=json \| jq -r .projectId` |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API Keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks → Signing Secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → API Keys |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API |
| `RESEND_API_KEY` | Resend Dashboard → API Keys |

---

## One Command: `npx keel init`

All of the above — workflow, Vercel config, Supabase migrations, Stripe webhook handler, Resend integration, cron job, type-safe Supabase client — is generated by:

```bash
npx keel init my-saas
cd my-saas
vercel --prod
```

**What you get:**
- Production-ready Next.js 14 + TypeScript + Tailwind
- Stripe Checkout + idempotent webhook + fulfillment outbox
- Supabase Auth + Database + RLS + generated types
- Resend email delivery with domain verification
- GitHub Actions CI/CD (lint, typecheck, test, preview, prod)
- Vercel config with cron, security headers, function timeouts
- Download delivery with expiring signed URLs
- ESLint + Prettier + Husky pre-commit hooks

**Price:** $149. One time. Source code is yours.

[Get Keel →](https://keel-kg592proe-benlafreniere6-3913s-projects.vercel.app)

---

## Further Reading

- [Vercel GitHub Actions](https://github.com/amondnet/vercel-action)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Stripe CLI Webhook Forwarding](https://stripe.com/docs/stripe-cli/webhooks)
- [Resend Domain Setup](https://resend.com/docs/domains/introduction)
- [Next.js Deployment Docs](https://nextjs.org/docs/app/building-your-application/deploying)

---

*Previous: [Idempotent Stripe Webhooks: Preventing Duplicate Orders in Next.js](/blog/idempotent-stripe-webhooks-nextjs).*