// Draws typeshi's pictures from what the compiler really says: the GitHub social preview and the README header
// (light and dark). It runs `typeshi check` on tests/fixtures/rug.shi, keeps the error and the verdict, writes them
// to brand/preview.txt, and sets them in the site's look: the fn tile (site/scripts/icons.mjs), Geist and Geist
// Mono (site/src/fonts), and the site's token colors (site/scripts/tokens.mjs). tests/brand.rs fails when the
// compiler's words change and these pictures still show the old ones, so they can't go stale.
//
//   cargo build --release && node brand/make.mjs
//
// Needs Playwright's Chromium (`cd brand && npm install && npx playwright install chromium` on a new machine).
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { drawing } from "../site/scripts/icons.mjs";
import { build } from "../site/scripts/tokens.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

// 1. What the compiler says today.
const bin = join(root, "target/release/typeshi");
const dir = mkdtempSync(join(tmpdir(), "typeshi-brand-"));
copyFileSync(join(root, "tests/fixtures/rug.shi"), join(dir, "rug.shi"));
let stdout = "", stderr = "";
try {
  execFileSync(bin, ["check", dir], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
} catch (e) {
  // A banned move exits 1 (ngmi). That's the point.
  stdout = e.stdout;
  stderr = e.stderr;
}
const block = stderr.split("\n").slice(0, stderr.split("\n").indexOf(""));
const verdict = stdout.trim().split("\n").at(-1);
if (!block[0]?.startsWith("error:") || verdict !== "ngmi") {
  throw new Error(`typeshi said something unexpected:\n${stderr}\n${stdout}`);
}
const lines = [...block, verdict];
writeFileSync(join(here, "preview.txt"), lines.join("\n") + "\n");

// 2. The same lines in the site's terminal colors: the message and the carets red, rustc's gutter quiet,
// the code plain, the verdict red.
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function paint(line) {
  if (line.startsWith("error:")) return `<b class="err">${esc(line)}</b>`;
  if (line === "ngmi") return `<b class="err verdict">ngmi</b>`;
  const m = line.match(/^(\s*\d*\s*)(\||-->)(.*)$/);
  if (!m) return esc(line);
  const [, num, bar, rest] = m;
  if (bar === "-->") return `<span class="gut">${esc(num)}--&gt;${esc(rest)}</span>`;
  const carets = rest.match(/^(\s*)(\^+)(.*)$/);
  if (carets) return `<span class="gut">${esc(num)}|</span>${esc(carets[1])}<span class="err">${carets[2]}${esc(carets[3])}</span>`;
  return `<span class="gut">${esc(num)}|</span>${esc(rest)}`;
}
const term = [`<span class="gut">$</span> typeshi check`, ...lines.map(paint)].join("\n");

// Inlined: a page made with setContent can't read file:// fonts, and a fallback face would break the caret alignment.
const font = (file) => `data:font/woff2;base64,${readFileSync(join(root, "site/src/fonts", file)).toString("base64")}`;
const svg = (s) => `data:image/svg+xml;base64,${Buffer.from(s).toString("base64")}`;
const { colors } = build();
const TILE = svg(drawing({ radius: 1 / 6, width: 0.6 }));
const THEMES = {
  // The README header sits on GitHub's own canvas, so it reads as part of the page; everything on it is a token.
  dark: { bg: "#0d1117", t: colors.dark },
  light: { bg: "#ffffff", t: colors.light },
  // The social preview is a card of its own, on the site's page color.
  card: { bg: colors.dark["surface-page"], t: colors.dark },
};

const version = readFileSync(join(root, "Cargo.toml"), "utf8").match(/^version = "([^"]+)"/m)[1];

function page({ theme, w, h, tile, name, title, code, pad, gap, card }) {
  const { bg, t } = THEMES[theme];
  // The README header is plain lines on GitHub's page; the social preview is the site's share card: a lede,
  // the output in a terminal with its verdict, and the home's stage light behind it.
  const out = card
    ? `<p>slang over Rust that compiles to real Solana programs.</p><div class="term"><div class="cap"><span>$ typeshi check</span><b class="err">ngmi</b></div><pre>${lines.slice(0, -1).map(paint).join("\n")}</pre></div>`
    : `<pre>${term}</pre>`;
  return `<!doctype html><meta charset="utf-8"><style>
  @font-face { font-family: S; src: url(${font("Geist-Latin.woff2")}); font-weight: 100 900; }
  @font-face { font-family: M; src: url(${font("GeistMono-Latin.woff2")}); font-weight: 100 900; }
  html, body { margin: 0; width: ${w}px; height: ${h}px; background: ${bg}; color: ${t["text-primary"]}; }
  /* rustc prints -->, not an arrow: no ligatures */
  * { font-variant-ligatures: none; font-feature-settings: "liga" 0, "calt" 0; }
  body { box-sizing: border-box; padding: ${pad}px; display: flex; flex-direction: column; justify-content: center; gap: ${gap}px; }
  body.card { background: radial-gradient(ellipse 760px 280px at 50% 80%, color-mix(in oklch, ${t["accent-fill"]} 14%, transparent), transparent), ${bg}; }
  header { display: flex; align-items: center; gap: ${tile * 0.36}px; }
  header img { width: ${tile}px; height: ${tile}px; }
  header span { font: 700 ${name}px/1 M; letter-spacing: -0.02em; }
  header small { font: 400 ${name * 0.5}px/1 M; color: ${t["text-tertiary"]}; margin-left: -${tile * 0.14}px; align-self: flex-end; padding-bottom: ${name * 0.12}px; }
  h1 { margin: 0; font: 700 ${title}px/0.95 S; letter-spacing: -0.045em; }
  h1 code { font: 700 0.92em/1 M; letter-spacing: -0.06em; color: ${t["accent-text"]}; }
  p { margin: -${gap * 0.4}px 0 0; font: 400 ${name * 0.66}px/1.3 S; color: ${t["text-secondary"]}; }
  pre { margin: 0; font: 400 ${code}px/1.42 M; white-space: pre; }
  .term { border: 1px solid ${t["border-strong"]}; border-radius: 18px; background: ${t["surface-terminal"]}; overflow: hidden; }
  .term .cap { display: flex; justify-content: space-between; padding: 12px 28px; border-bottom: 1px solid ${t["border-default"]}; font: 400 ${code * 0.85}px/1.4 M; color: ${t["text-tertiary"]}; }
  .term pre { padding: 16px 28px 18px; }
  b { font-weight: 600; } .err { color: ${t["state-error"]}; } .gut { color: ${t["text-tertiary"]}; }
  .cap .err, .verdict { font-weight: 700; } .verdict { display: inline-block; margin-top: 0.35em; }
</style><body class="${card ? "card" : ""}"><header><img src="${TILE}" alt=""><span>typeshi</span>${card ? `<small>v${version}</small>` : ""}</header><h1>lock in <code>fn</code>.</h1>${out}</body>`;
}

const SHOTS = [
  // GitHub social preview: 1280×640 is GitHub's "best display" size; the file must stay under 1 MB.
  { file: "social-preview.png", theme: "card", w: 1280, h: 640, tile: 52, name: 38, title: 116, code: 21, pad: 64, gap: 30, scale: 1, card: true },
  // README header, drawn at twice its 830 px display width.
  { file: "readme-dark.png", theme: "dark", w: 830, h: 380, tile: 34, name: 26, title: 66, code: 14.5, pad: 34, gap: 18, scale: 2 },
  { file: "readme-light.png", theme: "light", w: 830, h: 380, tile: 34, name: 26, title: 66, code: 14.5, pad: 34, gap: 18, scale: 2 },
];

const browser = await chromium.launch(
  process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
);
for (const s of SHOTS) {
  const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: s.scale });
  const p = await ctx.newPage();
  await p.setContent(page(s), { waitUntil: "load" });
  await p.evaluate(() => document.fonts.ready);
  const loaded = await p.evaluate(() => document.fonts.check("700 20px M") && document.fonts.check("700 20px S") && [...document.fonts].every((f) => f.status === "loaded"));
  if (!loaded) throw new Error(`${s.file}: Geist or Geist Mono did not load`);
  const overflow = await p.evaluate(() => document.body.scrollHeight > innerHeight || document.body.scrollWidth > innerWidth);
  if (overflow) throw new Error(`${s.file}: the words don't fit`);
  await p.screenshot({ path: join(here, s.file) });
  await ctx.close();
  console.log(`brand/${s.file}`, `${s.w * s.scale}×${s.h * s.scale}`);
}
await browser.close();
const kb = readFileSync(join(here, "social-preview.png")).length / 1024;
if (kb > 1000) throw new Error(`social-preview.png is ${kb.toFixed(0)} KB; GitHub's limit is 1 MB`);
