import { NextResponse } from 'next/server';

import { countDownload, findByToken, signedAssetUrl } from '@/lib/db';
import { KEEL, PRODUCTS } from '@/lib/product';

export const runtime = 'nodejs';

/**
 * Redeems a download token for a short-lived signed URL to the private asset.
 *
 * The token is a bearer secret, so it is never logged, and every failure returns
 * the same generic message — distinguishing "no such token" from "expired" tells
 * someone guessing tokens when they have found a real one.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;

  const deny = (status: number, message: string) =>
    NextResponse.json({ error: message }, { status });

  if (!token || token.length < 20) return deny(404, 'This download link is not valid.');

  let purchase;
  try {
    purchase = await findByToken(token);
  } catch (err) {
    console.error('[download] lookup failed', err);
    return deny(500, 'Something went wrong. Reply to your receipt email.');
  }

  if (!purchase) return deny(404, 'This download link is not valid.');

  if (new Date(purchase.token_expires_at) < new Date()) {
    return deny(410, 'This download link has expired. Reply to your receipt email.');
  }

  if (purchase.downloads_used >= purchase.download_limit) {
    return deny(429, 'This download link has been used its maximum number of times. Reply to your receipt email.');
  }

  const product = PRODUCTS[purchase.product] ?? KEEL;

  let url: string;
  try {
    url = await signedAssetUrl(product.assetPath);
  } catch (err) {
    console.error('[download] could not sign asset url', err);
    return deny(500, 'The file could not be prepared. Reply to your receipt email.');
  }

  // Counted after the URL is successfully minted, so a storage outage does not
  // burn one of the buyer's five attempts.
  await countDownload(purchase.id, purchase.downloads_used);

  return NextResponse.redirect(url, 302);
}
