import type { Check } from "./check.mjs";

export type Lesson = {
  n: number;
  slug: string;
  chapter: string;
  title: string;
  body: string;
  start: string;
  solution: string;
  check: Check;
};
