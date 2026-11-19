"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { audit } from "@/lib/audit";
import { siteUrl } from "@/lib/env";
import { notifyAdmins } from "@/lib/notifications";
import { RATE_LIMIT_MESSAGE, rateLimit } from "@/lib/rate-limit";
import { clientIpHash } from "@/lib/request";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { employerRegistrationSchema, fieldErrors, loginSchema, passwordSchema } from "@/lib/validation";
import { z } from "zod";

function safeNext(next: FormDataEntryValue | null, fallback: string) {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/\\") ? n : fallback;
}

async function signIn(formData: FormData, area: "employer" | "admin"): Promise<ActionState | { redirectTo: string }> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Enter your email and password.", fieldErrors: fieldErrors(parsed.error) };
  const { email, password } = parsed.data;
  const ipOk = await rateLimit(`login-${area}`, 20, 900);
  const emailOk = await rateLimit(`login-${area}-email`, 8, 900, email);
  if (!ipOk || !emailOk) return { ok: false, message: RATE_LIMIT_MESSAGE };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    if (error?.code === "email_not_confirmed") {
      return { ok: false, message: "Please confirm your email address first. Check your inbox for the verification link.", data: { unconfirmed: true } };
    }
    await audit({ action: `auth.${area}_login_failed`, entityType: "auth", metadata: { reason: error?.code ?? "unknown" } });
    return { ok: false, message: "Incorrect email or password." };
  }

  const { data: profile } = await supabase.from("profiles").select("role, status").eq("id", data.user.id).single();
  const isAdmin = profile?.role === "super_admin" || profile?.role === "recruitment_admin";
  if (!profile || profile.status !== "active") {
    await supabase.auth.signOut();
    return { ok: false, message: "This account has been suspended. Please contact TalentVault." };
  }
  if (area === "admin" && !isAdmin) {
    await supabase.auth.signOut();
    return { ok: false, message: "This account does not have administrator access." };
  }
  await supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", data.user.id);
  await audit({ actorId: data.user.id, actorRole: profile.role, action: `auth.${area}_login`, entityType: "auth" });
  if (area === "admin") return { redirectTo: "/admin" };
  return { redirectTo: isAdmin ? "/admin" : safeNext(formData.get("next"), "/portal") };
}

export async function employerLogin(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const r = await signIn(formData, "employer");
  if ("redirectTo" in r) redirect(r.redirectTo);
  return r;
}

export async function adminLogin(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const r = await signIn(formData, "admin");
  if ("redirectTo" in r) redirect(r.redirectTo);
  return r;
}

export async function registerEmployer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { data: setting } = await createAdminClient().from("site_settings").select("value").eq("key", "employer_registration_open").maybeSingle();
  if (setting?.value === false) return { ok: false, message: "Employer registration is currently closed. Please contact us to request access." };

  const parsed = employerRegistrationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please correct the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  if (!(await rateLimit("register", 5, 3600))) return { ok: false, message: RATE_LIMIT_MESSAGE };

  const d = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: d.email,
    password: d.password,
    options: {
      emailRedirectTo: siteUrl("/auth/confirm?next=/portal"),
      data: {
        full_name: d.full_name,
        job_title: d.job_title,
        phone: d.phone ?? "",
        company_name: d.company_name,
        company_number: d.company_number ?? "",
        website: d.website ?? "",
        industry: d.industry ?? "",
        company_size: d.company_size ?? "",
        city: d.city ?? "",
        hiring_needs: d.hiring_needs ?? "",
      },
    },
  });
  if (error) {
    if (error.code === "weak_password") return { ok: false, message: "Please choose a stronger password.", fieldErrors: { password: [error.message] } };
    console.error("[register] signUp failed", error.code, error.message);
    return { ok: false, message: "We could not create your account. Please try again." };
  }
  // Supabase returns an obfuscated user (no identities) when the email already exists — respond identically.
  const isNew = (data.user?.identities?.length ?? 0) > 0;
  if (isNew && data.user) {
    const userId = data.user.id;
    after(async () => {
      await audit({ actorId: userId, actorRole: "employer", action: "employer.registered", entityType: "user", entityId: userId });
      await notifyAdmins({
        type: "employer.registered",
        title: "New employer registration awaiting approval",
        body: `${d.company_name} registered an employer account and is awaiting verification.`,
        link: "/admin/employers?status=pending",
      });
    });
  }
  redirect(`/auth/check-email?email=${encodeURIComponent(d.email)}`);
}

export async function resendConfirmation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = z.string().email().safeParse(formData.get("email"));
  if (!email.success) return { ok: false, message: "Enter a valid email address." };
  if (!(await rateLimit("resend-confirmation", 3, 3600, email.data.toLowerCase()))) return { ok: false, message: RATE_LIMIT_MESSAGE };
  const supabase = await createClient();
  await supabase.auth.resend({ type: "signup", email: email.data, options: { emailRedirectTo: siteUrl("/auth/confirm?next=/portal") } });
  return { ok: true, message: "If an unconfirmed account exists for that address, a new verification email has been sent." };
}

export async function requestPasswordReset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = z.string().trim().toLowerCase().email().safeParse(formData.get("email"));
  if (!email.success) return { ok: false, message: "Enter a valid email address.", fieldErrors: { email: ["Enter a valid email address"] } };
  const okIp = await rateLimit("pw-reset", 10, 3600);
  const okEmail = await rateLimit("pw-reset-email", 3, 3600, email.data);
  if (okIp && okEmail) {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: siteUrl("/auth/update-password") });
    if (error) console.error("[pw-reset]", error.code, error.message);
    await audit({ action: "auth.password_reset_requested", entityType: "auth", metadata: { ip: await clientIpHash() } });
  }
  // Same response whether or not the account exists (prevents account enumeration).
  return { ok: true, message: "If an account exists for that email, you will receive a password reset link shortly." };
}

export async function updatePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const schema = z
    .object({ password: passwordSchema, confirm_password: z.string() })
    .refine((d) => d.password === d.confirm_password, { path: ["confirm_password"], message: "Passwords do not match" });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please correct the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { ok: false, message: "Your reset link has expired. Please request a new one." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { ok: false, message: error.code === "same_password" ? "Choose a password different from your current one." : "We could not update your password. Please try again." };
  }
  await audit({ actorId: user.user.id, action: "auth.password_changed", entityType: "user", entityId: user.user.id });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.user.id).single();
  redirect(profile?.role === "employer" ? "/portal?password=updated" : "/admin?password=updated");
}

export async function signOut() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) await audit({ actorId: data.user.id, action: "auth.logout", entityType: "auth" });
  await supabase.auth.signOut();
  redirect("/login?signed_out=1");
}

export async function adminSignOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
