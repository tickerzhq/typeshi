// Draws typeshi's pictures from what the compiler really says: the GitHub social preview and the README header
// (light and dark). It runs `typeshi check` on tests/fixtures/rug.shi, keeps the error and the verdict, writes them
// to brand/preview.txt, and renders them in rustc's own colours. tests/brand.rs fails when the compiler's words
// change and these pictures still show the old ones, so they can't go stale.
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

// 2. The same lines in rustc's colours. Gutter and arrows blue, errors red, everything else plain.
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function paint(line) {
  if (line.startsWith("error:")) return `<b class="err">error:</b><b>${esc(line.slice(6))}</b>`;
  if (line === "ngmi") return `<b class="err verdict">ngmi</b>`;
  const m = line.match(/^(\s*\d*\s*)(\||-->)(.*)$/);
  if (!m) return esc(line);
  const [, num, bar, rest] = m;
  if (bar === "-->") return `<b class="gut">${esc(num)}--&gt;</b>${esc(rest)}`;
  const carets = rest.match(/^(\s*)(\^+)(.*)$/);
  if (carets) return `<b class="gut">${esc(num)}|</b>${esc(carets[1])}<b class="err">${carets[2]}${esc(carets[3])}</b>`;
  return `<b class="gut">${esc(num)}|</b>${esc(rest)}`;
}
const term = [`<span class="prompt">$</span> typeshi check`, ...lines.map(paint)].join("\n");

// Inlined: a page made with setContent can't read file:// fonts, and a fallback serif would break the caret alignment.
const font = (file) => `data:font/woff2;base64,${readFileSync(join(here, "fonts", file)).toString("base64")}`;
const THEMES = {
  // GitHub's own canvas colours, so the README header sits on the page instead of on a box.
  dark: { bg: "#0d1117", fg: "#e6edf3", muted: "#8d96a0", err: "#ff7b72", gut: "#79c0ff" },
  light: { bg: "#ffffff", fg: "#1f2328", muted: "#59636e", err: "#cf222e", gut: "#0969da" },
};

function page({ theme, w, h, title, code, pad, gap }) {
  const t = THEMES[theme];
  return `<!doctype html><meta charset="utf-8"><style>
  @font-face { font-family: M; src: url(${font("JetBrainsMono-Regular.woff2")}); font-weight: 400; }
  @font-face { font-family: M; src: url(${font("JetBrainsMono-Bold.woff2")}); font-weight: 700; }
  @font-face { font-family: M; src: url(${font("JetBrainsMono-ExtraBold.woff2")}); font-weight: 800; }
  html, body { margin: 0; width: ${w}px; height: ${h}px; background: ${t.bg}; color: ${t.fg}; font-family: M; }
  /* rustc prints -->, not an arrow: no ligatures */
  * { font-variant-ligatures: none; font-feature-settings: "liga" 0, "calt" 0; }
  body { box-sizing: border-box; padding: ${pad}px; display: flex; flex-direction: column; justify-content: center; gap: ${gap}px; }
  h1 { margin: 0; font-size: ${title}px; font-weight: 800; letter-spacing: -0.04em; line-height: 0.9; }
  h1 span { color: ${t.muted}; font-weight: 400; font-size: 0.32em; letter-spacing: 0; margin-left: 0.6em; vertical-align: 0.35em; }
  pre { margin: 0; font: 400 ${code}px/1.42 M; white-space: pre; }
  b { font-weight: 700; } .err { color: ${t.err}; } .gut { color: ${t.gut}; } .prompt { color: ${t.muted}; }
  .verdict { display: inline-block; margin-top: 0.35em; }
</style><h1>typeshi<span>lock in fn.</span></h1><pre>${term}</pre>`;
}

const SHOTS = [
  // GitHub social preview: 1280×640 is GitHub's "best display" size; the file must stay under 1 MB.
  { file: "social-preview.png", theme: "dark", w: 1280, h: 640, title: 150, code: 27, pad: 84, gap: 44, scale: 1 },
  // README header, drawn at twice its 830 px display width.
  { file: "readme-dark.png", theme: "dark", w: 830, h: 380, title: 92, code: 16.5, pad: 40, gap: 26, scale: 2 },
  { file: "readme-light.png", theme: "light", w: 830, h: 380, title: 92, code: 16.5, pad: 40, gap: 26, scale: 2 },
];

const browser = await chromium.launch(
  process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
);
for (const s of SHOTS) {
  const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: s.scale });
  const p = await ctx.newPage();
  await p.setContent(page(s), { waitUntil: "load" });
  await p.evaluate(() => document.fonts.ready);
  const mono = await p.evaluate(() => document.fonts.check("700 20px M") && [...document.fonts].every((f) => f.status === "loaded"));
  if (!mono) throw new Error(`${s.file}: JetBrains Mono did not load`);
  const overflow = await p.evaluate(() => document.body.scrollHeight > innerHeight || document.body.scrollWidth > innerWidth);
  if (overflow) throw new Error(`${s.file}: the words don't fit`);
  await p.screenshot({ path: join(here, s.file) });
  await ctx.close();
  console.log(`brand/${s.file}`, `${s.w * s.scale}×${s.h * s.scale}`);
}
await browser.close();
const kb = readFileSync(join(here, "social-preview.png")).length / 1024;
if (kb > 1000) throw new Error(`social-preview.png is ${kb.toFixed(0)} KB; GitHub's limit is 1 MB`);
