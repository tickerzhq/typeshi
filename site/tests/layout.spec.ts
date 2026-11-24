import { readFileSync } from "node:fs";
import { deflateRawSync } from "node:zlib";
import { expect, test } from "@playwright/test";
import content from "../src/generated/content.json" with { type: "json" };

// No page may ever scroll sideways: every page and every lesson, phone to desktop, and with large
// system text on phones (where text grows and the screen doesn't), up to 200%, Android's largest.
// Lesson names like golden_parachute are one long word, so every lesson is checked, not a sample.
// Lists what sticks out when it fails.
const shared = deflateRawSync(readFileSync("../tests/fixtures/friday.shi")).toString("base64url");
const pages = [
  "/", "/play", "/tour", ...content.tour.map((l) => `/tour/${l.slug}`),
  "/exploits", "/opinions", "/keywords", "/built", "/tokens", `/p/${shared}`, "/not-a-page",
];
const runs: [number, number][] = [
  [320, 100], [360, 100], [375, 100], [390, 100], [414, 100], [768, 100], [1024, 100], [1440, 100], [1920, 100],
  [320, 150], [375, 150], [414, 150], [768, 125], [320, 200], [390, 200],
];

for (const [width, scale] of runs) {
  test(`nothing scrolls sideways at ${width}px, ${scale}% text`, async ({ browser }, info) => {
    test.skip(info.project.name !== "desktop", "sets its own viewport; once is enough");
    test.setTimeout(120_000);
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, isMobile: width < 800, hasTouch: width < 800 });
    const page = await ctx.newPage();
    for (const path of pages) {
      await page.goto(path);
      if (scale !== 100) await page.addStyleTag({ content: `html { font-size: ${scale}% !important; }` });
      await page.waitForTimeout(300);
      const out = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const over = document.documentElement.scrollWidth - vw;
        // A box past the edge, or a box whose text spills past the edge (a word longer than its line).
        const culprits = [...document.querySelectorAll("body *")]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            const spills = getComputedStyle(el).overflowX === "visible" && r.left + el.scrollWidth > vw + 0.5;
            return r.right > vw + 0.5 || spills;
          })
          .slice(0, 4)
          .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]}`);
        return { over, culprits };
      });
      expect(out.over, `${path} at ${width}px, ${scale}%: ${out.culprits.join(", ")}`).toBeLessThanOrEqual(0);
    }
    await ctx.close();
  });
}

// The skip link sits above the page by its own height, so no text size lets its edge show over the
// header, and the first Tab brings it into view.
test("the skip link stays hidden at any text size and shows on the first Tab", async ({ page }) => {
  for (const scale of [100, 200]) {
    await page.goto("/");
    await page.addStyleTag({ content: `html { font-size: ${scale}% !important; }` });
    const skip = page.getByRole("link", { name: /skip/i });
    const hidden = (await skip.boundingBox())!;
    expect(hidden.y + hidden.height, `${scale}% text`).toBeLessThanOrEqual(0);
    await page.keyboard.press("Tab");
    await expect(skip).toBeFocused();
    expect((await skip.boundingBox())!.y, `${scale}% text, focused`).toBeGreaterThanOrEqual(0);
  }
});
