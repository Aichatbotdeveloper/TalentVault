"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { safeDbMessage, type ActionState } from "@/lib/action-state";
import { audit } from "@/lib/audit";
import { AuthorizationError, requireAdminAction } from "@/lib/auth";
import { autoProcessEnabled, finaliseUploadedCv, removeStoredCv } from "@/lib/cv/intake";
import { processQueuedJobs } from "@/lib/cv/processor";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { CONSENT_TEXT, fieldErrors } from "@/lib/validation";

function fail(err: unknown): ActionState {
  if (err instanceof AuthorizationError) return { ok: false, message: err.message };
  console.error("[admin/candidates]", err);
  return { ok: false, message: "Something went wrong. Please try again." };
}
const uuid = z.string().uuid();
const lines = (v: FormDataEntryValue | null) => String(v ?? "").split(/\r?\n|,/).map((x) => x.trim()).filter(Boolean);

function revalidateCandidate(id: string) {
  revalidatePath(`/admin/candidates/${id}`, "layout");
  revalidatePath("/admin/candidates");
  revalidatePath("/admin/processing");
  revalidatePath("/portal/candidates", "layout");
}

/** Save the anonymous profile (and history) atomically. Accepts the review editor's JSON payload. */
export async function saveAnonymousProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdminAction("candidates.manage");
    const id = uuid.parse(formData.get("candidate_id"));
    const schema = z.object({
      headline: z.string().trim().min(3, "Headline is required").max(160),
      job_title: z.string().trim().max(120),
      seniority: z.string().trim().max(60),
      summary: z.string().trim().min(40, "Summary should be at least 40 characters").max(2000),
      years_experience: z.union([z.literal(""), z.coerce.number().int().min(0).max(60)]),
      location_region: z.string().trim().max(120),
      salary_min: z.union([z.literal(""), z.coerce.number().int().min(0).max(5_000_000)]),
      salary_max: z.union([z.literal(""), z.coerce.number().int().min(0).max(5_000_000)]),
      availability: z.enum(["", "immediate", "two_weeks", "one_month", "three_months", "not_looking"]),
      notice_period: z.string().trim().max(80),
    });
    const parsed = schema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { ok: false, message: "Please correct the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
    const d = parsed.data;
    if (d.salary_min !== "" && d.salary_max !== "" && d.salary_min > d.salary_max) {
      return { ok: false, message: "Salary minimum must not exceed the maximum.", fieldErrors: { salary_max: ["Must be at least the minimum"] } };
    }
    const history = z
      .object({
        experience: z.array(z.record(z.string(), z.unknown())).max(20),
        education: z.array(z.record(z.string(), z.unknown())).max(12),
        certifications: z.array(z.record(z.string(), z.unknown())).max(20),
      })
      .safeParse(JSON.parse(String(formData.get("history_json") ?? "{}")));
    if (!history.success) return { ok: false, message: "Career history could not be read." };

    const supabase = await createClient();
    const { error } = await supabase.rpc("admin_save_candidate_profile", {
      p_candidate_id: id,
      p: {
        ...d,
        years_experience: d.years_experience === "" ? "" : String(d.years_experience),
        salary_min: d.salary_min === "" ? "" : String(d.salary_min),
        salary_max: d.salary_max === "" ? "" : String(d.salary_max),
        work_modes: formData.getAll("work_modes").map(String).filter((m) => ["remote", "hybrid", "onsite"].includes(m)),
        skills: lines(formData.get("skills")).slice(0, 40),
        industries: lines(formData.get("industries")).slice(0, 10),
        highlights: String(formData.get("highlights") ?? "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean).slice(0, 8),
        ...history.data,
      } as Json,
    });
    if (error) return { ok: false, message: safeDbMessage(error) };
    revalidateCandidate(id);
    return { ok: true, message: "Profile saved." };
  } catch (e) {
    return fail(e);
  }
}

export async function savePrivateDetails(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const profile = await requireAdminAction("candidates.manage");
    const id = uuid.parse(formData.get("candidate_id"));
    const parsed = z
      .object({
        full_name: z.string().trim().min(2).max(120),
        email: z.string().trim().toLowerCase().email(),
        phone: z.string().trim().max(30),
        location_full: z.string().trim().max(160),
        linkedin_url: z.string().trim().max(200),
        right_to_work: z.string().trim().max(120),
        internal_notes: z.string().trim().max(4000),
      })
      .safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { ok: false, message: "Please correct the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
    const n = (v: string) => (v ? v : null);
    const d = parsed.data;
    const supabase = await createClient();
    const { error } = await supabase
      .from("candidate_private")
      .update({ full_name: d.full_name, email: d.email, phone: n(d.phone), location_full: n(d.location_full), linkedin_url: n(d.linkedin_url), right_to_work: n(d.right_to_work), internal_notes: n(d.internal_notes) })
      .eq("candidate_id", id);
    if (error) return { ok: false, message: safeDbMessage(error) };
    await audit({ actorId: profile.userId, actorRole: profile.role, action: "candidate.private_updated", entityType: "candidate", entityId: id });
    revalidateCandidate(id);
    return { ok: true, message: "Private record saved." };
  } catch (e) {
    return fail(e);
  }
}

/** Human sign-off: requires both reviewer confirmations, then approves (and optionally publishes). */
export async function approveCandidate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdminAction("candidates.manage");
    const id = uuid.parse(formData.get("candidate_id"));
    if (formData.get("confirm_sanitised") !== "on" || formData.get("confirm_details") !== "on") {
      return { ok: false, message: "Confirm both reviewer sign-off checks before approving.", fieldErrors: { signoff: ["Both confirmations are required"] } };
    }
    const supabase = await createClient();
    const { data: prof } = await supabase.from("candidate_profiles").select("summary").eq("candidate_id", id).single();
    if (prof?.summary?.includes("[LOCAL DEVELOPMENT PLACEHOLDER")) {
      return { ok: false, message: "Replace the local-development placeholder summary with a reviewed summary (and Save Draft) before approving." };
    }
    const { error } = await supabase.rpc("approve_candidate_review", { p_candidate_id: id });
    if (error) return { ok: false, message: safeDbMessage(error) };
    if (formData.get("publish") === "1") {
      const { error: pubErr } = await supabase.rpc("set_candidate_publication", { p_candidate_id: id, p_publish: true });
      if (pubErr) {
        revalidateCandidate(id);
        return { ok: false, message: `Approved, but not published: ${safeDbMessage(pubErr)}` };
      }
    }
    revalidateCandidate(id);
    return { ok: true, message: formData.get("publish") === "1" ? "Approved and published to the employer marketplace." : "Profile approved. It can now be published." };
  } catch (e) {
    return fail(e);
  }
}

export async function setPublication(formData: FormData) {
  await requireAdminAction("candidates.publish");
  const id = uuid.parse(formData.get("candidate_id"));
  const publish = formData.get("publish") === "1";
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_candidate_publication", { p_candidate_id: id, p_publish: publish });
  if (error) redirect(`/admin/candidates/${id}?error=${encodeURIComponent(safeDbMessage(error))}`);
  revalidateCandidate(id);
}

export async function setArchived(formData: FormData) {
  await requireAdminAction("candidates.manage");
  const id = uuid.parse(formData.get("candidate_id"));
  const supabase = await createClient();
  await supabase.rpc("set_candidate_archived", { p_candidate_id: id, p_archived: formData.get("archive") === "1" });
  revalidateCandidate(id);
}

export async function requestReprocess(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdminAction("candidates.manage");
    const id = uuid.parse(formData.get("candidate_id"));
    const instructions = String(formData.get("instructions") ?? "").slice(0, 2000);
    const supabase = await createClient();
    const { error } = await supabase.rpc("request_cv_reprocess", { p_candidate_id: id, p_instructions: instructions });
    if (error) return { ok: false, message: safeDbMessage(error) };
    after(() => processQueuedJobs({ maxJobs: 1 }).then(() => undefined));
    revalidateCandidate(id);
    return { ok: true, message: "Reprocessing queued. Refresh in a moment to see the new results." };
  } catch (e) {
    return fail(e);
  }
}

export async function assignCandidate(formData: FormData) {
  await requireAdminAction("candidates.manage");
  const id = uuid.parse(formData.get("candidate_id"));
  const adminId = String(formData.get("admin_id") ?? "");
  const supabase = await createClient();
  await supabase.rpc("assign_candidate", { p_candidate_id: id, p_admin_id: adminId ? adminId : (null as unknown as string) });
  revalidateCandidate(id);
}

export async function batchCandidates(formData: FormData) {
  const op = String(formData.get("op"));
  const ids = formData.getAll("ids").map(String).filter((x) => uuid.safeParse(x).success).slice(0, 100);
  await requireAdminAction(op === "publish" || op === "unpublish" ? "candidates.publish" : "candidates.manage");
  const supabase = await createClient();
  const errors: string[] = [];
  for (const id of ids) {
    const { error } =
      op === "publish" || op === "unpublish"
        ? await supabase.rpc("set_candidate_publication", { p_candidate_id: id, p_publish: op === "publish" })
        : op === "archive"
          ? await supabase.rpc("set_candidate_archived", { p_candidate_id: id, p_archived: true })
          : op === "assign_me"
            ? await supabase.rpc("assign_candidate", { p_candidate_id: id, p_admin_id: (await supabase.auth.getUser()).data.user!.id })
            : { error: null };
    if (error) errors.push(error.message);
  }
  revalidatePath("/admin/candidates");
  revalidatePath("/portal/candidates", "layout");
  const qs = new URLSearchParams({ batch: `${ids.length - errors.length}/${ids.length}` });
  if (errors.length) qs.set("batch_error", errors[0]!.slice(0, 150));
  redirect(`/admin/candidates?${qs.toString()}`);
}

/** Permanent erasure (right to be forgotten). Super administrators only. */
export async function eraseCandidate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const profile = await requireAdminAction("candidates.erase");
    const id = uuid.parse(formData.get("candidate_id"));
    const db = createAdminClient();
    const { data: cand } = await db.from("candidates").select("ref").eq("id", id).single();
    if (!cand || formData.get("confirm_ref") !== cand.ref) return { ok: false, message: `Type ${cand?.ref ?? "the candidate reference"} to confirm erasure.` };
    const { data: docs } = await db.from("candidate_documents").select("storage_path").eq("candidate_id", id);
    if (docs?.length) await db.storage.from("cvs").remove(docs.map((d) => d.storage_path));
    const { error } = await db.from("candidates").delete().eq("id", id);
    if (error) return { ok: false, message: "Erasure failed. Please try again." };
    await audit({ actorId: profile.userId, actorRole: profile.role, action: "candidate.erased", entityType: "candidate", entityId: id, metadata: { ref: cand.ref, documents_removed: docs?.length ?? 0 } });
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/admin/candidates");
  revalidatePath("/portal/candidates", "layout");
  redirect("/admin/candidates?erased=1");
}

/** Recruiter upload on behalf of a candidate. Consent must have been obtained and is recorded as such. */
export async function adminCreateCandidate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let created: { candidate_id: string } | null = null;
  try {
    const profile = await requireAdminAction("candidates.manage");
    const parsed = z
      .object({
        full_name: z.string().trim().max(120),
        email: z.string().trim().toLowerCase().max(254).refine((v) => !v || z.string().email().safeParse(v).success, "Enter a valid email"),
        phone: z.string().trim().max(30),
        location: z.string().trim().max(120),
        job_title: z.string().trim().max(120),
        upload_path: z.string().regex(/^incoming\/[0-9a-f-]{36}\.(pdf|docx|doc)$/, "Upload a CV first"),
        original_filename: z.string().min(1).max(200),
        consent_confirmed: z.literal("on", { message: "Confirm the candidate's consent before uploading" }),
        consent_source: z.string().trim().min(5, "Describe how consent was obtained").max(500),
      })
      .safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { ok: false, message: "Please correct the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
    const d = parsed.data;
    const stored = await finaliseUploadedCv(d.upload_path, d.original_filename);
    if (!stored.ok) return { ok: false, message: stored.error };
    const auto = await autoProcessEnabled();
    const { data, error } = await createAdminClient().rpc("create_candidate_submission", {
      p: {
        source: "admin_upload",
        auto_process: auto,
        uploaded_by: profile.userId,
        full_name: d.full_name,
        email: d.email,
        phone: d.phone || null,
        location: d.location || null,
        location_region: d.location || null,
        job_title: d.job_title || null,
        ...stored.document,
        policy_version: "recruiter-recorded",
        consents: (["data_processing", "anonymised_marketplace", "contact_for_introductions"] as const).map((t) => ({
          type: t,
          granted: true,
          text: `${CONSENT_TEXT[t]} [Recorded by recruiter: ${d.consent_source}]`,
        })),
      } as Json,
    });
    if (error || !data) {
      await removeStoredCv(stored.document.storage_path);
      return { ok: false, message: "Could not create the candidate record." };
    }
    created = data as { candidate_id: string };
    if (auto) after(() => processQueuedJobs({ maxJobs: 1 }).then(() => undefined));
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/admin/candidates");
  redirect(`/admin/candidates/${created!.candidate_id}?created=1`);
}

export async function runQueueNow() {
  await requireAdminAction("candidates.manage");
  await processQueuedJobs({ maxJobs: 3, timeBudgetMs: 200_000 });
  revalidatePath("/admin/processing");
}
