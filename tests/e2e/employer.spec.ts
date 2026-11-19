import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { config } from "dotenv";
import { confirmationLink, formError, login, PASSWORD } from "./helpers";

config({ path: ".env.local", quiet: true });

test("employer registers, verifies email, is gated until approved, then searches and enquires", async ({ page }) => {
  const email = `e2e.employer.${Date.now()}@example.com`;
  await page.goto("/employer/register");
  await page.fill("#full_name", "E2E Hiring Manager");
  await page.fill("#job_title", "Head of Talent");
  await page.fill("#email", email);
  await page.fill("#company_name", "E2E Test Holdings (Demo)");
  await page.fill("#password", "weak");
  await page.fill("#confirm_password", "weak");
  await page.check('input[name="accept_terms"]');
  await page.click('button:has-text("Create Employer Account")');
  await expect(page.getByText("Use at least 10 characters")).toBeVisible();
  await expect(page.locator("#company_name")).toHaveValue("E2E Test Holdings (Demo)"); // values preserved on error

  await page.fill("#password", PASSWORD);
  await page.fill("#confirm_password", PASSWORD);
  await page.check('input[name="accept_terms"]');
  await page.click('button:has-text("Create Employer Account")');
  await expect(page).toHaveURL(/check-email/);

  // cannot sign in before verifying
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await page.click('button:has-text("Sign In")');
  await expect(formError(page)).toContainText("confirm your email");

  // verify through the real email link (Mailpit)
  await page.goto(await confirmationLink(email));
  await expect(page).toHaveURL(/\/portal\?verified=1/);
  await expect(page.getByText("Your organisation is being verified")).toBeVisible();

  // server-side gate (not just navigation)
  await page.goto("/portal/candidates");
  await expect(page).toHaveURL(/\/portal\?gate=approval/);

  // an administrator approves the organisation
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: prof } = await db.from("profiles").select("employer_id").eq("email", email).single();
  await db.from("employers").update({ status: "approved" }).eq("id", prof!.employer_id);

  await page.goto("/portal/candidates?skill=Kubernetes&work_mode=remote");
  await expect(page.getByText(/Showing \d+ anonymised candidate/)).toBeVisible();
  await page.locator("article a", { hasText: "Enquire About Candidate" }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.fill("#role_title", "Lead Platform Engineer");
  await page.fill("#requirement", "Leading our cloud platform team through a Kubernetes migration, hybrid in London.");
  await page.click('button:has-text("Submit Enquiry")');
  await expect(page.getByText("Enquiry submitted")).toBeVisible();
  await page.getByRole("link", { name: "View in My Enquiries" }).click();
  await expect(page.getByText("Lead Platform Engineer").first()).toBeVisible();

  await db.auth.admin.deleteUser((await db.from("profiles").select("id").eq("email", email).single()).data!.id);
  await db.from("employers").delete().eq("id", prof!.employer_id);
});

test("search filters narrow results and profiles hide identity", async ({ page }) => {
  await login(page, "employer@example.com");
  await page.goto("/portal/candidates?q=machine%20learning");
  await expect(page.getByText("Showing 1 anonymised candidate")).toBeVisible();
  await page.goto("/portal/candidates?salary_min=200000");
  await expect(page.getByText("No candidates match these filters")).toBeVisible();
  await page.goto("/portal/candidates");
  await page.locator("article h2 a").first().click();
  await expect(page.getByText("Ready to Connect?")).toBeVisible();
  await expect(page.getByText(/Sample Candidate \d/)).toHaveCount(0);
  await expect(page.getByText(/sample\.candidate\d@example\.com/)).toHaveCount(0);
});
