import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';

import { env } from './env';

/**
 * Service-role Supabase client. Server-only.
 *
 * The purchases table has RLS on with no policies, so this is the only key that
 * can read or write it. Never import this from a client component.
 */
function admin() {
  return createClient(env.supabaseUrl, env.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** The purchases table. Configurable so Keel can share a database that already
 *  holds unrelated tables without colliding. */
function table() {
  return env.purchasesTable;
}

/** Storage is not schema-scoped, so it needs its own client. */
function storage() {
  return createClient(env.supabaseUrl, env.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type Purchase = {
  id: string;
  email: string;
  product: string;
  stripe_session_id: string;
  amount_cents: number;
  currency: string;
  download_token: string;
  token_expires_at: string;
  downloads_used: number;
  download_limit: number;
  delivered_at: string | null;
};

const TOKEN_TTL_DAYS = 30;

export function newDownloadToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Idempotent by `stripe_session_id`.
 *
 * Stripe retries webhooks, and will happily deliver the same event twice. Without
 * the unique constraint plus this ignoreDuplicates path, a retry mints a second
 * token and sends the buyer a second email.
 */
export async function recordPurchase(input: {
  email: string;
  product: string;
  sessionId: string;
  paymentIntent: string | null;
  customerId: string | null;
  amountCents: number;
  currency: string;
}): Promise<{ purchase: Purchase; isNew: boolean }> {
  const db = admin();
  const expires = new Date(Date.now() + TOKEN_TTL_DAYS * 864e5).toISOString();

  const { data: inserted, error } = await db
    .from(table())
    .insert({
      email: input.email,
      product: input.product,
      stripe_session_id: input.sessionId,
      stripe_payment_intent: input.paymentIntent,
      stripe_customer_id: input.customerId,
      amount_cents: input.amountCents,
      currency: input.currency,
      download_token: newDownloadToken(),
      token_expires_at: expires,
    })
    .select()
    .single();

  if (!error && inserted) return { purchase: inserted as Purchase, isNew: true };

  // 23505 = unique_violation on stripe_session_id: this is a webhook retry.
  if (error && error.code !== '23505') throw error;

  const { data: existing, error: readErr } = await db
    .from(table())
    .select()
    .eq('stripe_session_id', input.sessionId)
    .single();
  if (readErr) throw readErr;
  return { purchase: existing as Purchase, isNew: false };
}

/** Backs the /thanks fallback when the delivery email does not arrive. */
export async function findBySessionId(sessionId: string): Promise<Purchase | null> {
  const db = admin();
  const { data, error } = await db
    .from(table())
    .select()
    .eq('stripe_session_id', sessionId)
    .maybeSingle();
  if (error) throw error;
  return (data as Purchase) ?? null;
}

export async function findByToken(token: string): Promise<Purchase | null> {
  const db = admin();
  const { data, error } = await db
    .from(table())
    .select()
    .eq('download_token', token)
    .maybeSingle();
  if (error) throw error;
  return (data as Purchase) ?? null;
}

export async function countDownload(id: string, used: number): Promise<void> {
  const db = admin();
  await db.from(table()).update({ downloads_used: used + 1 }).eq('id', id);
}

export async function markDelivered(id: string, error?: string): Promise<void> {
  const db = admin();
  await db
    .from(table())
    .update(
      error
        ? { delivery_error: error.slice(0, 500) }
        : { delivered_at: new Date().toISOString(), delivery_error: null },
    )
    .eq('id', id);
}

/** Time-limited signed URL for the private asset in Supabase Storage. */
export async function signedAssetUrl(path: string, seconds = 900): Promise<string> {
  const [bucket, ...rest] = path.split('/');
  const { data, error } = await storage()
    .storage
    .from(bucket)
    .createSignedUrl(rest.join('/'), seconds);
  if (error) throw error;
  return data.signedUrl;
}
