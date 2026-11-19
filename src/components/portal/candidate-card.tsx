import Link from "next/link";
import { AVAILABILITY_LABELS, WORK_MODE_LABELS, formatSalaryRange, timeAgo } from "@/lib/format";
import type { Database } from "@/lib/supabase/database.types";
import { Icon } from "../ui/icon";

type Row = Database["public"]["Functions"]["search_candidate_profiles"]["Returns"][number];

/** Anonymous candidate card (Stitch "Candidate Discovery Marketplace" layout). Receives ONLY anonymous fields. */
export function CandidateCard({ c }: { c: Row }) {
  return (
    <article className="tv-panel p-space-xl hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-shadow">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-space-md">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-space-sm">
            <span className="chip font-mono"><Icon name="badge" className="text-sm" /> Candidate #{c.ref}</span>
            <span className="font-label-sm text-label-sm text-text-muted">Published {timeAgo(c.published_at)}</span>
            {c.is_sample && <span className="chip bg-[#fff3cd] text-[#7a5a00]">Sample data</span>}
          </div>
          <h2 className="font-heading-md text-[22px] md:text-heading-md font-bold text-text-primary leading-tight">
            <Link href={`/portal/candidates/${c.ref}`} className="hover:text-primary-container">{c.headline ?? c.job_title}</Link>
          </h2>
          <div className="flex flex-wrap gap-x-space-lg gap-y-1 mt-space-sm font-body-sm text-body-sm text-on-surface-variant">
            {c.location_region && <span className="flex items-center gap-1"><Icon name="location_on" className="text-base" />{c.location_region}{c.work_modes?.length ? ` (${c.work_modes.map((m) => WORK_MODE_LABELS[m]).join(" / ")})` : ""}</span>}
            {!!c.industries?.length && <span className="flex items-center gap-1"><Icon name="domain" className="text-base" />{c.industries.slice(0, 3).join(" • ")}</span>}
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-2 shrink-0 text-center">
          <div className="rounded-lg bg-surface-container-low px-3 py-2">
            <dt className="font-label-sm text-label-sm uppercase text-text-muted">Experience</dt>
            <dd className="font-label-md text-label-md text-text-primary">{c.years_experience != null ? `${c.years_experience} Years` : "—"}</dd>
          </div>
          <div className="rounded-lg bg-surface-container-low px-3 py-2">
            <dt className="font-label-sm text-label-sm uppercase text-text-muted">Target Salary</dt>
            <dd className="font-label-md text-label-md text-text-primary">{formatSalaryRange(c.salary_min, c.salary_max, c.salary_currency)}</dd>
          </div>
          <div className={`rounded-lg px-3 py-2 ${c.availability === "immediate" ? "bg-secondary-fixed/40" : "bg-surface-container-low"}`}>
            <dt className="font-label-sm text-label-sm uppercase text-text-muted">Notice</dt>
            <dd className="font-label-md text-label-md text-text-primary">{c.availability ? AVAILABILITY_LABELS[c.availability].replace(" Notice", "") : "—"}</dd>
          </div>
        </dl>
      </div>

      {c.summary && (
        <div className="mt-space-lg rounded-xl bg-surface-container-low p-space-md flex gap-space-sm">
          <Icon name="auto_awesome" className="text-primary text-xl" />
          <div>
            <div className="font-label-sm text-label-sm uppercase tracking-wider text-primary mb-1">AI-assisted summary • recruiter reviewed</div>
            <p className="font-body-sm text-body-sm text-on-surface line-clamp-4">{c.summary}</p>
          </div>
        </div>
      )}

      {!!c.skills?.length && (
        <div className="flex flex-wrap gap-1.5 mt-space-md">
          {c.skills.slice(0, 10).map((s) => <span key={s} className="chip-green">{s}</span>)}
          {c.skills.length > 10 && <span className="chip">+{c.skills.length - 10}</span>}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm mt-space-lg pt-space-md border-t border-surface-container-low">
        <span className="font-label-sm text-label-sm text-text-muted flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-primary-container" /> Identity protected • consent-led introductions</span>
        <div className="flex gap-space-sm">
          <Link href={`/portal/candidates/${c.ref}`} className="btn-ghost"><Icon name="visibility" className="text-lg" /> View Full Profile</Link>
          <Link href={`/portal/candidates/${c.ref}?enquire=1`} className="btn-primary"><Icon name="mail" className="text-lg" /> Enquire About Candidate</Link>
        </div>
      </div>
    </article>
  );
}
