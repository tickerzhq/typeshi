import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import content from "@/generated/content.json";
import { headScript } from "@/lib/head";
import { siteUrl } from "@/lib/site";
import { colors } from "@/lib/tokens";
import { mono, sans } from "./fonts";
import "./tokens.css";
import "./globals.css";
import s from "./site.module.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "typeshi: lock in fn.", template: "%s · typeshi" },
  description:
    "A joke language that really works: slang over Rust that compiles to real Solana programs (Anchor 1.2). rug!() is a compile error. Try the real compiler in your browser.",
  openGraph: {
    title: "typeshi: lock in fn.",
    description: "Slang over Rust that compiles to real Solana programs. rug!() is a compile error.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  alternates: { types: { "text/plain": "/llms.txt" } },
};

export const viewport: Viewport = { themeColor: colors.dark["surface-page"], colorScheme: "dark light" };

function GitHubMark() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" className={s.icon}>
      <path
        fill="currentColor"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
      />
    </svg>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: headScript }} />
      </head>
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
              <Link href="/tour">tour</Link>
              <Link href="/play">
                <span>
                  play<span className={s.long}>ground</span>
                </span>
              </Link>
              <Link href="/opinions" className={s.wide}>
                opinions
              </Link>
              <Link href="/keywords" className={s.wide}>
                keywords
              </Link>
              <a href="https://github.com/tickerzhq/typeshi" aria-label="github">
                <GitHubMark />
                <span className={s.long}>github</span>
              </a>
              <ThemeToggle className={s.theme} />
            </nav>
          </div>
        </header>
        <main id="main">{children}</main>
        {process.env.VERCEL ? <Analytics /> : null}
      </body>
    </html>
  );
}
