import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shell/page-header";
import { Icon } from "@/components/ui/icon";
import { requireEmployerPage } from "@/lib/auth";
import { AVAILABILITY_LABELS, formatSalaryRange, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { toggleShortlist } from "../actions";

export const metadata: Metadata = { title: "Shortlist" };

export default async function ShortlistPage() {
  await requireEmployerPage({ approved: true });
  const supabase = await createClient();
  const { data: list } = await supabase.from("shortlists").select("candidate_id, created_at").order("created_at", { ascending: false });
  const ids = (list ?? []).map((l) => l.candidate_id);
  const { data: profiles } = ids.length
    ? await supabase.from("candidate_profiles").select("candidate_id, ref, headline, years_experience, location_region, salary_min, salary_max, availability, skills").in("candidate_id", ids)
    : { data: [] };
  const byId = new Map((profiles ?? []).map((p) => [p.candidate_id, p]));

  return (
    <div>
      <PageHeader crumbs={[{ label: "Employer Workspace", href: "/portal" }, { label: "Shortlist" }]} title="Shortlist" description="Anonymous profiles your team has saved for later." />
      {!list?.length ? (
        <div className="tv-panel p-space-3xl text-center">
          <Icon name="bookmark" className="text-4xl text-outline" />
          <p className="font-body-md text-body-md text-text-muted mt-space-sm">Your shortlist is empty.</p>
          <Link href="/portal/candidates" className="btn-primary mt-space-md">Browse candidates</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-lg">
          {list.map((l) => {
            const p = byId.get(l.candidate_id);
            return (
              <article key={l.candidate_id} className="tv-panel p-space-xl flex flex-col">
                <div className="font-label-sm text-label-sm text-text-muted font-mono">{p ? `#${p.ref}` : "Unavailable"} • saved {timeAgo(l.created_at)}</div>
                {p ? (
                  <>
                    <h2 className="font-heading-sm text-heading-sm font-bold mt-1">{p.headline}</h2>
                    <p className="font-body-sm text-body-sm text-text-muted">{[p.years_experience != null && `${p.years_experience} yrs`, p.location_region, formatSalaryRange(p.salary_min, p.salary_max), p.availability && AVAILABILITY_LABELS[p.availability]].filter(Boolean).join(" • ")}</p>
                    <div className="flex flex-wrap gap-1 mt-space-sm">{p.skills.slice(0, 5).map((s) => <span key={s} className="chip">{s}</span>)}</div>
                  </>
                ) : (
                  <p className="font-body-sm text-body-sm text-text-muted mt-1">This profile is no longer published.</p>
                )}
                <div className="flex gap-space-sm mt-auto pt-space-lg">
                  {p && <Link href={`/portal/candidates/${p.ref}`} className="btn-primary btn-sm">View profile</Link>}
                  <form action={toggleShortlist}>
                    <input type="hidden" name="candidate_id" value={l.candidate_id} />
                    <button className="btn-ghost btn-sm">Remove</button>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
