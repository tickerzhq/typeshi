import { expect, test } from "@playwright/test";
import content from "../src/generated/content.json" with { type: "json" };

test("a shared program opens in the playground and unfurls with its own card", async ({ page, context, request }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/play");
  await expect(page.getByRole("log", { name: "compiler output" })).toContainText(/wagmi|ngmi/, { timeout: 15_000 });
  await page.getByLabel("example program").selectOption("friday");
  await page.getByRole("button", { name: "share" }).click();
  // Sharing compresses the program first; read the clipboard only once it says the link is copied.
  await expect(page.getByText("link copied")).toBeVisible();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  const path = new URL(url).pathname;
  expect(path).toMatch(/^\/p\/[A-Za-z0-9_-]+$/);

  const shared = await context.newPage();
  await shared.goto(path);
  await expect(shared.getByRole("log", { name: "compiler output" })).toContainText("absolutely not.", { timeout: 15_000 });
  await expect(shared).toHaveTitle(/release, a typeshi program/);
  expect(await shared.locator('meta[property="og:description"]').getAttribute("content")).toBe("error: absolutely not.");
  expect(await shared.locator('meta[name="robots"]').getAttribute("content")).toContain("noindex");
  const og = await shared.locator('meta[property="og:image"]').first().getAttribute("content");
  const res = await request.get(new URL(og!).pathname + new URL(og!).search);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("image/png");
  expect(res.headers()["cache-control"]).toContain("s-maxage=31536000");

  expect((await request.get("/p/not-a-real-program")).status()).toBe(404);
});

test("robots.txt points at a sitemap that lists every page and lesson", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("sitemap.xml");
  expect(robots).toContain("Disallow: /p/");
  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const path of ["/tour", "/play", "/opinions", "/keywords", "/built"]) expect(sitemap).toContain(`${path}</loc>`);
  for (const l of content.tour) expect(sitemap).toContain(`/tour/${l.slug}</loc>`);
});

test("no page shouts: nothing renders in all caps outside code", async ({ page }) => {
  for (const path of ["/", "/play", "/tour", `/tour/${content.tour[0].slug}`, "/opinions", "/keywords", "/built"]) {
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
