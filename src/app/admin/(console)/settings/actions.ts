"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { safeDbMessage, type ActionState } from "@/lib/action-state";
import { audit } from "@/lib/audit";
import { AuthorizationError, requireAdminAction } from "@/lib/auth";
import { siteUrl } from "@/lib/env";
import { RATE_LIMIT_MESSAGE, rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors } from "@/lib/validation";

function denied(e: unknown): ActionState {
  if (e instanceof AuthorizationError) return { ok: false, message: e.message };
  throw e;
}

export async function inviteAdmin(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let actor;
  try {
    actor = await requireAdminAction("users.manage");
  } catch (e) {
    return denied(e);
  }
  const parsed = z
    .object({ email: z.string().trim().toLowerCase().email(), full_name: z.string().trim().min(2).max(120), role: z.enum(["super_admin", "recruitment_admin"]) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please correct the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  if (!(await rateLimit("invite-admin", 20, 3600, actor.userId))) return { ok: false, message: RATE_LIMIT_MESSAGE };
  const db = createAdminClient();
  const { data, error } = await db.auth.admin.inviteUserByEmail(parsed.data.email, {
    data: { full_name: parsed.data.full_name },
    redirectTo: siteUrl("/auth/update-password"),
  });
  if (error || !data.user) return { ok: false, message: error?.code === "email_exists" ? "A user with this email already exists." : "The invitation could not be sent." };
  await db.auth.admin.updateUserById(data.user.id, { app_metadata: { tv_role: parsed.data.role } });
  await db.from("profiles").update({ role: parsed.data.role, full_name: parsed.data.full_name }).eq("id", data.user.id);
  await audit({ actorId: actor.userId, actorRole: actor.role, action: "user.invited", entityType: "user", entityId: data.user.id, metadata: { role: parsed.data.role } });
  revalidatePath("/admin/settings");
  return { ok: true, message: `Invitation sent to ${parsed.data.email}.` };
}

export async function setUserAccess(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdminAction("users.manage");
  } catch (e) {
    return denied(e);
  }
  const parsed = z
    .object({ user_id: z.string().uuid(), role: z.enum(["super_admin", "recruitment_admin"]), status: z.enum(["active", "suspended"]) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Invalid request." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_user_access", { p_user_id: parsed.data.user_id, p_role: parsed.data.role, p_status: parsed.data.status });
  if (error) return { ok: false, message: safeDbMessage(error) };
  const db = createAdminClient();
  // Mirror into Supabase Auth: a suspended account cannot sign in or refresh its session.
  await db.auth.admin.updateUserById(parsed.data.user_id, {
    app_metadata: { tv_role: parsed.data.role },
    ban_duration: parsed.data.status === "suspended" ? "876000h" : "none",
  });
  revalidatePath("/admin/settings");
  return { ok: true, message: "Access updated." };
}

const settingsSchema = z.object({
  contact_email: z.string().trim().email().or(z.literal("")),
  contact_phone: z.string().trim().max(40),
  contact_address: z.string().trim().max(300),
  contact_hours: z.string().trim().max(100),
  admin_notification_emails: z.string().trim().max(1000),
  employer_registration_open: z.string().optional(),
  auto_process_cvs: z.string().optional(),
});

export async function updatePlatformSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdminAction("settings.manage");
  } catch (e) {
    return denied(e);
  }
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please correct the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;
  const emails = d.admin_notification_emails.split(/[\s,]+/).filter(Boolean);
  if (emails.some((e) => !z.string().email().safeParse(e).success)) return { ok: false, message: "Notification recipients must be valid email addresses.", fieldErrors: { admin_notification_emails: ["Invalid email address"] } };
  const supabase = await createClient();
  const updates: [string, Json][] = [
    ["contact", { email: d.contact_email, phone: d.contact_phone, address: d.contact_address, hours: d.contact_hours }],
    ["admin_notification_emails", emails],
    ["employer_registration_open", d.employer_registration_open === "on"],
    ["auto_process_cvs", d.auto_process_cvs === "on"],
  ];
  for (const [key, value] of updates) {
    const { error } = await supabase.rpc("admin_update_setting", { p_key: key, p_value: value });
    if (error) return { ok: false, message: safeDbMessage(error) };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Platform settings saved." };
}

export async function setContactMessageStatus(formData: FormData) {
  await requireAdminAction();
  const supabase = await createClient();
  const status = z.enum(["new", "handled", "spam"]).parse(formData.get("status"));
  await supabase.from("contact_messages").update({ status }).eq("id", z.string().uuid().parse(formData.get("id")));
  revalidatePath("/admin/settings");
}

export async function updateOwnName(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireAdminAction();
  const name = z.string().trim().min(2).max(120).safeParse(formData.get("full_name"));
  if (!name.success) return { ok: false, message: "Enter your name." };
  const supabase = await createClient();
  await supabase.from("profiles").update({ full_name: name.data, job_title: String(formData.get("job_title") ?? "").slice(0, 120) || null }).eq("id", actor.userId);
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Saved." };
}
