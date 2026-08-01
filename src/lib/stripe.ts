import Stripe from 'stripe';

import { env } from './env';

/** Server-only Stripe client. Pinned API version so a Stripe-side release cannot
 *  silently change response shapes under a live checkout. */
export function stripe(): Stripe {
  return new Stripe(env.stripeSecretKey, {
    apiVersion: '2026-07-29.dahlia',
    typescript: true,
    appInfo: { name: 'Keel', version: '1.0.0' },
  });
}
