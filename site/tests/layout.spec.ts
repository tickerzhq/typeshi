import { readFileSync } from "node:fs";
import { deflateRawSync } from "node:zlib";
import { expect, test } from "@playwright/test";

// No page may ever scroll sideways: every page, phone to desktop, and with large system text on
// phones (where text grows and the screen doesn't). Lists what sticks out when it fails.
const shared = deflateRawSync(readFileSync("../tests/fixtures/friday.shi")).toString("base64url");
const pages = ["/", "/play", "/tour", "/tour/rent-free", "/opinions", "/keywords", `/p/${shared}`, "/not-a-page"];
const runs: [number, number][] = [
  [320, 100], [360, 100], [375, 100], [390, 100], [414, 100], [768, 100], [1024, 100], [1440, 100], [1920, 100],
  [320, 150], [375, 150], [414, 150], [768, 125],
];

for (const [width, scale] of runs) {
  test(`nothing scrolls sideways at ${width}px, ${scale}% text`, async ({ browser }, info) => {
    test.skip(info.project.name !== "desktop", "sets its own viewport; once is enough");
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, isMobile: width < 800, hasTouch: width < 800 });
    const page = await ctx.newPage();
    for (const path of pages) {
      await page.goto(path);
      if (scale !== 100) await page.addStyleTag({ content: `html { font-size: ${scale}% !important; }` });
      await page.waitForTimeout(300);
      const out = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const over = document.documentElement.scrollWidth - vw;
        const culprits = [...document.querySelectorAll("body *")]
          .filter((el) => el.getBoundingClientRect().right > vw + 0.5)
          .slice(0, 4)
          .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]}`);
        return { over, culprits };
      });
      expect(out.over, `${path} at ${width}px, ${scale}%: ${out.culprits.join(", ")}`).toBeLessThanOrEqual(0);
    }
    await ctx.close();
  });
}
