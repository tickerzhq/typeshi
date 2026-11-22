// The mark: the favicon's `fn` tile (DESIGN.md, "The mark"). One drawing for every size, with `fn`
// as Geist Mono Bold outlines, so it looks the same with or without the font installed.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";

const site = join(dirname(fileURLToPath(import.meta.url)), "..");
const bold = opentype.parse(readFileSync(join(site, "node_modules/geist/dist/fonts/geist-mono/GeistMono-Bold.ttf")).buffer);

// opentype.js's compacted path data makes librsvg (sharp, GitHub's image proxy) drop glyphs at some
// coordinates, so every command and number is written out in full.
const num = (v) => String(Math.round(v * 100) / 100);
function pathData(p) {
  return p.commands
    .map((c) => {
      if (c.type === "Z") return "Z";
      if (c.type === "Q") return `Q${num(c.x1)} ${num(c.y1)} ${num(c.x)} ${num(c.y)}`;
      if (c.type === "C") return `C${num(c.x1)} ${num(c.y1)} ${num(c.x2)} ${num(c.y2)} ${num(c.x)} ${num(c.y)}`;
      return `${c.type}${num(c.x)} ${num(c.y)}`;
    })
    .join("");
}

/** `fn`, centered on (cx, cy) by its ink, as one path. */
export function fnGlyph(cx, cy, size, fill) {
  const bb = bold.getPath("fn", 0, 0, size).getBoundingBox();
  const p = bold.getPath("fn", cx - (bb.x1 + bb.x2) / 2, cy - (bb.y1 + bb.y2) / 2, size);
  return `<path fill="${fill}" d="${pathData(p)}"/>`;
}

/**
 * The tile as SVG. `radius` 14 of 64 is the favicon; 0 is for app icons (the OS rounds them);
 * `glyph` is the type size in a 64 box (smaller for maskable icons, which get cropped to a circle).
 */
export function tileSvg({ page, accent, radius = 14, glyph = 31, px = 64 }) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${px}" height="${px}">` +
    `<rect width="64" height="64" rx="${radius}" fill="${page}"/>${fnGlyph(32, 32, glyph, accent)}</svg>\n`
  );
}
