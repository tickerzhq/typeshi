import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const term = (page: Page) => page.getByRole("log", { name: "compiler output" });
const source = (page: Page) => page.getByRole("textbox", { name: /typeshi source/ });
const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1000) < 860;

async function showRust(page: Page) {
  if (isPhone(page)) await page.getByRole("tab", { name: "lib.rs" }).click();
}

test("the real compiler loads and compiles the starter program", async ({ page }) => {
  await page.goto("/");
  await expect(term(page)).toContainText("wagmi", { timeout: 15_000 });
  await showRust(page);
  // CodeMirror only renders the lines on screen, so check what's at the top.
  const rust = page.getByRole("textbox", { name: /generated Anchor Rust/ });
  await expect(rust).toContainText('declare_id!("7PxhmDuhhe394QJgKyW1P7Ce4dPCfFPN2yKq4KCCj7Vj")');
  await expect(rust).toContainText("pub struct Counter");
  await expect(page.getByText(/^compiles · the real compiler/)).toBeVisible();
});

test("a banned move refuses to compile, with the joke and the line", async ({ page }) => {
  await page.goto("/");
  await expect(term(page)).toContainText("wagmi", { timeout: 15_000 });
  const editor = source(page);
  await editor.click();
  await page.keyboard.press("ControlOrMeta+End");
  // Put a rug inside gm, before its last two lines.
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("End");
  await page.keyboard.type("\nrug!(counter);");
  await expect(term(page)).toContainText("not on our watch, anon");
  await expect(term(page)).toContainText("ngmi");
  await expect(page.locator(".cm-lintRange-error").first()).toBeVisible();
});

test("build escalates on repeat failures", async ({ page }) => {
  await page.goto("/");
  await expect(term(page)).toContainText("wagmi", { timeout: 15_000 });
  await page.getByLabel("example program").selectOption("rug");
  const build = page.getByRole("button", { name: /^build/ });
  await build.click();
  await expect(term(page)).toContainText("your build is vesting");
  await expect(term(page)).toContainText("skill issue.");
  await build.click();
  await expect(term(page)).toContainText("have you tried turning your strategy off.");
});

test("every example compiles exactly as the CLI says it does", async ({ page }) => {
  await page.goto("/play");
  await expect(term(page)).toContainText(/wagmi|ngmi/, { timeout: 15_000 });
  for (const [id, verdict] of [
    ["degen_desk", "wagmi"],
    ["print_feed", "wagmi"],
    ["friday", "absolutely not."],
    ["no_disclaimer", "ngmi"],
    ["warnings", "you trusted the dev. classic."],
  ] as const) {
    await page.getByLabel("example program").selectOption(id);
    await expect(term(page)).toContainText(verdict);
  }
});

test("a share link carries the program", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/play");
  await expect(term(page)).toContainText(/wagmi|ngmi/, { timeout: 15_000 });
  await page.getByLabel("example program").selectOption("friday");
  await page.getByRole("button", { name: "share" }).click();
  await expect(page.getByText("link copied")).toBeVisible();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  expect(url).toMatch(/\/play#code=[A-Za-z0-9_-]+$/);

  const fresh = await context.newPage();
  await fresh.goto(url);
  await expect(term(fresh)).toContainText("absolutely not.", { timeout: 15_000 });
});

test("the page has no accessibility violations", async ({ page }) => {
  await page.goto("/");
  await expect(term(page)).toContainText("wagmi", { timeout: 15_000 });
  const results = await new AxeBuilder({ page }).disableRules(["scrollable-region-focusable"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.length} (${v.help})`)).toEqual([]);
});

test("no horizontal scroll and no console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  for (const path of ["/", "/play"]) {
    await page.goto(path);
    await expect(term(page)).toContainText(/wagmi|ngmi/, { timeout: 15_000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${path} scrolls sideways`).toBeLessThanOrEqual(0);
  }
  expect(errors).toEqual([]);
});

test("the terminal is actually visible, not squeezed to nothing", async ({ page }) => {
  for (const path of ["/", "/play"]) {
    await page.goto(path);
    await expect(term(page)).toContainText(/wagmi|ngmi/, { timeout: 15_000 });
    await term(page).scrollIntoViewIfNeeded();
    const box = await term(page).boundingBox();
    expect(box?.height ?? 0, `${path} terminal height`).toBeGreaterThan(80);
  }
});

test("a broken example never shows another program's Rust", async ({ page }) => {
  await page.goto("/play");
  await expect(term(page)).toContainText("wagmi", { timeout: 15_000 });
  await page.getByLabel("example program").selectOption("rug");
  await expect(term(page)).toContainText("ngmi");
  await showRust(page);
  const rust = page.getByRole("textbox", { name: /generated Anchor Rust/ });
  await expect(rust).toContainText("lib.shi doesn't compile");
  await expect(rust).not.toContainText("gm_counter");
});
