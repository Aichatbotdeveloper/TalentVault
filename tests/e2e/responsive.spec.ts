import { expect, test } from "@playwright/test";
import { login } from "./helpers";

for (const path of ["/", "/submit-cv", "/employers", "/contact"]) {
  test(`no horizontal overflow on mobile: ${path}`, async ({ page }) => {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test("mobile navigation menu opens", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("navigation", { name: "Mobile" }).getByRole("link", { name: "Services" }).click();
  await expect(page).toHaveURL(/\/services/);
});

test("portal sidebar becomes a drawer on mobile", async ({ page }) => {
  await login(page, "employer@example.com");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "My Enquiries" }).last().click();
  await expect(page).toHaveURL(/\/portal\/enquiries/);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
