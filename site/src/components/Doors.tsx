import Link from "next/link";
import content from "@/generated/content.json";
import s from "./Doors.module.css";

const chapters = new Set(content.tour.map((l) => l.chapter)).size;

// Every count comes from content.json, so it is what the site really has. Each door's color is the
// compiler's own word for it: lime is wagmi (lessons you pass), red is ngmi (banned moves), violet is
// the editor's keyword color, and the playground is plain text, like the code you bring.
const DOORS = [
  {
    href: "/tour",
    name: "tour",
    n: content.tour.length,
    text: `lessons in ${chapters} chapters. the compiler grades each one as you type.`,
    tone: "wagmi",
  },
  {
    href: "/play",
    name: "playground",
    n: content.examples.length,
    text: "programs to start from, or a blank file. a share link carries your code.",
    tone: "plain",
  },
  {
    href: "/opinions",
    name: "opinions",
    n: content.banned.length,
    text: `banned moves, ${content.fixedErrors.length} error codes that never change, and what it says when you fail.`,
    tone: "ngmi",
  },
  {
    href: "/keywords",
    name: "keywords",
    n: content.keywords.length,
    text: "words, each next to the Rust or Anchor it becomes.",
    tone: "keyword",
  },
] as const;

/** The four ways into the rest of typeshi, each with a real count. */
export default function Doors({ label = "the rest of typeshi" }: { label?: string }) {
  return (
    <nav aria-label={label}>
      <ul className={s.doors}>
        {DOORS.map((d) => (
          <li key={d.href}>
            <Link href={d.href} className={s.door} data-tone={d.tone}>
              <span className={s.name}>
                {d.name}
                <span className={s.arrow} aria-hidden="true">
                  →
                </span>
              </span>
              <span className={s.n}>{d.n}</span>
              <span className={s.text}>{d.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
