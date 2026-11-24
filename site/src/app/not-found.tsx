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
          <ul className="m-0 list-none border-t border-line p-0">
            {PAGES.map((p) => (
              <li key={p.href} className="border-b border-line">
                <Link href={p.href} className="group grid min-h-11 grid-cols-[minmax(0,1fr)_28px] items-center gap-4 py-5 text-ink no-underline transition-colors hover:bg-hover">
                  <span className="grid min-w-0 gap-1">
                    <span className="text-lede leading-[1.3]">{p.label}</span>
                    <small className="text-small text-ink-2">{p.line}</small>
                  </span>
                  <span className="grid size-7 place-items-center rounded-full border border-line-strong text-ink-2 group-hover:text-ink">
                    <Arrow className="size-3" />
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
