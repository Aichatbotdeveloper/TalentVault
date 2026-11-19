import { expect, test } from "@playwright/test";
import { resetRateLimits } from "./helpers";

test.beforeEach(() => resetRateLimits());

test("candidate submits a CV and sees live processing status", async ({ page }) => {
  await page.goto("/submit-cv");
  await page.setInputFiles("#cv-file", "tests/fixtures/not-a-cv.pdf");
  await expect(page.getByText("does not look like a valid PDF")).toBeVisible();

  await page.fill("#full_name", "E2E Candidate");
  await page.fill("#email", `e2e.candidate.${Date.now()}@example.com`);
  await page.fill("#location", "Manchester, UK");
  await page.fill("#job_title", "Senior Platform Engineer");
  await page.fill("#years_experience", "8");
  await page.click("text=1 Month");
  await page.check('input[name=work_modes][value=hybrid]');
  await page.fill("#skill-input", "Kubernetes");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Senior Platform Engineer").last()).toBeVisible(); // live employer-view preview

  // missing upload + consents -> validation
  await page.click('button:has-text("Submit CV")');
  await expect(page.locator(".tv-error").first()).toBeVisible();

  await page.setInputFiles("#cv-file", "tests/fixtures/cv-sample.docx");
  await expect(page.getByText("Uploaded securely")).toBeVisible();
  for (const n of ["consent_data_processing", "consent_anonymised_marketplace", "consent_contact"]) await page.check(`input[name=${n}]`);
  await page.click('button:has-text("Submit CV")');
  await expect(page).toHaveURL(/\/submit-cv\/confirmation\?ref=SUB-/);
  await expect(page.locator("h1")).toContainText("Your Credentials Have Been Received, E2E");
  await expect(page.getByText(/awaiting recruiter review|structuring and anonymising/)).toBeVisible({ timeout: 30_000 });
});

test("confirmation page reveals nothing without the submission session", async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("/submit-cv/confirmation?ref=SUB-2026-1001");
  await expect(page.locator("h1")).toHaveText("Submission received");
  await expect(page.getByText("Jordan")).toHaveCount(0);
  await ctx.close();
});
