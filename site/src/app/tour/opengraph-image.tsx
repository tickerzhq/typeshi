import content from "@/generated/content.json";
import { CARD, card } from "@/lib/card";

const chapters = [...new Set(content.tour.map((l) => l.chapter))].map((name) => ({
  name,
  n: content.tour.filter((l) => l.chapter === name).length,
}));

export const alt = `The typeshi tour: ${content.tour.length} lessons in ${chapters.length} chapters, ${chapters.map((c) => c.name).join(", ")}.`;
export const size = CARD;
export const contentType = "image/png";

export default function Image() {
  return card({
    path: "/tour",
    title: "learn typeshi by breaking it.",
    lede: `${content.tour.length} short lessons. the real compiler checks each one as you type.`,
    terminal: {
      caption: `${chapters.length} chapters`,
      lines: [
        {
          text: chapters.flatMap((c, i) => [
            ...(i ? [{ text: "  ·  ", tone: "muted" as const }] : []),
            { text: `${c.name} ` },
            { text: String(c.n), tone: "slang" as const },
          ]),
        },
      ],
      size: 24,
    },
  });
}
