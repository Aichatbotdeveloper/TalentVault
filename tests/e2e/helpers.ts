import { createClient } from "@supabase/supabase-js";
import { expect, type Page } from "@playwright/test";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

export const PASSWORD = process.env.SEED_PASSWORD ?? "TalentVault-Dev-2026";
export const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

export async function resetRateLimits() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !/127\.0\.0\.1|localhost/.test(url)) return;
  await createClient(url, key).from("rate_limits").delete().neq("key", "");
}

export async function login(page: Page, email: string, area: "employer" | "admin" = "employer") {
  await resetRateLimits();
  await page.goto(area === "admin" ? "/admin/login" : "/login");
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await page.click('button:has-text("Sign In")');
  await expect(page).toHaveURL(area === "admin" ? /\/admin$/ : /\/portal/);
}

export const formError = (page: Page) => page.locator("div[role=alert].bg-error-container");

/** Latest link to /auth/confirm in the Mailpit inbox for this recipient. */
export async function confirmationLink(to: string): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
    const list = (await res.json()) as { messages?: { ID: string }[] };
    const id = list.messages?.[0]?.ID;
    if (id) {
      const msg = (await (await fetch(`${MAILPIT}/api/v1/message/${id}`)).json()) as { HTML: string };
      const m = msg.HTML.match(/href="([^"]*\/auth\/confirm[^"]*)"/);
      if (m) return m[1]!.replace(/&amp;/g, "&");
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`No confirmation email for ${to}`);
}
