// Every raster icon, from the same tile the favicon is (scripts/mark.mjs), in the tokens' colors.
// Run after changing the mark or the colors: npm run icons. The outputs are committed.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { tileSvg } from "./mark.mjs";
import { build } from "./tokens.mjs";

const site = join(dirname(fileURLToPath(import.meta.url)), "..");
const repo = join(site, "..");
const { dark } = build().colors;
const tile = (o) => tileSvg({ page: dark["surface-page"], accent: dark["accent-fill"], ...o });

const png = (svg, size) => sharp(Buffer.from(svg), { density: 600 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();

/** PNG-in-ICO, which every browser reads. */
function ico(images) {
  const head = Buffer.alloc(6 + 16 * images.length);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(images.length, 4);
  let offset = head.length;
  images.forEach(({ size, buf }, i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(size, e);
    head.writeUInt8(size, e + 1);
    head.writeUInt16LE(1, e + 4);
    head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(buf.length, e + 8);
    head.writeUInt32LE(offset, e + 12);
    offset += buf.length;
  });
  return Buffer.concat([head, ...images.map((i) => i.buf)]);
}

const out = (p, data) => {
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, data);
  console.log("icons:", p.replace(`${repo}/`, ""));
};

// Tabs and bookmarks: the favicon itself, at the sizes old browsers and Windows ask for.
out(join(site, "src/app/favicon.ico"), ico(await Promise.all([16, 32, 48].map(async (size) => ({ size, buf: await png(tile(), size) })))));
// Home screens: full bleed, because iOS and Android round the corners themselves.
out(join(site, "src/app/apple-icon.png"), await png(tile({ radius: 0, glyph: 28 }), 180));
out(join(site, "public/icons/icon-192.png"), await png(tile({ radius: 0, glyph: 28 }), 192));
out(join(site, "public/icons/icon-512.png"), await png(tile({ radius: 0, glyph: 28 }), 512));
// Maskable: Android may crop to a circle, so `fn` stays inside the middle 80%.
out(join(site, "public/icons/maskable-512.png"), await png(tile({ radius: 0, glyph: 22 }), 512));
// The VS Code extension's icon in the marketplace and the extensions list.
out(join(repo, "editors/vscode/icon.png"), await png(tile({ radius: 14 }), 256));
