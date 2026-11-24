// The icons are drawn by scripts/icons.mjs from the tokens and Geist Mono's outlines. These tests fail when a
// committed icon no longer matches what the script draws today (run npm run icons).

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { drawing, HASH_KEY, ICONS, INK, sourceHash } from "./icons.mjs";
import { build, site } from "./tokens.mjs";

const { colors } = build();

/** Width, height and tEXt chunks of a PNG. */
function png(buf) {
  assert.equal(buf.toString("latin1", 1, 4), "PNG", "not a PNG");
  const text = {};
  for (let at = 8; at < buf.length; ) {
    const len = buf.readUInt32BE(at);
    const type = buf.toString("latin1", at + 4, at + 8);
    if (type === "tEXt") {
      const [k, v] = buf.toString("latin1", at + 8, at + 8 + len).split("\0");
      text[k] = v;
    }
    at += 12 + len;
  }
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), text };
}

/** The PNG entries of an .ico, with the size its directory claims. */
function ico(buf) {
  assert.equal(buf.readUInt16LE(2), 1, "not an icon file");
  return Array.from({ length: buf.readUInt16LE(4) }, (_, i) => {
    const e = 6 + 16 * i;
    const entry = buf.subarray(buf.readUInt32LE(e + 12), buf.readUInt32LE(e + 12) + buf.readUInt32LE(e + 8));
    return { size: buf.readUInt8(e) || 256, ...png(entry) };
  });
}

test("icon.svg is what scripts/icons.mjs draws (run npm run icons)", () => {
  const svg = ICONS.find((i) => i.path.endsWith(".svg"));
  assert.equal(readFileSync(join(site, svg.path), "utf8"), svg.svg, "src/app/icon.svg is stale");
});

test("every PNG and the .ico were drawn from today's drawing, at their sizes (run npm run icons)", () => {
  for (const icon of ICONS.filter((i) => i.sizes)) {
    const buf = readFileSync(join(site, icon.path));
    const pictures = icon.path.endsWith(".ico") ? ico(buf) : [{ size: icon.sizes[0], ...png(buf) }];
    assert.deepEqual(pictures.map((p) => p.size), icon.sizes, `${icon.path} holds the wrong sizes`);
    for (const p of pictures) {
      assert.equal(p.w, p.size, `${icon.path} at ${p.size}: the picture is ${p.w} px wide`);
      assert.equal(p.h, p.size, `${icon.path} at ${p.size}: the picture is ${p.h} px tall`);
      assert.equal(p.text[HASH_KEY], sourceHash(icon.svg, p.size), `${icon.path} at ${p.size} px is stale`);
    }
  }
});

test("the mark is the header's: brand-teal tile, dark fn, colors from the tokens", () => {
  assert.equal(INK.tile, colors.dark["accent-fill"]);
  assert.equal(INK.fn, colors.dark["text-on-accent"]);
  assert.equal(INK.tile, colors.light["accent-fill"], "the tile is the brand teal in both themes");
  const svg = drawing({ radius: 1 / 6, width: 0.66 });
  assert.match(svg, /^<svg [^>]*viewBox="0 0 512 512"><rect [^>]*fill="#[0-9a-f]{6}"\/><g fill="#[0-9a-f]{6}"><path /);
  assert.doesNotMatch(svg, /<text|font-family/, "the letters are outlines, not text that depends on the reader's fonts");
});

test("the tab icon follows the light and dark tab bar", () => {
  const svg = ICONS.find((i) => i.path.endsWith(".svg")).svg;
  assert.match(svg, /@media \(prefers-color-scheme:dark\)/);
  assert.ok(svg.includes(`stroke:${INK.edge}`), "a light tab bar gets the dark green edge");
});
