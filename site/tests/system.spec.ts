import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import content from "../src/generated/content.json" with { type: "json" };
import { WASM_URL } from "../src/generated/wasm";

const PAGES = ["/", "/play", "/tour", "/tour/cap-table", "/opinions", "/keywords", "/built", "/tour/1"];
/** The pages that run the compiler; wait for its first verdict there. */
const LIVE = new Set(["/", "/play", "/tour/cap-table"]);
const ready = (page: Page) =>
  expect(page.getByRole("log", { name: "compiler output" }).first()).toContainText(/wagmi|ngmi/, { timeout: 15_000 });

test("every page fits 320 px with no sideways scroll", async ({ browser }, info) => {
  test.skip(info.project.name !== "desktop", "one run is enough; it makes its own 320 px window");
  const ctx = await browser.newContext({ viewport: { width: 320, height: 640 } });
  const page = await ctx.newPage();
  for (const path of PAGES) {
    await page.goto(path);
    if (LIVE.has(path)) await ready(page);
    const wide = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(wide, `${path} is ${wide} px wide at 320`).toBeLessThanOrEqual(320);
  }
  await ctx.close();
});

test("on a phone, every control is at least 44 px tall", async ({ page }, info) => {
  test.skip(info.project.name !== "phone", "touch targets are a phone question");
  for (const path of PAGES) {
    await page.goto(path);
    if (LIVE.has(path)) await ready(page);
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
    if (LIVE.has(path)) await ready(page);
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

test("/play, /tour, /opinions, /keywords, /built and the 404 have no accessibility violations", async ({ page }) => {
  for (const path of ["/play", "/tour", "/opinions", "/keywords", "/built", "/tour/1"]) {
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

// The compiler's URL carries a hash of its bytes, so a deploy is a new URL. Before, it was always
// /typeshi.wasm, cached for an hour, and a returning visitor ran the previous compiler.
test("the playground loads the compiler by its content hash, and the bare URL is never kept", async ({ page, request }) => {
  const asked: string[] = [];
  page.context().on("request", (r) => {
    if (r.url().includes("typeshi.wasm")) asked.push(new URL(r.url()).pathname + new URL(r.url()).search);
  });
  await page.goto("/play");
  await expect(page.getByText("compiles", { exact: true })).toBeVisible();
  expect(asked).toContain(WASM_URL);
  expect(asked.filter((u) => u !== WASM_URL), "nothing loads the bare URL").toEqual([]);

  const hashed = await request.get(WASM_URL);
  expect(hashed.headers()["cache-control"]).toContain("immutable");
  expect(hashed.headers()["content-type"]).toBe("application/wasm");
  const bare = await request.get("/typeshi.wasm");
  expect(bare.headers()["cache-control"]).toContain("max-age=0");
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

test("the 404 is the site's own page, in the site's colors, whatever the system says", async ({ browser }) => {
  // Next's built-in 404 set its own body colors from prefers-color-scheme: a dark header over a white page.
  for (const [system, stored] of [["light", null], ["dark", "light"], ["dark", null], ["light", "light"]] as const) {
    const ctx = await browser.newContext({ colorScheme: system });
    if (stored) await ctx.addInitScript((t) => localStorage.setItem("typeshi:theme", t), stored);
    const page = await ctx.newPage();
    const res = await page.goto("/tour/1");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("404");
    const c = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.style.cssText = "color: var(--text-primary); background-color: var(--surface-page)";
      document.body.append(probe);
      const p = getComputedStyle(probe);
      return {
        body: getComputedStyle(document.body).backgroundColor,
        page: p.backgroundColor,
        mark: getComputedStyle(document.querySelector("header a")!).color,
        ink: p.color,
      };
    });
    expect(c.body, `system ${system}, stored ${stored}`).toBe(c.page);
    expect(c.mark, `system ${system}, stored ${stored}`).toBe(c.ink);
    await ctx.close();
  }
});

// --- icons and share cards ---------------------------------------------------------------------------

/** The path and query of a URL the page states absolutely (the metadata base is the production address). */
const local = (url: string) => {
  const u = new URL(url);
  return u.pathname + u.search;
};
const pngSize = (b: Buffer) => [b.readUInt32BE(16), b.readUInt32BE(20)];

test("the icons and the manifest are linked and served", async ({ request }, info) => {
  test.skip(info.project.name !== "desktop", "one run is enough");
  const html = await (await request.get("/")).text();
  const link = (rel: string, type?: string) => {
    const tags = [...html.matchAll(/<link [^>]*>/g)].map((m) => m[0]).filter((t) => t.includes(`rel="${rel}"`));
    const tag = tags.find((t) => !type || t.includes(`type="${type}"`));
    expect(tag, `<link rel="${rel}"${type ? ` type="${type}"` : ""}>`).toBeTruthy();
    return tag!.match(/href="([^"]+)"/)![1].replaceAll("&amp;", "&");
  };
  const svg = await request.get(link("icon", "image/svg+xml"));
  expect(await svg.text()).toContain("prefers-color-scheme:dark");
  const ico = await (await request.get(link("icon", "image/x-icon"))).body();
  expect([ico.readUInt16LE(2), ico.readUInt16LE(4)], "an .ico with 16, 32 and 48").toEqual([1, 3]);
  const apple = await (await request.get(link("apple-touch-icon"))).body();
  expect(pngSize(apple)).toEqual([180, 180]);
  const manifest = await (await request.get(link("manifest"))).json();
  expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/);
  expect(manifest.icons.map((i: { purpose: string; sizes: string }) => `${i.purpose} ${i.sizes}`)).toEqual([
    "any 192x192",
    "any 512x512",
    "maskable 512x512",
  ]);
  for (const icon of manifest.icons) {
    const png = await (await request.get(icon.src)).body();
    expect(pngSize(png).join("x"), icon.src).toBe(icon.sizes);
  }
});

test("every page has its own share card, its own title, and a large-image card for X", async ({ request }, info) => {
  test.skip(info.project.name !== "desktop", "one run is enough");
  const pages = ["/", "/play", "/tour", "/opinions", "/keywords", "/built", ...content.tour.map((l) => `/tour/${l.slug}`)];
  const images = new Set<string>();
  const titles = new Set<string>();
  for (const path of pages) {
    const html = await (await request.get(path)).text();
    const meta = (key: string) => html.match(new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`))?.[1];
    expect(meta("twitter:card"), path).toBe("summary_large_image");
    const image = meta("og:image");
    expect(image, `${path} has an og:image`).toBeTruthy();
    expect(meta("twitter:image"), path).toBe(image);
    images.add(local(image!));
    titles.add(meta("og:title")!);
    const res = await request.get(local(image!));
    expect(res.headers()["content-type"], path).toBe("image/png");
    expect(pngSize(await res.body()), path).toEqual([1200, 630]);
  }
  expect(images.size, "no two pages share a card").toBe(pages.length);
  expect(titles.size, "no two pages share an og:title").toBe(pages.length);
});

test("/built is linked from the footer and names what the site really ships", async ({ page }) => {
  await page.goto("/tour");
  await page.getByRole("navigation", { name: "footer" }).getByRole("link", { name: "how it's built" }).click();
  await expect(page).toHaveURL(/\/built$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("how it's built.");
  await expect(page.getByText(`typeshi v${content.version}`)).toBeVisible();
  await expect(page.getByText(`${content.tour.length + 6} pages`)).toBeVisible();
});
