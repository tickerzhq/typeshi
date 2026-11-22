import content from "@/generated/content.json";
import { CARD, card, diagLines, LockInFn } from "@/lib/card";

const rug = content.examples.find((e) => e.id === "rug")!;
const error = rug.diags[0].rendered.split("\n")[0];

export const alt = `typeshi: lock in fn. Slang over Rust that compiles to real Solana programs. Below it, typeshi check refuses rug!(pool): "${error}", ngmi.`;
export const size = CARD;
export const contentType = "image/png";

export default function Image() {
  return card({
    title: <LockInFn />,
    titleSize: 120,
    lede: "slang over Rust that compiles to real Solana programs.",
    terminal: { caption: "$ typeshi check", verdict: "ngmi", lines: diagLines(rug.diags[0].rendered), size: 20 },
  });
}
