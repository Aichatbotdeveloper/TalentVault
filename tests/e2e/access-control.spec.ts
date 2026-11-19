import { expect, test } from "@playwright/test";
import { formError, login, PASSWORD } from "./helpers";

test("protected areas redirect anonymous visitors", async ({ page }) => {
  await page.goto("/portal/enquiries");
  await expect(page).toHaveURL(/\/login\?next=%2Fportal%2Fenquiries/);
  await page.goto("/admin/candidates");
  await expect(page).toHaveURL(/\/admin\/login/);
  const res = await page.request.get("/api/admin/documents/00000000-0000-0000-0000-000000000000");
  expect(res.status()).toBe(403);
  const cron = await page.request.get("/api/cron/process-cv-jobs");
  expect(cron.status()).toBe(401);
});

test("employers cannot use the admin console", async ({ page }) => {
  await page.goto("/admin/login");
  await page.fill("#email", "employer@example.com");
  await page.fill("#password", PASSWORD);
  await page.click('button:has-text("Sign In")');
  await expect(formError(page)).toContainText("does not have administrator access");
  await login(page, "employer@example.com");
  await page.goto("/admin/candidates");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("pending employers cannot reach the candidate database", async ({ page }) => {
  await login(page, "pending@example.com");
  await page.goto("/portal/candidates/TV-1001");
  await expect(page).toHaveURL(/gate=approval/);
});

test("recruitment admins cannot manage users or platform settings", async ({ page }) => {
  await login(page, "recruiter@talentvault.local", "admin");
  await page.goto("/admin/settings?tab=users");
  await expect(page.getByText("Invite administrator")).toHaveCount(0);
  await page.goto("/admin/settings?tab=platform");
  await expect(page.getByText("Save Configuration Changes")).toHaveCount(0);
});
