import { type Browser, expect, type Page, test } from "@playwright/test";
import content from "../src/generated/content.json" with { type: "json" };

// iOS Safari zooms the page into a text field whose type is under 16 px as soon as it gets focus, and
// a zoomed page scrolls sideways. That was the bug on phones (Nov 22 2026): the editor was 12.6 px and
// the example picker 14 px. Chromium doesn't zoom like Safari, so these tests check the cause (on a
// touch screen no field you can type in is under 16 px) and the symptom (no page is wider than the
// phone, before or after you use it). DESIGN.md, "Type", has the rule.

test.describe.configure({ mode: "parallel" });

const LESSONS = content.tour.map((l) => `/tour/${l.slug}`);
/** Every route, every lesson included, and a 404. */
const ROUTES = ["/", "/play", "/tour", "/exploits", "/opinions", "/keywords", "/built", ...LESSONS, "/tour/1"];
const PLAYGROUND = new Set(["/", "/play"]);
const EDITOR = new Set([...PLAYGROUND, ...LESSONS]);

/** iPhone SE (1st gen), iPhone SE, iPhone 15 and iPhone 15 Pro Max widths, with their heights. */
const PHONES: Record<number, number> = { 320: 568, 375: 667, 390: 844, 430: 932 };
const phone = (browser: Browser, width: number) =>
  browser.newContext({ viewport: { width, height: PHONES[width] }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });

const log = (page: Page) => page.getByRole("log", { name: "compiler output" }).first();
const source = (page: Page) => page.getByRole("textbox", { name: /typeshi source/ });

async function open(page: Page, path: string) {
  await page.goto(path);
  if (!EDITOR.has(path)) return;
  await expect(log(page)).toContainText(/wagmi|ngmi/, { timeout: 15_000 });
  await expect(source(page)).toBeVisible();
}

/** Every visible field a finger can type in or pick from, with the smallest type inside it. */
const fields = (page: Page) =>
  page.evaluate(() => {
    const notText = new Set(["checkbox", "radio", "range", "color", "file", "button", "submit", "reset", "image", "hidden"]);
    return [...document.querySelectorAll<HTMLElement>("input, select, textarea, [contenteditable]")]
      .filter((e) =>
        e instanceof HTMLInputElement ? !notText.has(e.type) : e instanceof HTMLSelectElement || e instanceof HTMLTextAreaElement || e.isContentEditable,
      )
      .filter((e) => {
        const r = e.getBoundingClientRect();
        return r.width > 1 && r.height > 1 && e.checkVisibility() && !(e as HTMLInputElement).disabled;
      })
      .map((e) => ({
        field: e.isContentEditable ? "the editor" : (e as HTMLInputElement).labels?.[0]?.textContent?.trim() || e.tagName.toLowerCase(),
        px: Math.min(...[e, ...e.querySelectorAll("*")].map((n) => parseFloat(getComputedStyle(n).fontSize))),
      }));
  });

for (const width of [390, 320]) {
  test(`on a ${width} px touch screen, no field you can type in is under 16 px, so iOS never zooms`, async ({ browser }, info) => {
    test.skip(info.project.name !== "phone", "a touch question; it makes its own phones");
    test.setTimeout(240_000);
    const ctx = await phone(browser, width);
    const page = await ctx.newPage();
    const small: string[] = [];
    for (const path of ROUTES) {
      await open(page, path);
      if (path === "/") {
        expect(await page.evaluate(() => matchMedia("(pointer: coarse)").matches), "a touch screen").toBe(true);
        // The fix is the type size, never a viewport that turns pinch zoom off.
        const viewport = await page.locator('meta[name="viewport"]').getAttribute("content");
        expect(viewport, "pinch zoom stays on").not.toMatch(/maximum-scale|user-scalable\s*=\s*(no|0)/);
      }
      const found = await fields(page);
      // The pages with a field must show it, or this test would pass on nothing.
      const least = PLAYGROUND.has(path) ? 2 : EDITOR.has(path) || path === "/keywords" ? 1 : 0;
      expect(found.length, `${path} shows its fields`).toBeGreaterThanOrEqual(least);
      for (const f of found) if (f.px < 16) small.push(`${path}  ${f.field}: ${f.px} px`);
    }
    expect(small, "fields under 16 px on a touch screen").toEqual([]);
    await ctx.close();
  });
}

/**
 * The page is no wider than the phone, and the phone's layout viewport hasn't grown to hold it. A phone
 * browser widens innerWidth to fit a page that's too wide, so scrollWidth <= innerWidth alone passes a
 * page that overflows: at 320 px the header was 321 px and innerWidth came back 321.
 */
async function fits(page: Page, width: number, when: string, wide: string[]) {
  const m = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: innerWidth }));
  if (m.inner !== width || m.scroll > m.inner) wide.push(`${when}: ${m.scroll} px of page in ${m.inner} px at ${width}`);
}

/** Uses the page the way a phone would: the editor, the build, the tabs, the example picker, the search. */
async function use(page: Page, path: string, width: number, wide: string[]) {
  if (path === "/keywords") {
    const search = page.getByRole("searchbox", { name: "find a keyword" });
    await search.click();
    await search.pressSequentially("rug");
    await fits(page, width, `${path} after a search`, wide);
    await search.fill("x".repeat(80));
    await fits(page, width, `${path} after a long search`, wide);
    return;
  }
  if (!EDITOR.has(path)) return;

  // Focus the editor and type a line far longer than the phone, with no space to wrap at.
  const long = "x".repeat(160);
  await source(page).click();
  await fits(page, width, `${path} with the editor focused`, wide);
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.type("\n// gm ");
  await page.keyboard.insertText(`${long}\nrug!(${long});`);
  await expect(log(page)).toContainText(long.slice(0, 40));
  await fits(page, width, `${path} after typing a long line`, wide);

  // Build.
  if (PLAYGROUND.has(path)) {
    await page.getByRole("button", { name: /^build/ }).click();
    await expect(log(page)).toContainText("$ typeshi build");
  } else {
    await page.keyboard.press("ControlOrMeta+Enter");
    await expect(log(page)).toContainText(/wagmi|ngmi/);
  }
  await fits(page, width, `${path} after a build`, wide);

  // Every tab: lib.shi and lib.rs in the playground, the terminal and lib.rs in a lesson.
  // (the home's proof card has tabs of its own; these are the editor's)
  const tabs = page.locator('[role="tab"]:not([data-proof] [role="tab"])');
  for (let i = 0; i < (await tabs.count()); i++) {
    await tabs.nth(i).click();
    await fits(page, width, `${path} on the ${await tabs.nth(i).innerText()} tab`, wide);
  }
  await tabs.first().click();

  // Open the example picker, then load each example.
  if (PLAYGROUND.has(path)) {
    const picker = page.getByLabel("example program");
    await picker.click();
    await fits(page, width, `${path} with the example picker open`, wide);
    await page.keyboard.press("Escape");
    for (const ex of content.examples) {
      await picker.selectOption(ex.id);
      await expect(source(page)).toContainText(ex.source.split("\n")[0]);
      await fits(page, width, `${path} with ${ex.id} loaded`, wide);
    }
  }
}

for (const width of [320, 375, 390, 430]) {
  test(`at ${width} px, no page scrolls sideways, before or after you use it`, async ({ browser }, info) => {
    test.skip(info.project.name !== "phone", "a phone question; it makes its own phones");
    test.setTimeout(360_000);
    const ctx = await phone(browser, width);
    const page = await ctx.newPage();
    const wide: string[] = [];
    for (const path of ROUTES) {
      await open(page, path);
      await fits(page, width, `${path} on load`, wide);
      await use(page, path, width, wide);
    }
    expect(wide, "pages wider than the phone").toEqual([]);
    await ctx.close();
  });
}

test("with a mouse, the editor and the example picker keep their desktop sizes", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "a desktop question");
  await open(page, "/play");
  expect(await page.evaluate(() => matchMedia("(pointer: fine)").matches)).toBe(true);
  const px = await page.evaluate(() => {
    const step = (name: string) => {
      const probe = document.createElement("span");
      probe.style.fontSize = `var(--step-${name})`;
      document.body.append(probe);
      const size = getComputedStyle(probe).fontSize;
      probe.remove();
      return size;
    };
    const size = (sel: string) => getComputedStyle(document.querySelector(sel)!).fontSize;
    return {
      editor: [size(".cm-content"), step("code")],
      picker: [size("select"), step("small")],
    };
  });
  expect(px.editor[0], "the editor is the code step").toBe(px.editor[1]);
  expect(px.picker[0], "the picker is the small step").toBe(px.picker[1]);
});
