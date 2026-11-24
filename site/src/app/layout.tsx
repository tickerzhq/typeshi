import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import SiteHeader from "@/components/SiteHeader";
import content from "@/generated/content.json";
import { headScript } from "@/lib/head";
import { homeMeta } from "@/lib/meta";
import { siteUrl } from "@/lib/site";
import { colors } from "@/lib/tokens";
import { mono, sans } from "./fonts";
import "./tokens.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: homeMeta.title, template: "%s · typeshi" },
  description: homeMeta.description,
  applicationName: "typeshi",
  alternates: { canonical: "/", types: homeMeta.alternates },
  openGraph: { title: homeMeta.title, description: homeMeta.social, url: "/", siteName: "typeshi", type: "website" },
  twitter: { card: "summary_large_image", title: homeMeta.title, description: homeMeta.social },
  appleWebApp: { title: "typeshi" },
};

export const viewport: Viewport = { themeColor: colors.dark["surface-page"], colorScheme: "dark light" };

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
        <SiteHeader version={content.version} />
        <main id="main">{children}</main>
        {process.env.VERCEL ? (
          <>
            <Analytics />
            <SpeedInsights />
          </>
        ) : null}
      </body>
    </html>
  );
}
