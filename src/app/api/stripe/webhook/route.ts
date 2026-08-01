import { NextResponse } from 'next/server';
import type Stripe from 'stripe';

import { markDelivered, recordPurchase } from '@/lib/db';
import { sendDeliveryEmail } from '@/lib/email';
import { env } from '@/lib/env';
import { KEEL, PRODUCTS } from '@/lib/product';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';

/**
 * Stripe webhook. This is the only thing standing between a payment and the
 * customer getting what they paid for, so three rules hold:
 *
 *  1. Verify the signature against the raw body. An unverified webhook endpoint
 *     lets anyone on the internet mint themselves a download.
 *  2. Be idempotent. Stripe retries, and a retry must not send a second email.
 *  3. Return 200 once the purchase is durably recorded. If only the email failed,
 *     a retry would re-record nothing and re-send nothing useful — the failure is
 *     stored on the row and the buyer can self-serve from /thanks.
 */
export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'missing stripe-signature' }, { status: 400 });
  }

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, signature, env.stripeWebhookSecret);
  } catch (err) {
    console.error('[webhook] signature verification failed', err);
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  // paid is the only status that means the money actually moved. `complete`
  // alone can mean an async payment method is still pending.
  if (session.payment_status !== 'paid') {
    return NextResponse.json({ received: true, ignored: session.payment_status });
  }

  const email = session.customer_details?.email ?? session.customer_email;
  if (!email) {
    console.error('[webhook] paid session with no email', session.id);
    return NextResponse.json({ error: 'no customer email' }, { status: 400 });
  }

  const product = PRODUCTS[session.metadata?.product ?? ''] ?? KEEL;

  let purchase;
  try {
    ({ purchase } = await recordPurchase({
      email,
      product: product.slug,
      sessionId: session.id,
      paymentIntent:
        typeof session.payment_intent === 'string' ? session.payment_intent : null,
      customerId: typeof session.customer === 'string' ? session.customer : null,
      amountCents: session.amount_total ?? product.priceCents,
      currency: session.currency ?? product.currency,
    }));
  } catch (err) {
    // Nothing durable was written, so let Stripe retry.
    console.error('[webhook] could not record purchase', err);
    return NextResponse.json({ error: 'record failed' }, { status: 500 });
  }

  if (purchase.delivered_at) {
    return NextResponse.json({ received: true, alreadyDelivered: true });
  }

  try {
    await sendDeliveryEmail({
      to: purchase.email,
      product,
      downloadUrl: `${env.siteUrl}/download/${purchase.download_token}`,
      amountCents: purchase.amount_cents,
      currency: purchase.currency,
    });
    await markDelivered(purchase.id);
  } catch (err) {
    // The purchase is recorded and the token exists; /thanks can still hand over
    // the link. Store why the email failed instead of losing it in a log.
    console.error('[webhook] delivery email failed', err);
    await markDelivered(purchase.id, err instanceof Error ? err.message : String(err));
  }

  return NextResponse.json({ received: true });
}
