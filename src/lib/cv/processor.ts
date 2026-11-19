import "server-only";
import { createAdminClient } from "../supabase/admin";
import type { Json } from "../supabase/database.types";
import { notifyAdmins } from "../notifications";
import { collectIdentifiers, scrubProfile } from "./anonymise";
import { extractCvText, MIN_TEXT_CHARS } from "./extract";
import { sniffCvKind } from "./files";
import { getCvProvider } from "./providers";
import { NonRetryableProcessingError } from "./providers/types";
import { CvAnalysisSchema, sanitiseAnalysis } from "./schema";

export interface JobOutcome {
  jobId: string;
  candidateId: string;
  status: "awaiting_review" | "queued" | "failed";
  error?: string;
}

/** Claims and processes a single queued job. Returns null when the queue is empty. */
export async function processNextJob(): Promise<JobOutcome | null> {
  const db = createAdminClient();
  const { data: claimed, error: claimError } = await db.rpc("claim_cv_job");
  if (claimError) throw new Error(`claim_cv_job failed: ${claimError.message}`);
  const job = claimed?.[0];
  if (!job) return null;

  const started = Date.now();
  try {
    const { data: doc, error: docError } = await db
      .from("candidate_documents")
      .select("id, storage_path, mime_type")
      .eq("id", job.document_id)
      .single();
    if (docError || !doc) throw new NonRetryableProcessingError("Source document record not found.");

    const { data: blob, error: dlError } = await db.storage.from("cvs").download(doc.storage_path);
    if (dlError || !blob) throw new Error(`Could not read stored document: ${dlError?.message ?? "unknown"}`);
    const buffer = Buffer.from(await blob.arrayBuffer());
    const kind = sniffCvKind(buffer.subarray(0, 4096));
    if (!kind) throw new NonRetryableProcessingError("Stored file is not a valid PDF, DOCX or DOC document.");

    let text = "";
    let extractionMethod = "";
    try {
      const r = await extractCvText(buffer, kind);
      text = r.text;
      extractionMethod = r.method;
    } catch (err) {
      console.warn(`[cv] text extraction failed for job ${job.id}:`, err instanceof Error ? err.message : err);
      if (kind !== "pdf") throw new NonRetryableProcessingError("The document could not be read. It may be corrupted or password-protected.");
    }

    const provider = getCvProvider();
    const needsOcr = text.length < MIN_TEXT_CHARS;
    if (needsOcr && kind === "pdf" && provider.supportsDocumentInput) extractionMethod = "pdf-ai-ocr";

    const [{ data: priv }, { data: prof }] = await Promise.all([
      db.from("candidate_private").select("full_name, email, phone").eq("candidate_id", job.candidate_id).single(),
      db.from("candidate_profiles").select("job_title, years_experience, salary_min, salary_max, availability, work_modes, location_region, skills").eq("candidate_id", job.candidate_id).single(),
    ]);
    const selfReported = Object.fromEntries(Object.entries(prof ?? {}).filter(([, v]) => v != null && !(Array.isArray(v) && v.length === 0)));

    const output = await provider.analyse({
      text,
      pdfBase64: needsOcr && kind === "pdf" && provider.supportsDocumentInput ? buffer.toString("base64") : undefined,
      selfReported,
      customInstructions: job.custom_instructions,
    });

    const validated = CvAnalysisSchema.safeParse(output.analysis);
    if (!validated.success) throw new Error(`Provider output failed schema validation: ${validated.error.issues[0]?.message}`);
    const analysis = sanitiseAnalysis(validated.data);
    const ids = collectIdentifiers(analysis.extracted, { fullName: priv?.full_name, email: priv?.email, phone: priv?.phone });
    const { profile: anonymised, findings } = scrubProfile(analysis.anonymised, ids);

    const { error: completeError } = await db.rpc("complete_cv_job", {
      p_job_id: job.id,
      p_result: {
        provider: provider.name,
        model: output.model,
        is_ai: provider.isAI,
        extraction_method: extractionMethod,
        extracted_text: text.slice(0, 200_000),
        extracted: analysis.extracted,
        anonymised,
        pii_findings: findings,
        warnings: analysis.warnings,
        input_tokens: output.inputTokens ?? null,
        output_tokens: output.outputTokens ?? null,
        duration_ms: Date.now() - started,
      } as unknown as Json,
    });
    if (completeError) throw new Error(`Saving results failed: ${completeError.message}`);

    const { data: cand } = await db.from("candidates").select("ref").eq("id", job.candidate_id).single();
    await notifyAdmins(
      {
        type: "cv.awaiting_review",
        title: `Candidate ${cand?.ref ?? ""} is awaiting review`,
        body: `CV processing completed${provider.isAI ? "" : " (local development adapter — not AI)"}. Review the extracted information and anonymised profile before approval.`,
        link: `/admin/candidates/${job.candidate_id}/review`,
      },
      { email: false },
    );
    return { jobId: job.id, candidateId: job.candidate_id, status: "awaiting_review" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const retryable = !(err instanceof NonRetryableProcessingError);
    console.error(`[cv] job ${job.id} failed (retryable=${retryable}):`, message);
    const { data: status } = await db.rpc("fail_cv_job", { p_job_id: job.id, p_error: message, p_retryable: retryable });
    if (status === "failed") {
      await notifyAdmins({
        type: "cv.failed",
        title: "CV processing failed",
        body: `A CV could not be processed: ${message}`,
        link: `/admin/candidates/${job.candidate_id}`,
      });
    }
    return { jobId: job.id, candidateId: job.candidate_id, status: status === "failed" ? "failed" : "queued", error: message };
  }
}

/** Drains the queue within a time budget (suitable for serverless invocations). */
export async function processQueuedJobs(opts: { maxJobs?: number; timeBudgetMs?: number } = {}) {
  const maxJobs = opts.maxJobs ?? 5;
  const deadline = Date.now() + (opts.timeBudgetMs ?? 240_000);
  const outcomes: JobOutcome[] = [];
  while (outcomes.length < maxJobs && Date.now() < deadline) {
    const outcome = await processNextJob();
    if (!outcome) break;
    outcomes.push(outcome);
  }
  return outcomes;
}
