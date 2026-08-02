Show HN: Keel – A production-ready Next.js starter with Stripe and Supabase

Hey HN,

I built Keel because I was tired of rewiring the same auth, Stripe webhook idempotency, and Supabase RLS policies for every new SaaS side project. 

Keel is a single-command Next.js starter kit (49) that includes:
- Stripe Checkout (signature-verified, idempotent webhook handler)
- Supabase with RLS enabled out of the box
- Automated Resend delivery of download links upon successful payment
- Modern Tailwind CSS & TypeScript setup

It gets you from zero to taking live payments in an afternoon instead of a weekend. Check it out at https://keel-kappa-six.vercel.app.

I'm here to answer any questions about the architecture or why I built it this way!
