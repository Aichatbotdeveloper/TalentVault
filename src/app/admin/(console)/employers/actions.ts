"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { safeDbMessage, type ActionState } from "@/lib/action-state";
import { AuthorizationError, requireAdminAction } from "@/lib/auth";
import { notifyEmployer } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";

const MESSAGES = {
  approved: { title: "Your TalentVault account is approved", body: "Your organisation has been verified. You can now search anonymised candidate profiles and submit enquiries.", link: "/portal/candidates" },
  rejected: { title: "Update on your TalentVault registration", body: "We were unable to approve your organisation's registration. Please contact us if you have any questions.", link: "/portal" },
  suspended: { title: "Your TalentVault access has been suspended", body: "Access to the candidate directory has been suspended for your organisation. Please contact the TalentVault team.", link: "/portal" },
  pending: { title: "Your TalentVault account is under review", body: "Your organisation's account has been returned to review.", link: "/portal" },
} as const;

export async function setEmployerStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdminAction("employers.manage");
  } catch (e) {
    if (e instanceof AuthorizationError) return { ok: false, message: e.message };
    throw e;
  }
  const parsed = z
    .object({ employer_id: z.string().uuid(), status: z.enum(["approved", "rejected", "suspended", "pending"]), reason: z.string().trim().max(1000).optional() })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Invalid request." };
  const { employer_id, status, reason } = parsed.data;
  if ((status === "suspended" || status === "rejected") && !reason) return { ok: false, message: "Please give a reason (shared with the employer)." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_employer_status", { p_employer_id: employer_id, p_status: status, p_reason: reason ?? "" });
  if (error) return { ok: false, message: safeDbMessage(error) };
  const msg = MESSAGES[status];
  after(() => notifyEmployer(employer_id, { type: `employer.${status}`, title: msg.title, body: reason ? `${msg.body} Note: ${reason}` : msg.body, link: msg.link }));
  revalidatePath("/admin/employers");
  revalidatePath("/admin", "layout");
  return { ok: true, message: `Employer ${status === "approved" ? "approved" : status === "pending" ? "returned to review" : status}. The account holders have been notified.` };
}

export async function batchApproveEmployers(formData: FormData) {
  await requireAdminAction("employers.manage");
  const ids = formData.getAll("ids").map(String).filter((x) => z.string().uuid().safeParse(x).success);
  const supabase = await createClient();
  let ok = 0;
  for (const id of ids) {
    const { data: e } = await supabase.from("employers").select("status").eq("id", id).single();
    if (e?.status !== "pending") continue;
    const { error } = await supabase.rpc("admin_set_employer_status", { p_employer_id: id, p_status: "approved", p_reason: "" });
    if (!error) {
      ok++;
      after(() => notifyEmployer(id, { type: "employer.approved", ...MESSAGES.approved }));
    }
  }
  revalidatePath("/admin/employers");
  redirect(`/admin/employers?batch=${ok}`);
}
