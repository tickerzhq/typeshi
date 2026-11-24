import content from "@/generated/content.json";

/**
 * The site's information system, in one place: the bar, the phone menu, the footer and the side list of every
 * reading page read it, so they never disagree. Each line is a count from content.json, never typed.
 */
export type Page = { href: string; label: string; line: string; icon: string[] };

const chapters = new Set(content.tour.map((l) => l.chapter)).size;

/** The main pages, in the bar's order. Icons are Lucide outlines (ISC). */
export const PAGES: Page[] = [
  {
    href: "/tour",
    label: "Tour",
    line: `${content.tour.length} lessons in ${chapters} chapters, no install`,
    icon: ["M12 7v14", "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"],
  },
  {
    href: "/play",
    label: "Playground",
    line: "The real compiler, in your browser",
    icon: ["m4 17 6-6-6-6", "M12 19h8"],
  },
  {
    href: "/exploits",
    label: "Exploits",
    line: `${content.exploits.length} real exploits that don't compile`,
    icon: [
      "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
      "m14.5 9.5-5 5",
      "m9.5 9.5 5 5",
    ],
  },
  {
    href: "/opinions",
    label: "Opinions",
    line: `${content.banned.length} banned moves, and what it says when you fail`,
    icon: ["M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20z", "m4.9 4.9 14.2 14.2"],
  },
  {
    href: "/keywords",
    label: "Keywords",
    line: `${content.keywords.length} words, and the Rust they become`,
    icon: ["m16 18 6-6-6-6", "m8 6-6 6 6 6"],
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
