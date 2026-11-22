// Takes the README's demo picture from the real site: the playground turning the starter program into
// Anchor Rust, in GitHub's dark and light modes. Run against a built site:
//   npm run build && npx next start -p 3100 &  BASE_URL=http://localhost:3100 node scripts/readme-shot.mjs
// PW_CHROMIUM=/path/to/chrome uses a browser that's already installed.

import { chromium } from "@playwright/test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const base = process.env.BASE_URL ?? "http://localhost:3100";
const brand = join(dirname(fileURLToPath(import.meta.url)), "../../brand");
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});

for (const theme of ["dark", "light"]) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
  if (theme === "light") await ctx.addInitScript(() => localStorage.setItem("typeshi:theme", "light"));
  await ctx.addInitScript(() => localStorage.removeItem("typeshi:draft"));
  const page = await ctx.newPage();
  await page.goto(`${base}/play`);
  await page.getByRole("log", { name: "compiler output" }).getByText("wagmi").waitFor({ timeout: 20_000 });
  await page.getByRole("button", { name: /^build/ }).click();
  await page.getByRole("log", { name: "compiler output" }).getByText("mcap").waitFor();
  await page.mouse.move(0, 0);
  await page.screenshot({ path: join(brand, `playground-${theme}.png`), clip: { x: 0, y: 57, width: 1280, height: 703 } });
  await ctx.close();
}
await browser.close();
console.log("wrote brand/playground-dark.png and brand/playground-light.png");
