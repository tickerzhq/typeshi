import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import PageHead from "@/components/PageHead";
import { Arrow } from "@/components/SecHead";
import { PAGES } from "@/lib/pages";
import s from "./not-found.module.css";

export const metadata: Metadata = { title: "404" };

// Our own not-found page, so the site's tokens and theme apply. Next's built-in one sets its own body
// colors from prefers-color-scheme, which left a dark header over a white page in the light theme.
export default function NotFound() {
  return (
    <>
      <div className="wrap">
        <PageHead
          title={
            <>
              404. <span className={s.ngmi}>ngmi.</span>
            </>
          }
        >
          There&apos;s no page here. Maybe it never launched, maybe it got rugged. Either way, nothing to see.
        </PageHead>
        <div className={s.actions}>
          <Link href="/" className="button">
            Back home <span aria-hidden="true">→</span>
          </Link>
        </div>
        <nav aria-label="or try one of these">
          <ul className="rows">
            {PAGES.map((p) => (
              <li key={p.href}>
                <Link href={p.href} className="row">
                  <span className="row-text">
                    <span>{p.label}</span>
                    <small>{p.line}</small>
                  </span>
                  <span className="row-go">
                    <Arrow />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <Footer />
    </>
  );
}
