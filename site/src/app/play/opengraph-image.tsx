import content from "@/generated/content.json";
import { CARD, card, pairLines } from "@/lib/card";

export const alt = "The typeshi playground: lines of gm_counter in typeshi beside the Rust the compiler writes for them.";
export const size = CARD;
export const contentType = "image/png";

export default function Image() {
  return card({
    path: "/play",
    title: "the playground.",
    lede: "write typeshi, get Anchor Rust. the real compiler, in your browser.",
    terminal: { caption: "gm_counter: lib.shi → lib.rs", verdict: "wagmi", lines: pairLines(content.phrasebook), size: 22 },
  });
}
