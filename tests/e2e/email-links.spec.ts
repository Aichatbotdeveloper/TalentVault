import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { config } from "dotenv";
import { confirmationLink, formError, login, PASSWORD, resetRateLimits } from "./helpers";

config({ path: ".env.local", quiet: true });
const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

test.beforeEach(() => resetRateLimits());

test("password reset by email link", async ({ page }) => {
  const email = `e2e.reset.${Date.now()}@example.com`;
  const { data } = await db().auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { full_name: "Reset User", company_name: "Reset Co (Demo)" } });
  try {
    const sentAfter = Date.now() - 1000;
    await page.goto("/auth/forgot-password");
    await page.fill("#email", email);
    await page.click('button:has-text("Send reset link")');
    await expect(page.getByText("If an account exists")).toBeVisible();
    await page.goto(await confirmationLink(email, { after: sentAfter }));
    await expect(page).toHaveURL(/\/auth\/update-password/);
    const newPassword = "Brand-New-Pass-2026";
    await page.fill("#password", newPassword);
    await page.fill("#confirm_password", newPassword);
    await page.click('button:has-text("Update password")');
    await expect(page).toHaveURL(/\/portal\?password=updated/);
    await page.context().clearCookies();
    await page.goto("/login");
    await page.fill("#email", email);
    await page.fill("#password", PASSWORD);
    await page.click('button:has-text("Sign In")');
    await expect(formError(page)).toContainText("Incorrect email or password");
  } finally {
    const { data: p } = await db().from("profiles").select("employer_id").eq("id", data.user!.id).single();
    await db().auth.admin.deleteUser(data.user!.id);
    if (p?.employer_id) await db().from("employers").delete().eq("id", p.employer_id);
  }
});

test("invited administrator accepts the invitation and sets a password", async ({ page, browser }) => {
  const email = `e2e.invite.${Date.now()}@example.com`;
  await login(page, "admin@talentvault.local", "admin");
  await page.goto("/admin/settings?tab=users");
  await page.fill("#full_name", "Invited Recruiter");
  await page.fill("#email", email);
  await page.click('button:has-text("Invite Admin User")');
  await expect(page.getByText(`Invitation sent to ${email}`)).toBeVisible();

  const ctx = await browser.newContext();
  const invitee = await ctx.newPage();
  await invitee.goto(await confirmationLink(email));
  await expect(invitee).toHaveURL(/\/auth\/update-password/);
  await invitee.waitForTimeout(1000); // fragment-delivered session is stored
  await invitee.fill("#password", PASSWORD);
  await invitee.fill("#confirm_password", PASSWORD);
  await invitee.click('button:has-text("Update password")');
  await expect(invitee).toHaveURL(/\/admin\?password=updated/);
  await expect(invitee.locator("h1")).toContainText("Recruitment Operations Overview");
  await ctx.close();

  const { data } = await db().from("profiles").select("id, role").eq("email", email).single();
  expect(data?.role).toBe("recruitment_admin");
  await db().auth.admin.deleteUser(data!.id);
});
