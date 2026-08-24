import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Keel — the Next.js starter with payments pre-wired",
  description:
    "Auth, Stripe checkout, Postgres and deployment wired before you write line one. Ship your SaaS this weekend, not this quarter.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
