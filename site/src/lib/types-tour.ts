import type { Check } from "./check.mjs";

/** The one line of real compiler output that shows a lesson's goal (scripts/sync.mjs), for its share card. */
export type Proof = { kind: "ok" | "error" | "warning"; line: number | null; text: string };

export type Lesson = {
  n: number;
  slug: string;
  chapter: string;
  title: string;
  body: string;
  start: string;
  solution: string;
  check: Check;
  proof: Proof;
};
