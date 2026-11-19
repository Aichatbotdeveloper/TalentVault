import type { Metadata } from "next";
import Link from "next/link";
import { BatchBar, SelectAll } from "@/components/admin/batch-bar";
import { PageHeader } from "@/components/shell/page-header";
import { FormMessage } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Pagination } from "@/components/ui/pagination";
import { StatCard } from "@/components/ui/stat-card";
import { EMPLOYER_TONE, ENQUIRY_TONE, Pill } from "@/components/ui/status";
import { requireAdminPage } from "@/lib/auth";
import { EMPLOYER_STATUS_LABELS, ENQUIRY_STATUS_LABELS, cn, formatDate, formatDateTime, initials, timeAgo } from "@/lib/format";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { batchApproveEmployers } from "./actions";
import { EmployerStatusForm } from "./status-form";

export const metadata: Metadata = { title: "Employer Governance" };
const PAGE = 25;

export default async function EmployersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdminPage("employers.manage");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  let q = supabase.from("employers").select("id, company_name, company_number, website, industry, city, country, status, created_at, profiles(id, full_name, email, job_title, employer_role)", { count: "exact" });
  if (sp.status) q = q.eq("status", sp.status as Database["public"]["Enums"]["employer_status"]);
  if (sp.q) {
    const term = sp.q.replace(/[%,()]/g, " ");
    q = q.or(`company_name.ilike.%${term}%,email_domain.ilike.%${term}%,company_number.ilike.%${term}%`);
  }
  const [{ data: rows, count }, statusCounts, { count: enq30 }] = await Promise.all([
    q.order("created_at", { ascending: sp.status === "pending" }).range((page - 1) * PAGE, page * PAGE - 1),
    Promise.all((["approved", "pending", "suspended", "rejected"] as const).map((s) => supabase.from("employers").select("id", { count: "exact", head: true }).eq("status", s).then((r) => [s, r.count ?? 0] as const))),
    supabase.rpc("admin_dashboard_metrics").then((r) => ({ count: ((r.data ?? {}) as Record<string, number>).enquiries_30d ?? 0 })),
  ]);
  const counts = Object.fromEntries(statusCounts) as Record<string, number>;
  const selectedId = sp.selected ?? rows?.[0]?.id;
  const selected = rows?.find((r) => r.id === selectedId) ?? (selectedId ? (await supabase.from("employers").select("id, company_name, company_number, website, industry, city, country, status, created_at, profiles(id, full_name, email, job_title, employer_role)").eq("id", selectedId).maybeSingle()).data : null);
  const [detail, enquiries, activity] = selected
    ? await Promise.all([
        supabase.from("employers").select("*").eq("id", selected.id).single().then((r) => r.data),
        supabase.from("enquiries").select("id, ref, status, role_title, created_at").eq("employer_id", selected.id).order("created_at", { ascending: false }).limit(5).then((r) => r.data ?? []),
        supabase.from("audit_logs").select("id, action, created_at, metadata").eq("entity_type", "employer").eq("entity_id", selected.id).order("created_at", { ascending: false }).limit(8).then((r) => r.data ?? []),
      ])
    : [null, [], []];
  const qs = (extra: Record<string, string>) => new URLSearchParams(Object.entries({ ...sp, ...extra }).filter((e): e is [string, string] => !!e[1])).toString();

  return (
    <div>
      {sp.batch && <div className="mb-space-md"><FormMessage state={{ ok: true, message: `${sp.batch} employer(s) approved and notified.` }} /></div>}
      <PageHeader
        crumbs={[{ label: "Admin Console", href: "/admin" }, { label: "Employer Directory & Governance" }]}
        title="Employer Account Management & Governance"
        description="Verify organisations, manage access to the anonymised candidate directory and monitor employer engagement."
        actions={<Link href="/admin/employers?status=pending" className="btn-outline text-tertiary"><Icon name="rule" className="text-lg" /> Review Queue <span className="chip bg-tertiary text-on-tertiary">{counts.pending}</span></Link>}
      />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-space-md mb-space-xl">
        <StatCard label="Total employers" value={(counts.approved ?? 0) + (counts.pending ?? 0) + (counts.suspended ?? 0) + (counts.rejected ?? 0)} icon="domain" foot={`${counts.approved} active & verified`} />
        <StatCard label="Pending verification" value={counts.pending ?? 0} icon="pending_actions" accent="red" foot="Awaiting approval" />
        <StatCard label="Suspended" value={counts.suspended ?? 0} icon="pause_circle" accent="dark" foot={`${counts.rejected} rejected`} />
        <StatCard label="Enquiries (30 days)" value={enq30 ?? 0} icon="mail" accent="mint" foot="Across all employers" />
      </div>

      <form method="get" className="tv-panel p-space-md mb-space-lg flex flex-col md:flex-row gap-space-sm">
        <label className="relative flex-1"><span className="sr-only">Search</span><Icon name="search" className="absolute left-3 top-3 text-outline" /><input name="q" defaultValue={sp.q} className="tv-input pl-10" placeholder="Search by company name, email domain or registration number" /></label>
        <select name="status" defaultValue={sp.status ?? ""} className="tv-select md:w-56" aria-label="Status">
          <option value="">All statuses</option>
          {Object.entries(EMPLOYER_STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <button className="btn-primary">Apply</button>
      </form>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-xl items-start">
        <form id="employer-batch" action={batchApproveEmployers} className="xl:col-span-7">
          <div className="tv-panel overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-surface-container-low"><tr><th className="table-head w-10"><SelectAll formId="employer-batch" /></th><th className="table-head">Company &amp; jurisdiction</th><th className="table-head">Primary contact</th><th className="table-head">Status</th></tr></thead>
              <tbody className="divide-y divide-border-subtle">
                {(rows ?? []).map((e) => {
                  const owner = e.profiles.find((p) => p.employer_role === "owner") ?? e.profiles[0];
                  return (
                    <tr key={e.id} className={cn("hover:bg-surface-container-low", e.id === selectedId && "bg-secondary-fixed/10")}>
                      <td className="table-cell"><input type="checkbox" name="ids" value={e.id} aria-label={`Select ${e.company_name}`} className="accent-[#1a6840] h-4 w-4" /></td>
                      <td className="table-cell">
                        <Link href={`/admin/employers?${qs({ selected: e.id })}`} className="flex items-center gap-space-sm">
                          <span className="h-10 w-10 shrink-0 rounded-lg bg-surface-alt text-surface-bright grid place-items-center font-label-md text-label-md">{initials(e.company_name)}</span>
                          <span><span className="font-label-md text-label-md text-[15px] block">{e.company_name}</span><span className="text-text-muted">{[e.city, e.country].filter(Boolean).join(", ")}{e.company_number ? ` • Reg ${e.company_number}` : ""}</span></span>
                        </Link>
                      </td>
                      <td className="table-cell">{owner ? <><div className="font-label-md text-label-md">{owner.full_name}</div><div className="text-text-muted">{owner.job_title}</div><div className="font-mono text-[12px] text-text-muted">{owner.email}</div></> : "—"}</td>
                      <td className="table-cell"><Pill tone={EMPLOYER_TONE[e.status]} dot>{EMPLOYER_STATUS_LABELS[e.status]}</Pill><div className="text-text-muted mt-1">{timeAgo(e.created_at)}</div></td>
                    </tr>
                  );
                })}
                {!rows?.length && <tr><td colSpan={4} className="p-space-2xl text-center text-text-muted">No employers match.</td></tr>}
              </tbody>
            </table>
            <div className="flex justify-between items-center px-space-lg py-space-md border-t border-border-subtle">
              <span className="font-body-sm text-body-sm text-text-muted">{count ?? 0} accounts</span>
              <Pagination page={page} pageSize={PAGE} total={count ?? 0} basePath="/admin/employers" params={sp} />
            </div>
          </div>
          <BatchBar formId="employer-batch" actions={[{ op: "approve", label: "Batch Approve Pending", icon: "verified" }]} />
        </form>

        <aside className="xl:col-span-5 tv-panel p-space-xl xl:sticky xl:top-24 space-y-space-lg">
          {detail ? (
            <>
              <div className="flex items-start gap-space-sm">
                <span className="h-12 w-12 shrink-0 rounded-lg bg-surface-alt text-surface-bright grid place-items-center font-label-md text-label-md">{initials(detail.company_name)}</span>
                <div className="min-w-0">
                  <h2 className="font-heading-md text-heading-md leading-tight">{detail.company_name}</h2>
                  <div className="font-body-sm text-body-sm text-text-muted">{[detail.industry, detail.company_size, detail.city, detail.country].filter(Boolean).join(" • ")}</div>
                  <Pill tone={EMPLOYER_TONE[detail.status]} dot className="mt-1">{EMPLOYER_STATUS_LABELS[detail.status]}</Pill>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-space-sm font-body-sm text-body-sm">
                {[
                  ["Registration no.", detail.company_number],
                  ["VAT", detail.vat_number],
                  ["Website", detail.website],
                  ["Email domain", detail.email_domain],
                  ["Registered", formatDate(detail.created_at)],
                  ["Approved", detail.approved_at ? formatDate(detail.approved_at) : "—"],
                ].map(([k, val]) => (
                  <div key={k} className="rounded-lg bg-surface-container-low p-space-sm"><dt className="font-label-sm text-label-sm text-text-muted">{k}</dt><dd className="break-words">{val || "—"}</dd></div>
                ))}
              </dl>
              {detail.hiring_needs && <div><h3 className="font-label-sm text-label-sm uppercase text-text-muted mb-1">Hiring needs</h3><p className="font-body-sm text-body-sm">{detail.hiring_needs}</p></div>}
              {detail.status_reason && <p className="rounded-lg bg-error-container/40 p-space-sm font-body-sm text-body-sm">Last status note: {detail.status_reason}</p>}
              <div>
                <h3 className="font-label-sm text-label-sm uppercase text-text-muted mb-1">Account users</h3>
                {selected?.profiles.map((p) => <div key={p.id} className="font-body-sm text-body-sm">{p.full_name} — {p.email} {p.employer_role === "owner" && <span className="chip-green">Owner</span>}</div>)}
              </div>
              <div className="border-t border-border-subtle pt-space-md"><EmployerStatusForm employerId={detail.id} status={detail.status} /></div>
              <div>
                <h3 className="font-label-sm text-label-sm uppercase text-text-muted mb-1">Recent enquiries</h3>
                {enquiries.length ? enquiries.map((e) => (
                  <Link key={e.id} href={`/admin/enquiries?selected=${e.id}`} className="flex justify-between gap-2 py-1 font-body-sm text-body-sm"><span><span className="font-mono">#{e.ref}</span> {e.role_title}</span><Pill tone={ENQUIRY_TONE[e.status]}>{ENQUIRY_STATUS_LABELS[e.status]}</Pill></Link>
                )) : <p className="font-body-sm text-body-sm text-text-muted">None.</p>}
              </div>
              <div>
                <h3 className="font-label-sm text-label-sm uppercase text-text-muted mb-1">Governance trail</h3>
                <ol className="space-y-1">{activity.map((a) => <li key={a.id} className="font-body-sm text-body-sm"><span className="text-text-muted">{formatDateTime(a.created_at)}</span> — {a.action.replace("employer.", "").replace("_", " ")} {(a.metadata as { to?: string })?.to ? `→ ${(a.metadata as { to?: string }).to}` : ""}</li>)}</ol>
                {!activity.length && <p className="font-body-sm text-body-sm text-text-muted">No status changes yet.</p>}
              </div>
            </>
          ) : <p className="text-text-muted">Select an employer.</p>}
        </aside>
      </div>
    </div>
  );
}
