import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shell/page-header";
import { AutoRefresh } from "@/components/ui/auto-refresh";
import { SubmitButton } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { StatCard } from "@/components/ui/stat-card";
import { PROCESSING_TONE, Pill } from "@/components/ui/status";
import { requireAdminPage } from "@/lib/auth";
import { describeProvider } from "@/lib/cv/providers";
import { PROCESSING_STATUS_LABELS, formatDateTime, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { runQueueNow } from "../candidates/actions";

export const metadata: Metadata = { title: "CV Processing Pipeline" };
export const maxDuration = 300;

export default async function ProcessingPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdminPage();
  const { status } = await searchParams;
  const supabase = await createClient();
  const statuses = ["queued", "processing", "awaiting_review", "failed", "approved", "uploaded"] as const;
  const counts = await Promise.all(statuses.map((s) => supabase.from("cv_processing_jobs").select("id", { count: "exact", head: true }).eq("status", s).then((r) => [s, r.count ?? 0] as const)));
  const countMap = Object.fromEntries(counts) as Record<(typeof statuses)[number], number>;
  let q = supabase.from("cv_processing_jobs").select("id, status, attempts, max_attempts, last_error, created_at, started_at, completed_at, candidate_id, candidates(ref, source, candidate_profiles(headline))").order("created_at", { ascending: false }).limit(50);
  if (status && (statuses as readonly string[]).includes(status)) q = q.eq("status", status as (typeof statuses)[number]);
  else q = q.in("status", ["queued", "processing", "awaiting_review", "failed", "uploaded"]);
  const { data: jobs } = await q;
  const provider = describeProvider();
  const active = countMap.queued + countMap.processing > 0;

  return (
    <div>
      <AutoRefresh active={active} intervalMs={8000} />
      <PageHeader
        crumbs={[{ label: "Admin Console", href: "/admin" }, { label: "AI Processing Pipeline" }]}
        title="CV Upload & AI Processing"
        description="Queue status for CV extraction, anonymisation and review. Jobs run server-side (after each submission, via the scheduled cron endpoint, or the worker process)."
        actions={
          <>
            <Link href="/admin/candidates/new" className="btn-outline"><Icon name="upload_file" className="text-lg" /> Upload CV</Link>
            <form action={runQueueNow}><SubmitButton icon="play_arrow" pendingText="Processing…">Process Queue Now</SubmitButton></form>
          </>
        }
      />
      <div className={`mb-space-xl rounded-xl p-space-md flex gap-space-sm ${provider.isAI ? "bg-secondary-fixed/25 text-on-secondary-container" : "bg-[#fff3cd] text-[#7a5a00]"}`}>
        <Icon name={provider.isAI ? "smart_toy" : "warning"} />
        <p className="font-body-sm text-body-sm">
          {provider.isAI
            ? `AI provider: Anthropic (${provider.model}). Structured output is schema-validated and every result requires human approval.`
            : "No AI provider configured — the clearly-labelled local development adapter is active. Its output is NOT AI analysis. Set AI_PROVIDER=anthropic and ANTHROPIC_API_KEY to enable real CV analysis."}
        </p>
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-space-md mb-space-xl">
        <StatCard label="Queued" value={countMap.queued + countMap.uploaded} icon="schedule" />
        <StatCard label="Processing" value={countMap.processing} icon="memory" accent="mint" />
        <StatCard label="Awaiting review" value={countMap.awaiting_review} icon="assignment_ind" accent="red" />
        <StatCard label="Failed" value={countMap.failed} icon="error" accent="dark" />
      </div>
      <div className="flex flex-wrap gap-2 mb-space-md">
        {[["", "Active"], ...statuses.map((s) => [s, PROCESSING_STATUS_LABELS[s]])].map(([k, label]) => (
          <Link key={k} href={k ? `/admin/processing?status=${k}` : "/admin/processing"} className={`chip ${status === k || (!status && !k) ? "bg-primary-container text-on-primary" : ""}`}>{label}</Link>
        ))}
      </div>
      <div className="tv-panel overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead className="bg-surface-container-low"><tr><th className="table-head">Candidate</th><th className="table-head">Status</th><th className="table-head">Attempts</th><th className="table-head">Queued</th><th className="table-head">Completed</th><th className="table-head"></th></tr></thead>
          <tbody className="divide-y divide-border-subtle">
            {(jobs ?? []).map((j) => (
              <tr key={j.id}>
                <td className="table-cell"><div className="font-mono font-semibold text-primary-container">#{j.candidates?.ref}</div><div className="text-text-muted">{j.candidates?.candidate_profiles?.headline ?? "—"} • {j.candidates?.source.replace("_", " ")}</div></td>
                <td className="table-cell"><Pill tone={PROCESSING_TONE[j.status]} dot>{PROCESSING_STATUS_LABELS[j.status]}</Pill>{j.last_error && <div className="text-error mt-1 max-w-xs">{j.last_error}</div>}</td>
                <td className="table-cell">{j.attempts}/{j.max_attempts}</td>
                <td className="table-cell">{timeAgo(j.created_at)}</td>
                <td className="table-cell">{j.completed_at ? formatDateTime(j.completed_at) : "—"}</td>
                <td className="table-cell text-right"><Link href={`/admin/candidates/${j.candidate_id}/review`} className="btn-secondary btn-sm">{j.status === "awaiting_review" ? "Review" : "Open"}</Link></td>
              </tr>
            ))}
            {!jobs?.length && <tr><td colSpan={6} className="p-space-2xl text-center text-text-muted">No jobs in this view.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
