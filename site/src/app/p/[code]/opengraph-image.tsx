import { CARD, card, diagLines, type Line } from "@/lib/card";
import { decodeShared, verdict } from "@/lib/server-compile";

export const alt = "A shared typeshi program and what the compiler said about it.";
export const size = CARD;
export const contentType = "image/png";

/** The program's first real lines (comments and blank lines skipped) with their real line numbers,
 * in rustc's gutter style, so the card reads like the error card does. */
function firstLines(src: string, n: number): Line[] {
  const all = src.split("\n").map((text, i) => ({ text, no: i + 1 }));
  const start = all.findIndex((l) => l.text.trim() && !/^\s*\/\//.test(l.text));
  return all
    .slice(Math.max(0, start))
    .filter((l) => !/^\s*\/\//.test(l.text))
    .slice(0, n)
    .map((l) => ({ gutter: `${String(l.no).padStart(3)} | `, text: l.text, tone: "code" as const }));
}

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const src = decodeShared(code) ?? "// this link doesn't hold a program.";
  const v = verdict(src);
  // A program that doesn't compile shows its first error exactly as the CLI prints it; one that does
  // shows its first lines.
  const lines: Line[] = v.rendered ? diagLines(v.rendered) : firstLines(src, 6);
  const res = await card({
    kicker: "a shared program",
    title: v.program ?? "a typeshi program",
    terminal: { caption: v.program ? `${v.program}.shi` : "lib.shi", lines, verdict: v.ok ? "wagmi" : "ngmi", size: 22 },
  });
  // A link's program never changes, so its card can live at the edge for good.
  res.headers.set("Cache-Control", "public, max-age=86400, s-maxage=31536000, immutable");
  return res;
}
