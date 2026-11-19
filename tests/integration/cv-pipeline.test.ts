import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import type { Database, Json } from "@/lib/supabase/database.types";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const enabled = /127\.0\.0\.1|localhost/.test(URL_) && !!SERVICE;
const db = () => createClient<Database>(URL_, SERVICE, { auth: { persistSession: false } });
const cleanup: { ids: string[]; paths: string[] } = { ids: [], paths: [] };

async function submit(fixture: string) {
  process.env.AI_PROVIDER = "local";
  const path = `documents/pipeline-${randomUUID()}.pdf`;
  await db().storage.from("cvs").upload(path, readFileSync(`tests/fixtures/${fixture}`), { contentType: "application/pdf" });
  cleanup.paths.push(path);
  const { data, error } = await db().rpc("create_candidate_submission", {
    p: {
      source: "portal", auto_process: true, full_name: "Jordan Example", email: "jordan.example@example.com", job_title: "Senior Platform Engineer",
      years_experience: "9", availability: "two_weeks", work_modes: ["remote"], skills: ["Kubernetes"],
      storage_path: path, original_filename: fixture, mime_type: "application/pdf", size_bytes: 1000, sha256: "test",
      consents: [{ type: "anonymised_marketplace", granted: true, text: "test" }],
    } as Json,
  });
  if (error) throw error;
  const r = data as { candidate_id: string; job_id: string };
  cleanup.ids.push(r.candidate_id);
  return r;
}

async function drainUntil(jobId: string) {
  const { processNextJob } = await import("@/lib/cv/processor");
  for (let i = 0; i < 20; i++) {
    const out = await processNextJob();
    if (!out || out.jobId === jobId) return out;
  }
  return null;
}

describe.skipIf(!enabled)("CV processing pipeline (local adapter)", () => {
  afterAll(async () => {
    if (!enabled) return;
    await db().storage.from("cvs").remove(cleanup.paths);
    await db().from("candidates").delete().in("id", cleanup.ids);
  });

  it("processes a submitted CV into a draft profile awaiting review — never auto-published", async () => {
    const { candidate_id, job_id } = await submit("cv-sample.pdf");
    const out = await drainUntil(job_id);
    expect(out?.status).toBe("awaiting_review");
    const { data: c } = await db().from("candidates").select("pipeline_status, profile_status").eq("id", candidate_id).single();
    expect(c).toEqual({ pipeline_status: "awaiting_review", profile_status: "draft" });
    const { data: profile } = await db().from("candidate_profiles").select("published, years_experience, skills, summary").eq("candidate_id", candidate_id).single();
    expect(profile?.published).toBe(false);
    expect(profile?.years_experience).toBe(9); // self-reported value wins over the CV estimate
    expect(profile?.skills).toEqual(expect.arrayContaining(["Kubernetes", "Terraform"]));
    expect(profile?.summary).not.toContain("jordan.example@example.com");
    const { data: result } = await db().from("ai_processing_results").select("is_ai, provider").eq("candidate_id", candidate_id).single();
    expect(result).toEqual({ is_ai: false, provider: "local-dev-heuristic" });
    const { data: doc } = await db().from("candidate_documents").select("extracted_text").eq("candidate_id", candidate_id).single();
    expect(doc?.extracted_text).toContain("Senior Platform Engineer");
  });

  it("marks image-only documents as failed without retrying when no OCR provider is configured", async () => {
    const { candidate_id, job_id } = await submit("cv-scanned.pdf");
    const out = await drainUntil(job_id);
    expect(out?.status).toBe("failed");
    expect(out?.error).toMatch(/OCR requires the Anthropic provider/);
    const { data: c } = await db().from("candidates").select("pipeline_status").eq("id", candidate_id).single();
    expect(c?.pipeline_status).toBe("failed");
  });
});
