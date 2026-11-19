import "server-only";
import type { ExtractedCv } from "../cv/schema";
import type { PiiFinding } from "../cv/anonymise";
import { createClient } from "../supabase/server";

export async function getAdminCandidate(id: string) {
  const supabase = await createClient();
  const { data: c } = await supabase
    .from("candidates")
    .select("id, ref, submission_ref, source, pipeline_status, profile_status, is_sample, assigned_admin_id, reviewed_at, published_at, archived_at, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (!c) return null;
  const [priv, prof, exp, edu, certs, docs, jobs, results, consents, enquiries] = await Promise.all([
    supabase.from("candidate_private").select("full_name, email, phone, location_full, linkedin_url, right_to_work, internal_notes").eq("candidate_id", id).maybeSingle(),
    supabase.from("candidate_profiles").select("*").eq("candidate_id", id).single(),
    supabase.from("candidate_experience").select("*").eq("candidate_id", id).order("sort_order"),
    supabase.from("candidate_education").select("*").eq("candidate_id", id).order("sort_order"),
    supabase.from("candidate_certifications").select("*").eq("candidate_id", id).order("sort_order"),
    supabase.from("candidate_documents").select("id, original_filename, mime_type, size_bytes, sha256, extraction_method, created_at").eq("candidate_id", id).order("created_at", { ascending: false }),
    supabase.from("cv_processing_jobs").select("id, status, attempts, max_attempts, last_error, custom_instructions, created_at, started_at, completed_at").eq("candidate_id", id).order("created_at", { ascending: false }),
    supabase.from("ai_processing_results").select("id, provider, model, is_ai, extraction_method, extracted, anonymised, pii_findings, warnings, input_tokens, output_tokens, duration_ms, created_at").eq("candidate_id", id).order("created_at", { ascending: false }).limit(1),
    supabase.from("consent_records").select("id, consent_type, granted, consent_text, policy_version, source, created_at").eq("candidate_id", id).order("created_at", { ascending: false }),
    supabase.from("enquiries").select("id, ref, status, role_title, created_at, employers(company_name)").eq("candidate_id", id).order("created_at", { ascending: false }),
  ]);
  const result = results.data?.[0] ?? null;
  return {
    c,
    priv: priv.data,
    profile: prof.data!,
    experience: exp.data ?? [],
    education: edu.data ?? [],
    certifications: certs.data ?? [],
    documents: docs.data ?? [],
    jobs: jobs.data ?? [],
    result: result
      ? { ...result, extracted: result.extracted as unknown as ExtractedCv, pii_findings: result.pii_findings as unknown as PiiFinding[], warnings: result.warnings as unknown as string[] }
      : null,
    consents: consents.data ?? [],
    enquiries: enquiries.data ?? [],
  };
}
