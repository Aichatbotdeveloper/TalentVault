"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { safeDbMessage, type ActionState } from "@/lib/action-state";
import { audit } from "@/lib/audit";
import { AuthorizationError, requireAdminAction } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { ENQUIRY_STATUS_LABELS } from "@/lib/format";
import { notifyEmployer, notifyUser } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";

const STATUSES = ["new", "under_review", "candidate_contacted", "candidate_consented", "introduced", "closed_placed", "closed_declined", "withdrawn"] as const;

async function guard() {
  try {
    return { profile: await requireAdminAction("enquiries.manage") };
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: { ok: false, message: e.message } as ActionState };
    throw e;
  }
}

export async function updateEnquiry(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const g = await guard();
  if (g.error) return g.error;
  const parsed = z
    .object({
      enquiry_id: z.string().uuid(),
      status: z.enum(STATUSES).or(z.literal("")).optional(),
      assigned_admin_id: z.string().optional(),
      message: z.string().trim().max(4000).optional(),
      visibility: z.enum(["internal", "employer"]).default("internal"),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Invalid request." };
  const d = parsed.data;
  const supabase = await createClient();
  const { data: before } = await supabase.from("enquiries").select("status, assigned_admin_id, employer_id, ref").eq("id", d.enquiry_id).single();
  if (!before) return { ok: false, message: "Enquiry not found." };
  const assign = d.assigned_admin_id === undefined ? undefined : d.assigned_admin_id;
  const { error } = await supabase.rpc("admin_update_enquiry", {
    p_enquiry_id: d.enquiry_id,
    p_status: d.status ? d.status : undefined,
    p_assigned_admin_id: assign ? assign : undefined,
    p_unassign: assign === "" && before.assigned_admin_id !== null,
    p_message: d.message ?? "",
    p_visibility: d.visibility,
  });
  if (error) return { ok: false, message: safeDbMessage(error) };

  const statusChanged = d.status && d.status !== before.status;
  const employerMessage = d.message && d.visibility === "employer";
  if (statusChanged || employerMessage) {
    after(() =>
      notifyEmployer(before.employer_id, {
        type: "enquiry.updated",
        title: `Update on enquiry ${before.ref}`,
        body: [statusChanged ? `Status: ${ENQUIRY_STATUS_LABELS[d.status as (typeof STATUSES)[number]]}.` : "", employerMessage ? "The TalentVault team sent you a message." : ""].filter(Boolean).join(" "),
        link: `/portal/enquiries/${before.ref}`,
      }),
    );
  }
  if (assign && assign !== before.assigned_admin_id) {
    after(() => notifyUser(assign, { type: "enquiry.assigned", title: `Enquiry ${before.ref} assigned to you`, body: "You have been assigned a candidate enquiry.", link: `/admin/enquiries?selected=${d.enquiry_id}` }));
  }
  revalidatePath("/admin/enquiries");
  revalidatePath("/portal/enquiries", "layout");
  return { ok: true, message: "Enquiry updated." };
}

/** Emails the candidate (private address) asking whether they want to be introduced. Identity is NOT shared with the employer. */
export async function sendConsentRequest(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const g = await guard();
  if (g.error) return g.error;
  const parsed = z.object({ enquiry_id: z.string().uuid(), body: z.string().trim().min(30).max(4000) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Write a message of at least 30 characters." };
  const supabase = await createClient();
  const { data: e } = await supabase.from("enquiries").select("id, ref, status, candidate_id").eq("id", parsed.data.enquiry_id).single();
  if (!e) return { ok: false, message: "Enquiry not found." };
  const { data: priv } = await supabase.from("candidate_private").select("email, full_name").eq("candidate_id", e.candidate_id).single();
  if (!priv?.email || priv.email.startsWith("(")) return { ok: false, message: "No email address on the candidate's private record." };
  const sent = await sendEmail({
    to: priv.email,
    template: "candidate.consent_request",
    subject: `An employer is interested in your profile (${e.ref})`,
    heading: `Hello ${priv.full_name.split(" ")[0]},`,
    paragraphs: [...parsed.data.body.split(/\n{2,}/), "Please reply to this email to let us know whether you would like us to share your details with this employer. We will not share your identity without your agreement."],
  });
  if (!sent) return { ok: false, message: "The email could not be sent. Check the email provider configuration." };
  const { error } = await supabase.rpc("admin_update_enquiry", {
    p_enquiry_id: e.id,
    p_status: ["new", "under_review"].includes(e.status) ? "candidate_contacted" : undefined,
    p_message: `Consent request emailed to candidate:\n\n${parsed.data.body}`,
    p_visibility: "internal",
  });
  if (error) return { ok: false, message: safeDbMessage(error) };
  revalidatePath("/admin/enquiries");
  return { ok: true, message: "Consent request sent to the candidate." };
}

export async function recordIdentityConsent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const g = await guard();
  if (g.error) return g.error;
  const parsed = z.object({ enquiry_id: z.string().uuid(), note: z.string().trim().min(10).max(1000) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Describe how and when the candidate consented (at least 10 characters)." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_record_identity_consent", { p_enquiry_id: parsed.data.enquiry_id, p_note: parsed.data.note });
  if (error) return { ok: false, message: safeDbMessage(error) };
  revalidatePath("/admin/enquiries");
  return { ok: true, message: "Candidate consent recorded. You can now make the introduction." };
}

/** Sends the employer-visible introduction (the only point where identity may be disclosed). Requires recorded consent (enforced in SQL). */
export async function makeIntroduction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const g = await guard();
  if (g.error) return g.error;
  const parsed = z.object({ enquiry_id: z.string().uuid(), body: z.string().trim().min(20).max(4000) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Write the introduction message (at least 20 characters)." };
  const supabase = await createClient();
  const { data: e } = await supabase.from("enquiries").select("ref, employer_id, candidate_id").eq("id", parsed.data.enquiry_id).single();
  if (!e) return { ok: false, message: "Enquiry not found." };
  const { error } = await supabase.rpc("admin_update_enquiry", { p_enquiry_id: parsed.data.enquiry_id, p_status: "introduced", p_message: parsed.data.body, p_visibility: "employer" });
  if (error) return { ok: false, message: safeDbMessage(error) };
  await audit({ actorId: g.profile!.userId, actorRole: g.profile!.role, action: "enquiry.introduction_made", entityType: "enquiry", entityId: parsed.data.enquiry_id, metadata: { candidate_id: e.candidate_id } });
  after(() => notifyEmployer(e.employer_id, { type: "enquiry.introduced", title: `Introduction ready for enquiry ${e.ref}`, body: "The candidate has agreed to an introduction. Open the enquiry to see the details.", link: `/portal/enquiries/${e.ref}` }));
  revalidatePath("/admin/enquiries");
  revalidatePath("/portal/enquiries", "layout");
  return { ok: true, message: "Introduction sent to the employer." };
}
