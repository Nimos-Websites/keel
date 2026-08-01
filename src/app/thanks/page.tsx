import Link from "next/link";

import { findBySessionId } from "@/lib/db";
import { KEEL, PRODUCTS, formatPrice } from "@/lib/product";

export const dynamic = "force-dynamic";

/**
 * Receipt page, and the safety net.
 *
 * The delivery email is the primary handoff. This page exists because email is
 * not guaranteed — it bounces, it lands in spam, Resend has an outage. Rather
 * than leave someone who has paid with nothing, the link is shown here too, read
 * straight from the purchase row the webhook wrote.
 */
export default async function Thanks({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;
  const purchase = sessionId ? await findBySessionId(sessionId) : null;
  const product = purchase ? (PRODUCTS[purchase.product] ?? KEEL) : KEEL;

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-24">
      {purchase ? (
        <>
          <div className="mb-6 font-mono text-xs tracking-[0.2em] text-[#7d8494] uppercase">
            Paid — {formatPrice(purchase.amount_cents, purchase.currency)}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {product.name} is yours.
          </h1>
          <p className="mt-5 leading-relaxed text-[#a7adba]">
            A copy of this link is on its way to{" "}
            <span className="text-[#e7e8ec]">{purchase.email}</span>. If it does
            not arrive, use the button below — it is the same link, and it works
            for 30 days.
          </p>

          <a
            href={`/download/${purchase.download_token}`}
            className="mt-8 inline-block rounded-lg bg-[#e7e8ec] px-6 py-3 text-[0.95rem] font-semibold text-[#0b0c0e] transition-colors hover:bg-white"
          >
            Download {product.name}
          </a>

          <p className="mt-8 text-[0.9rem] leading-relaxed text-[#7d8494]">
            Start with <code className="font-mono text-[#a7adba]">README.md</code>
            . It takes you from unzip to taking a real payment. Reply to the
            receipt email if anything is wrong — a human reads it.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-semibold tracking-tight">
            We could not find that order.
          </h1>
          <p className="mt-5 leading-relaxed text-[#a7adba]">
            If you have just paid, the confirmation can take a few seconds to
            reach us — reload this page. Your download link is emailed either
            way, so check your inbox before worrying.
          </p>
          <Link
            href="/"
            className="mt-8 inline-block font-mono text-sm text-[#a7adba] underline underline-offset-4 hover:text-[#e7e8ec]"
          >
            Back to Keel
          </Link>
        </>
      )}
    </main>
  );
}
