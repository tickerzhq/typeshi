"use client";

import Link from "next/link";
import type { RefObject } from "react";
import { X } from "lucide-react";
import Sheet, { SheetClose } from "@/components/ui/Sheet";
import { MORE, PAGES } from "@/lib/pages";
import { Mark } from "./SiteHeader";

const ICON = { size: 20, strokeWidth: 1.5, "aria-hidden": true } as const;

/**
 * The phone menu, tickerz.com's (src/components/v2/PhoneMenu.tsx) with typeshi's pages: a full-screen sheet with its
 * own bar in the same place, so the X sits where the menu button was; the pages with an icon tile and one line; the
 * rest in two columns; the two actions at the bottom, clear of the home bar.
 */
export default function PhoneMenu({
  open,
  onOpenChange,
  here,
  version,
  button,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  here: (href: string) => boolean;
  version: string;
  button: RefObject<HTMLElement | null>;
}) {
  const close = () => onOpenChange(false);
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Menu" finalFocus={button}>
      <div className="shrink-0 border-b border-line">
        <div className="frame flex h-14 items-center justify-between">
          <Link href="/" onClick={close} className="-m-2 flex min-h-11 items-center p-2 text-ink no-underline">
            <Mark version={version} />
          </Link>
          <SheetClose className="-mr-3 grid size-11 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-ink-2 hover:text-ink" aria-label="Close the menu">
            <X {...ICON} />
          </SheetClose>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="frame pb-6 pt-4">
          <nav aria-label="pages">
            <ul className="m-0 flex list-none flex-col p-0">
              {PAGES.map((p) => (
                <li key={p.href}>
                  <Link
                    href={p.href}
                    onClick={close}
                    aria-current={here(p.href) ? "page" : undefined}
                    className="-mx-2 flex min-h-16 items-center gap-4 rounded-card px-2 py-2 text-ink no-underline hover:bg-raised aria-[current=page]:bg-raised"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-control border border-line bg-raised text-ink">
                      <p.icon {...ICON} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-lede font-medium leading-tight">{p.label}</span>
                      <span className="mt-0.5 block text-small text-ink-2">{p.line}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="more" className="mt-4 grid grid-cols-2 gap-x-4 border-t border-line pt-3">
            {MORE.map(([href, label]) => (
              <a key={href} href={href} onClick={close} className="flex h-11 items-center text-body text-ink-2 no-underline hover:text-ink">
                {label}
              </a>
            ))}
          </nav>
        </div>
      </div>
      <div className="shrink-0 border-t border-line">
        <div className="frame grid grid-cols-2 gap-2 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <Link href="/tour" onClick={close} className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-full bg-brand px-4 font-medium text-on-brand no-underline hover:bg-brand-hover">
            Take the tour
          </Link>
          <Link href="/play" onClick={close} className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-full border border-line-strong px-4 font-medium text-ink no-underline hover:bg-hover">
            Playground
          </Link>
        </div>
      </div>
    </Sheet>
  );
}
