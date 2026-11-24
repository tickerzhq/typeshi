import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import content from "@/generated/content.json";

// What /built and its share card say about the site, read from the files at build time, so the page never
// names a version, a size or a count the site doesn't ship. The compiler's side (crates, edition, MSRV) comes
// from Cargo.toml and the lockfiles, through scripts/sync.mjs and content.json.

const site = process.cwd();
const pkg = JSON.parse(readFileSync(join(site, "package.json"), "utf8")) as {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};
/** The version package.json pins, without a range sign. */
export const npm = (name: string) => (pkg.dependencies[name] ?? pkg.devDependencies[name]).replace(/^[\^~]/, "");

const kb = (bytes: number) => Math.round(bytes / 1024);
const wasm = readFileSync(join(site, "public/typeshi.wasm"));
export const wasmKB = kb(wasm.length);
export const wasmGzipKB = kb(gzipSync(wasm, { level: 9 }).length);

/** Both variable fonts, cut to Latin. */
export const fontKB = kb(["Geist-Latin.woff2", "GeistMono-Latin.woff2"].reduce((n, f) => n + statSync(join(site, "src/fonts", f)).size, 0));

/** The CSS variables tokens.css defines (each `--name:` in its :root). */
export const tokenCount = new Set(readFileSync(join(site, "src/app/tokens.css"), "utf8").match(/--[a-z0-9-]+(?=:)/g)).size;

/** Every page with a share card: the six reading pages, this one, and each lesson. */
export const PAGES = ["/", "/play", "/tour", "/exploits", "/opinions", "/keywords", "/built", ...content.tour.map((l) => `/tour/${l.slug}`)];
