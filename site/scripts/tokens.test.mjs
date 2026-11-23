// The design tokens are the only source of colors, type sizes, space, corners and motion.
// These tests fail when the generated files drift from tokens/*.json, when a token file
// breaks the DTCG 2025.10 shape, or when a stylesheet sets a value by hand.

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";
import { build, gamut, load, OUT, site } from "./tokens.mjs";

const built = build();

test("tokens.css and tokens.ts are what tokens/*.json generate (run npm run tokens)", () => {
  assert.equal(readFileSync(OUT.css, "utf8"), built.css, "src/app/tokens.css is stale");
  assert.equal(readFileSync(OUT.ts, "utf8"), built.ts, "src/lib/tokens.ts is stale");
});

test("every token file has the DTCG 2025.10 shape", () => {
  const { resolver } = load();
  assert.equal(resolver.version, "2025-11-01");
  for (const ref of JSON.stringify(resolver).matchAll(/"\$ref":"([^"#][^"]*)"/g)) {
    assert.ok(readdirSync(join(site, "tokens")).includes(ref[1]), `resolver points at missing ${ref[1]}`);
  }
  for (const [mode, tokens] of Object.entries(built.flat)) {
    for (const [name, t] of Object.entries(tokens)) {
      const where = `${mode}: ${name}`;
      assert.ok(t.type, `${where} has no $type`);
      if (typeof t.value === "string") {
        assert.match(t.value, /^\{[a-z0-9.-]+\}$/i, `${where}: a string value must be an alias like {color.text.primary}`);
        continue;
      }
      if (t.type === "color") {
        assert.equal(t.value.colorSpace, "oklch", `${where}: colors are OKLCH`);
        assert.equal(t.value.components.length, 3, where);
        const [L, C, H] = t.value.components;
        assert.ok(L >= 0 && L <= 1 && C >= 0 && C <= 0.4 && H >= 0 && H < 360, `${where}: out of range`);
      }
      if (t.type === "dimension") assert.ok(["px", "rem"].includes(t.value.unit) && typeof t.value.value === "number", where);
      if (t.type === "duration") assert.ok(["ms", "s"].includes(t.value.unit), where);
      if (t.type === "cubicBezier") assert.equal(t.value.length, 4, where);
    }
  }
});

test("the input step is never under 16 px, so iOS Safari never zooms into a field", () => {
  for (const [mode, tokens] of Object.entries(built.flat)) {
    const t = tokens["font.step.input"];
    assert.ok(t, `${mode}: font.step.input is missing`);
    assert.equal(t.value.unit, "px", `${mode}: font.step.input is in px`);
    for (const size of [t.value.value, t.ext.max?.value ?? t.value.value]) assert.ok(size >= 16, `${mode}: font.step.input is ${size} px`);
  }
});

test("every color fits sRGB, and every P3 value fits Display P3", () => {
  const bad = gamut().filter((g) => !g.srgb || !g.p3);
  assert.deepEqual(bad, []);
});

// --- the scale check -------------------------------------------------------------

const files = (dir, re) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name), re) : re.test(e.name) ? [join(dir, e.name)] : [],
  );
const src = join(site, "src");
const styles = files(src, /\.css$/).filter((f) => f !== OUT.css);
const code = files(src, /\.(tsx?|mjs)$/).filter((f) => !f.includes("/wasm/") && f !== OUT.ts);
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

/** Each `prop: value` in a stylesheet, with its line. */
function declarations(file) {
  const css = strip(readFileSync(file, "utf8"));
  const out = [];
  for (const m of css.matchAll(/([a-z-]+)\s*:\s*([^;{}]+);/g)) {
    out.push({ prop: m[1], value: m[2].trim(), at: `${relative(site, file)}:${css.slice(0, m.index).split("\n").length}` });
  }
  return out;
}

const COLOR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb|color)\(|\b(?:white|black|red|green|blue|gray|grey)\b/i;

test("no stylesheet or component writes a color by hand", () => {
  const bad = [];
  for (const f of styles) {
    for (const d of declarations(f)) {
      if (d.value.startsWith("url(")) continue;
      if (COLOR.test(d.value)) bad.push(`${d.at}  ${d.prop}: ${d.value}`);
    }
  }
  for (const f of code) {
    const text = readFileSync(f, "utf8");
    for (const m of text.matchAll(/#[0-9a-fA-F]{6}\b|oklch\(/g)) bad.push(`${relative(site, f)}  ${m[0]}`);
  }
  assert.deepEqual(bad, [], "use a token from src/app/tokens.css (or colors in src/lib/tokens.ts)");
});

test("type sizes, corners and durations come from the scale", () => {
  const bad = [];
  for (const f of styles) {
    for (const d of declarations(f)) {
      const v = d.value;
      if (d.prop === "font-size" && !/^(var\(--step-[a-z0-9]+\)|[\d.]+em|inherit)$/.test(v)) bad.push(`${d.at}  font-size: ${v}`);
      if (d.prop === "font" && !/var\(--step-[a-z0-9]+\)|\binherit\b/.test(v)) bad.push(`${d.at}  font: ${v}`);
      if (d.prop === "border-radius" && !/^(var\(--radius-[a-z0-9]+\)|0|50%|999px|inherit)$/.test(v)) bad.push(`${d.at}  border-radius: ${v}`);
      const times = [...v.replace(/var\([^)]*\)/g, "").matchAll(/(?<![\w-])([\d.]+)m?s\b/g)].map((m) => Number(m[1]));
      if (/^(transition|animation)(-duration)?$/.test(d.prop) && times.some((t) => t > 0)) bad.push(`${d.at}  ${d.prop}: ${v}`);
    }
  }
  assert.deepEqual(bad, []);
});

/** Splits a value on spaces that aren't inside parentheses. */
function words(value) {
  const out = [""];
  let depth = 0;
  for (const ch of value) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (/\s/.test(ch) && depth === 0) {
      if (out.at(-1)) out.push("");
    } else out[out.length - 1] += ch;
  }
  return out.filter(Boolean);
}

test("space comes from the 4 px scale", () => {
  const ok = /^(0|auto|-?var\(--(space-[a-z0-9]+|gutter|size-[a-z]+)\)|var\(--[a-z]+-gap, var\(--space-[a-z0-9]+\)\)|calc\(.*\)|1px|2px|-1px)$/;
  const bad = [];
  for (const f of styles) {
    for (const d of declarations(f)) {
      if (!/^(margin|padding|gap|row-gap|column-gap)(-(top|right|bottom|left|block|inline)(-(start|end))?)?$/.test(d.prop)) continue;
      for (const part of words(d.value)) if (!ok.test(part)) bad.push(`${d.at}  ${d.prop}: ${d.value}`);
    }
  }
  assert.deepEqual([...new Set(bad)], []);
});

test("every variable a stylesheet reads exists, and every semantic color is used", () => {
  const defined = new Set([...built.css.matchAll(/--([a-z0-9-]+):/g)].map((m) => m[1]));
  const local = new Set();
  const used = new Set();
  for (const f of [...styles, ...code]) {
    const text = readFileSync(f, "utf8");
    for (const m of text.matchAll(/--([a-z][a-z0-9-]*)\s*:/g)) local.add(m[1]);
    for (const m of text.matchAll(/var\(--([a-z0-9-]+)/g)) used.add(m[1]);
    for (const m of text.matchAll(/\bv\("([a-z0-9-]+)"\)/g)) used.add(m[1]);
  }
  for (const m of built.css.matchAll(/var\(--([a-z0-9-]+)/g)) used.add(m[1]);
  const nextFont = new Set(["font-geist-sans", "font-geist-mono"]);
  const missing = [...used].filter((n) => !defined.has(n) && !local.has(n) && !nextFont.has(n));
  assert.deepEqual(missing, [], "read but never defined");
  const unused = built.semantic.map((n) => n.replace(/^color\./, "").replaceAll(".", "-")).filter((n) => !used.has(n));
  assert.deepEqual(unused, [], "semantic colors nothing uses: delete them from tokens/");
});
