import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import content from "../src/generated/content.json" with { type: "json" };

const lessons = content.tour;

test("every lesson starts unsolved and its solution passes, in the browser", async ({ page }) => {
  test.setTimeout(120_000);
  for (const l of lessons) {
    await page.goto(`/tour/${l.slug}`);
    const status = page.getByRole("status");
    await expect(status).toContainText("goal:", { timeout: 15_000 });
    await expect(status).not.toContainText("done. wagmi.");
    await page.getByRole("button", { name: "show solution" }).click();
    await expect(status, `lesson ${l.n} (${l.slug})`).toContainText("done. wagmi.");
  }
});

test("typing the fix by hand passes lesson 1, and the tour remembers", async ({ page }) => {
  await page.goto("/tour/gm");
  const status = page.getByRole("status");
  await expect(status).toContainText("goal:", { timeout: 15_000 });
  await expect(page.getByRole("log", { name: "compiler output" })).toContainText("gm needs a program id.");
  const editor = page.getByRole("textbox", { name: /typeshi source/ });
  await editor.click();
  // Put the id between gm!( and ).
  await editor.getByText("gm!();").click();
  await page.keyboard.press("End");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.type('"7PxhmDuhhe394QJgKyW1P7Ce4dPCfFPN2yKq4KCCj7Vj"');
  await expect(status).toContainText("done. wagmi.");
  await page.goto("/tour");
  await expect(page.getByText(`1 of ${lessons.length} done`)).toBeVisible();
  await expect(page.getByRole("link", { name: /keep going/ })).toHaveAttribute("href", `/tour/${lessons[1].slug}`);
});

test("a lesson page has no accessibility violations", async ({ page }) => {
  await page.goto(`/tour/${lessons[2].slug}`);
  await expect(page.getByRole("status")).toContainText("goal:", { timeout: 15_000 });
  const results = await new AxeBuilder({ page }).disableRules(["scrollable-region-focusable"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.length} (${v.help})`)).toEqual([]);
});
