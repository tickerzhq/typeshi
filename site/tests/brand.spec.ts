import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import content from "../src/generated/content.json" with { type: "json" };

// Link previews, icons and the manifest are fetched by machines, so check them like one.
test.describe.configure({ mode: "parallel" });

const pages = ["/", "/play", "/tour", `/tour/${content.tour[11].slug}`, "/opinions", "/keywords"];

for (const path of pages) {
  test(`${path} has a working share card`, async ({ page, request }) => {
    await page.goto(path);
    const og = await page.locator('meta[property="og:image"]').first().getAttribute("content");
    expect(og, "og:image").toBeTruthy();
    expect(await page.locator('meta[property="og:image:width"]').first().getAttribute("content")).toBe("1200");
    expect(await page.locator('meta[property="og:image:height"]').first().getAttribute("content")).toBe("630");
    expect(await page.locator('meta[name="twitter:card"]').getAttribute("content")).toBe("summary_large_image");
    expect(await page.locator('meta[property="og:title"]').getAttribute("content")).toBeTruthy();
    const res = await request.get(new URL(og!).pathname + new URL(og!).search);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("image/png");
    expect((await res.body()).length).toBeGreaterThan(10_000);
  });
}

test("icons, manifest, robots and sitemap all resolve", async ({ request }) => {
  for (const [path, type] of [
    ["/favicon.ico", "image/x-icon"],
    ["/icon.svg", "image/svg+xml"],
    ["/apple-icon.png", "image/png"],
  ]) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(200);
    expect(res.headers()["content-type"], path).toContain(type);
  }
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.name).toBe("typeshi");
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === "maskable")).toBe(true);
  for (const icon of manifest.icons) expect((await request.get(icon.src)).status(), icon.src).toBe(200);
  expect(await (await request.get("/robots.txt")).text()).toContain("sitemap.xml");
  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const l of content.tour) expect(sitemap).toContain(`/tour/${l.slug}`);
});

test("a shared program opens in the playground and unfurls with its own card", async ({ page, context, request }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/play");
  const term = page.getByRole("log", { name: "compiler output" });
  await expect(term).toContainText(/wagmi|ngmi/, { timeout: 15_000 });
  await page.getByLabel("example program").selectOption("friday");
  await page.getByRole("button", { name: "share" }).click();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  const path = new URL(url).pathname;

  const shared = await context.newPage();
  await shared.goto(path);
  await expect(shared.getByRole("log", { name: "compiler output" })).toContainText("absolutely not.", { timeout: 15_000 });
  await expect(shared).toHaveTitle(/release, a typeshi program/);
  expect(await shared.locator('meta[property="og:description"]').getAttribute("content")).toBe("error: absolutely not.");
  const og = await shared.locator('meta[property="og:image"]').first().getAttribute("content");
  const res = await request.get(new URL(og!).pathname + new URL(og!).search);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("image/png");

  expect((await request.get("/p/not-a-real-program")).status()).toBe(404);
});

test("no page shouts: nothing renders in all caps outside code", async ({ page }) => {
  for (const path of ["/", "/play", "/tour", `/tour/${content.tour[0].slug}`, "/opinions", "/keywords"]) {
    await page.goto(path);
    const shouting = await page.evaluate(() => {
      const out: string[] = [];
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (w.nextNode()) {
        const t = (w.currentNode.textContent ?? "").trim();
        const el = w.currentNode.parentElement;
        if (!t || !el || el.closest("script,style,code,pre,kbd,.cm-editor,table")) continue;
        const letters = t.replace(/[^A-Za-z]/g, "");
        if (getComputedStyle(el).textTransform === "uppercase" || (letters.length > 3 && letters === letters.toUpperCase())) out.push(t);
      }
      return out;
    });
    expect(shouting, path).toEqual([]);
  }
});
