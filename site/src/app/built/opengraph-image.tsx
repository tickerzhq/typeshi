import { PAGES, wasmGzipKB } from "@/lib/built";
import { CARD, card } from "@/lib/card";

export const alt = `How typeshi is built: lib.shi to lib.rs to typeshi.wasm (${wasmGzipKB} KB gzipped) to ${PAGES.length} static pages.`;
export const size = CARD;
export const contentType = "image/png";

const arrow = { text: "  →  ", tone: "muted" as const };

export default function Image() {
  return card({
    path: "/built",
    title: "how it's built.",
    lede: "one Rust crate, compiled twice: for your terminal and for the browser.",
    terminal: {
      caption: "from .shi to your screen",
      lines: [
        {
          text: [
            { text: "lib.shi", tone: "slang" },
            arrow,
            { text: "lib.rs" },
            arrow,
            { text: "typeshi.wasm " },
            { text: `${wasmGzipKB} KB gzipped`, tone: "muted" },
            arrow,
            { text: `${PAGES.length} pages` },
          ],
        },
      ],
      size: 24,
    },
  });
}
