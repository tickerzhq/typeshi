import { expect, test, type Page } from "@playwright/test";

// The layout math, measured on the rendered page at the grid's widths: every block starts on the frame's gutter or a
// column line, sections are spaced the same, cards in a row are the same size, and every gap is a whole 4px step.
// These are tickerz.com's rules (DESIGN.md, "Structure"), so a stray margin or an off-grid block fails here, not in a
// screenshot review.

const WIDTHS = [390, 768, 1024, 1440];
const STEP = 4;
const onStep = (n: number) => Math.abs(n / STEP - Math.round(n / STEP)) < 0.05;

/** The frame's gutter and the left edge of every column, as globals.css computes them. */
async function lines(page: Page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const frame = Math.min(vw, 1440);
    const gutter = vw <= 900 ? 16 : 48;
    const cols = vw >= 1100 ? 12 : vw >= 600 ? 8 : 4;
    const left = (vw - frame) / 2 + gutter;
    const col = (frame - 2 * gutter - (cols - 1) * 16) / cols;
    return { left, right: left + frame - 2 * gutter, starts: Array.from({ length: cols }, (_, i) => left + i * (col + 16)) };
  });
}

for (const width of WIDTHS) {
  test(`the home sits on the grid at ${width}px`, async ({ browser }, info) => {
    test.skip(info.project.name !== "desktop", "sets its own viewport");
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    await page.goto("/");
    const grid = await lines(page);

    // 1. The hero's claim, every section's hairline and the footer start on the gutter; nothing passes the right edge.
    const edges = await page.evaluate(() =>
      [
        document.querySelector("#hero-h"),
        ...document.querySelectorAll("[data-sec] > div:first-child, footer > nav"),
      ]
        .filter(Boolean)
        .map((el) => {
          const r = (el as Element).getBoundingClientRect();
          return { what: (el as Element).textContent!.trim().slice(0, 24), left: r.left, right: r.right };
        }),
    );
    for (const e of edges) {
      expect(Math.abs(e.left - grid.left), `${e.what} starts on the gutter`).toBeLessThan(1);
      expect(e.right, `${e.what} stays inside the frame`).toBeLessThanOrEqual(grid.right + 1);
    }

    // 2. From 1100px the proof card starts on column 7.
    if (width >= 1100) {
      const card = await page.getByRole("tablist", { name: "what the compiler does" }).evaluate((el) => el.parentElement!.getBoundingClientRect().left);
      expect(Math.abs(card - grid.starts[6]), "the proof card starts on column 7").toBeLessThan(1);
    }

    // 3. Every section is spaced the same: the space from the end of one section to the next hairline is one value.
    const gaps = await page.evaluate(() => {
      const secs = [document.querySelector("section[aria-labelledby=hero-h]")!, ...document.querySelectorAll("[data-sec]")];
      return secs.slice(1).map((s, i) => {
        const line = s.querySelector(":scope > div")!.getBoundingClientRect().top;
        return Math.round(line - secs[i].getBoundingClientRect().bottom);
      });
    });
    expect(new Set(gaps.slice(1)).size, `sections are spaced alike: ${gaps}`).toBe(1);
    for (const g of gaps) expect(onStep(g), `section gap ${g} is a 4px step`).toBe(true);

    // 4. The exploit cards: one size per row, the same gap between every pair, and that gap a 4px step.
    const cards = await page.evaluate(() =>
      [...document.querySelectorAll("#exploits li > a")].map((a) => {
        const r = a.getBoundingClientRect();
        return { top: Math.round(r.top), left: r.left, width: r.width, height: r.height };
      }),
    );
    const rows = new Map<number, typeof cards>();
    for (const c of cards) rows.set(c.top, [...(rows.get(c.top) ?? []), c]);
    for (const row of rows.values()) {
      expect(new Set(row.map((c) => Math.round(c.width))).size, "cards in a row are one width").toBe(1);
      expect(new Set(row.map((c) => Math.round(c.height))).size, "cards in a row are one height").toBe(1);
      for (let i = 1; i < row.length; i++) {
        const gap = row[i].left - (row[i - 1].left + row[i - 1].width);
        expect(onStep(gap), `card gap ${gap} is a 4px step`).toBe(true);
      }
    }

    // 5. Rows in the checks and the tour: one height for a one-line row, never under 44px.
    const heights = await page.evaluate(() => [...document.querySelectorAll("#checks li > a, #tour li > a")].map((a) => a.getBoundingClientRect().height));
    for (const h of heights) expect(h, "a row is a full touch target").toBeGreaterThanOrEqual(44);

    await ctx.close();
  });
}
