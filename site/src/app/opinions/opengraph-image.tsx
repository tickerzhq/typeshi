import content from "@/generated/content.json";
import { CARD, card, diagLines } from "@/lib/card";

const friday = content.examples.find((e) => e.id === "friday")!;
const first = friday.diags[0].rendered;

export const alt = `The compiler has opinions: ${content.banned.length} banned moves and ${content.fixedErrors.length} error codes that never change. Below, typeshi check on a Friday deploy: "${first.split("\n")[0]}"`;
export const size = CARD;
export const contentType = "image/png";

export default function Image() {
  return card({
    path: "/opinions",
    title: "the compiler has opinions.",
    lede: `${content.banned.length} banned moves. ${content.fixedErrors.length} error codes that never change.`,
    terminal: { caption: "$ typeshi check", verdict: "ngmi", lines: diagLines(first), size: 20 },
  });
}
