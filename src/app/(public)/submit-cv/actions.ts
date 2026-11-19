"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { autoProcessEnabled, finaliseUploadedCv, removeStoredCv } from "@/lib/cv/intake";
import { processQueuedJobs } from "@/lib/cv/processor";
import { sendEmail } from "@/lib/email";
import { notifyAdmins } from "@/lib/notifications";
import { RATE_LIMIT_MESSAGE, rateLimit } from "@/lib/rate-limit";
import { clientIpHash, userAgent } from "@/lib/request";
import { setSubmissionCookie } from "@/lib/submission-cookie";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { CONSENT_TEXT, CONSENT_VERSION, candidateSubmissionSchema, fieldErrors } from "@/lib/validation";

export async function submitCandidate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = {
    ...Object.fromEntries(formData),
    work_modes: formData.getAll("work_modes"),
    skills: formData.getAll("skills"),
  };
  const parsed = candidateSubmissionSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Please correct the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }
  if (!(await rateLimit("cv-submit", 5, 3600))) return { ok: false, message: RATE_LIMIT_MESSAGE };
  const d = parsed.data;

  const stored = await finaliseUploadedCv(d.upload_path, d.original_filename);
  if (!stored.ok) return { ok: false, message: stored.error, fieldErrors: { upload_path: [stored.error] } };

  const auto = await autoProcessEnabled();
  const ipHash = await clientIpHash();
  const { data: created, error } = await createAdminClient().rpc("create_candidate_submission", {
    p: {
      source: "portal",
      auto_process: auto,
      full_name: d.full_name,
      email: d.email,
      phone: d.phone ?? null,
      location: d.location,
      location_region: d.location,
      linkedin_url: d.linkedin_url ?? null,
      job_title: d.job_title,
      years_experience: d.years_experience,
      salary_min: d.salary_min ?? null,
      salary_max: d.salary_max ?? null,
      availability: d.availability,
      work_modes: d.work_modes,
      skills: d.skills,
      ...stored.document,
      policy_version: CONSENT_VERSION,
      ip_hash: ipHash,
      user_agent: await userAgent(),
      consents: [
        { type: "data_processing", granted: true, text: CONSENT_TEXT.data_processing },
        { type: "anonymised_marketplace", granted: true, text: CONSENT_TEXT.anonymised_marketplace },
        { type: "contact_for_introductions", granted: true, text: CONSENT_TEXT.contact_for_introductions },
      ],
    } as Json,
  });
  if (error || !created) {
    console.error("[submit-cv] create_candidate_submission failed", error?.message);
    await removeStoredCv(stored.document.storage_path);
    return { ok: false, message: "We could not save your submission. Please try again." };
  }
  const result = created as { candidate_id: string; ref: string; submission_ref: string };
  await setSubmissionCookie(result.submission_ref);

  after(async () => {
    await notifyAdmins(
      { type: "candidate.submitted", title: `New CV submission ${result.ref}`, body: "A candidate submitted a CV through the website.", link: `/admin/candidates/${result.candidate_id}` },
      { email: false },
    );
    await sendEmail({
      to: d.email,
      template: "candidate.receipt",
      subject: "We have received your CV",
      heading: "Thank you for your submission",
      paragraphs: [
        `Your submission reference is ${result.submission_ref}.`,
        "A recruiter will review your anonymised profile before it is shown to approved employers. We will never share your identity with an employer without your agreement.",
        "To update or withdraw your details at any time, reply to this email or use the contact page on our website.",
      ],
    });
    if (auto) await processQueuedJobs({ maxJobs: 1, timeBudgetMs: 250_000 });
  });

  redirect(`/submit-cv/confirmation?ref=${encodeURIComponent(result.submission_ref)}`);
}
