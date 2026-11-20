import { Analytics } from "@vercel/analytics/next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import content from "@/generated/content.json";
import "./globals.css";
import s from "./site.module.css";

const site = "https://typeshi.dev";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? site),
  title: { default: "typeshi: lock in fn.", template: "%s · typeshi" },
  description:
    "A joke language that really works: slang over Rust that compiles to real Solana programs (Anchor 1.2). rug!() is a compile error. Try the real compiler in your browser.",
  openGraph: {
    title: "typeshi: lock in fn.",
    description: "Slang over Rust that compiles to real Solana programs. rug!() is a compile error.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#0b0b0d", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <a className="skip" href="#main">
          skip to content
        </a>
        <header className={s.header}>
          <div className={`wrap ${s.headerIn}`}>
            <Link href="/" className={s.mark}>
              typeshi<span className={s.ver}>v{content.version}</span>
            </Link>
            <nav aria-label="primary" className={s.nav}>
              <Link href="/play">playground</Link>
              <Link href="/#opinions">opinions</Link>
              <Link href="/#keywords">keywords</Link>
              <a href="https://github.com/tickerzhq/typeshi">github</a>
            </nav>
          </div>
        </header>
        <main id="main">{children}</main>
        {process.env.VERCEL ? <Analytics /> : null}
      </body>
    </html>
  );
}
