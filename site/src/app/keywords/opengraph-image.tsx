import content from "@/generated/content.json";
import { CARD, card, pairLines } from "@/lib/card";

export const alt = `typeshi keywords: ${content.keywords.length} words, each beside the Rust or Anchor it becomes, like stealth_launch to pub mod.`;
export const size = CARD;
export const contentType = "image/png";

export default function Image() {
  return card({
    path: "/keywords",
    title: "keywords.",
    lede: `${content.keywords.length} words, each next to the Rust or Anchor it becomes.`,
    terminal: { caption: "gm_counter: lib.shi → lib.rs", verdict: "wagmi", lines: pairLines(content.keywordPairs), size: 22 },
  });
}
