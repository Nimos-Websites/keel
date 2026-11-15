/**
 * Environment access, validated once at module load.
 *
 * Anything read here is server-only unless it carries the NEXT_PUBLIC_ prefix.
 * Missing values throw at first use rather than producing a silent 500 three
 * layers deep — a checkout that half-works is worse than one that refuses to start.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Set it in .env.local for development, or in the Vercel project settings.`,
    );
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

export const env = {
  get stripeSecretKey() {
    return required('STRIPE_SECRET_KEY');
  },
  get stripeWebhookSecret() {
    return required('STRIPE_WEBHOOK_SECRET');
  },
  get stripePriceId() {
    return process.env.STRIPE_PRICE_ID || '';
  },
  get supabaseUrl() {
    return required('NEXT_PUBLIC_SUPABASE_URL');
  },
  get supabaseServiceKey() {
    return required('SUPABASE_SERVICE_ROLE_KEY');
  },
  /** Table name, so this can share a database that already holds other things.
   *  The bundled migration creates `purchases`. */
  get purchasesTable() {
    return optional('KEEL_PURCHASES_TABLE', 'purchases');
  },
  get resendApiKey() {
    return required('RESEND_API_KEY');
  },
  get fromEmail() {
    return optional('KEEL_FROM_EMAIL', 'Keel <keel@davidandrewfurniture.com>');
  },
  get siteUrl() {
    const explicit = process.env.NEXT_PUBLIC_SITE_URL;
    if (explicit) return explicit.replace(/\/$/, '');
    const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
    if (vercel) return `https://${vercel}`;
    return 'http://localhost:3000';
  },
} as const;
