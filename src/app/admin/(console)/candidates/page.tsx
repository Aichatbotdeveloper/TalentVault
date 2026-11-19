import type { Metadata } from "next";
import Link from "next/link";
import { BatchBar, SelectAll } from "@/components/admin/batch-bar";
import { PageHeader } from "@/components/shell/page-header";
import { FormMessage } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Pagination } from "@/components/ui/pagination";
import { PROCESSING_TONE, PROFILE_TONE, Pill } from "@/components/ui/status";
import { requireAdminPage } from "@/lib/auth";
import { listAdminCandidates, listAdmins } from "@/lib/data/admin-candidates";
import { AVAILABILITY_OPTIONS, PROCESSING_STATUS_LABELS, PROFILE_STATUS_LABELS, formatSalaryRange, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { batchCandidates } from "./actions";

export const metadata: Metadata = { title: "Candidate Management" };

export default async function AdminCandidatesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const profile = await requireAdminPage();
  const sp = await searchParams;
  const pageSize = [10, 25, 50].includes(Number(sp.size)) ? Number(sp.size) : 25;
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  const [{ rows, total }, admins, { data: metrics }] = await Promise.all([
    listAdminCandidates({ q: sp.q, pipeline: sp.pipeline, status: sp.status, availability: sp.availability, assigned: sp.assigned, sample: sp.sample, page, pageSize }, profile.userId),
    listAdmins(),
    supabase.rpc("admin_dashboard_metrics"),
  ]);
  const m = (metrics ?? {}) as Record<string, number>;
  const adminName = new Map(admins.map((a) => [a.id, a.full_name ?? a.email]));
  const canPrivate = profile.permissions.has("candidates.read_private");
  const activeFilters = ["q", "pipeline", "status", "availability", "assigned", "sample"].filter((k) => sp[k]);

  return (
    <div>
      {sp.batch && <div className="mb-space-md"><FormMessage state={{ ok: !sp.batch_error, message: `Batch action applied to ${sp.batch} candidates.${sp.batch_error ? ` Some failed: ${sp.batch_error}` : ""}` }} /></div>}
      {sp.erased && <div className="mb-space-md"><FormMessage state={{ ok: true, message: "Candidate and documents permanently erased." }} /></div>}
      <PageHeader
        crumbs={[{ label: "Admin Console", href: "/admin" }, { label: "Candidate Directory & Management" }]}
        title="Candidate Management Database"
        description="Monitor CV ingestion, verify anonymised profiles, and manage marketplace publication."
        actions={
          <>
            <Link href="/admin/candidates/new" className="btn-outline"><Icon name="upload_file" className="text-lg" /> Upload Candidate CV</Link>
            <a href={`/admin/candidates/export?${new URLSearchParams(Object.entries(sp).filter((e): e is [string, string] => !!e[1])).toString()}`} className="btn-outline"><Icon name="download" className="text-lg" /> Export CSV</a>
          </>
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-space-md mb-space-xl">
        {[
          ["Total in vault", m.candidates_total, "folder_shared", `+${m.candidates_new_7d ?? 0} this week`],
          ["Active & published", m.candidates_published, "verified", "Visible to approved employers"],
          ["Review queue", m.candidates_awaiting_review, "assignment_ind", "Awaiting recruiter sign-off"],
          ["In AI pipeline", m.candidates_processing, "memory", `${m.candidates_failed ?? 0} failed`],
        ].map(([label, value, icon, foot], i) => (
          <div key={label as string} className={`tv-panel p-space-lg border-b-4 ${i === 2 ? "border-tertiary" : "border-primary-container"}`}>
            <div className="flex justify-between"><span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{label}</span><Icon name={icon as string} className="text-primary-container" /></div>
            <div className={`font-display-lg text-[36px] font-extrabold ${i === 2 ? "text-tertiary" : ""}`}>{(value as number) ?? 0}</div>
            <div className="font-body-sm text-body-sm text-text-muted">{foot}</div>
          </div>
        ))}
      </div>

      <form method="get" className="tv-panel p-space-lg mb-space-lg space-y-space-md">
        <div className="flex flex-col md:flex-row gap-space-sm">
          <label className="relative flex-1">
            <span className="sr-only">Search</span>
            <Icon name="search" className="absolute left-3 top-3 text-outline" />
            <input name="q" defaultValue={sp.q} className="tv-input pl-10" placeholder={canPrivate ? "Search by name, email, reference, headline or skill" : "Search by reference, headline or skill"} />
          </label>
          <button className="btn-primary"><Icon name="filter_alt" className="text-lg" /> Apply</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-space-sm">
          <select name="pipeline" defaultValue={sp.pipeline ?? ""} className="tv-select" aria-label="Pipeline status">
            <option value="">All pipeline stages</option>
            {Object.entries(PROCESSING_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select name="status" defaultValue={sp.status ?? ""} className="tv-select" aria-label="Profile status">
            <option value="">Active (not archived)</option>
            {Object.entries(PROFILE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select name="availability" defaultValue={sp.availability ?? ""} className="tv-select" aria-label="Availability">
            <option value="">Any availability</option>
            {AVAILABILITY_OPTIONS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select name="assigned" defaultValue={sp.assigned ?? ""} className="tv-select" aria-label="Assigned">
            <option value="">Any assignee</option>
            <option value="me">Assigned to me</option>
            <option value="none">Unassigned</option>
          </select>
          <select name="sample" defaultValue={sp.sample ?? ""} className="tv-select" aria-label="Sample data">
            <option value="">Include sample data</option>
            <option value="hide">Hide sample data</option>
          </select>
        </div>
        {activeFilters.length > 0 && (
          <div className="flex items-center gap-2 font-label-sm text-label-sm">
            <span className="text-text-muted">Active filters:</span>
            {activeFilters.map((k) => <span key={k} className="chip-green">{k}: {sp[k]}</span>)}
            <Link href="/admin/candidates" className="text-tertiary ml-2">Reset all</Link>
          </div>
        )}
      </form>

      <form id="candidate-batch" action={batchCandidates}>
        <div className="tv-panel overflow-x-auto">
          <table className="w-full min-w-[960px]">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="table-head w-10"><SelectAll formId="candidate-batch" /></th>
                <th className="table-head">Candidate ID</th>
                <th className="table-head">Identity &amp; contact <Icon name="lock" className="text-sm align-middle" /></th>
                <th className="table-head">Role headline &amp; seniority</th>
                <th className="table-head">Key skills</th>
                <th className="table-head">Pipeline / Profile</th>
                <th className="table-head">Assigned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-surface-container-low has-[:checked]:bg-secondary-fixed/10">
                  <td className="table-cell"><input type="checkbox" name="ids" value={c.id} aria-label={`Select ${c.ref}`} className="accent-[#1a6840] h-4 w-4" /></td>
                  <td className="table-cell">
                    <Link href={`/admin/candidates/${c.id}`} className="font-mono font-semibold text-primary-container hover:underline">#{c.ref}</Link>
                    {c.is_sample && <div><span className="chip bg-[#fff3cd] text-[#7a5a00] mt-1">Sample</span></div>}
                  </td>
                  <td className="table-cell">
                    {canPrivate ? (
                      <>
                        <div className="font-label-md text-label-md">{c.candidate_private?.full_name}</div>
                        <div className="font-mono text-[12px] text-text-muted">{c.candidate_private?.email}</div>
                        <div className="text-text-muted">{c.candidate_private?.location_full}</div>
                      </>
                    ) : <span className="text-text-muted">Restricted</span>}
                  </td>
                  <td className="table-cell">
                    <div className="font-label-md text-label-md">{c.candidate_profiles.headline ?? c.candidate_profiles.job_title ?? "—"}</div>
                    <div className="text-text-muted">{[c.candidate_profiles.years_experience != null && `${c.candidate_profiles.years_experience} yrs`, formatSalaryRange(c.candidate_profiles.salary_min, c.candidate_profiles.salary_max), timeAgo(c.created_at)].filter(Boolean).join(" • ")}</div>
                  </td>
                  <td className="table-cell">
                    <div className="flex flex-wrap gap-1 max-w-[220px]">
                      {c.candidate_profiles.skills.slice(0, 3).map((s) => <span key={s} className="chip">{s}</span>)}
                      {c.candidate_profiles.skills.length > 3 && <span className="chip-green">+{c.candidate_profiles.skills.length - 3}</span>}
                    </div>
                  </td>
                  <td className="table-cell space-y-1">
                    <Pill tone={PROCESSING_TONE[c.pipeline_status]}>{PROCESSING_STATUS_LABELS[c.pipeline_status]}</Pill>
                    <div><Pill tone={PROFILE_TONE[c.profile_status]}>{PROFILE_STATUS_LABELS[c.profile_status]}</Pill></div>
                  </td>
                  <td className="table-cell text-text-muted">{c.assigned_admin_id ? adminName.get(c.assigned_admin_id) ?? "—" : "Unassigned"}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="p-space-2xl text-center font-body-md text-body-md text-text-muted">No candidates match these filters.</td></tr>
              )}
            </tbody>
          </table>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-space-sm px-space-lg py-space-md border-t border-border-subtle">
            <span className="font-body-sm text-body-sm text-text-muted">
              Showing {total ? (page - 1) * pageSize + 1 : 0}–{Math.min(total, page * pageSize)} of {total} candidate records •{" "}
              {[10, 25, 50].map((n) => (
                <Link key={n} href={`/admin/candidates?${new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter((e): e is [string, string] => !!e[1])), size: String(n), page: "1" })}`} className={n === pageSize ? "font-semibold text-primary" : "underline"}> {n}</Link>
              ))}{" "}per page
            </span>
            <Pagination page={page} pageSize={pageSize} total={total} basePath="/admin/candidates" params={sp} />
          </div>
        </div>
        <BatchBar
          formId="candidate-batch"
          actions={[
            ...(profile.permissions.has("candidates.publish") ? [{ op: "publish", label: "Batch Publish", icon: "publish" }, { op: "unpublish", label: "Unpublish", icon: "visibility_off", tone: "dark" as const }] : []),
            { op: "assign_me", label: "Assign to me", icon: "person_add", tone: "dark" as const },
            { op: "archive", label: "Archive", icon: "archive", tone: "danger" as const, confirm: "Archive the selected candidates? They will be removed from the marketplace." },
          ]}
        />
      </form>
    </div>
  );
}
