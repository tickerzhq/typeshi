"use client";

import { Dialog } from "@base-ui/react/dialog";
import type { ReactNode, RefObject } from "react";

/**
 * A full-screen sheet on Base UI's Dialog, as tickerz.com's (src/components/ui/Sheet.tsx): while it is open, focus stays
 * inside, Escape closes it, the page behind does not scroll, and focus goes back to what opened it. Styled from the
 * tokens with Tailwind; motion is a short fade, off for reduced motion.
 */
export default function Sheet({
  open,
  onOpenChange,
  title,
  finalFocus,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The dialog's name for a screen reader. */
  title: string;
  finalFocus?: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const fade =
    "transition-opacity duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0 motion-reduce:transition-none";
  return (
    <Dialog.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
      <Dialog.Portal>
        <Dialog.Viewport className="fixed inset-0 z-50 flex">
          <Dialog.Popup className={`flex h-dvh w-full flex-col bg-page text-ink outline-none ${fade}`} finalFocus={finalFocus}>
            <Dialog.Title className="visually-hidden">{title}</Dialog.Title>
            {children}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** A button that closes the sheet it sits in. */
export const SheetClose = Dialog.Close;
