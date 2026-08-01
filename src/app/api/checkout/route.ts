import { NextResponse } from 'next/server';

import { env } from '@/lib/env';
import { KEEL } from '@/lib/product';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';

/**
 * Starts a Stripe Checkout session and redirects the browser to it.
 *
 * GET rather than POST so the buy button is a plain link that works with
 * JavaScript disabled and survives being opened in a new tab. The amount is
 * never accepted from the client — it comes from the Stripe Price.
 */
export async function GET() {
  try {
    const session = await stripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: env.stripePriceId, quantity: 1 }],
      success_url: `${env.siteUrl}/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.siteUrl}/?checkout=cancelled`,
      // Required: the delivery email is the entire fulfilment mechanism.
      customer_creation: 'always',
      billing_address_collection: 'auto',
      allow_promotion_codes: true,
      metadata: { product: KEEL.slug },
      payment_intent_data: {
        // Buyers see this on their statement, not the Stripe account's legal name.
        statement_descriptor_suffix: 'KEEL',
        metadata: { product: KEEL.slug },
      },
    });

    if (!session.url) throw new Error('Stripe returned a session with no URL');
    return NextResponse.redirect(session.url, 303);
  } catch (err) {
    console.error('[checkout] failed to create session', err);
    return NextResponse.redirect(`${env.siteUrl}/?checkout=error`, 303);
  }
}
