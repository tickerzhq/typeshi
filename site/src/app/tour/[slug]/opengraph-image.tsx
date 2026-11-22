import content from "@/generated/content.json";
import { CARD, card, type Terminal } from "@/lib/card";
import type { Lesson, Proof } from "@/lib/types-tour";

const lessons = content.tour as Lesson[];
const find = (slug: string) => lessons.find((l) => l.slug === slug)!;

export const contentType = "image/png";

// Made at build, one per lesson, like the lesson pages themselves.
export const dynamicParams = false;
export function generateStaticParams() {
  return lessons.map((l) => ({ slug: l.slug }));
}

/** What the compiler says when you pass the lesson, as the card's terminal shows it. */
function terminal(p: Proof): Terminal {
  if (p.kind === "ok") return { caption: "lib.rs", verdict: "wagmi", lines: [{ gutter: `${p.line}  `, text: p.text }] };
  return { caption: "$ typeshi check", verdict: p.kind === "error" ? "ngmi" : "wagmi", lines: [{ text: p.text, tone: p.kind }] };
}

export const alt = "A lesson of the typeshi tour: its title and chapter, and the line of real compiler output you get when you pass it.";
export const size = CARD;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const l = find((await params).slug);
  return card({
    path: `/tour/${l.slug}`,
    kicker: `tour · ${l.chapter} · lesson ${l.n} of ${lessons.length}`,
    title: l.title,
    terminal: terminal(l.proof),
  });
}
