// Turns the design tokens in tokens/ (DTCG 2025.10: tokens.json, light.json,
// contrast-more.json, read in the order typeshi.resolver.json gives) into:
//   src/app/tokens.css  the CSS variables every stylesheet uses
//   src/lib/tokens.ts   their names as a TS type, and sRGB hex for places CSS can't reach (the OG image)
//   src/app/icon.svg    the favicon, in the theme's own colors
// `node scripts/tokens.mjs` writes them. scripts/tokens.test.mjs fails if they drift.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { hex, inP3, inSrgb } from "./color.mjs";

export const site = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(site, "tokens");
const EXT = "com.tickerz.typeshi";
const read = (f) => JSON.parse(readFileSync(join(dir, f), "utf8"));

export const OUT = {
  css: join(site, "src/app/tokens.css"),
  ts: join(site, "src/lib/tokens.ts"),
  icon: join(site, "src/app/icon.svg"),
};

// --- read and resolve ------------------------------------------------------------

const isToken = (o) => o && typeof o === "object" && "$value" in o;

function merge(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) {
    out[k] = v && typeof v === "object" && !Array.isArray(v) && !isToken(v) && out[k] ? merge(out[k], v) : v;
  }
  return out;
}

/** The resolver's sets and modifier contexts, merged in its resolution order. */
export function load() {
  const resolver = read("typeshi.resolver.json");
  const files = { base: resolver.sets.base.sources.map((s) => read(s.$ref)) };
  const pick = (mod, ctx) => resolver.modifiers[mod].contexts[ctx].map((s) => read(s.$ref));
  const tree = (theme, contrast) =>
    [...files.base, ...pick("theme", theme), ...pick("contrast", contrast)].reduce(merge, {});
  return {
    resolver,
    trees: {
      dark: tree("dark", "normal"),
      light: tree("light", "normal"),
      "dark-more": tree("dark", "more"),
      "light-more": tree("light", "more"),
    },
  };
}

/** Flattens a token tree to { "a.b.c": { type, value, ext, description } }, with group $type inherited. */
function flatten(node, path = [], type, ext = {}, out = {}) {
  for (const [k, v] of Object.entries(node)) {
    if (k.startsWith("$") || !v || typeof v !== "object") continue;
    const p = [...path, k];
    const t = v.$type ?? type;
    if (isToken(v)) out[p.join(".")] = { type: t, value: v.$value, ext: { ...ext, ...v.$extensions?.[EXT] }, description: v.$description };
    else flatten(v, p, t, { ...ext, ...v.$extensions?.[EXT] }, out);
  }
  return out;
}

const aliasOf = (value) => (typeof value === "string" && /^\{[^}]+\}$/.test(value) ? value.slice(1, -1) : null);

/** Follows aliases to a literal value. Throws on a missing or circular reference. */
function deref(tokens, name, seen = []) {
  if (seen.includes(name)) throw new Error(`tokens: circular alias ${[...seen, name].join(" -> ")}`);
  const t = tokens[name];
  if (!t) throw new Error(`tokens: ${seen.at(-1) ?? "?"} points at ${name}, which doesn't exist`);
  const a = aliasOf(t.value);
  return a ? deref(tokens, a, [...seen, name]) : t;
}

// --- names and CSS values ------------------------------------------------------------

/** "color.surface.page" -> "surface-page", "palette.gray.855" -> "gray-855", "font.step.xs" -> "step-xs". */
export function cssName(path) {
  const [group, ...rest] = path.split(".");
  if (group === "color" || group === "palette") return rest.join("-");
  if (group === "font") return (rest[0] === "family" ? ["font", ...rest.slice(1)] : rest).join("-");
  if (group === "duration") return ["dur", ...rest].join("-");
  if (group === "easing") return ["ease", ...rest].join("-");
  return path.replaceAll(".", "-");
}

const num = (n, d = 4) => String(Number(n.toFixed(d)));

function oklch({ components: [L, C, H], alpha }) {
  const a = alpha != null && alpha < 1 ? ` / ${num(alpha, 3)}` : "";
  return `oklch(${num(L * 100, 2)}% ${num(C)} ${num(H, 2)}${a})`;
}

function dimension(t, viewport) {
  const min = t.value.value;
  const max = t.ext.max?.value;
  const unit = t.value.unit;
  // Type and space go in rem so they follow the reader's font size setting.
  const rem = (px) => `${num(px / 16)}rem`;
  if (max == null || max === min) return unit === "px" && t.ext.rem !== false && viewport ? rem(min) : `${min}${unit}`;
  const slope = (max - min) / (viewport.max - viewport.min);
  const intercept = min - slope * viewport.min;
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return `clamp(${rem(lo)}, ${num(intercept / 16)}rem + ${num(slope * 100)}vw, ${rem(hi)})`;
}

function literal(t) {
  switch (t.type) {
    case "color":
      return oklch(t.value);
    case "dimension":
      return dimension(t, t.ext.viewport);
    case "duration":
      return `${t.value.value}${t.value.unit}`;
    case "cubicBezier":
      return `cubic-bezier(${t.value.join(", ")})`;
    case "fontFamily": {
      const rest = t.value.filter((f) => !/^Geist/.test(f)).map((f) => (/\s/.test(f) ? `"${f}"` : f));
      return [t.ext.cssVar ? `var(${t.ext.cssVar})` : null, ...rest].filter(Boolean).join(", ");
    }
    case "number":
    case "fontWeight":
      return String(t.value);
    default:
      throw new Error(`tokens: no CSS for $type ${t.type}`);
  }
}

/** A token's CSS value: var() of what it aliases, so the alias survives into CSS, or its literal. */
function cssValue(tokens, name) {
  const t = tokens[name];
  const a = aliasOf(t.value);
  if (a) {
    deref(tokens, a, [name]);
    return `var(--${cssName(a)})`;
  }
  return literal(t);
}

// --- build -------------------------------------------------------------------------------

const HEAD = "generated by scripts/tokens.mjs from tokens/*.json. do not edit; edit the JSON and run npm run tokens.";

export function build() {
  const { trees } = load();
  const flat = Object.fromEntries(Object.entries(trees).map(([k, tree]) => [k, flatten(tree)]));
  const names = Object.keys(flat.dark);
  for (const [mode, tokens] of Object.entries(flat)) {
    for (const n of Object.keys(tokens)) if (!(n in flat.dark)) throw new Error(`tokens: ${mode} adds ${n}, which the base set doesn't have`);
    for (const n of names) deref(tokens, n);
  }

  const semantic = names.filter((n) => n.startsWith("color."));
  const fixed = names.filter((n) => !n.startsWith("color."));
  const v = (mode, n) => cssValue(flat[mode], n);
  const differs = (a, b, n) => v(a, n) !== v(b, n);

  const lines = [`/* ${HEAD} */`, "", ":root {", "  color-scheme: dark;"];
  let group = "";
  for (const n of fixed) {
    const g = n.split(".").slice(0, -1).join(".");
    if (g !== group) lines.push("", `  /* ${g} */`);
    group = g;
    lines.push(`  --${cssName(n)}: ${v("dark", n)};`);
  }
  lines.push("", "  /* semantic colors: the dark theme, and the fallback where light-dark() is missing */");
  for (const n of semantic) lines.push(`  --${cssName(n)}: ${v("dark", n)};`);
  lines.push("}", "", ':root[data-theme="light"] {', "  color-scheme: light;", "}", "");

  const themed = semantic.filter((n) => differs("light", "dark", n));
  lines.push("@supports (color: light-dark(white, black)) {", "  :root {");
  for (const n of themed) lines.push(`    --${cssName(n)}: light-dark(${v("light", n)}, ${v("dark", n)});`);
  lines.push("  }", "}", "");

  const more = semantic.filter((n) => differs("dark-more", "dark", n) || differs("light-more", "light", n));
  for (const n of more) {
    if (v("dark-more", n) !== v("light-more", n)) throw new Error(`tokens: contrast-more.json must alias the same token in both themes (${n})`);
  }
  lines.push("/* more contrast, when the system asks for it */", "@media (prefers-contrast: more) {", "  :root {");
  for (const n of more) lines.push(`    --${cssName(n)}: ${v("dark-more", n)};`);
  lines.push("  }", "}", "");

  const p3 = fixed.filter((n) => flat.dark[n].ext.p3);
  if (p3.length) {
    lines.push("/* Display P3 screens get the chroma sRGB can't show */", "@media (color-gamut: p3) {", "  :root {");
    for (const n of p3) lines.push(`    --${cssName(n)}: ${oklch({ components: flat.dark[n].ext.p3 })};`);
    lines.push("  }", "}", "");
  }
  const css = lines.join("\n");

  // sRGB hex for every semantic color, per theme, for code that can't read CSS.
  const hexes = (mode) =>
    Object.fromEntries(
      semantic.map((n) => {
        const t = deref(flat[mode], n);
        return [cssName(n), hex(t.value.components, t.value.alpha ?? 1)];
      }),
    );
  const colors = { dark: hexes("dark"), light: hexes("light") };
  const allVars = names.map(cssName);
  const ts = [
    `// ${HEAD}`,
    "",
    "/** Every CSS variable tokens.css defines. */",
    `export type TokenVar =\n${allVars.map((n) => `  | "${n}"`).join("\n")};`,
    "",
    "/** `var(--name)`, checked against the tokens at compile time. */",
    "export const v = (name: TokenVar) => `var(--${name})` as const;",
    "",
    "/** Semantic colors as sRGB hex, per theme, for places CSS variables can't reach (the OG image). */",
    `export const colors = ${JSON.stringify(colors, null, 2)} as const;`,
    "",
    "export type Theme = keyof typeof colors;",
    "export type ColorToken = keyof (typeof colors)[\"dark\"];",
    "",
  ].join("\n");

  const icon =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${colors.dark["surface-page"]}"/>` +
    `<text x="32" y="43" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-size="30" font-weight="700" fill="${colors.dark["accent-fill"]}">fn</text></svg>\n`;

  return { css, ts, icon, flat, colors, semantic };
}

/** Every color literal in the token files, with whether it fits sRGB and P3. */
export function gamut() {
  const out = [];
  for (const [mode, tokens] of Object.entries(build().flat)) {
    for (const [n, t] of Object.entries(tokens)) {
      if (t.type !== "color" || aliasOf(t.value)) continue;
      out.push({ mode, name: n, srgb: inSrgb(t.value.components), p3: t.ext.p3 ? inP3(t.ext.p3) : true });
    }
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { css, ts, icon } = build();
  writeFileSync(OUT.css, css);
  writeFileSync(OUT.ts, ts);
  writeFileSync(OUT.icon, icon);
  console.log(`tokens: wrote ${css.split("\n").filter((l) => l.trim().startsWith("--")).length} variables to src/app/tokens.css, src/lib/tokens.ts, src/app/icon.svg`);
}
