import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EraseForm, PrivateDetailsForm } from "@/components/admin/candidate-forms";
import { PageHeader } from "@/components/shell/page-header";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { ENQUIRY_TONE, PROCESSING_TONE, PROFILE_TONE, Pill } from "@/components/ui/status";
import { requireAdminPage } from "@/lib/auth";
import { getAdminCandidate } from "@/lib/data/admin-candidate";
import { listAdmins } from "@/lib/data/admin-candidates";
import { AVAILABILITY_LABELS, ENQUIRY_STATUS_LABELS, PROCESSING_STATUS_LABELS, PROFILE_STATUS_LABELS, formatDateTime, formatSalaryRange } from "@/lib/format";
import { assignCandidate, setArchived, setPublication } from "../actions";

export const metadata: Metadata = { title: "Candidate Record" };

export default async function AdminCandidatePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string; error?: string }> }) {
  const profile = await requireAdminPage("candidates.read_private");
  const { id } = await params;
  const sp = await searchParams;
  const [data, admins] = await Promise.all([getAdminCandidate(id), listAdmins()]);
  if (!data) notFound();
  const { c, priv, profile: p } = data;
  const canPublish = profile.permissions.has("candidates.publish");

  return (
    <div>
      {sp.created && <div className="mb-space-md"><FormMessage state={{ ok: true, message: "Candidate created. The CV is queued for processing." }} /></div>}
      {sp.error && <div className="mb-space-md"><FormMessage state={{ ok: false, message: sp.error }} /></div>}
      <PageHeader
        crumbs={[{ label: "Candidate Directory", href: "/admin/candidates" }, { label: `#${c.ref}` }]}
        title={priv?.full_name ?? `Candidate #${c.ref}`}
        badge={
          <div className="flex flex-wrap gap-2">
            <Pill tone={PROCESSING_TONE[c.pipeline_status]} dot>{PROCESSING_STATUS_LABELS[c.pipeline_status]}</Pill>
            <Pill tone={PROFILE_TONE[c.profile_status]}>{PROFILE_STATUS_LABELS[c.profile_status]}</Pill>
            {c.is_sample && <Pill tone="amber">Sample data</Pill>}
          </div>
        }
        description={<>Anonymous reference <span className="font-mono font-semibold text-primary">#{c.ref}</span>{c.submission_ref ? ` • Submission ${c.submission_ref}` : ""} • Source: {c.source.replace("_", " ")} • Created {formatDateTime(c.created_at)}</>}
        actions={
          <>
            <Link href={`/admin/candidates/${c.id}/review`} className="btn-primary"><Icon name="fact_check" className="text-lg" /> Review &amp; edit profile</Link>
            {canPublish && c.pipeline_status === "approved" && c.profile_status !== "archived" && (
              <form action={setPublication}>
                <input type="hidden" name="candidate_id" value={c.id} />
                <input type="hidden" name="publish" value={c.profile_status === "published" ? "0" : "1"} />
                <SubmitButton className={c.profile_status === "published" ? "btn-danger" : "btn-outline"} icon={c.profile_status === "published" ? "visibility_off" : "publish"}>
                  {c.profile_status === "published" ? "Unpublish" : "Publish"}
                </SubmitButton>
              </form>
            )}
            <form action={setArchived}>
              <input type="hidden" name="candidate_id" value={c.id} />
              <input type="hidden" name="archive" value={c.profile_status === "archived" ? "0" : "1"} />
              <SubmitButton className="btn-secondary" icon={c.profile_status === "archived" ? "unarchive" : "archive"} confirm={c.profile_status === "archived" ? undefined : "Archive this candidate? They will be removed from the marketplace."}>
                {c.profile_status === "archived" ? "Restore" : "Archive"}
              </SubmitButton>
            </form>
          </>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-xl items-start">
        <div className="xl:col-span-8 space-y-space-xl">
          <section className="tv-panel p-space-xl">
            <h2 className="font-heading-sm text-heading-sm font-bold flex items-center gap-2 mb-space-md"><Icon name="lock_person" /> Private candidate record <span className="chip">Admin only</span></h2>
            {priv && <PrivateDetailsForm candidateId={c.id} p={priv} />}
          </section>

          <section className="tv-panel p-space-xl">
            <div className="flex justify-between items-center mb-space-md">
              <h2 className="font-heading-sm text-heading-sm font-bold flex items-center gap-2"><Icon name="visibility_off" /> Anonymous employer profile</h2>
              <Link href={`/admin/candidates/${c.id}/review`} className="font-label-md text-label-md text-primary">Edit</Link>
            </div>
            <div className="font-heading-sm text-heading-sm">{p.headline ?? "—"}</div>
            <div className="font-body-sm text-body-sm text-text-muted">{[p.years_experience != null && `${p.years_experience} yrs`, p.location_region, formatSalaryRange(p.salary_min, p.salary_max), p.availability && AVAILABILITY_LABELS[p.availability]].filter(Boolean).join(" • ")}</div>
            <p className="font-body-sm text-body-sm mt-space-sm whitespace-pre-line">{p.summary ?? "No summary yet."}</p>
            <div className="flex flex-wrap gap-1 mt-space-sm">{p.skills.map((s) => <span key={s} className="chip">{s}</span>)}</div>
          </section>

          <section className="tv-panel p-space-xl">
            <h2 className="font-heading-sm text-heading-sm font-bold mb-space-md">Enquiries for this candidate</h2>
            {data.enquiries.length === 0 ? <p className="font-body-sm text-body-sm text-text-muted">No enquiries yet.</p> : (
              <ul className="divide-y divide-border-subtle">
                {data.enquiries.map((e) => (
                  <li key={e.id} className="py-space-sm flex justify-between gap-2">
                    <Link href={`/admin/enquiries?selected=${e.id}`} className="font-label-md text-label-md"><span className="font-mono">#{e.ref}</span> • {e.employers?.company_name} • {e.role_title}</Link>
                    <Pill tone={ENQUIRY_TONE[e.status]}>{ENQUIRY_STATUS_LABELS[e.status]}</Pill>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="xl:col-span-4 space-y-space-lg">
          <section className="tv-panel p-space-xl">
            <h2 className="font-heading-sm text-heading-sm font-bold mb-space-sm">Assigned recruiter</h2>
            <form action={assignCandidate} className="flex gap-2">
              <input type="hidden" name="candidate_id" value={c.id} />
              <select name="admin_id" defaultValue={c.assigned_admin_id ?? ""} className="tv-select" aria-label="Assigned recruiter">
                <option value="">Unassigned</option>
                {admins.map((a) => <option key={a.id} value={a.id}>{a.full_name ?? a.email}</option>)}
              </select>
              <SubmitButton className="btn-secondary">Save</SubmitButton>
            </form>
          </section>
          <section className="tv-panel p-space-xl">
            <h2 className="font-heading-sm text-heading-sm font-bold mb-space-sm">Documents</h2>
            {data.documents.map((d) => (
              <a key={d.id} href={`/api/admin/documents/${d.id}`} className="flex items-center gap-space-sm rounded-lg bg-surface-container-low p-space-sm hover:bg-surface-container mb-2">
                <Icon name="description" className="text-primary-container" />
                <div className="min-w-0"><div className="font-label-md text-label-md truncate">{d.original_filename}</div><div className="font-body-sm text-body-sm text-text-muted">{(d.size_bytes / 1024).toFixed(0)} KB • {formatDateTime(d.created_at)}</div></div>
                <Icon name="download" className="ml-auto" />
              </a>
            ))}
            {!data.documents.length && <p className="font-body-sm text-body-sm text-text-muted">No documents.</p>}
            <p className="tv-help">Downloads use 60-second signed links and are recorded in the audit log.</p>
          </section>
          <section className="tv-panel p-space-xl">
            <h2 className="font-heading-sm text-heading-sm font-bold mb-space-sm">Processing jobs</h2>
            <ul className="space-y-2">
              {data.jobs.map((j) => (
                <li key={j.id} className="font-body-sm text-body-sm">
                  <div className="flex justify-between"><span className="font-mono">{j.id.slice(0, 8)}</span><Pill tone={PROCESSING_TONE[j.status]}>{PROCESSING_STATUS_LABELS[j.status]}</Pill></div>
                  <div className="text-text-muted">{formatDateTime(j.created_at)} • attempts {j.attempts}/{j.max_attempts}</div>
                  {j.last_error && <div className="text-error">{j.last_error}</div>}
                </li>
              ))}
            </ul>
          </section>
          <section className="tv-panel p-space-xl">
            <h2 className="font-heading-sm text-heading-sm font-bold mb-space-sm">Consent records</h2>
            <ul className="space-y-2">
              {data.consents.map((r) => (
                <li key={r.id} className="font-body-sm text-body-sm rounded-lg bg-surface-container-low p-space-sm">
                  <div className="flex justify-between"><span className="font-label-md text-label-md">{r.consent_type.replaceAll("_", " ")}</span><Pill tone={r.granted ? "green" : "red"}>{r.granted ? "Granted" : "Withdrawn"}</Pill></div>
                  <div className="text-text-muted">{formatDateTime(r.created_at)} • {r.source} • {r.policy_version}</div>
                  <details><summary className="cursor-pointer text-primary">Wording</summary><p className="mt-1">{r.consent_text}</p></details>
                </li>
              ))}
            </ul>
          </section>
          {profile.permissions.has("candidates.erase") && (
            <section className="tv-panel p-space-xl border border-error/30">
              <h2 className="font-heading-sm text-heading-sm font-bold text-error mb-space-sm">Erase candidate (right to erasure)</h2>
              <EraseForm candidateId={c.id} candidateRef={c.ref} />
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
