Title: Built a Next.js 15/16 starter kit with bulletproof Stripe webhooks & Supabase RLS — here's why

Hey r/nextjs,

Like many of you, I've set up Stripe + Supabase integration dozens of times. Every time, I worried about webhook signature verification, idempotency handling, and setting up secure Supabase RLS policies correctly.

I put together Keel (https://keel-kappa-six.vercel.app) to solve this once and for all. It's a 49 starter kit designed to get you taking payments immediately with:
1. Bulletproof Stripe Checkout & Webhook handler (idempotent, handles duplicate events safely).
2. Supabase DB + RLS configured.
3. Resend email delivery of secure download tokens.
4. Clean App Router structure.

Let me know what you think of the architecture or if you run into any edge cases with Stripe webhooks!
