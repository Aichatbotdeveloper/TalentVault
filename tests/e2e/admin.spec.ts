import { expect, test } from "@playwright/test";
import { resetRateLimits } from "./helpers";

test.beforeEach(() => resetRateLimits());
import { login } from "./helpers";

test("recruiter reviews, signs off and publishes a processed CV", async ({ page }) => {
  // create a fresh submission
  await page.goto("/submit-cv");
  await page.fill("#full_name", "Review Flow Candidate");
  await page.fill("#email", `review.${Date.now()}@example.com`);
  await page.fill("#location", "Leeds, UK");
  await page.fill("#job_title", "Data Platform Engineer");
  await page.fill("#years_experience", "6");
  await page.click("text=Immediate");
  await page.check('input[name=work_modes][value=remote]');
  await page.setInputFiles("#cv-file", "tests/fixtures/cv-sample.pdf");
  await expect(page.getByText("Uploaded securely")).toBeVisible();
  for (const n of ["consent_data_processing", "consent_anonymised_marketplace", "consent_contact"]) await page.check(`input[name=${n}]`);
  await page.click('button:has-text("Submit CV")');
  await expect(page.getByText("awaiting recruiter review")).toBeVisible({ timeout: 30_000 });
  const ref = (await page.locator("text=/ID: TV-\\d+/").innerText()).replace("ID: ", "");

  await login(page, "recruiter@talentvault.local", "admin");
  await page.goto(`/admin/candidates?q=${ref}`);
  await page.getByRole("link", { name: `#${ref}` }).click();
  await page.getByRole("link", { name: /Review & edit profile/ }).click();
  await expect(page.getByText("Local development adapter — not AI analysis.")).toBeVisible();

  // placeholder summaries cannot be approved
  await page.check("input[name=confirm_sanitised]");
  await page.check("input[name=confirm_details]");
  await page.click('button:has-text("Approve & Publish")');
  await expect(page.getByText("Replace the local-development placeholder")).toBeVisible();

  await page.fill("#headline", "Data Platform Engineer (Cloud & Kubernetes)");
  await page.fill("#summary", "Data platform engineer with six years of experience building cloud infrastructure, CI/CD pipelines and observability tooling for payments organisations.");
  await page.click('button:has-text("Save Draft")');
  await expect(page.getByText("Profile saved.")).toBeVisible();

  await page.click('button:has-text("Approve & Publish")'); // sign-off checkboxes were reset → must confirm again
  await expect(page.getByText("Confirm both reviewer sign-off checks")).toBeVisible();
  await page.check("input[name=confirm_sanitised]");
  await page.check("input[name=confirm_details]");
  await page.click('button:has-text("Approve & Publish")');
  await expect(page.getByRole("button", { name: "Unpublish" })).toBeVisible();

  // now visible to an approved employer
  await page.context().clearCookies();
  await login(page, "employer@example.com");
  await page.goto(`/portal/candidates/${ref}`);
  await expect(page.locator("h1")).toContainText("Data Platform Engineer (Cloud & Kubernetes)");
  await expect(page.getByText("Review Flow Candidate")).toHaveCount(0);
});

test("admin console pages render", async ({ page }) => {
  await login(page, "admin@talentvault.local", "admin");
  for (const path of ["/admin", "/admin/candidates", "/admin/processing", "/admin/employers", "/admin/enquiries", "/admin/content", "/admin/settings?tab=users", "/admin/settings?tab=platform", "/admin/settings?tab=audit"]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
    await expect(page.locator("h1").first()).toBeVisible();
  }
});

test("CMS edits publish to the live site", async ({ page }) => {
  await login(page, "admin@talentvault.local", "admin");
  await page.goto("/admin/content?page=contact&section=main");
  const heading = `Contact Us ${Date.now()}`;
  await page.locator('label:has-text("Heading") input').fill(heading);
  page.once("dialog", (d) => d.accept());
  await page.click('button:has-text("Publish to Live")');
  await expect(page.getByText("Published to the live website.")).toBeVisible();
  await page.goto("/contact");
  await expect(page.locator("h1")).toHaveText(heading);
  // restore
  await page.goto("/admin/content?page=contact&section=main");
  await page.locator('label:has-text("Heading") input').fill("Contact Us");
  page.once("dialog", (d) => d.accept());
  await page.click('button:has-text("Publish to Live")');
  await expect(page.getByText("Published to the live website.")).toBeVisible();
});
