import type { Metadata } from "next";
import Link from "next/link";
import { EnquiryDetail } from "@/components/portal/enquiry-detail";
import { PageHeader } from "@/components/shell/page-header";
import { Icon } from "@/components/ui/icon";
import { Pagination } from "@/components/ui/pagination";
import { ENQUIRY_TONE, Pill } from "@/components/ui/status";
import { requireEmployerPage } from "@/lib/auth";
import { employerEnquiryStats, getEmployerEnquiry, listEmployerEnquiries } from "@/lib/data/enquiries";
import { ENQUIRY_STATUS_LABELS, ENQUIRY_STATUS_OPTIONS, cn, formatDate, timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "My Enquiries" };

export default async function MyEnquiriesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const profile = await requireEmployerPage({ approved: true });
  const sp = await searchParams;
  const page = Number(sp.page) || 1;
  const [{ rows, total }, stats] = await Promise.all([listEmployerEnquiries({ q: sp.q, status: sp.status, sort: sp.sort, page }), employerEnquiryStats()]);
  const selectedRef = sp.selected ?? rows[0]?.ref;
  const selected = selectedRef ? await getEmployerEnquiry(selectedRef) : null;
  const qs = (extra: Record<string, string>) => new URLSearchParams(Object.entries({ ...sp, ...extra }).filter((e): e is [string, string] => !!e[1])).toString();

  return (
    <div>
      <PageHeader
        crumbs={[{ label: "Employer Workspace", href: "/portal" }, { label: "My Enquiries" }]}
        title="My Enquiries"
        description="Track and coordinate your candidate enquiries and introduction requests with the TalentVault team."
        actions={
          <>
            <a href={`/portal/enquiries/export?${qs({})}`} className="btn-outline"><Icon name="download" className="text-lg" /> Export Report (CSV)</a>
            <Link href="/portal/candidates" className="btn-primary"><Icon name="person_search" className="text-lg" /> Search New Candidates</Link>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-md mb-space-xl">
        {[
          { label: "Total enquiries", value: stats.total, note: `${stats.last30} in the last 30 days`, badge: null },
          { label: "New", value: stats.new, note: "Awaiting recruiter review", badge: "Awaiting review" },
          { label: "In progress", value: stats.inProgress, note: "Candidate being contacted", badge: "Active" },
          { label: "Introduced", value: stats.introduced, note: `${stats.closed} declined / withdrawn`, badge: null },
        ].map((s) => (
          <div key={s.label} className="tv-panel p-space-lg">
            <div className="flex items-start justify-between gap-2">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{s.label}</span>
              {s.badge && <span className="chip-green">{s.badge}</span>}
            </div>
            <div className="font-display-lg text-[36px] font-extrabold mt-space-xs">{s.value}</div>
            <div className="font-body-sm text-body-sm text-text-muted">{s.note}</div>
          </div>
        ))}
      </div>

      <form method="get" className="tv-panel p-space-md mb-space-xl grid grid-cols-1 md:grid-cols-4 gap-space-sm">
        <label className="relative md:col-span-2">
          <span className="sr-only">Search</span>
          <Icon name="search" className="absolute left-3 top-3 text-outline" />
          <input name="q" defaultValue={sp.q} className="tv-input pl-10" placeholder="Search by enquiry ref or role title" />
        </label>
        <select name="status" defaultValue={sp.status ?? ""} className="tv-select" aria-label="Status">
          <option value="">All statuses</option>
          <option value="open">All open</option>
          <option value="closed">All closed</option>
          {ENQUIRY_STATUS_OPTIONS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div className="flex gap-2">
          <select name="sort" defaultValue={sp.sort ?? ""} className="tv-select" aria-label="Sort">
            <option value="">Most recent</option>
            <option value="updated">Recently updated</option>
            <option value="oldest">Oldest first</option>
          </select>
          <button className="btn-primary px-space-md" aria-label="Apply filters"><Icon name="filter_alt" /></button>
        </div>
      </form>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-xl items-start">
        <section className="xl:col-span-7 tv-panel overflow-hidden">
          <div className="flex items-center gap-space-sm px-space-lg py-space-md border-b border-border-subtle">
            <h2 className="font-heading-sm text-heading-sm font-bold">Registered Enquiries</h2>
            <span className="chip-green">{total} total</span>
          </div>
          {rows.length === 0 ? (
            <div className="p-space-3xl text-center">
              <Icon name="inbox" className="text-4xl text-outline" />
              <p className="font-body-md text-body-md text-text-muted mt-space-sm">No enquiries yet. Find a candidate and send your first enquiry.</p>
              <Link href="/portal/candidates" className="btn-primary mt-space-md">Explore Candidates</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px]">
                <thead className="bg-surface-container-low">
                  <tr><th className="table-head">Enquiry ref</th><th className="table-head">Candidate &amp; brief</th><th className="table-head">Submitted</th><th className="table-head">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {rows.map((r) => (
                    <tr key={r.id} className={cn("hover:bg-surface-container-low", r.ref === selectedRef && "bg-secondary-fixed/10")}>
                      <td className="table-cell font-mono font-semibold">
                        <Link href={`/portal/enquiries?${qs({ selected: r.ref })}`} className="hover:text-primary-container">#{r.ref}</Link>
                      </td>
                      <td className="table-cell">
                        <Link href={`/portal/enquiries?${qs({ selected: r.ref })}`} className="block">
                          <span className="font-mono text-primary-container font-semibold">#{r.candidate?.ref ?? "—"}</span>{" "}
                          <span className="font-label-md text-label-md">{r.role_title}</span>
                          <span className="flex flex-wrap gap-1 mt-1">{r.candidate?.skills.slice(0, 3).map((s) => <span key={s} className="chip">{s}</span>)}</span>
                        </Link>
                      </td>
                      <td className="table-cell whitespace-nowrap">{formatDate(r.created_at)}<div className="text-text-muted">{timeAgo(r.updated_at)}</div></td>
                      <td className="table-cell"><Pill tone={ENQUIRY_TONE[r.status]} dot>{ENQUIRY_STATUS_LABELS[r.status]}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex items-center justify-between px-space-lg py-space-md border-t border-border-subtle">
            <span className="font-body-sm text-body-sm text-text-muted">{total ? `Showing ${(page - 1) * 10 + 1}–${Math.min(total, page * 10)} of ${total}` : ""}</span>
            <Pagination page={page} pageSize={10} total={total} basePath="/portal/enquiries" params={sp} />
          </div>
        </section>

        <aside className="xl:col-span-5 tv-panel p-space-xl border-t-4 border-primary-container xl:sticky xl:top-24">
          {selected ? <EnquiryDetail e={selected} userId={profile.userId} /> : <p className="font-body-sm text-body-sm text-text-muted">Select an enquiry to preview its dossier.</p>}
        </aside>
      </div>

      <section className="mt-space-2xl rounded-2xl bg-surface-alt text-surface-bright p-space-xl md:p-space-2xl flex flex-col md:flex-row md:items-center justify-between gap-space-lg">
        <div>
          <div className="font-label-sm text-label-sm uppercase tracking-wider text-secondary-fixed">Need a custom candidate search?</div>
          <h2 className="font-heading-md text-heading-md mt-1">Hire securely with TalentVault recruiters</h2>
          <p className="font-body-sm text-body-sm text-surface-variant mt-1">Can&apos;t find the right profile? Our team can run a specialist search on your behalf.</p>
        </div>
        <Link href="/portal/candidates" className="btn-primary">Explore Candidates Marketplace</Link>
      </section>
    </div>
  );
}
