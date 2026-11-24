import { Ban, BookOpen, Code, ShieldX, SquareTerminal, type LucideIcon } from "lucide-react";
import content from "@/generated/content.json";

/**
 * The site's information system, in one place: the bar, the phone menu, the footer and the side list of every
 * reading page read it, so they never disagree. Each line is a count from content.json, never typed.
 */
export type Page = { href: string; label: string; line: string; icon: LucideIcon };

const chapters = new Set(content.tour.map((l) => l.chapter)).size;

/** The main pages, in the bar's order. Icons are lucide-react, as tickerz.com's menu draws them. */
export const PAGES: Page[] = [
  {
    href: "/tour",
    label: "Tour",
    line: `${content.tour.length} lessons in ${chapters} chapters, no install`,
    icon: BookOpen,
  },
  {
    href: "/play",
    label: "Playground",
    line: "The real compiler, in your browser",
    icon: SquareTerminal,
  },
  {
    href: "/exploits",
    label: "Exploits",
    line: `${content.exploits.length} real exploits that don't compile`,
    icon: ShieldX,
  },
  {
    href: "/opinions",
    label: "Opinions",
    line: `${content.banned.length} banned moves, and what it says when you fail`,
    icon: Ban,
  },
  {
    href: "/keywords",
    label: "Keywords",
    line: `${content.keywords.length} words, and the Rust they become`,
    icon: Code,
  },
];

/** The rest, in the menu's two columns. */
export const MORE: [string, string][] = [
  ["/built", "How it's built"],
  ["https://github.com/tickerzhq/typeshi/tree/main/docs/checks", "The checks"],
  ["/llms.txt", "llms.txt"],
  ["https://github.com/tickerzhq/typeshi/releases", "Releases"],
  ["https://github.com/tickerzhq/typeshi", "GitHub"],
  ["https://tickerz.com", "Tickerz"],
];

/** The side list of a reading page and the footer's columns: every page, grouped. */
export const GROUPS: { label: string; links: [string, string][] }[] = [
  { label: "Learn", links: [["/tour", "Tour"], ["/play", "Playground"]] },
  {
    label: "Reference",
    links: [
      ["/exploits", "Exploits"],
      ["/opinions", "Opinions"],
      ["/keywords", "Keywords"],
      ["https://github.com/tickerzhq/typeshi/tree/main/docs/checks", "The checks"],
    ],
  },
  {
    label: "Build",
    links: [
      ["/built", "How it's built"],
      ["/llms.txt", "llms.txt"],
      ["/tokens/typeshi.resolver.json", "Design tokens"],
      ["https://github.com/tickerzhq/typeshi/releases", "Releases"],
    ],
  },
  {
    label: "Project",
    links: [
      ["https://github.com/tickerzhq/typeshi", "GitHub"],
      ["https://github.com/tickerzhq/typeshi/blob/main/CHANGELOG.md", "Changelog"],
      ["https://tickerz.com", "Tickerz"],
    ],
  },
];
