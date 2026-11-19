"use server";

import { createClient as createPlainClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { safeDbMessage, type ActionState } from "@/lib/action-state";
import { audit } from "@/lib/audit";
import { AuthorizationError, requireEmployerAction } from "@/lib/auth";
import { notifyAdmins } from "@/lib/notifications";
import { RATE_LIMIT_MESSAGE, rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { enquirySchema, fieldErrors, passwordSchema } from "@/lib/validation";

function denied(err: unknown): ActionState {
  if (err instanceof AuthorizationError) return { ok: false, message: err.message };
  throw err;
}

export async function createEnquiry(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let profile;
  try {
    profile = await requireEmployerAction({ approved: true });
  } catch (e) {
    return denied(e);
  }
  const parsed = enquirySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please correct the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  if (!(await rateLimit("enquiry", 20, 3600, profile.userId))) return { ok: false, message: RATE_LIMIT_MESSAGE };

  const d = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_enquiry", {
    p_candidate_ref: d.candidate_ref,
    p_role_title: d.role_title,
    p_requirement: d.requirement,
    p_salary_offer: d.salary_offer ?? undefined,
    p_contact_phone: d.contact_phone ?? undefined,
  });
  if (error || !data) return { ok: false, message: safeDbMessage(error, "We could not submit your enquiry. Please try again.") };
  const result = data as { id: string; ref: string };

  after(() =>
    notifyAdmins({
      type: "enquiry.created",
      title: `New enquiry ${result.ref} for Candidate #${d.candidate_ref}`,
      body: `${profile.employer?.company_name ?? "An employer"} submitted an enquiry for the role "${d.role_title}".`,
      link: `/admin/enquiries?selected=${result.id}`,
    }),
  );
  revalidatePath("/portal", "layout");
  return { ok: true, message: `Enquiry ${result.ref} submitted. Our team will be in touch shortly.`, data: { ref: result.ref } };
}

export async function toggleShortlist(formData: FormData) {
  const profile = await requireEmployerAction({ approved: true });
  const candidateId = z.string().uuid().parse(formData.get("candidate_id"));
  const supabase = await createClient();
  const { data: existing } = await supabase.from("shortlists").select("candidate_id").eq("candidate_id", candidateId).maybeSingle();
  if (existing) {
    await supabase.from("shortlists").delete().eq("candidate_id", candidateId).eq("employer_id", profile.employerId!);
  } else {
    await supabase.from("shortlists").insert({ candidate_id: candidateId, employer_id: profile.employerId!, created_by: profile.userId });
  }
  revalidatePath("/portal", "layout");
}

export async function postEnquiryMessage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let profile;
  try {
    profile = await requireEmployerAction({ approved: true });
  } catch (e) {
    return denied(e);
  }
  const parsed = z.object({ enquiry_id: z.string().uuid(), body: z.string().trim().min(2).max(4000) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please enter a message." };
  if (!(await rateLimit("enquiry-message", 30, 3600, profile.userId))) return { ok: false, message: RATE_LIMIT_MESSAGE };
  const supabase = await createClient();
  const { error } = await supabase.rpc("employer_post_enquiry_message", { p_enquiry_id: parsed.data.enquiry_id, p_body: parsed.data.body });
  if (error) return { ok: false, message: safeDbMessage(error) };
  const { data: enq } = await supabase.from("enquiries").select("ref, assigned_admin_id").eq("id", parsed.data.enquiry_id).single();
  after(() =>
    notifyAdmins(
      {
        type: "enquiry.message",
        title: `New employer message on ${enq?.ref ?? "an enquiry"}`,
        body: `${profile.employer?.company_name ?? "The employer"} added a message.`,
        link: `/admin/enquiries?selected=${parsed.data.enquiry_id}`,
      },
      enq?.assigned_admin_id ? { onlyAdminIds: [enq.assigned_admin_id] } : {},
    ),
  );
  revalidatePath("/portal/enquiries", "layout");
  return { ok: true, message: "Message sent to the TalentVault team." };
}

export async function withdrawEnquiry(formData: FormData) {
  await requireEmployerAction({ approved: true });
  const id = z.string().uuid().parse(formData.get("enquiry_id"));
  const supabase = await createClient();
  await supabase.rpc("employer_withdraw_enquiry", { p_enquiry_id: id });
  revalidatePath("/portal", "layout");
}

const companySchema = z.object({
  company_name: z.string().trim().min(2).max(200),
  company_number: z.string().trim().max(40).optional(),
  vat_number: z.string().trim().max(40).optional(),
  website: z.string().trim().max(200).optional(),
  industry: z.string().trim().max(100).optional(),
  company_size: z.string().trim().max(40).optional(),
  address_line: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  country: z.string().trim().max(100).optional(),
  description: z.string().trim().max(2000).optional(),
  hiring_needs: z.string().trim().max(2000).optional(),
});

export async function updateCompany(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let profile;
  try {
    profile = await requireEmployerAction();
  } catch (e) {
    return denied(e);
  }
  if (profile.employerRole !== "owner") return { ok: false, message: "Only the account owner can edit company details." };
  const parsed = companySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please correct the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const n = (v: string | undefined) => (v ? v : null);
  const d = parsed.data;
  const clean = {
    company_name: d.company_name,
    company_number: n(d.company_number),
    vat_number: n(d.vat_number),
    website: n(d.website),
    industry: n(d.industry),
    company_size: n(d.company_size),
    address_line: n(d.address_line),
    city: n(d.city),
    country: n(d.country),
    description: n(d.description),
    hiring_needs: n(d.hiring_needs),
  };
  const supabase = await createClient();
  const { error } = await supabase.from("employers").update(clean).eq("id", profile.employerId!);
  if (error) return { ok: false, message: safeDbMessage(error) };
  await audit({ actorId: profile.userId, actorRole: "employer", action: "employer.profile_updated", entityType: "employer", entityId: profile.employerId });
  revalidatePath("/portal", "layout");
  return { ok: true, message: "Company profile saved." };
}

export async function updateMyProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let profile;
  try {
    profile = await requireEmployerAction();
  } catch (e) {
    return denied(e);
  }
  const parsed = z
    .object({ full_name: z.string().trim().min(2).max(120), job_title: z.string().trim().max(120).optional(), phone: z.string().trim().max(30).optional() })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please correct the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.full_name, job_title: parsed.data.job_title || null, phone: parsed.data.phone || null })
    .eq("id", profile.userId);
  if (error) return { ok: false, message: safeDbMessage(error) };
  revalidatePath("/portal", "layout");
  return { ok: true, message: "Your details have been saved." };
}

/** Password change for any signed-in user; verifies the current password first. */
export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user?.email) return { ok: false, message: "Please sign in again." };
  const parsed = z
    .object({ current_password: z.string().min(1, "Enter your current password"), password: passwordSchema, confirm_password: z.string() })
    .refine((d) => d.password === d.confirm_password, { path: ["confirm_password"], message: "Passwords do not match" })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please correct the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  if (!(await rateLimit("change-password", 5, 900, auth.user.id))) return { ok: false, message: RATE_LIMIT_MESSAGE };

  const verifier = createPlainClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: verifyError } = await verifier.auth.signInWithPassword({ email: auth.user.email, password: parsed.data.current_password });
  if (verifyError) return { ok: false, message: "Your current password is incorrect.", fieldErrors: { current_password: ["Incorrect password"] } };
  await verifier.auth.signOut();

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, message: error.code === "same_password" ? "Choose a different password." : "We could not update your password." };
  await audit({ actorId: auth.user.id, action: "auth.password_changed", entityType: "user", entityId: auth.user.id });
  return { ok: true, message: "Password updated." };
}
