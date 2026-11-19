import type { Metadata } from "next";
import Link from "next/link";
import { CandidateCard } from "@/components/portal/candidate-card";
import { SortSelect } from "@/components/portal/sort-select";
import { Icon } from "@/components/ui/icon";
import { Pagination } from "@/components/ui/pagination";
import { requireEmployerPage } from "@/lib/auth";
import { AVAILABILITY_OPTIONS, WORK_MODE_OPTIONS } from "@/lib/format";
import { EXPERIENCE_BANDS, PAGE_SIZE, SORTS, activeFilterChips, getFacets, parseSearchParams, searchCandidates, type SearchParams } from "@/lib/data/search";

export const metadata: Metadata = { title: "Candidate Discovery" };

function hrefWithout(sp: SearchParams, key: string, value?: string) {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    for (const item of Array.isArray(v) ? v : v ? [v] : []) {
      if (k === "page") continue;
      if (k === key && (value === undefined || item === value)) continue;
      out.append(k, item);
    }
  }
  const qs = out.toString();
  return `/portal/candidates${qs ? `?${qs}` : ""}`;
}

export default async function CandidateSearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireEmployerPage({ approved: true });
  const sp = await searchParams;
  const p = parseSearchParams(sp);
  const [{ rows, total, error }, facets] = await Promise.all([searchCandidates(p), getFacets()]);
  const chips = activeFilterChips(p);
  const skillOptions = [...new Set([...p.skills, ...facets.skills])].slice(0, 24);

  return (
    <div className="space-y-space-xl">
      {/* Header panel */}
      <section className="relative overflow-hidden rounded-2xl bg-surface-container-low p-space-xl md:p-space-2xl">
        <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full border border-outline-variant/40 pointer-events-none" />
        <div className="absolute -right-4 -top-4 h-44 w-44 rounded-full border border-outline-variant/40 pointer-events-none" />
        <div className="relative">
          <div className="flex flex-wrap gap-2 mb-space-md">
            <span className="chip-green"><Icon name="verified" className="text-sm" /> Recruiter-reviewed profiles</span>
            <span className="chip"><Icon name="visibility_off" className="text-sm" /> Identities protected</span>
          </div>
          <h1 className="page-title">Candidate Discovery Marketplace</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-space-xs max-w-2xl">
            Search anonymised, pre-vetted professional profiles by skills, experience, salary expectations and availability.
          </p>
          <form action="/portal/candidates" method="get" role="search" className="mt-space-lg bg-surface-container-lowest rounded-2xl sm:rounded-full p-2 shadow-float flex flex-col sm:flex-row gap-2">
            <label className="flex-1 flex items-center gap-space-sm px-space-md">
              <Icon name="search" className="text-outline" />
              <span className="sr-only">Keywords</span>
              <input name="q" defaultValue={p.q} className="w-full h-10 bg-transparent outline-none font-body-md text-body-md" placeholder="Skills, technologies, role keywords (e.g. Kubernetes, FinOps)" />
            </label>
            {/* keep other filters when searching by keyword */}
            {Object.entries(sp).filter(([k]) => !["q", "page"].includes(k)).flatMap(([k, v]) => (Array.isArray(v) ? v : v ? [v] : []).map((val) => <input key={`${k}-${val}`} type="hidden" name={k} value={val} />))}
            <button className="btn-primary h-11 px-space-xl">Search <Icon name="arrow_forward" className="text-base" /></button>
          </form>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
        {/* Filters */}
        <aside className="lg:col-span-3 tv-panel p-space-lg lg:sticky lg:top-24">
          <form action="/portal/candidates" method="get" className="space-y-space-lg">
            {p.q && <input type="hidden" name="q" value={p.q} />}
            <input type="hidden" name="sort" value={p.sort} />
            <div className="flex items-center justify-between">
              <h2 className="font-heading-sm text-heading-sm font-bold flex items-center gap-2"><Icon name="filter_list" /> Filters</h2>
              {chips.length > 0 && <Link href="/portal/candidates" className="font-label-sm text-label-sm text-primary">Clear all</Link>}
            </div>

            <div>
              <label htmlFor="f-title" className="tv-label">Job title</label>
              <input id="f-title" name="title" defaultValue={p.title} className="tv-input h-10" placeholder="e.g. Engineer" />
            </div>
            <div>
              <label htmlFor="f-location" className="tv-label">Location</label>
              <input id="f-location" name="location" defaultValue={p.location} className="tv-input h-10" placeholder="e.g. London" />
            </div>

            <fieldset>
              <legend className="tv-label">Experience level</legend>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(EXPERIENCE_BANDS).map(([k, [, , label]]) => (
                  <label key={k} className="flex items-center gap-2 rounded-lg border border-border-subtle px-2 py-2 font-body-sm text-body-sm has-[:checked]:bg-secondary-fixed/30 has-[:checked]:border-primary-container cursor-pointer">
                    <input type="checkbox" name="exp" value={k} defaultChecked={p.exp.includes(k)} className="accent-[#1a6840]" />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="tv-label">Work arrangement</legend>
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-surface-container-low p-1">
                {WORK_MODE_OPTIONS.map(([k, label]) => (
                  <label key={k} className="text-center rounded-md py-1.5 font-label-sm text-label-sm cursor-pointer has-[:checked]:bg-surface-container-lowest has-[:checked]:shadow-sm">
                    <input type="checkbox" name="work_mode" value={k} defaultChecked={p.workModes.includes(k)} className="sr-only" />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="tv-label">Target salary (GBP)</legend>
              <div className="flex items-center gap-2">
                <input name="salary_min" inputMode="numeric" aria-label="Minimum salary" defaultValue={p.salaryMin ?? ""} className="tv-input h-10" placeholder="£ min" />
                <span className="text-text-muted">to</span>
                <input name="salary_max" inputMode="numeric" aria-label="Maximum salary" defaultValue={p.salaryMax ?? ""} className="tv-input h-10" placeholder="£ max" />
              </div>
            </fieldset>

            <fieldset>
              <legend className="tv-label">Availability</legend>
              <div className="space-y-1.5">
                {AVAILABILITY_OPTIONS.filter(([k]) => k !== "not_looking").map(([k, label]) => (
                  <label key={k} className="flex items-center gap-2 font-body-sm text-body-sm cursor-pointer">
                    <input type="checkbox" name="availability" value={k} defaultChecked={p.availability.includes(k)} className="accent-[#1a6840] h-4 w-4" />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            {skillOptions.length > 0 && (
              <fieldset>
                <legend className="tv-label">Core competencies <span className="font-body-sm text-text-muted">(all selected)</span></legend>
                <div className="flex flex-wrap gap-1.5">
                  {skillOptions.map((s) => (
                    <label key={s} className="chip cursor-pointer has-[:checked]:bg-primary-container has-[:checked]:text-on-primary">
                      <input type="checkbox" name="skill" value={s} defaultChecked={p.skills.includes(s)} className="sr-only" />
                      {s}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            {facets.industries.length > 0 && (
              <fieldset>
                <legend className="tv-label">Industry</legend>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {facets.industries.map((i) => (
                    <label key={i} className="flex items-center gap-2 font-body-sm text-body-sm cursor-pointer">
                      <input type="checkbox" name="industry" value={i} defaultChecked={p.industries.includes(i)} className="accent-[#1a6840] h-4 w-4" />
                      {i}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            <button className="btn-primary w-full"><Icon name="filter_alt" className="text-lg" /> Apply Filters</button>
            <Link href="/portal/candidates" className="btn-ghost w-full">Reset to defaults</Link>
          </form>
        </aside>

        {/* Results */}
        <section className="lg:col-span-9 space-y-space-lg" aria-live="polite">
          <div className="tv-panel p-space-md flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
            <div>
              <div className="font-heading-sm text-heading-sm font-bold">
                {error ? "Search unavailable" : `Showing ${total.toLocaleString("en-GB")} anonymised candidate${total === 1 ? "" : "s"}`}
              </div>
              {chips.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {chips.map((c) => (
                    <Link key={`${c.key}-${c.value ?? ""}`} href={hrefWithout(sp, c.key, c.value)} className="chip capitalize hover:bg-surface-container-high" aria-label={`Remove filter ${c.label}`}>
                      {c.label} <Icon name="close" className="text-sm" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <SortSelect options={SORTS} value={p.sort} />
          </div>

          {error && <div className="tv-panel p-space-xl text-error">We could not run your search. Please try again shortly.</div>}
          {!error && rows.length === 0 && (
            <div className="tv-panel p-space-3xl text-center">
              <span className="mx-auto h-14 w-14 rounded-full bg-surface-container-high grid place-items-center mb-space-md"><Icon name="search_off" className="text-3xl text-outline" /></span>
              <h2 className="font-heading-sm text-heading-sm font-bold">No candidates match these filters</h2>
              <p className="font-body-sm text-body-sm text-text-muted mt-1 max-w-md mx-auto">Try removing a filter or broadening your salary or experience range. Our recruiters can also run a targeted search for you.</p>
              <div className="flex justify-center gap-space-sm mt-space-lg">
                <Link href="/portal/candidates" className="btn-outline">Clear filters</Link>
                <Link href="/contact" className="btn-primary">Request a specialist search</Link>
              </div>
            </div>
          )}
          {rows.map((c) => <CandidateCard key={c.candidate_id} c={c} />)}

          {total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-space-sm">
              <span className="font-body-sm text-body-sm text-text-muted">
                Showing {(p.page - 1) * PAGE_SIZE + 1}–{Math.min(total, p.page * PAGE_SIZE)} of {total} candidates
              </span>
              <Pagination page={p.page} pageSize={PAGE_SIZE} total={total} basePath="/portal/candidates" params={sp} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
