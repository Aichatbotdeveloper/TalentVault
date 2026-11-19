import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { requireEmployerPage } from "@/lib/auth";
import { AVAILABILITY_LABELS, OPEN_ENQUIRY_STATUSES, WORK_MODE_LABELS, formatDate, formatSalaryRange } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { toggleShortlist } from "../../actions";
import { EnquiryModal } from "./enquiry-modal";

export async function generateMetadata({ params }: { params: Promise<{ ref: string }> }): Promise<Metadata> {
  return { title: `Candidate #${(await params).ref}` };
}

export default async function CandidateProfilePage({ params, searchParams }: { params: Promise<{ ref: string }>; searchParams: Promise<{ enquire?: string }> }) {
  const profile = await requireEmployerPage({ approved: true });
  const { ref } = await params;
  const { enquire } = await searchParams;
  if (!/^TV-\d+$/.test(ref)) notFound();

  const supabase = await createClient();
  // Explicit anonymous column list; RLS additionally restricts rows to published profiles.
  const { data: c } = await supabase
    .from("candidate_profiles")
    .select("candidate_id, ref, headline, summary, job_title, seniority, years_experience, location_region, work_modes, salary_min, salary_max, salary_currency, availability, notice_period, industries, skills, highlights, published_at, is_sample")
    .eq("ref", ref)
    .eq("published", true)
    .maybeSingle();
  if (!c) notFound();

  const [{ data: experience }, { data: education }, { data: certs }, { data: shortlisted }, { data: openEnquiry }] = await Promise.all([
    supabase.from("candidate_experience").select("id, title, organisation_descriptor, start_date, end_date, is_current, summary, achievements, skills").eq("candidate_id", c.candidate_id).order("sort_order"),
    supabase.from("candidate_education").select("id, qualification, field_of_study, institution_descriptor, year").eq("candidate_id", c.candidate_id).order("sort_order"),
    supabase.from("candidate_certifications").select("id, name, issuer, year").eq("candidate_id", c.candidate_id).order("sort_order"),
    supabase.from("shortlists").select("candidate_id").eq("candidate_id", c.candidate_id).maybeSingle(),
    supabase.from("enquiries").select("ref").eq("candidate_id", c.candidate_id).in("status", OPEN_ENQUIRY_STATUSES).maybeSingle(),
  ]);

  const salary = formatSalaryRange(c.salary_min, c.salary_max, c.salary_currency);
  const availability = c.availability ? AVAILABILITY_LABELS[c.availability] : "Not specified";
  const facts = [
    { icon: "location_on", label: "Location", value: c.location_region ?? "—", sub: c.work_modes.map((m) => WORK_MODE_LABELS[m]).join(" / ") },
    { icon: "work_history", label: "Experience", value: c.years_experience != null ? `${c.years_experience} Years` : "—", sub: c.seniority ?? "" },
    { icon: "payments", label: "Salary Expectation", value: salary, sub: "Per annum (base)" },
    { icon: "event_available", label: "Availability", value: availability, sub: c.notice_period ?? "" },
  ];

  return (
    <div className="space-y-space-xl">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
        <Link href="/portal/candidates" className="hover:text-on-surface">Candidate Directory</Link>
        <Icon name="chevron_right" className="text-sm" />
        <span className="text-primary">Candidate #{c.ref}</span>
      </nav>

      <section className="tv-panel p-space-xl md:p-space-2xl flex flex-col lg:flex-row lg:items-end justify-between gap-space-lg">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 mb-space-sm">
            {c.industries.slice(0, 2).map((i) => <span key={i} className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{i}</span>)}
            {c.is_sample && <span className="chip bg-[#fff3cd] text-[#7a5a00]">Sample data</span>}
            <span className="chip-green"><Icon name="verified" className="text-sm" /> Recruiter reviewed {c.published_at ? formatDate(c.published_at) : ""}</span>
          </div>
          <h1 className="page-title">{c.headline ?? c.job_title}</h1>
          {c.job_title && c.headline !== c.job_title && <p className="font-body-md text-body-md text-on-surface-variant mt-space-xs">{c.job_title}</p>}
        </div>
        <div className="flex flex-wrap gap-space-sm">
          <form action={toggleShortlist}>
            <input type="hidden" name="candidate_id" value={c.candidate_id} />
            <button className="btn-outline" type="submit"><Icon name="bookmark" filled={!!shortlisted} className="text-lg" /> {shortlisted ? "Shortlisted" : "Save to Shortlist"}</button>
          </form>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-space-md">
        {facts.map((f) => (
          <div key={f.label} className="tv-panel p-space-lg">
            <div className="flex items-center gap-1.5 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant"><Icon name={f.icon} className="text-base" /> {f.label}</div>
            <div className="font-heading-sm text-heading-sm font-bold text-text-primary mt-1">{f.value}</div>
            {f.sub && <div className="font-body-sm text-body-sm text-primary-container">{f.sub}</div>}
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
        <div className="lg:col-span-8 space-y-space-xl">
          <section className="tv-panel p-space-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-space-md">
              <h2 className="font-heading-sm text-heading-sm font-bold flex items-center gap-2"><Icon name="auto_awesome" className="text-primary" /> Executive Summary</h2>
              <span className="chip">AI-assisted • recruiter reviewed</span>
            </div>
            <p className="font-body-md text-body-md text-on-surface leading-relaxed whitespace-pre-line">{c.summary}</p>
            {c.highlights.length > 0 && (
              <ul className="mt-space-lg grid grid-cols-1 md:grid-cols-2 gap-space-sm">
                {c.highlights.map((h) => (
                  <li key={h} className="rounded-lg bg-surface-container-low p-space-md font-body-sm text-body-sm flex gap-2"><Icon name="trending_up" className="text-primary-container text-lg" />{h}</li>
                ))}
              </ul>
            )}
          </section>

          {!!experience?.length && (
            <section className="tv-panel p-space-xl">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-space-lg">
                <h2 className="font-heading-sm text-heading-sm font-bold flex items-center gap-2"><Icon name="timeline" /> Anonymised Career Trajectory</h2>
                <span className="font-label-sm text-label-sm text-text-muted flex items-center gap-1"><Icon name="lock" className="text-sm" /> Employer names anonymised</span>
              </div>
              <ol className="relative border-l-2 border-surface-container-high ml-2 space-y-space-xl">
                {experience.map((e, i) => (
                  <li key={e.id} className="pl-space-lg relative">
                    <span className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-surface-container-lowest ${i === 0 ? "bg-primary-container" : "bg-outline-variant"}`} />
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-heading-sm text-heading-sm font-bold text-text-primary">{e.title}</h3>
                        {e.organisation_descriptor && <div className="font-body-sm text-body-sm text-primary-container font-semibold">{e.organisation_descriptor}</div>}
                      </div>
                      <span className="chip">{[e.start_date, e.is_current ? "Present" : e.end_date].filter(Boolean).join(" – ") || "Dates not stated"}</span>
                    </div>
                    {e.summary && <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-xs">{e.summary}</p>}
                    {e.achievements.length > 0 && (
                      <ul className="mt-space-sm space-y-1.5">
                        {e.achievements.map((a) => <li key={a} className="font-body-sm text-body-sm flex gap-2"><Icon name="check_circle" className="text-primary-container text-base mt-0.5" />{a}</li>)}
                      </ul>
                    )}
                    {e.skills.length > 0 && <div className="flex flex-wrap gap-1 mt-space-sm">{e.skills.map((s) => <span key={s} className="chip">{s}</span>)}</div>}
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className="tv-panel p-space-xl">
            <div className="flex items-center justify-between mb-space-md">
              <h2 className="font-heading-sm text-heading-sm font-bold flex items-center gap-2"><Icon name="code_blocks" /> Core Competencies</h2>
              <span className="font-label-sm text-label-sm text-text-muted">{c.skills.length} skills</span>
            </div>
            <div className="flex flex-wrap gap-1.5">{c.skills.map((s) => <span key={s} className="chip-green">{s}</span>)}</div>
          </section>

          {(!!education?.length || !!certs?.length) && (
            <section className="tv-panel p-space-xl">
              <h2 className="font-heading-sm text-heading-sm font-bold flex items-center gap-2 mb-space-md"><Icon name="school" /> Education &amp; Certifications</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                {education?.map((e) => (
                  <div key={e.id} className="rounded-xl bg-surface-container-low p-space-md flex gap-space-sm">
                    <Icon name="school" className="text-primary-container" />
                    <div>
                      <div className="font-label-md text-label-md">{e.qualification}{e.field_of_study ? ` — ${e.field_of_study}` : ""}</div>
                      <div className="font-body-sm text-body-sm text-text-muted">{[e.institution_descriptor, e.year].filter(Boolean).join(" • ")}</div>
                    </div>
                  </div>
                ))}
                {certs?.map((e) => (
                  <div key={e.id} className="rounded-xl bg-surface-container-low p-space-md flex gap-space-sm">
                    <Icon name="workspace_premium" className="text-primary-container" />
                    <div>
                      <div className="font-label-md text-label-md">{e.name}</div>
                      <div className="font-body-sm text-body-sm text-text-muted">{[e.issuer, e.year].filter(Boolean).join(" • ")}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="lg:col-span-4 space-y-space-lg lg:sticky lg:top-24">
          <div className="tv-panel p-space-xl border-t-4 border-primary-container">
            <h2 className="font-heading-sm text-heading-sm font-bold flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary-container" /> Ready to Connect?</h2>
            <p className="font-body-sm text-body-sm text-text-muted mt-space-xs mb-space-lg">
              Submit an enquiry and our recruiters will confirm Candidate #{c.ref}&apos;s interest in your role before arranging an introduction.
            </p>
            <EnquiryModal
              candidate={{ ref: c.ref, headline: c.headline ?? c.job_title ?? "", experience: c.years_experience != null ? `${c.years_experience}+ Yrs Exp` : "Experience n/a", salary, availability }}
              employer={{ company: profile.employer?.company_name ?? "", contactName: [profile.fullName, profile.jobTitle && `(${profile.jobTitle})`].filter(Boolean).join(" "), email: profile.email, phone: profile.phone ?? "" }}
              openInitially={enquire === "1"}
              existingOpenEnquiryRef={openEnquiry?.ref ?? null}
            />
          </div>
          <div className="tv-panel p-space-xl flex gap-space-sm">
            <Icon name="shield_lock" className="text-primary-container" />
            <div>
              <h2 className="font-label-md text-label-md">Confidentiality</h2>
              <p className="font-body-sm text-body-sm text-text-muted">Personal contact details and the original CV are kept confidential. Identity is disclosed only after the candidate agrees to an introduction. Please do not attempt to identify or contact candidates directly.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
