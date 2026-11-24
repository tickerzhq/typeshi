// Draws every icon the site serves from one drawing: the header's mark, `fn` in Geist Mono Bold on a brand-teal
// tile (DESIGN.md, "The mark"). The letters are Geist Mono's own outlines (scripts/glyphs.mjs reads them out of
// the font), and every color is a token (src/lib/tokens.ts), so nothing depends on fonts the reader has.
//
//   src/app/icon.svg                     the tab icon; its edge follows the reader's light or dark tab bar
//   src/app/favicon.ico                  16, 32 and 48 px, for crawlers and anything that asks for /favicon.ico
//   src/app/apple-icon.png               180 px, full bleed: iOS rounds the corners itself
//   public/icons/icon-192.png, icon-512.png   the manifest's icons, the tile as the tab shows it
//   public/icons/icon-maskable-512.png   full bleed, fn inside the middle 80%, for Android's circles and squircles
//
// `npm run icons` writes them. Each PNG carries a hash of the drawing it was made from, so
// scripts/icons.test.mjs fails when a drawing changes and its pictures weren't redrawn, without failing
// when a Next.js update renders the same drawing a pixel differently.

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { crc32 } from "node:zlib";
import { font } from "./glyphs.mjs";
import { build, site } from "./tokens.mjs";

const { colors } = build();
const shape = font(join(site, "src/fonts/static/GeistMono-700.woff"));

/** The mark's two colors and its edge on a light tab bar, from the tokens. */
export const INK = {
  tile: colors.dark["accent-fill"],
  fn: colors.dark["text-on-accent"],
  edge: colors.light["accent-text"],
};

const VIEW = 512;
const n = (v) => String(Number(v.toFixed(2)));

/**
 * `fn` as one path, `width` of the box wide, centered on its ink (not its advance), so it sits in the
 * middle of the tile the way the eye measures it. Tracking is the header's -0.04 em.
 */
function fn(width) {
  const probe = shape("fn", 100, -0.04).box;
  const size = (100 * width * VIEW) / (probe.x1 - probe.x0);
  const { d, box } = shape("fn", size, -0.04);
  const dx = (VIEW - (box.x1 - box.x0)) / 2 - box.x0;
  const dy = (VIEW - (box.y1 - box.y0)) / 2 - box.y0;
  return `<path transform="translate(${n(dx)} ${n(dy)})" d="${d}"/>`;
}

/**
 * The drawing. `radius` is the tile's corner as a share of its side (the header's 4 px on 24 px is 1/6;
 * 0 is a full-bleed square for platforms that round it themselves). `width` is how much of the tile
 * `fn` spans. `adaptive` adds the edge a teal tile needs on a light tab bar, behind a media query.
 */
export function drawing({ radius, width, adaptive = false }) {
  const rx = radius ? ` rx="${n(VIEW * radius)}"` : "";
  const parts = [`<rect width="${VIEW}" height="${VIEW}"${rx} fill="${INK.tile}"/>`, `<g fill="${INK.fn}">${fn(width)}</g>`];
  if (adaptive) {
    // On a light tab bar a teal tile has little edge (about 1.5:1 against white), so there it gets a
    // hairline in the light theme's dark teal. On a dark tab bar the teal is the edge.
    const w = EDGE;
    parts.unshift(`<style>.edge{stroke:${INK.edge}}@media (prefers-color-scheme:dark){.edge{stroke:none}}</style>`);
    parts.push(`<rect class="edge" x="${w / 2}" y="${w / 2}" width="${VIEW - w}" height="${VIEW - w}" rx="${n(VIEW * radius - w / 2)}" fill="none" stroke-width="${w}"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW} ${VIEW}">${parts.join("")}</svg>\n`;
}

/** The light-scheme edge, in drawing units: 1 px at 32 px. */
const EDGE = 16;

/** The tile as the header shows it. At tab size fn fills two thirds of it so it reads at 16 px; as an app
 * icon it gets more room, as app icons do. */
const TAB = { radius: 1 / 6, width: 0.66 };
const APP = { radius: 1 / 6, width: 0.58 };

/** Every icon: its repo path, the drawing it comes from, and the pixel sizes it holds (none for the SVG). */
export const ICONS = [
  { path: "src/app/icon.svg", svg: drawing({ ...TAB, adaptive: true }) },
  { path: "src/app/favicon.ico", svg: drawing(TAB), sizes: [16, 32, 48] },
  { path: "src/app/apple-icon.png", svg: drawing({ radius: 0, width: 0.56 }), sizes: [180] },
  { path: "public/icons/icon-192.png", svg: drawing(APP), sizes: [192] },
  { path: "public/icons/icon-512.png", svg: drawing(APP), sizes: [512] },
  // The safe zone is a circle of 40% radius in the middle; fn at 46% of the side sits well inside it.
  { path: "public/icons/icon-maskable-512.png", svg: drawing({ radius: 0, width: 0.46 }), sizes: [512] },
  // The VS Code extension's icon, in the marketplace and the extensions list (editors/vscode/package.json).
  { path: "../editors/vscode/icon.png", svg: drawing(APP), sizes: [256] },
];

/** What a picture is drawn from: the drawing and its size. A PNG carries this in a tEXt chunk. */
export const sourceHash = (svg, size) => createHash("sha256").update(`${size}\n${svg}`).digest("hex").slice(0, 16);
export const HASH_KEY = "typeshi:drawing";

/** Adds a tEXt chunk right after IHDR. */
function stamp(png, key, value) {
  const data = Buffer.from(`${key}\0${value}`, "latin1");
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  chunk.write("tEXt", 4, "latin1");
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(chunk.subarray(4, 8 + data.length)), 8 + data.length);
  const ihdrEnd = 8 + 8 + png.readUInt32BE(8) + 4;
  return Buffer.concat([png.subarray(0, ihdrEnd), chunk, png.subarray(ihdrEnd)]);
}

/** Renders a drawing to a PNG with the same renderer as the share cards (next/og: Satori and resvg). */
async function raster(svg, size) {
  const require = createRequire(import.meta.url);
  const { ImageResponse } = require("next/og");
  const React = require("react");
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  const el = React.createElement("div", { style: { display: "flex", width: "100%", height: "100%" } }, React.createElement("img", { src, width: size, height: size }));
  const png = Buffer.from(await new ImageResponse(el, { width: size, height: size }).arrayBuffer());
  return stamp(png, HASH_KEY, sourceHash(svg, size));
}

/** An .ico holding PNG entries, the way every browser since 2009 reads them. */
function ico(pngs) {
  const head = Buffer.alloc(6 + 16 * pngs.length);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(pngs.length, 4);
  let at = head.length;
  pngs.forEach(({ size, png }, i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(size % 256, e);
    head.writeUInt8(size % 256, e + 1);
    head.writeUInt16LE(1, e + 4);
    head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(png.length, e + 8);
    head.writeUInt32LE(at, e + 12);
    at += png.length;
  });
  return Buffer.concat([head, ...pngs.map((p) => p.png)]);
}

/** The bytes of one icon. */
export async function render(icon) {
  if (!icon.sizes) return Buffer.from(icon.svg);
  const pngs = await Promise.all(icon.sizes.map(async (size) => ({ size, png: await raster(icon.svg, size) })));
  return icon.path.endsWith(".ico") ? ico(pngs) : pngs[0].png;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const icon of ICONS) {
    const file = join(site, icon.path);
    mkdirSync(dirname(file), { recursive: true });
    const bytes = await render(icon);
    writeFileSync(file, bytes);
    console.log(`icons: ${icon.path}${icon.sizes ? ` (${icon.sizes.join(", ")} px)` : ""}, ${(bytes.length / 1024).toFixed(1)} KB`);
  }
}
