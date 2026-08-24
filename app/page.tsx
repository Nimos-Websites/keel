import Link from "next/link";

export const metadata = {
  title: "Keel — the Next.js starter with payments pre-wired",
  description:
    "Auth, Stripe checkout, Postgres and deployment wired before you write line one. Ship your SaaS this weekend, not this quarter.",
};

const features = [
  {
    icon: "💳",
    title: "Stripe checkout wired",
    body: "Products, checkout sessions, webhooks and a customer portal — configured, tested, ready for your price tag.",
  },
  {
    icon: "🔐",
    title: "Auth that works day one",
    body: "Supabase auth with sessions, middleware guards and a profile flow. Email + OAuth, already glued together.",
  },
  {
    icon: "🐘",
    title: "Postgres with a schema",
    body: "Migrations, typed client, and the tables a paying SaaS actually needs. Not a blank folder.",
  },
  {
    icon: "🚀",
    title: "Deploy in one command",
    body: "Vercel-first: env template, build config and a README that assumes you have a weekend, not a month.",
  },
  {
    icon: "🧭",
    title: "Opinionated structure",
    body: "App router, server actions, and a folder layout that stays sane at 50 pages. Delete what you don't need.",
  },
  {
    icon: "⚖️",
    title: "MIT, yours forever",
    body: "No license fees, no phone-home. Clone it, rebrand it, ship ten products on it.",
  },
];

const steps = [
  { n: 1, t: "Clone & install", d: "One repo, one npm install. No monorepo ceremony." },
  { n: 2, t: "Drop in your keys", d: "Stripe + Supabase env vars — the template documents every one." },
  { n: 3, t: "Change the logo", d: "Seriously. The boring 80% is done; the fun 20% is yours." },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0A0A0F] text-[#F2F0EB] antialiased">
      {/* nav */}
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <div className="text-xl font-extrabold tracking-tight">
          Keel<span className="text-[#A37FD4]">.</span>
        </div>
        <Link
          href="#get"
          className="rounded-full bg-[#A37FD4] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#B793E4]"
        >
          Get the starter
        </Link>
      </nav>

      {/* hero */}
      <header className="relative mx-auto max-w-5xl px-6 pb-20 pt-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-24 h-72 opacity-70"
          style={{
            background:
              "radial-gradient(600px 220px at 20% 20%, rgba(122,80,176,.28), transparent 65%)",
          }}
        />
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#A37FD4]">
          Next.js starter · payments pre-wired
        </p>
        <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
          Your SaaS this weekend,
          <br />
          <span className="bg-gradient-to-r from-[#7A50B0] to-[#A37FD4] bg-clip-text text-transparent">
            not this quarter.
          </span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-[#9A948C]">
          Keel is the Next.js starter where the hard boring part is already done: Stripe
          checkout, auth, Postgres and deployment — wired, tested, and documented before
          you write line one.
        </p>
        <div className="mt-9 flex flex-wrap gap-4">
          <Link
            href="#get"
            className="rounded-full bg-gradient-to-r from-[#2E003E] via-[#7A50B0] to-[#A37FD4] px-8 py-4 font-bold shadow-[0_6px_24px_rgba(122,80,176,.4)] transition hover:-translate-y-0.5"
          >
            Get the starter →
          </Link>
          <Link
            href="/compare"
            className="rounded-full border border-[#3A3A4C] px-8 py-4 font-semibold text-[#9A948C] transition hover:border-[#A37FD4] hover:text-white"
          >
            How it compares
          </Link>
        </div>
      </header>

      {/* features */}
      <section className="mx-auto max-w-5xl px-6 py-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-[#262633] bg-[#15151E] p-6 transition hover:-translate-y-1 hover:border-[#7A50B0]"
            >
              <div className="text-3xl">{f.icon}</div>
              <h3 className="mt-4 text-base font-bold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#9A948C]">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* steps */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-3xl font-extrabold tracking-tight">Three steps. That's the whole list.</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="rounded-2xl border border-[#262633] bg-[#15151E] p-6">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-[#2E003E] to-[#A37FD4] text-sm font-extrabold">
                {s.n}
              </div>
              <h3 className="mt-4 font-bold">{s.t}</h3>
              <p className="mt-1.5 text-sm text-[#9A948C]">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* get */}
      <section id="get" className="mx-auto max-w-5xl px-6 py-16">
        <div className="rounded-3xl border border-[#7A50B0]/40 bg-gradient-to-b from-[#1A1026] to-[#15151E] p-10 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight">Start on the keel. Stay on the keel.</h2>
          <p className="mx-auto mt-3 max-w-lg text-[#9A948C]">
            One purchase, lifetime updates. Every future improvement to the starter lands in
            your repo.
          </p>
          <a
            href="/go/keel-starter-lifetime-2ec760"
            className="mt-7 inline-block rounded-full bg-gradient-to-r from-[#2E003E] via-[#7A50B0] to-[#A37FD4] px-10 py-4 text-lg font-bold shadow-[0_8px_30px_rgba(122,80,176,.45)] transition hover:-translate-y-0.5"
          >
            Get Keel →
          </a>
          <p className="mt-3 text-xs text-[#6E6860]">Secure checkout · lifetime updates · MIT licensed</p>
        </div>
      </section>

      <footer className="border-t border-[#262633] py-10 text-center text-sm text-[#6E6860]">
        Keel — built by the Nimos fleet ·{" "}
        <Link href="/compare" className="hover:text-[#A37FD4]">
          compare starters
        </Link>
      </footer>
    </main>
  );
}
