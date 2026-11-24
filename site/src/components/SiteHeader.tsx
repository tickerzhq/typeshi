"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { PAGES } from "@/lib/pages";

// The menu's code loads the first time it opens, as tickerz.com's does: no page carries the dialog until then.
const PhoneMenu = dynamic(() => import("./PhoneMenu"), { ssr: false });

const GITHUB =
  "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z";

/** The mark: the fn tile (the favicon's), then the name in mono, then the version from 600px. */
export function Mark({ version }: { version: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-tag bg-brand font-mono text-label font-bold tracking-tight text-on-brand">
        fn
      </span>
      <span className="truncate font-mono text-lede font-bold tracking-tight">typeshi</span>
      <span className="hidden font-mono text-label text-ink-3 sm:inline">v{version}</span>
    </span>
  );
}

const ICON_BUTTON =
  "grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-ink-2 no-underline transition-colors hover:text-ink aria-pressed:text-ink";

/**
 * The bar, as tickerz.com's (LiveNav): 56px, 64px from 600px, the ground with a hairline under it. The mark, the pages as
 * plain 14px words with a 1px line under the one you are on, then GitHub and the theme. At 900px and under the words go
 * into the full-screen menu (PhoneMenu). The name is the one thing that gives way when large text runs out of room.
 */
export default function SiteHeader({ version }: { version: string }) {
  const path = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const here = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`));
  // A link inside the menu navigates; the menu closes with it.
  useEffect(() => setOpen(false), [path]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-page">
      <div className="frame flex h-14 items-center gap-8 sm:h-16">
        <Link href="/" className="-m-2 flex min-h-11 min-w-0 shrink items-center p-2 text-ink no-underline">
          <Mark version={version} />
        </Link>
        <nav aria-label="primary" className="hidden h-full items-stretch gap-8 md:flex">
          {PAGES.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              aria-current={here(p.href) ? "page" : undefined}
              className="relative flex items-center whitespace-nowrap text-small font-medium text-ink-2 no-underline transition-colors hover:text-ink aria-[current=page]:text-ink aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-0 aria-[current=page]:after:bottom-0 aria-[current=page]:after:h-px aria-[current=page]:after:bg-ink aria-[current=page]:after:content-['']"
            >
              {p.label}
            </Link>
          ))}
        </nav>
        <div className="-mr-3 ml-auto flex shrink-0 items-center">
          <a href="https://github.com/tickerzhq/typeshi" aria-label="typeshi on GitHub" className={`${ICON_BUTTON} hidden sm:grid`}>
            <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
              <path fill="currentColor" d={GITHUB} />
            </svg>
          </a>
          <ThemeToggle className={ICON_BUTTON} />
          <button
            ref={button}
            type="button"
            className={`${ICON_BUTTON} md:hidden`}
            aria-label="Open the menu"
            aria-haspopup="dialog"
            aria-expanded={open}
            onPointerDown={() => setLoaded(true)}
            onClick={() => {
              setLoaded(true);
              setOpen(true);
            }}
          >
            <Menu size={20} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      </div>
      {loaded ? <PhoneMenu open={open} onOpenChange={setOpen} here={here} version={version} button={button} /> : null}
    </header>
  );
}
