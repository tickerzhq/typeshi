// Every text color on every surface it sits on, in every theme: WCAG 2.2 AA (4.5:1) is the rule,
// APCA is the second look (Lc floors by job, from "APCA in a Nutshell"). `node --test` prints the table.

import assert from "node:assert/strict";
import test from "node:test";
import { apca, over, toSrgb, wcag } from "./color.mjs";
import { build } from "./tokens.mjs";

const { flat } = build();

function rgb(tokens, name) {
  let t = tokens[name];
  while (typeof t.value === "string") t = tokens[t.value.slice(1, -1)];
  return { lch: t.value.components, alpha: t.value.alpha ?? 1 };
}

const SURFACES = ["surface.page", "surface.raised", "surface.sunk", "surface.terminal"];
// [text, surfaces, APCA floor (|Lc|), what it is]
const PAIRS = [
  ["text.primary", SURFACES, 75, "headings, code, terminal output"],
  ["text.secondary", SURFACES, 60, "body copy and labels"],
  ["text.tertiary", SURFACES, 30, "counts, paths, line numbers"],
  ["accent.text", SURFACES, 45, "wagmi, chapter names"],
  ["state.error", SURFACES, 45, "ngmi and compiler errors"],
  ["state.warning", SURFACES, 45, "warnings and confessions"],
  ...["keyword", "string", "number", "type", "function", "macro"].map((k) => [`syntax.${k}`, ["surface.sunk", "surface.page"], 45, "code"]),
  ["text.on-accent", ["accent.fill", "accent.fill-hover"], 75, "primary buttons"],
  ["text.on-accent-soft", ["accent.fill"], 45, "the small line on a ready button"],
  ["text.on-state", ["state.warning"], 45, "a pressed --gigamaxx"],
];

const rows = [];
for (const [mode, tokens] of Object.entries(flat)) {
  for (const [fg, bgs, floor, job] of PAIRS) {
    for (const bg of bgs) {
      const b = rgb(tokens, `color.${bg}`);
      const f = rgb(tokens, `color.${fg}`);
      const back = toSrgb(b.lch);
      const front = f.alpha < 1 ? over(f.lch, f.alpha, b.lch) : toSrgb(f.lch);
      rows.push({ mode, fg, bg, ratio: wcag(front, back), lc: apca(front, back), floor, job });
    }
  }
}

test("every text pair passes WCAG 2.2 AA (4.5:1) in every theme", () => {
  const fails = rows.filter((r) => r.ratio < 4.5).map((r) => `${r.mode}: ${r.fg} on ${r.bg} is ${r.ratio.toFixed(2)}:1`);
  assert.deepEqual(fails, []);
});

test("every text pair clears its APCA floor (second look)", () => {
  const fails = rows.filter((r) => Math.abs(r.lc) < r.floor).map((r) => `${r.mode}: ${r.fg} on ${r.bg} is Lc ${Math.abs(r.lc).toFixed(1)}, under ${r.floor} for ${r.job}`);
  assert.deepEqual(fails, []);
});

test("the table", () => {
  const worst = new Map();
  for (const r of rows) {
    const k = `${r.mode} ${r.fg}`;
    if (!worst.has(k) || r.ratio < worst.get(k).ratio) worst.set(k, r);
  }
  console.log("\n  lowest pair per text color and theme (WCAG ratio, APCA Lc):");
  for (const r of worst.values()) {
    console.log(`  ${r.mode.padEnd(11)} ${r.fg.padEnd(20)} on ${r.bg.padEnd(18)} ${r.ratio.toFixed(2).padStart(5)}:1  Lc ${Math.abs(r.lc).toFixed(1).padStart(5)}`);
  }
  assert.ok(rows.length > 100);
});
