import { KEEL, formatPrice } from "@/lib/product";

export const dynamic = "force-static";

/** Every claim on this page is something the zip actually contains. */
const WIRED: Array<[string, string]> = [
  [
    "Stripe Checkout",
    "Session created server-side from a Price ID. The amount is never accepted from the browser, so a tampered request cannot undercharge you.",
  ],
  [
    "A webhook that survives production",
    "Signature verified against the raw body. Idempotent on the session id, because Stripe retries and a retry must not charge twice or email twice.",
  ],
  [
    "Supabase with RLS already on",
    "The purchases table ships with row-level security enabled and zero policies — deny by default, service role only. Most starters ship it off.",
  ],
  [
    "Delivery that is not a redirect",
    "Resend sends a real email carrying a signed, expiring, use-limited download link. The customer keeps it after they close the tab.",
  ],
  [
    "Failure states that are written down",
    "If the delivery email fails, the reason lands on the purchase row instead of a log nobody reads, and the buyer can still self-serve the link.",
  ],
];

const NOT: string[] = [
  "Not a UI kit. Two pages and four routes, styled plainly so you delete rather than untangle.",
  "Not subscriptions. One-time payments only — that is the whole surface it claims.",
  "Not an auth system. Downloads are token-gated, which is what selling a file needs.",
];

const TREE = `keel/
├─ src/app/
│  ├─ page.tsx                    the page you are reading
│  ├─ thanks/page.tsx             receipt + fallback download link
│  ├─ api/checkout/route.ts       creates the Stripe session
│  ├─ api/stripe/webhook/route.ts verified, idempotent, records + delivers
│  └─ download/[token]/route.ts   redeems a token for a signed URL
├─ src/lib/
│  ├─ env.ts       throws on a missing var instead of a 500 three layers down
│  ├─ product.ts   the catalogue; price here is display copy only
│  ├─ stripe.ts    pinned API version
│  ├─ db.ts        service-role client, idempotent insert, signed URLs
│  └─ email.ts     the delivery email, text and HTML
└─ supabase/migrations/           the purchases table, RLS on, no policies`;

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-20 sm:py-28">
      <header className="mb-14">
        <div className="mb-6 font-mono text-xs tracking-[0.2em] text-[#7d8494] uppercase">
          Keel
        </div>
        <h1 className="text-3xl leading-[1.15] font-semibold tracking-tight text-balance sm:text-[2.6rem]">
          Most starter kits get you to a landing page. This one gets you to a
          bank transfer.
        </h1>
        <p className="mt-6 max-w-xl text-[1.05rem] leading-relaxed text-[#a7adba]">
          {KEEL.tagline} Next.js 16, Stripe, Supabase, Resend, Vercel — wired
          together the way they have to be wired when the payment is real, not
          the way they look in a tutorial.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3">
          <a
            href="/api/checkout"
            className="rounded-lg bg-[#e7e8ec] px-6 py-3 text-[0.95rem] font-semibold text-[#0b0c0e] transition-colors hover:bg-white"
          >
            Buy Keel — {formatPrice(KEEL.priceCents, KEEL.currency)}
          </a>
          <span className="font-mono text-xs text-[#7d8494]">
            one-time · lifetime updates · delivered by email in seconds
          </span>
        </div>
      </header>

      <section className="mb-14">
        <h2 className="mb-5 font-mono text-xs tracking-[0.2em] text-[#7d8494] uppercase">
          What is actually wired
        </h2>
        <dl className="divide-y divide-[#1c1f26] border-y border-[#1c1f26]">
          {WIRED.map(([title, detail]) => (
            <div
              key={title}
              className="grid gap-1.5 py-5 sm:grid-cols-[13rem_1fr] sm:gap-6"
            >
              <dt className="text-[0.95rem] font-medium text-[#e7e8ec]">
                {title}
              </dt>
              <dd className="text-[0.93rem] leading-relaxed text-[#a7adba]">
                {detail}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mb-14">
        <h2 className="mb-5 font-mono text-xs tracking-[0.2em] text-[#7d8494] uppercase">
          Everything in the zip
        </h2>
        <div className="overflow-x-auto rounded-lg border border-[#1c1f26] bg-[#0e1014] p-5">
          <pre className="font-mono text-[0.78rem] leading-[1.7] text-[#98a0b0]">
            {TREE}
          </pre>
        </div>
        <p className="mt-4 text-[0.9rem] leading-relaxed text-[#7d8494]">
          That is the whole thing. You can read all of it in an afternoon, which
          is the point — a starter you cannot audit is a liability you paid for.
        </p>
      </section>

      <section className="mb-14">
        <h2 className="mb-5 font-mono text-xs tracking-[0.2em] text-[#7d8494] uppercase">
          What it is not
        </h2>
        <ul className="space-y-3">
          {NOT.map((line) => (
            <li
              key={line}
              className="border-l-2 border-[#2a2f3a] pl-4 text-[0.93rem] leading-relaxed text-[#a7adba]"
            >
              {line}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-[#1c1f26] bg-[#0e1014] p-7">
        <p className="text-[0.98rem] leading-relaxed text-[#c9cede]">
          The site you are on right now is running Keel. The button above goes
          through the same checkout, the same webhook and the same delivery
          email that you get in the zip.
        </p>
        <a
          href="/api/checkout"
          className="mt-6 inline-block rounded-lg bg-[#e7e8ec] px-6 py-3 text-[0.95rem] font-semibold text-[#0b0c0e] transition-colors hover:bg-white"
        >
          Buy Keel — {formatPrice(KEEL.priceCents, KEEL.currency)}
        </a>
      </section>

      <footer className="mt-14 font-mono text-xs text-[#5d6472]">
        Keel · one-time purchase · refunds honoured, just reply to your receipt
      </footer>
    </main>
  );
}
