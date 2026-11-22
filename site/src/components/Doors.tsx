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
    text: `lessons, ${chapters} chapters`,
    tone: "wagmi",
  },
  {
    href: "/play",
    name: "playground",
    n: content.examples.length,
    text: "example programs",
    tone: "plain",
  },
  {
    href: "/opinions",
    name: "opinions",
    n: content.banned.length,
    text: "banned moves",
    tone: "ngmi",
  },
  {
    href: "/keywords",
    name: "keywords",
    n: content.keywords.length,
    text: "words, and the Rust they become",
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
