import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApproveForm, ReprocessForm } from "@/components/admin/candidate-forms";
import { ProfileEditor } from "@/components/admin/profile-editor";
import { Icon } from "@/components/ui/icon";
import { PROCESSING_TONE, PROFILE_TONE, Pill } from "@/components/ui/status";
import { AutoRefresh } from "@/components/ui/auto-refresh";
import { requireAdminPage } from "@/lib/auth";
import { getAdminCandidate } from "@/lib/data/admin-candidate";
import { PROCESSING_STATUS_LABELS, PROFILE_STATUS_LABELS, cn, formatDateTime, formatSalaryRange } from "@/lib/format";
import { setPublication } from "../../actions";

export const metadata: Metadata = { title: "AI CV Processing" };

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireAdminPage("candidates.read_private");
  const { id } = await params;
  const data = await getAdminCandidate(id);
  if (!data) notFound();
  const { c, priv, result, documents, jobs } = data;
  const job = jobs[0];
  const doc = documents[0];
  const ext = result?.extracted;
  const piiCount = (result?.pii_findings ?? []).reduce((n, f) => n + f.count, 0);
  const inFlight = ["uploaded", "queued", "processing"].includes(c.pipeline_status);
  const canPublish = profile.permissions.has("candidates.publish");
  const salaryText = formatSalaryRange(data.profile.salary_min, data.profile.salary_max);

  const steps = [
    { label: "Ingestion & Parsing", meta: doc ? (doc.size_bytes > 1024 * 1024 ? `${(doc.size_bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(doc.size_bytes / 1024)} KB`) : "", sub: doc?.original_filename ?? "No document", done: !!doc },
    { label: "PII Sanitisation", meta: result ? `${piiCount} removed` : "", sub: result ? `${ext?.employment.filter((e) => e.employer_name).length ?? 0} employer names generalised` : "Pending", done: !!result },
    { label: "Taxonomy Mapping", meta: "", sub: `${data.profile.skills.length} skills • ${data.experience.length} roles`, done: !!result },
    { label: "Synthesis & Sign-off", meta: c.pipeline_status === "awaiting_review" ? "Action needed" : "", sub: c.pipeline_status === "approved" ? "Approved" : "Recruiter approval", done: c.pipeline_status === "approved" },
  ];

  return (
    <div className="pb-space-4xl">
      <AutoRefresh active={inFlight} />
      <div className="flex flex-wrap items-center justify-between gap-space-sm mb-space-md">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
          <Link href="/admin">Admin Console</Link><Icon name="chevron_right" className="text-sm" />
          <Link href="/admin/processing">AI Processing Pipeline</Link><Icon name="chevron_right" className="text-sm" />
          <span className="text-primary font-semibold">Candidate #{c.ref}{job ? ` • Job ${job.id.slice(0, 8)}` : ""}</span>
        </nav>
        {result && (
          <span className="chip font-mono">
            <span className={cn("h-1.5 w-1.5 rounded-full", result.is_ai ? "bg-primary-container" : "bg-[#b45309]")} /> {result.is_ai ? `${result.provider} • ${result.model}` : "Local dev adapter (not AI)"}
            {result.duration_ms ? ` | ${(result.duration_ms / 1000).toFixed(1)}s` : ""}
          </span>
        )}
      </div>

      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-space-lg mb-space-xl">
        <div className="max-w-2xl">
          <h1 className="page-title">AI CV Processing &amp; Candidate Ingestion</h1>
          <div className="flex flex-wrap gap-2 mt-space-sm">
            <Pill tone={PROCESSING_TONE[c.pipeline_status]} dot>{PROCESSING_STATUS_LABELS[c.pipeline_status]}</Pill>
            <Pill tone={PROFILE_TONE[c.profile_status]}>{PROFILE_STATUS_LABELS[c.profile_status]}</Pill>
            {c.is_sample && <Pill tone="amber">Sample data</Pill>}
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant mt-space-sm">Structured extraction, PII redaction and anonymised profile synthesis — every result requires recruiter sign-off before publication.</p>
        </div>
        <div className="flex flex-wrap gap-space-sm">
          <Link href={`/admin/candidates/${c.id}`} className="btn-secondary"><Icon name="badge" className="text-lg" /> Candidate record</Link>
          {canPublish && c.profile_status === "published" && (
            <form action={setPublication}><input type="hidden" name="candidate_id" value={c.id} /><input type="hidden" name="publish" value="0" /><button className="btn-danger"><Icon name="visibility_off" className="text-lg" /> Unpublish</button></form>
          )}
          {canPublish && c.pipeline_status === "approved" && c.profile_status !== "published" && (
            <form action={setPublication}><input type="hidden" name="candidate_id" value={c.id} /><input type="hidden" name="publish" value="1" /><button className="btn-primary"><Icon name="rocket_launch" className="text-lg" /> Publish to Marketplace</button></form>
          )}
        </div>
      </div>

      {result && !result.is_ai && (
        <div role="alert" className="mb-space-lg rounded-xl bg-[#fff3cd] text-[#7a5a00] p-space-md flex gap-space-sm">
          <Icon name="warning" />
          <div className="font-body-sm text-body-sm"><strong>Local development adapter — not AI analysis.</strong> These results come from simple pattern matching because no AI provider is configured (set AI_PROVIDER=anthropic and ANTHROPIC_API_KEY). Write the summary and history manually before approval.</div>
        </div>
      )}
      {c.pipeline_status === "failed" && (
        <div role="alert" className="mb-space-lg rounded-xl bg-error-container text-on-error-container p-space-md flex gap-space-sm">
          <Icon name="error" />
          <div className="font-body-sm text-body-sm"><strong>Processing failed after {job?.attempts} attempt(s):</strong> {job?.last_error}. Review the CV manually and complete the profile below, or reprocess.</div>
        </div>
      )}
      {inFlight && (
        <div className="mb-space-lg rounded-xl bg-[#dbeafe] text-[#1e3a8a] p-space-md flex gap-space-sm items-center">
          <Icon name="progress_activity" className="animate-spin" /> <span className="font-body-sm text-body-sm">Processing in progress ({PROCESSING_STATUS_LABELS[c.pipeline_status]}). This page refreshes automatically.</span>
        </div>
      )}

      <div className="tv-panel p-space-md grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-sm mb-space-xl">
        {steps.map((s, i) => (
          <div key={s.label} className={cn("rounded-xl p-space-md flex gap-space-sm", i === 3 && !s.done ? "bg-secondary-fixed/25" : "bg-surface-container-low")}>
            <span className={cn("h-9 w-9 shrink-0 rounded-full grid place-items-center", s.done ? "bg-primary-container text-on-primary" : "bg-surface-container-high text-outline")}><Icon name={s.done ? "check" : "pending"} className="text-lg" /></span>
            <div className="min-w-0">
              <div className="flex justify-between gap-2 font-label-sm text-label-sm uppercase text-primary-container"><span>Step 0{i + 1}</span><span>{s.meta}</span></div>
              <div className="font-label-md text-label-md text-[15px] truncate">{s.label}</div>
              <div className="font-body-sm text-body-sm text-text-muted truncate">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-space-xl items-start">
        {/* LEFT: source & raw extraction */}
        <section className="space-y-space-lg">
          <div className="tv-panel p-space-xl space-y-space-lg">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-heading-md text-heading-md flex items-center gap-2"><Icon name="folder_open" /> Source Document &amp; Raw Extraction</h2>
              {doc && <a href={`/api/admin/documents/${doc.id}`} className="chip hover:bg-surface-container-high"><Icon name="download" className="text-sm" /> Original {doc.mime_type.includes("pdf") ? "PDF" : "Word"}</a>}
            </div>
            <div className="rounded-xl bg-surface-alt text-surface-bright p-space-md flex gap-space-sm">
              <Icon name="shield_lock" className="text-secondary-fixed" />
              <div>
                <div className="font-label-sm text-label-sm uppercase tracking-wider text-secondary-fixed">Confidential recruiter safeguard</div>
                <p className="font-body-sm text-body-sm text-surface-variant">{result ? `${piiCount} personal identifier occurrence(s) were removed from the anonymised profile by the post-processing safeguard.` : "Identifiers are removed from the anonymised profile once processing completes."} This panel is visible to authorised staff only; access is audited.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              <div className="rounded-xl bg-surface-container-low p-space-md">
                <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant">Candidate legal identity <Icon name="lock" className="text-sm text-tertiary" /></div>
                <div className="font-heading-sm text-heading-sm">{priv?.full_name}</div>
                <div className="font-label-sm text-label-sm text-text-muted">Protected • Admin only</div>
              </div>
              <div className="rounded-xl bg-surface-container-low p-space-md">
                <div className="font-label-sm text-label-sm text-on-surface-variant">Public pseudonym key</div>
                <div className="font-heading-sm text-heading-sm text-primary-container">Candidate #{c.ref}</div>
                <div className="font-label-sm text-label-sm text-text-muted">Auto-generated reference</div>
              </div>
            </div>
            <div className="rounded-xl bg-surface-container-low p-space-md">
              <div className="font-label-sm text-label-sm text-on-surface-variant mb-1">Contact points (private)</div>
              <div className="font-body-sm text-body-sm flex flex-wrap gap-x-space-md">{[priv?.email, priv?.phone, priv?.location_full, priv?.linkedin_url].filter(Boolean).map((x) => <span key={x!}>{x}</span>)}</div>
              {ext?.personal && (ext.personal.email !== priv?.email || ext.personal.full_name !== priv?.full_name) && (ext.personal.email || ext.personal.full_name) && (
                <div className="font-body-sm text-body-sm text-text-muted mt-1">CV states: {[ext.personal.full_name, ext.personal.email, ext.personal.phone].filter(Boolean).join(" • ")}</div>
              )}
            </div>

            {ext && ext.employment.length > 0 && (
              <div>
                <div className="flex justify-between mb-space-sm"><h3 className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Parsed career history → anonymised</h3><span className="font-label-sm text-label-sm text-primary-container">{ext.employment.length} roles</span></div>
                <div className="space-y-space-sm">
                  {ext.employment.map((e, i) => {
                    const anon = data.experience[i];
                    return (
                      <div key={i} className="rounded-xl bg-surface-container-low p-space-md">
                        <div className="flex justify-between font-label-sm text-label-sm text-text-muted"><span>{[e.start, e.is_current ? "Present" : e.end].filter(Boolean).join(" – ") || "Dates not stated"}</span>{e.is_current && <span className="chip-green">Current</span>}</div>
                        <div className="font-body-sm text-body-sm"><span className="line-through text-tertiary">{e.title}{e.employer_name ? ` @ ${e.employer_name}` : ""}</span> <Icon name="arrow_forward" className="text-sm align-middle" /></div>
                        <div className="font-label-md text-label-md text-[15px]">{anon ? `${anon.title}${anon.organisation_descriptor ? ` — ${anon.organisation_descriptor}` : ""}` : "(removed in draft)"}</div>
                        {e.description && <p className="font-body-sm text-body-sm text-text-muted mt-1 line-clamp-3">{e.description}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-space-sm">
              <div className="rounded-xl bg-surface-container-low p-space-md"><div className="font-label-sm text-label-sm text-text-muted">Total seniority</div><div className="font-heading-sm text-heading-sm">{data.profile.years_experience != null ? `${data.profile.years_experience} yrs` : "—"}</div><div className="font-label-sm text-label-sm text-primary-container">CV estimate: {ext?.total_years_experience ?? "n/a"}</div></div>
              <div className="rounded-xl bg-surface-container-low p-space-md"><div className="font-label-sm text-label-sm text-text-muted">Salary intent</div><div className="font-heading-sm text-heading-sm">{salaryText}</div><div className="font-label-sm text-label-sm text-text-muted">Self-reported</div></div>
              <div className="rounded-xl bg-surface-container-low p-space-md"><div className="font-label-sm text-label-sm text-text-muted">Notice period</div><div className="font-heading-sm text-heading-sm text-primary-container">{data.profile.availability?.replace("_", " ") ?? "—"}</div><div className="font-label-sm text-label-sm text-text-muted">{ext?.availability_text ?? ""}</div></div>
            </div>

            {result && (
              <details className="rounded-xl bg-surface-alt text-surface-bright p-space-md">
                <summary className="cursor-pointer flex items-center justify-between gap-2 font-body-sm text-body-sm">
                  <span className="flex items-center gap-2"><Icon name="terminal" /> {result.is_ai ? `Model: ${result.model}` : "Local heuristic adapter"} {result.input_tokens ? `(${result.input_tokens.toLocaleString()} input tokens)` : ""} • {result.extraction_method}</span>
                  <span className="font-label-sm text-label-sm text-secondary-fixed">JSON view</span>
                </summary>
                <pre className="mt-space-sm max-h-96 overflow-auto text-[11px] leading-relaxed text-surface-variant whitespace-pre-wrap">{JSON.stringify({ extracted: result.extracted, pii_findings: result.pii_findings }, null, 2)}</pre>
              </details>
            )}
            {!!result?.warnings.length && (
              <div className="rounded-xl border border-[#f2d27a] bg-[#fffbeb] p-space-md">
                <div className="font-label-md text-label-md text-[#7a5a00] flex items-center gap-1"><Icon name="flag" className="text-base" /> Items to double-check</div>
                <ul className="list-disc pl-5 mt-1 font-body-sm text-body-sm text-[#7a5a00]">{result.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
              </div>
            )}
          </div>

          {ext && (ext.education.length > 0 || ext.certifications.length > 0) && (
            <div className="tv-panel p-space-xl">
              <div className="flex justify-between mb-space-md"><h2 className="font-heading-sm text-heading-sm font-bold">Extracted Education &amp; Certifications</h2><span className="font-label-sm text-label-sm text-text-muted">{ext.education.length + ext.certifications.length} detected</span></div>
              <ul className="space-y-space-sm">
                {ext.certifications.map((x, i) => <li key={`c${i}`} className="rounded-xl bg-surface-container-low p-space-md flex gap-space-sm"><Icon name="verified_user" className="text-primary-container" /><div><div className="font-label-md text-label-md">{x.name}</div><div className="font-body-sm text-body-sm text-text-muted">{[x.issuer, x.year].filter(Boolean).join(" • ")}</div></div></li>)}
                {ext.education.map((x, i) => <li key={`e${i}`} className="rounded-xl bg-surface-container-low p-space-md flex gap-space-sm"><Icon name="school" className="text-primary-container" /><div><div className="font-label-md text-label-md">{x.qualification}{x.field_of_study ? ` — ${x.field_of_study}` : ""}</div><div className="font-body-sm text-body-sm text-text-muted">{[x.institution, x.year].filter(Boolean).join(" • ")}</div></div></li>)}
              </ul>
            </div>
          )}
        </section>

        {/* RIGHT: AI-generated anonymous profile + sign-off */}
        <section className="space-y-space-lg xl:sticky xl:top-24">
          <div className="tv-panel p-space-xl">
            <div className="flex items-start justify-between gap-2 mb-space-lg">
              <h2 className="font-heading-md text-heading-md flex items-center gap-2"><Icon name="smart_toy" /> {result?.is_ai ? "AI-Generated" : "Draft"} Anonymous Profile</h2>
              <span className="chip-green"><Icon name="storefront" className="text-sm" /> Marketplace view</span>
            </div>
            <ProfileEditor candidateId={c.id} profile={data.profile} experience={data.experience} education={data.education} certifications={data.certifications} />
          </div>
          {c.pipeline_status === "awaiting_review" || c.pipeline_status === "failed" ? (
            <div className="tv-panel p-space-xl">
              <ApproveForm candidateId={c.id} salaryText={salaryText} canPublish={canPublish} isAI={!!result?.is_ai} />
            </div>
          ) : c.pipeline_status === "approved" ? (
            <div className="tv-panel p-space-xl font-body-sm text-body-sm"><Icon name="task_alt" className="text-primary-container align-middle" /> Approved {c.reviewed_at ? formatDateTime(c.reviewed_at) : ""}. Edits saved here apply to the {c.profile_status === "published" ? "live" : "approved"} profile immediately.</div>
          ) : null}
          {!inFlight && doc && (
            <details className="tv-panel p-space-xl">
              <summary className="cursor-pointer font-label-md text-label-md flex items-center gap-2"><Icon name="restart_alt" /> Regenerate / reprocess</summary>
              <div className="mt-space-md"><ReprocessForm candidateId={c.id} /></div>
            </details>
          )}
        </section>
      </div>
    </div>
  );
}
