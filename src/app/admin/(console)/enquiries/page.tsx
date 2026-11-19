import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shell/page-header";
import { Icon } from "@/components/ui/icon";
import { Pagination } from "@/components/ui/pagination";
import { StatCard } from "@/components/ui/stat-card";
import { ENQUIRY_TONE, Pill } from "@/components/ui/status";
import { requireAdminPage } from "@/lib/auth";
import { listAdmins } from "@/lib/data/admin-candidates";
import { ENQUIRY_STATUS_LABELS, cn, formatDateTime, formatSalaryRange, initials, timeAgo } from "@/lib/format";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { ConsentRequestForm, IntroductionForm, NoteForm, RecordConsentForm, TriageForm } from "./forms";

export const metadata: Metadata = { title: "Enquiry Management" };
type Status = Database["public"]["Enums"]["enquiry_status"];
const TABS: [string, string, Status[] | null][] = [
  ["", "All enquiries", null],
  ["new", "New", ["new"]],
  ["active", "In progress", ["under_review", "candidate_contacted", "candidate_consented"]],
  ["introduced", "Introduced", ["introduced", "closed_placed"]],
  ["closed", "Closed", ["closed_declined", "withdrawn"]],
];
const PAGE = 15;

export default async function AdminEnquiriesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const profile = await requireAdminPage("enquiries.manage");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  const tab = TABS.find((t) => t[0] === (sp.tab ?? "")) ?? TABS[0]!;
  let q = supabase.from("enquiries").select("id, ref, status, role_title, created_at, updated_at, assigned_admin_id, candidate_id, employers(company_name), candidates(ref, candidate_private(full_name), candidate_profiles(headline))", { count: "exact" });
  if (tab[2]) q = q.in("status", tab[2]);
  if (sp.assigned === "me") q = q.eq("assigned_admin_id", profile.userId);
  if (sp.q) q = q.or(`ref.ilike.%${sp.q.replace(/[%,()]/g, "")}%,role_title.ilike.%${sp.q.replace(/[%,()]/g, "")}%`);
  const [{ data: rows, count }, admins, { data: metrics }] = await Promise.all([
    q.order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1),
    listAdmins(),
    supabase.rpc("admin_dashboard_metrics"),
  ]);
  const m = (metrics ?? {}) as Record<string, number>;
  const adminName = new Map(admins.map((a) => [a.id, a.full_name ?? a.email]));
  const selectedId = sp.selected ?? rows?.[0]?.id;

  const sel = selectedId
    ? (await supabase
        .from("enquiries")
        .select("*, employers(id, company_name, city, vat_number, company_number, status), creator:profiles!enquiries_created_by_fkey(full_name, job_title, email, phone)")
        .eq("id", selectedId)
        .maybeSingle()).data
    : null;
  const [cand, events, consentForThis] = sel
    ? await Promise.all([
        supabase.from("candidates").select("id, ref, candidate_private(full_name, email, phone), candidate_profiles(headline, skills, salary_min, salary_max, availability)").eq("id", sel.candidate_id).single().then((r) => r.data),
        supabase.from("enquiry_events").select("id, type, visibility, from_status, to_status, body, created_at, author:profiles(full_name, role)").eq("enquiry_id", sel.id).order("created_at").then((r) => r.data ?? []),
        supabase.from("consent_records").select("id").eq("candidate_id", sel.candidate_id).eq("consent_type", "identity_disclosure").eq("policy_version", `enquiry:${sel.ref}`).maybeSingle().then((r) => !!r.data),
      ])
    : [null, [], false];
  const qs = (extra: Record<string, string>) => new URLSearchParams(Object.entries({ ...sp, ...extra }).filter((e): e is [string, string] => !!e[1])).toString();
  const consentTemplate = sel
    ? `A ${sel.employers?.company_name ? `hiring team at ${sel.employers.company_name}` : "verified employer"} has enquired about your anonymous profile (Candidate #${cand?.ref}) for the role "${sel.role_title}"${sel.salary_offer ? ` (indicative package: ${sel.salary_offer})` : ""}.\n\nRole overview from the employer:\n"${sel.requirement}"\n\nWould you like us to introduce you and share your CV with this employer?`
    : "";
  const introTemplate = sel && cand
    ? `We are pleased to introduce Candidate #${cand.ref}, who has agreed to be introduced for the ${sel.role_title} role.\n\nName: ${cand.candidate_private?.full_name ?? ""}\nEmail: ${cand.candidate_private?.email ?? ""}${cand.candidate_private?.phone ? `\nPhone: ${cand.candidate_private.phone}` : ""}\n\nYour TalentVault recruiter will follow up to coordinate next steps.`
    : "";

  return (
    <div>
      <PageHeader
        crumbs={[{ label: "Admin Console", href: "/admin" }, { label: "Enquiry Management & Matchmaking" }]}
        title="Active Enquiry Orchestration"
        badge={<Pill tone="green" dot>{m.enquiries_open ?? 0} open</Pill>}
        description="Triage employer enquiries, contact candidates for consent and coordinate introductions. Internal notes are never visible to employers."
      />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-space-md mb-space-xl">
        <StatCard label="Total enquiries" value={m.enquiries_total ?? 0} icon="inventory_2" foot={`${m.enquiries_30d ?? 0} in last 30 days`} />
        <StatCard label="Awaiting triage" value={m.enquiries_new ?? 0} icon="timer" accent="red" foot="Status: New" />
        <StatCard label="Open / in outreach" value={m.enquiries_open ?? 0} icon="hub" accent="mint" foot="Candidate clearance in progress" />
        <StatCard label="Introductions made" value={m.enquiries_introduced ?? 0} icon="handshake" foot="Introduced or placed" />
      </div>

      <div className="tv-panel p-space-md mb-space-lg flex flex-col lg:flex-row gap-space-sm lg:items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {TABS.map(([k, label]) => (
            <Link key={k} href={`/admin/enquiries?${qs({ tab: k, page: "", selected: "" })}`} className={cn("px-space-md py-1.5 rounded-full font-label-md text-label-md", (sp.tab ?? "") === k ? "bg-primary-container text-on-primary" : "hover:bg-surface-container-high")}>{label}</Link>
          ))}
        </div>
        <form method="get" className="flex gap-2">
          {sp.tab && <input type="hidden" name="tab" value={sp.tab} />}
          <input name="q" defaultValue={sp.q} aria-label="Search enquiries" className="tv-input h-10" placeholder="Ref or role" />
          <select name="assigned" defaultValue={sp.assigned ?? ""} className="tv-select h-10" aria-label="Assignee"><option value="">Anyone</option><option value="me">Assigned to me</option></select>
          <button className="btn-primary h-10" aria-label="Search"><Icon name="search" /></button>
        </form>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-xl items-start">
        <section className="xl:col-span-6 tv-panel overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead className="bg-surface-container-low"><tr><th className="table-head">Ref</th><th className="table-head">Employer</th><th className="table-head">Candidate</th><th className="table-head">Status</th></tr></thead>
            <tbody className="divide-y divide-border-subtle">
              {(rows ?? []).map((r) => (
                <tr key={r.id} className={cn("hover:bg-surface-container-low", r.id === selectedId && "bg-secondary-fixed/10")}>
                  <td className="table-cell"><Link href={`/admin/enquiries?${qs({ selected: r.id })}`} className="font-mono font-semibold text-primary-container">#{r.ref}</Link><div className="text-text-muted">{timeAgo(r.created_at)}</div></td>
                  <td className="table-cell"><div className="font-label-md text-label-md">{r.employers?.company_name}</div><div className="text-text-muted">{r.role_title}</div></td>
                  <td className="table-cell"><div className="font-label-md text-label-md">{r.candidates?.candidate_private?.full_name} <span className="chip font-mono">#{r.candidates?.ref}</span></div><div className="text-text-muted truncate max-w-[200px]">{r.candidates?.candidate_profiles?.headline}</div></td>
                  <td className="table-cell"><Pill tone={ENQUIRY_TONE[r.status]} dot>{ENQUIRY_STATUS_LABELS[r.status]}</Pill><div className="text-text-muted mt-1">{r.assigned_admin_id ? adminName.get(r.assigned_admin_id) : "Unassigned"}</div></td>
                </tr>
              ))}
              {!rows?.length && <tr><td colSpan={4} className="p-space-2xl text-center text-text-muted">No enquiries in this view.</td></tr>}
            </tbody>
          </table>
          <div className="flex justify-between items-center px-space-lg py-space-md border-t border-border-subtle">
            <span className="font-body-sm text-body-sm text-text-muted">{count ?? 0} records</span>
            <Pagination page={page} pageSize={PAGE} total={count ?? 0} basePath="/admin/enquiries" params={sp} />
          </div>
        </section>

        <aside className="xl:col-span-6 tv-panel p-space-xl xl:sticky xl:top-24 space-y-space-xl">
          {sel && cand ? (
            <>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="chip-green">Selected dossier</span>
                  <h2 className="font-heading-md text-heading-md mt-1">Enquiry Ref #{sel.ref}</h2>
                  <div className="font-body-sm text-body-sm text-text-muted">Submitted {formatDateTime(sel.created_at)} • Assigned: {sel.assigned_admin_id ? adminName.get(sel.assigned_admin_id) : "nobody"}</div>
                </div>
                <Pill tone={ENQUIRY_TONE[sel.status]} dot>{ENQUIRY_STATUS_LABELS[sel.status]}</Pill>
              </div>
              <TriageForm key={`${sel.id}-${sel.status}-${sel.assigned_admin_id}`} enquiryId={sel.id} status={sel.status} assigned={sel.assigned_admin_id} admins={admins.map((a) => ({ id: a.id, name: a.full_name ?? a.email }))} />

              <section>
                <h3 className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant mb-space-sm">Section A • Employer brief</h3>
                <div className="rounded-xl bg-surface-container-low p-space-md space-y-space-sm">
                  <div className="flex items-center gap-space-sm">
                    <span className="h-10 w-10 rounded-full bg-surface-alt text-surface-bright grid place-items-center font-label-md text-label-md">{initials(sel.employers?.company_name)}</span>
                    <div><Link href={`/admin/employers?selected=${sel.employers?.id}`} className="font-label-md text-label-md text-[15px]">{sel.employers?.company_name}</Link><div className="font-body-sm text-body-sm text-text-muted">{[sel.employers?.city, sel.employers?.company_number && `Reg ${sel.employers.company_number}`].filter(Boolean).join(" • ")}</div></div>
                  </div>
                  <div className="font-body-sm text-body-sm">{sel.creator?.full_name}{sel.creator?.job_title ? ` (${sel.creator.job_title})` : ""} • {sel.creator?.email} {sel.contact_phone ? `• ${sel.contact_phone}` : ""}</div>
                  <div><div className="font-label-sm text-label-sm uppercase text-text-muted">Role: {sel.role_title}{sel.salary_offer ? ` • ${sel.salary_offer}` : ""}</div><blockquote className="font-body-sm text-body-sm italic mt-1 whitespace-pre-line">“{sel.requirement}”</blockquote></div>
                </div>
              </section>

              <section>
                <div className="flex justify-between mb-space-sm"><h3 className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Section B • Connected candidate record</h3><span className="chip"><Icon name="lock_open" className="text-sm" /> Admin view</span></div>
                <div className="rounded-xl bg-surface-container-low p-space-md">
                  <div className="flex justify-between gap-2">
                    <div><div className="font-label-md text-label-md text-[15px]">{cand.candidate_private?.full_name} <span className="chip font-mono">#{cand.ref}</span></div><div className="font-body-sm text-body-sm text-text-muted">{cand.candidate_profiles?.headline}</div></div>
                    <Link href={`/admin/candidates/${cand.id}`} className="font-label-sm text-label-sm text-primary whitespace-nowrap">Full record <Icon name="open_in_new" className="text-sm align-middle" /></Link>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-space-sm font-body-sm text-body-sm">
                    <div className="rounded-lg bg-surface-container-lowest p-space-sm"><div className="text-text-muted">Candidate target</div>{formatSalaryRange(cand.candidate_profiles?.salary_min, cand.candidate_profiles?.salary_max)}</div>
                    <div className="rounded-lg bg-surface-container-lowest p-space-sm"><div className="text-text-muted">Availability</div>{cand.candidate_profiles?.availability?.replace("_", " ") ?? "—"}</div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-space-sm">{cand.candidate_profiles?.skills.slice(0, 6).map((s) => <span key={s} className="chip-green">{s}</span>)}</div>
                </div>
              </section>

              <section>
                <div className="flex justify-between mb-space-sm"><h3 className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Section C • Anonymity gate &amp; clearance</h3><Pill tone={sel.status === "introduced" ? "green" : "red"}>{sel.status === "introduced" ? "Introduced" : consentForThis ? "Consent recorded" : "Identity masked to employer"}</Pill></div>
                <div className="space-y-space-md">
                  {["new", "under_review", "candidate_contacted"].includes(sel.status) && (
                    <>
                      <div className="rounded-xl border border-border-subtle p-space-md">
                        <div className="font-label-md text-label-md mb-1 flex items-center gap-1"><Icon name="mail_lock" className="text-base" /> 1. Ask the candidate for consent</div>
                        <p className="font-body-sm text-body-sm text-text-muted mb-space-sm">Emailed to the candidate&apos;s private address. Nothing is shared with the employer.</p>
                        <ConsentRequestForm enquiryId={sel.id} template={consentTemplate} />
                      </div>
                      <div className="rounded-xl border border-border-subtle p-space-md">
                        <div className="font-label-md text-label-md mb-1 flex items-center gap-1"><Icon name="how_to_reg" className="text-base" /> 2. Record the candidate&apos;s agreement</div>
                        <RecordConsentForm enquiryId={sel.id} />
                      </div>
                    </>
                  )}
                  {sel.status === "candidate_consented" && (
                    <div className="rounded-xl border border-primary-container/40 p-space-md">
                      <div className="font-label-md text-label-md mb-1 flex items-center gap-1"><Icon name="handshake" className="text-base" /> 3. Make the introduction</div>
                      <IntroductionForm enquiryId={sel.id} template={introTemplate} />
                    </div>
                  )}
                  {!["new", "under_review", "candidate_contacted", "candidate_consented"].includes(sel.status) && <p className="font-body-sm text-body-sm text-text-muted">This enquiry is {ENQUIRY_STATUS_LABELS[sel.status].toLowerCase()}.</p>}
                </div>
              </section>

              <section>
                <h3 className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant mb-space-sm">Section D • Operational audit log</h3>
                <ol className="space-y-space-sm max-h-[420px] overflow-y-auto rounded-xl bg-surface-container-low p-space-md">
                  {events.map((ev) => (
                    <li key={ev.id} className="font-body-sm text-body-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-text-muted">{formatDateTime(ev.created_at)}</span>
                        <Pill tone={ev.visibility === "internal" ? "dark" : "green"}>{ev.visibility === "internal" ? "Internal" : "Employer-visible"}</Pill>
                        <span className="font-semibold">{ev.author?.full_name ?? "System"}</span>
                      </div>
                      <div className="mt-0.5 whitespace-pre-line">
                        {ev.type === "status_change" || ev.type === "introduction" ? `Status ${ev.from_status ? ENQUIRY_STATUS_LABELS[ev.from_status] : ""} → ${ev.to_status ? ENQUIRY_STATUS_LABELS[ev.to_status] : ""}` : null}
                        {ev.body}
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="mt-space-md"><NoteForm enquiryId={sel.id} /></div>
              </section>
            </>
          ) : <p className="text-text-muted">Select an enquiry to view the dossier.</p>}
        </aside>
      </div>
    </div>
  );
}
