"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { PAGES, MORE } from "@/lib/pages";
import s from "./SiteHeader.module.css";

/** Lucide's outlines (ISC), one stroke, as Tickerz's bar and menu draw them. */
function Icon({ d }: { d: string[] }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d.map((p) => (
        <path key={p} d={p} />
      ))}
    </svg>
  );
}
const MENU = ["M4 6h16", "M4 12h16", "M4 18h16"];
const CLOSE = ["M18 6 6 18", "m6 6 12 12"];
const GITHUB =
  "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z";

function Mark({ version }: { version: string }) {
  return (
    <>
      <span className={s.tile} aria-hidden="true">
        fn
      </span>
      <span className={s.name}>
        typeshi<span className={s.ver}>v{version}</span>
      </span>
    </>
  );
}

/**
 * The bar, as tickerz.com's (LiveNav): the mark, the pages as plain words with a line under the one you are on,
 * then GitHub and the theme. At 900px and under the words go into a full-screen menu (PhoneMenu): the pages with an
 * icon and one line, the rest in two columns, and the two actions at the bottom. A native dialog keeps focus inside,
 * closes on Escape and holds the page behind still.
 */
export default function SiteHeader({ version }: { version: string }) {
  const path = usePathname() ?? "/";
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const here = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`));

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  // A link inside the menu navigates; the menu closes with it.
  useEffect(() => setOpen(false), [path]);

  return (
    <header className={s.bar}>
      <div className={`wrap ${s.in}`}>
        <Link href="/" className={s.mark}>
          <Mark version={version} />
        </Link>
        <nav aria-label="primary" className={s.nav}>
          {PAGES.map((p) => (
            <Link key={p.href} href={p.href} className={s.tab} aria-current={here(p.href) ? "page" : undefined}>
              {p.label}
            </Link>
          ))}
        </nav>
        <div className={s.end}>
          <a href="https://github.com/tickerzhq/typeshi" aria-label="typeshi on GitHub" className={`${s.icon} ${s.gh}`}>
            <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
              <path fill="currentColor" d={GITHUB} />
            </svg>
          </a>
          <ThemeToggle className={s.icon} />
          <button type="button" className={`${s.icon} ${s.menuButton}`} aria-label="Open the menu" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
            <Icon d={MENU} />
          </button>
        </div>
      </div>

      <dialog ref={dialog} className={s.sheet} aria-label="Menu" onClose={() => setOpen(false)}>
        <div className={s.sheetBar}>
          <div className={`wrap ${s.in}`}>
            <Link href="/" className={s.mark} onClick={() => setOpen(false)}>
              <Mark version={version} />
            </Link>
            <button type="button" className={s.icon} aria-label="Close the menu" onClick={() => setOpen(false)}>
              <Icon d={CLOSE} />
            </button>
          </div>
        </div>
        <div className={s.sheetBody}>
          <div className="wrap">
            <nav aria-label="pages">
              <ul className={s.products}>
                {PAGES.map((p) => (
                  <li key={p.href}>
                    <Link href={p.href} className={s.product} aria-current={here(p.href) ? "page" : undefined} onClick={() => setOpen(false)}>
                      <span className={s.productIcon}>
                        <Icon d={p.icon} />
                      </span>
                      <span className={s.productText}>
                        <span className={s.productName}>{p.label}</span>
                        <span className={s.productLine}>{p.line}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label="more" className={s.more}>
              {MORE.map(([href, label]) => (
                <a key={href} href={href} onClick={() => setOpen(false)}>
                  {label}
                </a>
              ))}
            </nav>
          </div>
        </div>
        <div className={s.sheetFoot}>
          <div className={`wrap ${s.actions}`}>
            <Link href="/tour" className="button" onClick={() => setOpen(false)}>
              Take the tour
            </Link>
            <Link href="/play" className="button" data-quiet="" onClick={() => setOpen(false)}>
              Playground
            </Link>
          </div>
        </div>
      </dialog>
    </header>
  );
}
