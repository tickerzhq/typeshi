import { CARD, card, diagLines, type Line } from "@/lib/card";
import { decodeShared, verdict } from "@/lib/server-compile";

export const alt = "A shared typeshi program and what the compiler said about it.";
export const size = CARD;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const src = decodeShared(code) ?? "// this link doesn't hold a program.";
  const v = verdict(src);
  // A program that doesn't compile shows its first error exactly as the CLI prints it; one that does
  // shows its first lines.
  const lines: Line[] = v.rendered
    ? diagLines(v.rendered)
    : src
        .split("\n")
        .filter((l) => !/^\s*\/\//.test(l))
        .slice(0, 6)
        .map((text, i) => ({ gutter: String(i + 1).padStart(2), text, tone: "code" as const }));
  const res = await card({
    kicker: "a shared program",
    title: v.program ?? "a typeshi program",
    terminal: { caption: v.program ? `${v.program}.shi` : "lib.shi", lines, verdict: v.ok ? "wagmi" : "ngmi", size: 22 },
  });
  // A link's program never changes, so its card can live at the edge for good.
  res.headers.set("Cache-Control", "public, max-age=86400, s-maxage=31536000, immutable");
  return res;
}
