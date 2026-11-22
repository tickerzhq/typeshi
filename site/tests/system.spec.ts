import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const PAGES = ["/", "/play", "/tour", "/tour/cap-table"];
const ready = (page: Page) =>
  expect(page.getByRole("log", { name: "compiler output" }).first()).toContainText(/wagmi|ngmi/, { timeout: 15_000 });

test("every page fits 320 px with no sideways scroll", async ({ browser }, info) => {
  test.skip(info.project.name !== "desktop", "one run is enough; it makes its own 320 px window");
  const ctx = await browser.newContext({ viewport: { width: 320, height: 640 } });
  const page = await ctx.newPage();
  for (const path of PAGES) {
    await page.goto(path);
    if (path !== "/tour") await ready(page);
    const wide = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(wide, `${path} is ${wide} px wide at 320`).toBeLessThanOrEqual(320);
  }
  await ctx.close();
});

test("on a phone, every control is at least 44 px tall", async ({ page }, info) => {
  test.skip(info.project.name !== "phone", "touch targets are a phone question");
  for (const path of PAGES) {
    await page.goto(path);
    if (path !== "/tour") await ready(page);
    const small = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("a[href], button, select, input, [role=tab]")]
        .filter((e) => {
          const r = e.getBoundingClientRect();
          const cs = getComputedStyle(e);
          // WCAG 2.5.8 leaves links inside running text alone
          const inline = cs.display === "inline" && e.tagName === "A" && e.closest("p, li, td");
          return r.width > 0 && r.height > 0 && !inline && !e.closest(".visually-hidden") && !e.classList.contains("skip");
        })
        .filter((e) => e.getBoundingClientRect().height < 44)
        .map((e) => `${e.tagName.toLowerCase()} "${e.textContent?.trim().slice(0, 20)}"`),
    );
    expect(small, path).toEqual([]);
  }
});

test("the light theme turns on, survives a reload, and passes axe", async ({ page }) => {
  await page.goto("/");
  await ready(page);
  const toggle = page.getByRole("button", { name: "light theme" });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).not.toBe("rgb(0, 0, 0)");
  for (const path of PAGES) {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    if (path !== "/tour") await ready(page);
    const results = await new AxeBuilder({ page }).disableRules(["scrollable-region-focusable"]).analyze();
    expect(results.violations.map((v) => `${path} ${v.id}: ${v.nodes.length} (${v.help})`)).toEqual([]);
  }
  await page.getByRole("button", { name: "light theme" }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", "light");
});

test("a light reader gets light before the first paint, not after hydration", async ({ page, request }) => {
  const html = await (await request.get("/tour")).text();
  expect(html).toContain('localStorage.getItem("typeshi:theme")');
  expect(html).not.toContain("from the server but");
  await page.addInitScript(() => localStorage.setItem("typeshi:theme", "light"));
  await page.route(/\/_next\/static\/chunks\/.*\.js$/, (route) => route.abort());
  await page.goto("/tour");
  // no JavaScript bundle ran, only the inline head script
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("/play and /tour have no accessibility violations", async ({ page }) => {
  for (const path of ["/play", "/tour"]) {
    await page.goto(path);
    if (path === "/play") await ready(page);
    const results = await new AxeBuilder({ page }).disableRules(["scrollable-region-focusable"]).analyze();
    expect(results.violations.map((v) => `${path} ${v.id}: ${v.nodes.length} (${v.help})`)).toEqual([]);
  }
});

test("tabs move with the arrow keys", async ({ page }) => {
  await page.goto("/tour/cap-table");
  await ready(page);
  const terminal = page.getByRole("tab", { name: /terminal/ });
  const rust = page.getByRole("tab", { name: "lib.rs" });
  await terminal.focus();
  await page.keyboard.press("ArrowRight");
  await expect(rust).toBeFocused();
  await expect(rust).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel", { name: "lib.rs" })).toBeVisible();
  await page.keyboard.press("Home");
  await expect(terminal).toHaveAttribute("aria-selected", "true");
});

test("a lesson's terminal and lib.rs have room on every screen", async ({ page }) => {
  await page.goto("/tour/cap-table");
  await ready(page);
  const terminal = page.getByRole("tabpanel", { name: /terminal/ });
  await terminal.scrollIntoViewIfNeeded();
  expect((await terminal.boundingBox())?.height ?? 0).toBeGreaterThan(200);
  await page.getByRole("tab", { name: "lib.rs" }).click();
  const rust = page.getByRole("tabpanel", { name: "lib.rs" });
  await expect(rust).toBeVisible();
  expect((await rust.boundingBox())?.height ?? 0).toBeGreaterThan(200);
});

test("the program is in the HTML, so it paints before the editor loads", async ({ request }) => {
  for (const path of ["/", "/play"]) {
    const html = await (await request.get(path)).text();
    expect(html, path).toContain("stealth_launch gm_counter {");
  }
});

test("the tour slides between lessons and lands on the next one", async ({ page }) => {
  await page.goto("/tour/gm");
  await expect(page.getByRole("status")).toContainText("goal:", { timeout: 15_000 });
  await page.getByRole("link", { name: /next/ }).click();
  await expect(page).toHaveURL(/\/tour\/frame$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("frame");
  await page.getByRole("link", { name: /back/ }).click();
  await expect(page).toHaveURL(/\/tour\/gm$/);
});

test("llms.txt and the design tokens are public", async ({ request }) => {
  const llms = await (await request.get("/llms.txt")).text();
  expect(llms).toMatch(/^# typeshi\n\n> lock in fn\./);
  for (const part of ["## Keywords", "`rug!`", "0x1", "## The tour"]) expect(llms).toContain(part);
  const resolver = await (await request.get("/tokens/typeshi.resolver.json")).json();
  expect(Object.keys(resolver.modifiers)).toEqual(["theme", "contrast"]);
  const base = await (await request.get("/tokens/tokens.json")).json();
  expect(base.color.accent.fill.$value).toBe("{palette.lime.110}");
});
