import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shell/page-header";
import { FormMessage } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { StatCard } from "@/components/ui/stat-card";
import { EMPLOYER_TONE, ENQUIRY_TONE, PROCESSING_TONE, Pill } from "@/components/ui/status";
import { requireAdminPage } from "@/lib/auth";
import { describeProvider } from "@/lib/cv/providers";
import { EMPLOYER_STATUS_LABELS, ENQUIRY_STATUS_LABELS, PROCESSING_STATUS_LABELS, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Overview" };

type Metrics = Record<string, number>;

export default async function AdminOverview({ searchParams }: { searchParams: Promise<{ error?: string; password?: string }> }) {
  const profile = await requireAdminPage();
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: m }, { data: review }, { data: employers }, { data: enquiries }, { data: activity }] = await Promise.all([
    supabase.rpc("admin_dashboard_metrics"),
    supabase.from("candidates").select("id, ref, pipeline_status, created_at, candidate_profiles(headline)").in("pipeline_status", ["awaiting_review", "failed", "processing", "queued"]).order("created_at", { ascending: false }).limit(6),
    supabase.from("employers").select("id, company_name, status, created_at").eq("status", "pending").order("created_at").limit(5),
    supabase.from("enquiries").select("id, ref, status, role_title, created_at, employers(company_name)").in("status", ["new", "under_review"]).order("created_at").limit(5),
    profile.permissions.has("audit.read")
      ? supabase.from("audit_logs").select("id, action, entity_type, entity_id, created_at, profiles(full_name)").order("created_at", { ascending: false }).limit(10)
      : Promise.resolve({ data: [] as never[] }),
  ]);
  const metrics = (m ?? {}) as Metrics;
  const provider = describeProvider();

  return (
    <div>
      {sp.error === "forbidden" && <div className="mb-space-md"><FormMessage state={{ ok: false, message: "You do not have permission to open that page." }} /></div>}
      {sp.password && <div className="mb-space-md"><FormMessage state={{ ok: true, message: "Password updated." }} /></div>}
      <PageHeader
        crumbs={[{ label: "Admin Console" }, { label: "Overview" }]}
        title="Recruitment Operations Overview"
        description="Live figures from the TalentVault database."
        badge={!provider.isAI ? <Pill tone="amber"><Icon name="warning" className="text-sm" /> AI provider: local development adapter</Pill> : <Pill tone="green" dot>AI provider: {provider.model}</Pill>}
        actions={
          <>
            <Link href="/admin/candidates/new" className="btn-outline"><Icon name="upload_file" className="text-lg" /> Upload Candidate CV</Link>
            <Link href="/admin/processing" className="btn-primary"><Icon name="fact_check" className="text-lg" /> Review Queue</Link>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md mb-space-xl">
        <StatCard label="Candidates in vault" value={metrics.candidates_total ?? 0} icon="folder_shared" foot={`+${metrics.candidates_new_7d ?? 0} in the last 7 days`} />
        <StatCard label="Published profiles" value={metrics.candidates_published ?? 0} icon="verified" foot="Visible to approved employers" />
        <StatCard label="Awaiting review" value={metrics.candidates_awaiting_review ?? 0} icon="assignment_ind" accent="red" foot={`${metrics.candidates_processing ?? 0} processing • ${metrics.candidates_failed ?? 0} failed`} />
        <StatCard label="Open enquiries" value={metrics.enquiries_open ?? 0} icon="forward_to_inbox" accent="mint" foot={`${metrics.enquiries_new ?? 0} new • ${metrics.enquiries_introduced ?? 0} introduced`} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md mb-space-xl">
        {[
          ["Employers approved", metrics.employers_approved, "/admin/employers?status=approved"],
          ["Employers pending verification", metrics.employers_pending, "/admin/employers?status=pending"],
          ["New contact messages", metrics.contact_messages_new, "/admin/settings?tab=messages"],
        ].map(([label, value, href]) => (
          <Link key={label as string} href={href as string} className="tv-panel p-space-lg flex items-center justify-between hover:shadow-float">
            <span className="font-label-md text-label-md text-on-surface-variant">{label}</span>
            <span className="font-display-lg text-[28px] font-extrabold">{(value as number) ?? 0}</span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-space-xl">
        <section className="tv-panel p-space-xl">
          <div className="flex justify-between items-center mb-space-md"><h2 className="font-heading-sm text-heading-sm font-bold">CV pipeline</h2><Link href="/admin/processing" className="font-label-md text-label-md text-primary">Open</Link></div>
          <ul className="divide-y divide-border-subtle">
            {(review ?? []).map((c) => (
              <li key={c.id}>
                <Link href={`/admin/candidates/${c.id}/review`} className="flex items-center justify-between gap-2 py-space-sm">
                  <div className="min-w-0"><div className="font-mono font-label-md text-label-md text-primary">#{c.ref}</div><div className="font-body-sm text-body-sm text-text-muted truncate">{c.candidate_profiles?.headline ?? "—"} • {timeAgo(c.created_at)}</div></div>
                  <Pill tone={PROCESSING_TONE[c.pipeline_status]}>{PROCESSING_STATUS_LABELS[c.pipeline_status]}</Pill>
                </Link>
              </li>
            ))}
            {!review?.length && <li className="py-space-sm font-body-sm text-body-sm text-text-muted">Nothing waiting.</li>}
          </ul>
        </section>
        <section className="tv-panel p-space-xl">
          <div className="flex justify-between items-center mb-space-md"><h2 className="font-heading-sm text-heading-sm font-bold">Employer verification</h2><Link href="/admin/employers?status=pending" className="font-label-md text-label-md text-primary">Open</Link></div>
          <ul className="divide-y divide-border-subtle">
            {(employers ?? []).map((e) => (
              <li key={e.id}>
                <Link href={`/admin/employers?selected=${e.id}`} className="flex items-center justify-between gap-2 py-space-sm">
                  <div className="min-w-0"><div className="font-label-md text-label-md truncate">{e.company_name}</div><div className="font-body-sm text-body-sm text-text-muted">Registered {timeAgo(e.created_at)}</div></div>
                  <Pill tone={EMPLOYER_TONE[e.status]}>{EMPLOYER_STATUS_LABELS[e.status]}</Pill>
                </Link>
              </li>
            ))}
            {!employers?.length && <li className="py-space-sm font-body-sm text-body-sm text-text-muted">No pending registrations.</li>}
          </ul>
        </section>
        <section className="tv-panel p-space-xl">
          <div className="flex justify-between items-center mb-space-md"><h2 className="font-heading-sm text-heading-sm font-bold">Enquiries needing triage</h2><Link href="/admin/enquiries" className="font-label-md text-label-md text-primary">Open</Link></div>
          <ul className="divide-y divide-border-subtle">
            {(enquiries ?? []).map((e) => (
              <li key={e.id}>
                <Link href={`/admin/enquiries?selected=${e.id}`} className="flex items-center justify-between gap-2 py-space-sm">
                  <div className="min-w-0"><div className="font-label-md text-label-md truncate"><span className="font-mono">#{e.ref}</span> • {e.employers?.company_name}</div><div className="font-body-sm text-body-sm text-text-muted truncate">{e.role_title} • {timeAgo(e.created_at)}</div></div>
                  <Pill tone={ENQUIRY_TONE[e.status]}>{ENQUIRY_STATUS_LABELS[e.status]}</Pill>
                </Link>
              </li>
            ))}
            {!enquiries?.length && <li className="py-space-sm font-body-sm text-body-sm text-text-muted">No enquiries awaiting triage.</li>}
          </ul>
        </section>
      </div>

      {!!activity?.length && (
        <section className="tv-panel p-space-xl mt-space-xl">
          <div className="flex justify-between items-center mb-space-md"><h2 className="font-heading-sm text-heading-sm font-bold">Recent activity</h2><Link href="/admin/settings?tab=audit" className="font-label-md text-label-md text-primary">Audit log</Link></div>
          <ul className="space-y-1.5">
            {activity.map((a) => (
              <li key={a.id} className="flex flex-wrap gap-x-space-sm font-body-sm text-body-sm">
                <span className="font-mono text-text-muted w-28">{timeAgo(a.created_at)}</span>
                <span className="font-semibold">{a.action}</span>
                <span className="text-text-muted">{a.entity_type} {a.entity_id ? `• ${a.entity_id.slice(0, 8)}` : ""}</span>
                <span className="text-text-muted">{a.profiles?.full_name ? `by ${a.profiles.full_name}` : "system"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
