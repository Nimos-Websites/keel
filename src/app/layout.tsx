import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Keel — the Next.js starter that ships with the money already wired",
  description:
    "Next.js 16, Stripe Checkout with a signature-verified idempotent webhook, Supabase with RLS on, Resend delivery. Take a real payment on day one.",
  openGraph: {
    title: "Keel",
    description: "The Next.js starter that ships with the money already wired.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0b0c0e] text-[#e7e8ec]">
        {children}
      </body>
    </html>
  );
}
