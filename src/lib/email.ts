import { Resend } from 'resend';

import { env } from './env';
import { formatPrice, type Product } from './product';

/**
 * Delivery email. This IS the product handoff — if it does not arrive, the
 * customer has paid and received nothing, so the caller records the failure
 * against the purchase rather than swallowing it.
 */
export async function sendDeliveryEmail(args: {
  to: string;
  product: Product;
  downloadUrl: string;
  amountCents: number;
  currency: string;
}): Promise<void> {
  const resend = new Resend(env.resendApiKey);
  const { product, downloadUrl } = args;

  const { error } = await resend.emails.send({
    from: env.fromEmail,
    to: args.to,
    subject: `Your ${product.name} download`,
    text: [
      `Thanks for buying ${product.name}.`,
      '',
      `Download it here: ${downloadUrl}`,
      '',
      'That link works for 30 days and up to 5 downloads. Keep this email —',
      'it is the only copy of the link.',
      '',
      'What you have:',
      '  - Next.js 16 App Router, TypeScript, Tailwind 4',
      '  - Stripe Checkout and a signature-verified, idempotent webhook',
      '  - Supabase with row-level security on by default',
      '  - Resend transactional email',
      '  - One-command deploy to Vercel',
      '',
      'README.md in the zip takes you from unzip to taking real money.',
      '',
      `Paid ${formatPrice(args.amountCents, args.currency)}. Reply to this email if`,
      'anything is wrong and a human will read it.',
    ].join('\n'),
    html: `
<div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:34rem;margin:0 auto;padding:32px 24px;color:#14161a;line-height:1.55">
  <p style="margin:0 0 24px;font-size:15px">Thanks for buying <strong>${product.name}</strong>.</p>
  <p style="margin:0 0 28px">
    <a href="${downloadUrl}" style="display:inline-block;background:#14161a;color:#fff;text-decoration:none;padding:13px 22px;border-radius:7px;font-size:15px;font-weight:600">Download ${product.name}</a>
  </p>
  <p style="margin:0 0 24px;font-size:13px;color:#5b6270">
    That link works for 30 days and up to 5 downloads. Keep this email — it is the only copy of the link.
  </p>
  <p style="margin:0 0 8px;font-size:14px;font-weight:600">What you have</p>
  <ul style="margin:0 0 24px;padding-left:20px;font-size:14px;color:#3d434e">
    <li>Next.js 16 App Router, TypeScript, Tailwind 4</li>
    <li>Stripe Checkout and a signature-verified, idempotent webhook</li>
    <li>Supabase with row-level security on by default</li>
    <li>Resend transactional email</li>
    <li>One-command deploy to Vercel</li>
  </ul>
  <p style="margin:0 0 24px;font-size:14px;color:#3d434e">
    <code>README.md</code> in the zip takes you from unzip to taking real money.
  </p>
  <hr style="border:0;border-top:1px solid #e6e8ec;margin:28px 0">
  <p style="margin:0;font-size:13px;color:#5b6270">
    Paid ${formatPrice(args.amountCents, args.currency)}. Reply to this email if anything is wrong and a human will read it.
  </p>
</div>`.trim(),
  });

  if (error) throw new Error(`Resend refused the delivery email: ${error.message}`);
}
