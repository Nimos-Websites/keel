/**
 * The catalogue. One product today; the shape allows more without a rewrite.
 *
 * `priceCents` is display copy only — the amount actually charged comes from the
 * Stripe Price, so a mismatch here can never undercharge a customer.
 */

export type Product = {
  slug: string;
  name: string;
  tagline: string;
  priceCents: number;
  currency: string;
  /** Path inside the Supabase Storage bucket that the buyer receives. */
  assetPath: string;
};

export const KEEL: Product = {
  slug: 'keel',
  name: 'Keel',
  tagline: 'The Next.js starter that ships with the money already wired.',
  priceCents: 14900,
  currency: 'usd',
  assetPath: 'keel/keel-starter.zip',
};

export const PRODUCTS: Record<string, Product> = {
  [KEEL.slug]: KEEL,
};

export function formatPrice(cents: number, currency = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
