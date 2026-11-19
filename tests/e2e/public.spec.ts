import { expect, test } from "@playwright/test";

const PAGES: [string, RegExp][] = [
  ["/", /Curated Talent/],
  ["/about", /discretion/i],
  ["/services", /Recruitment Services/],
  ["/employers", /talent pool/i],
  ["/candidates", /confidentially/i],
  ["/contact", /Contact Us/],
  ["/privacy", /Privacy Policy/],
  ["/terms", /Terms/],
  ["/submit-cv", /Join the Anonymous Talent Marketplace/],
  ["/employer/register", /Register Your Organisation/],
  ["/login", /Employer Sign In/],
];

test.describe("public website", () => {
  for (const [path, heading] of PAGES) {
    test(`renders ${path}`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator("h1").first()).toContainText(heading);
    });
  }

  test("main navigation links work", async ({ page }) => {
    await page.goto("/");
    for (const label of ["About Us", "Services", "For Employers", "For Candidates", "Contact"]) {
      await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: label }).click();
      await expect(page.locator("h1").first()).toBeVisible();
    }
  });

  test("contact form validates and submits", async ({ page }) => {
    await page.goto("/contact");
    await page.click('button:has-text("Send Message")');
    await expect(page.locator(".tv-error").first()).toBeVisible();
    await page.fill("#name", "E2E Visitor");
    await page.fill("#email", "e2e.visitor@example.com");
    await page.fill("#message", "I would like to learn more about hiring through TalentVault.");
    await page.click('button:has-text("Send Message")');
    await expect(page.getByText("your message has been sent")).toBeVisible();
  });

  test("hero search requires employer sign-in", async ({ page }) => {
    await page.goto("/");
    await page.fill('input[name="title"]', "Engineer");
    await page.click('button:has-text("Explore Candidates")');
    await expect(page).toHaveURL(/\/login\?next=%2Fportal%2Fcandidates%3Ftitle%3DEngineer/);
  });
});
