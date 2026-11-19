import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { asCards, asList, asText, getPageContent, getPublicStats, getTestimonials } from "@/lib/cms/content";

export const revalidate = 300;

export default async function HomePage() {
  const [c, stats, testimonials] = await Promise.all([getPageContent("home"), getPublicStats(), getTestimonials()]);
  const hero = c.hero!;
  const methodology = c.methodology!;
  const audiences = c.audiences!;
  const samples = asCards(c.samples!.cards);
  const promises = asCards(c.promises!.cards);

  return (
    <div className="flex flex-col w-full">
      {/* Hero */}
      <section className="relative w-full pt-12 pb-24 lg:pt-16 lg:pb-32 overflow-hidden bg-surface">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[480px] bg-gradient-to-b from-primary-fixed/30 via-secondary-container/15 to-transparent blur-3xl pointer-events-none rounded-full" />
        <div className="absolute top-1/4 right-0 w-80 h-80 bg-primary/5 blur-3xl pointer-events-none rounded-full" />
        <div className="relative max-w-7xl mx-auto px-margin lg:px-margin-desktop">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-space-xs px-space-md py-xs rounded-full bg-surface-container-high text-primary font-label-md text-label-md mb-space-xl shadow-sm">
              <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span>{asText(hero.badge)}</span>
            </div>
            <h1 className="font-display-lg text-[38px] sm:text-display-lg text-text-primary tracking-[-1.8px] leading-[1.08] mb-space-lg font-extrabold">
              {asText(hero.heading_line1)} <br className="hidden sm:inline" />
              <span className="text-primary-container">{asText(hero.heading_highlight)}</span> <br />
              {asText(hero.heading_line3)}
            </h1>
            <p className="font-body-lg text-body-lg text-text-muted max-w-2xl mb-space-3xl leading-relaxed">{asText(hero.lead)}</p>

            <form action="/portal/candidates" method="get" className="w-full max-w-3xl bg-surface-container-lowest rounded-3xl md:rounded-full p-2.5 shadow-float flex flex-col md:flex-row items-center gap-2 mb-space-2xl">
              <label className="flex-1 flex items-center gap-space-sm px-space-md py-2 w-full md:w-auto">
                <Icon name="search" className="text-outline text-xl" />
                <span className="sr-only">Role</span>
                <input name="title" className="w-full bg-transparent font-body-md text-body-md text-text-primary focus:outline-none placeholder:text-text-muted" placeholder="Role (e.g. Lead Architect, VP Product)" />
              </label>
              <div className="hidden md:block w-px h-8 bg-surface-container-high" />
              <label className="flex-1 flex items-center gap-space-sm px-space-md py-2 w-full md:w-auto">
                <Icon name="location_on" className="text-outline text-xl" />
                <span className="sr-only">Location</span>
                <input name="location" className="w-full bg-transparent font-body-md text-body-md text-text-primary focus:outline-none placeholder:text-text-muted" placeholder="London, Manchester, Remote" />
              </label>
              <button type="submit" className="btn-primary h-11 px-space-xl w-full md:w-auto shrink-0">
                <span>Explore Candidates</span>
                <Icon name="arrow_forward" className="text-base" />
              </button>
            </form>
            <p className="font-body-sm text-body-sm text-text-muted -mt-space-lg mb-space-xl">Candidate search is available to approved employer accounts.</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-3 gap-x-space-2xl text-on-surface-variant font-label-md text-label-md pt-space-xs">
              {asList(hero.trust_points).map((p, i) => (
                <div key={p} className="flex items-center justify-center gap-2">
                  <Icon name={["verified", "lock", "tune"][i % 3]!} filled className="text-primary text-lg" />
                  <span>{p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Metrics band: live counts + CMS promises */}
      <section className="w-full bg-surface-container-low py-space-3xl">
        <div className="max-w-7xl mx-auto px-margin lg:px-margin-desktop">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-lg">
            <div className="bg-surface-container-lowest p-space-xl rounded-xl shadow-micro">
              <div className="font-display-lg text-heading-lg text-primary-container font-extrabold mb-1">{stats.published_profiles.toLocaleString("en-GB")}</div>
              <div className="font-heading-sm text-heading-sm text-text-primary mb-1">Published Profiles</div>
              <p className="font-body-sm text-body-sm text-text-muted">Live count of recruiter-approved anonymous profiles.</p>
            </div>
            <div className="bg-surface-container-lowest p-space-xl rounded-xl shadow-micro">
              <div className="font-display-lg text-heading-lg text-primary-container font-extrabold mb-1">{stats.approved_employers.toLocaleString("en-GB")}</div>
              <div className="font-heading-sm text-heading-sm text-text-primary mb-1">Approved Employers</div>
              <p className="font-body-sm text-body-sm text-text-muted">Organisations verified to search the directory.</p>
            </div>
            {promises.slice(0, 2).map((p) => (
              <div key={p.title} className="bg-surface-container-lowest p-space-xl rounded-xl shadow-micro">
                <Icon name={p.icon ?? "verified"} className="text-primary-container text-[36px] mb-1" />
                <div className="font-heading-sm text-heading-sm text-text-primary mb-1">{p.title}</div>
                <p className="font-body-sm text-body-sm text-text-muted">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Illustrative candidate cards */}
      <section className="w-full py-space-4xl bg-surface">
        <div className="max-w-7xl mx-auto px-margin lg:px-margin-desktop">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-space-3xl gap-space-lg">
            <div>
              <div className="eyebrow mb-space-xs">Illustrative examples</div>
              <h2 className="font-heading-lg text-heading-lg-mobile md:text-heading-lg text-text-primary font-extrabold tracking-tight">What Employers See</h2>
              <p className="font-body-md text-body-md text-text-muted mt-space-xs">Example profile cards. Identities remain masked until the candidate agrees to an introduction.</p>
            </div>
            <Link href="/employers" className="btn-secondary self-start md:self-auto">
              <span>How employer access works</span>
              <Icon name="tune" className="text-sm" />
            </Link>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-xl">
            {samples.map((s, i) => (
              <article key={s.title} className="bg-surface-container-lowest rounded-xl p-space-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex flex-col justify-between hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-200">
                <div>
                  <div className="flex items-center justify-between mb-space-md">
                    <span className="font-label-sm text-label-sm tracking-wider uppercase px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-semibold">Example #{i + 1}</span>
                    <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-secondary font-semibold bg-secondary-fixed/30 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary" /> Illustrative
                    </span>
                  </div>
                  <h3 className="font-heading-sm text-heading-sm text-text-primary font-bold mb-space-xs">{s.title}</h3>
                  <div className="bg-surface-container-low p-space-md rounded-lg mb-space-lg">
                    <div className="flex items-center gap-1 text-primary font-label-sm text-label-sm mb-1">
                      <Icon name="auto_awesome" className="text-sm" /> AI-assisted summary (recruiter reviewed)
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface">{s.body}</p>
                  </div>
                  <div className="mb-space-xl">
                    <div className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider mb-2">Primary Competencies</div>
                    <div className="flex flex-wrap gap-1.5">
                      {(s.icon ?? "").split(",").map((k) => k.trim()).filter(Boolean).map((k) => (
                        <span key={k} className="chip">{k}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-space-md border-t border-surface-container-low">
                  <span className="font-label-sm text-label-sm text-primary font-semibold">Anonymised profile</span>
                  <Link href="/employer/register" className="btn-primary h-9">View Profiles</Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Methodology */}
      <section className="w-full py-space-4xl bg-surface-container-low">
        <div className="max-w-7xl mx-auto px-margin lg:px-margin-desktop">
          <div className="text-center max-w-2xl mx-auto mb-space-3xl">
            <div className="eyebrow mb-space-xs">{asText(methodology.eyebrow)}</div>
            <h2 className="font-heading-lg text-heading-lg-mobile md:text-heading-lg text-text-primary font-extrabold tracking-tight">{asText(methodology.heading)}</h2>
            <p className="font-body-md text-body-md text-text-muted mt-space-xs">{asText(methodology.lead)}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-xl">
            {asCards(methodology.steps).map((step, i) => (
              <div key={step.title} className="bg-surface-container-lowest p-space-2xl rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col">
                <div className="w-12 h-12 rounded-full bg-primary-fixed/40 text-primary flex items-center justify-center font-heading-sm text-heading-sm font-bold mb-space-xl">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="font-heading-sm text-heading-sm text-text-primary font-bold mb-space-sm">{step.title}</h3>
                <p className="font-body-md text-body-md text-text-muted leading-relaxed mb-space-lg">{step.body}</p>
                {step.icon && <Icon name={step.icon} className="text-primary text-2xl mt-auto" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dark editorial band — the real review pipeline */}
      <section className="w-full py-space-4xl bg-surface overflow-hidden">
        <div className="max-w-7xl mx-auto px-margin lg:px-margin-desktop">
          <div className="bg-surface-alt text-surface-bright rounded-2xl p-space-2xl lg:p-space-4xl relative overflow-hidden shadow-2xl">
            <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-primary-container/20 rounded-full blur-3xl pointer-events-none" />
            <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-space-3xl items-center">
              <div className="lg:col-span-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-container/30 text-secondary-fixed font-label-sm text-label-sm mb-space-lg">
                  <Icon name="auto_awesome" className="text-sm" /> AI-assisted, human-approved
                </div>
                <h2 className="font-heading-lg text-heading-lg-mobile md:text-[32px] font-extrabold tracking-tight leading-tight mb-space-md">
                  Replace inconsistent CVs with structured, comparable profiles.
                </h2>
                <p className="font-body-md text-body-md text-surface-variant mb-space-xl">
                  Every CV moves through the same pipeline. AI extracts skills, experience and qualifications and drafts an anonymised summary; a recruiter checks and approves it before any employer can see it. AI never makes hiring decisions.
                </p>
              </div>
              <ol className="lg:col-span-6 bg-surface/5 border border-surface-container/10 rounded-xl p-space-xl space-y-space-md">
                {[
                  ["upload_file", "CV submitted", "Stored privately; never publicly accessible"],
                  ["memory", "Structured extraction", "Skills, experience, education, certifications"],
                  ["visibility_off", "Anonymisation", "Names, contact details and employers removed"],
                  ["fact_check", "Recruiter review", "Edited and approved by our team"],
                  ["public", "Published to approved employers", "Searchable by skills, salary and availability"],
                ].map(([icon, title, body], i) => (
                  <li key={title} className="flex items-start gap-space-md">
                    <span className="h-9 w-9 shrink-0 rounded-full bg-primary-container/40 text-secondary-fixed grid place-items-center">
                      <Icon name={icon!} className="text-lg" />
                    </span>
                    <div>
                      <div className="font-label-md text-label-md text-surface-bright">{i + 1}. {title}</div>
                      <div className="font-body-sm text-body-sm text-surface-variant">{body}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Audiences */}
      <section className="w-full pb-space-4xl bg-surface">
        <div className="max-w-7xl mx-auto px-margin lg:px-margin-desktop grid grid-cols-1 lg:grid-cols-2 gap-space-xl">
          <div className="bg-surface-container-lowest rounded-2xl p-space-2xl shadow-micro flex flex-col">
            <div className="eyebrow mb-space-sm flex items-center gap-2"><Icon name="domain" className="text-lg" /> Enterprise hiring teams</div>
            <h2 className="font-heading-lg text-heading-lg-mobile md:text-[28px] font-extrabold text-text-primary mb-space-md">{asText(audiences.employer_heading)}</h2>
            <p className="font-body-md text-body-md text-text-muted mb-space-lg">{asText(audiences.employer_lead)}</p>
            <ul className="space-y-space-sm mb-space-xl">
              {asList(audiences.employer_points).map((p) => (
                <li key={p} className="flex items-start gap-space-sm font-body-sm text-body-sm text-on-surface"><Icon name="check_circle" filled className="text-primary-container text-lg" />{p}</li>
              ))}
            </ul>
            <Link href="/employer/register" className="btn-primary self-start mt-auto">Access Employer Portal</Link>
          </div>
          <div className="bg-surface-container-low rounded-2xl p-space-2xl flex flex-col">
            <div className="eyebrow mb-space-sm flex items-center gap-2"><Icon name="person" className="text-lg" /> Senior &amp; executive talent</div>
            <h2 className="font-heading-lg text-heading-lg-mobile md:text-[28px] font-extrabold text-text-primary mb-space-md">{asText(audiences.candidate_heading)}</h2>
            <p className="font-body-md text-body-md text-text-muted mb-space-lg">{asText(audiences.candidate_lead)}</p>
            <ul className="space-y-space-sm mb-space-xl">
              {asList(audiences.candidate_points).map((p) => (
                <li key={p} className="flex items-start gap-space-sm font-body-sm text-body-sm text-on-surface"><Icon name="shield_person" className="text-primary-container text-lg" />{p}</li>
              ))}
            </ul>
            <Link href="/submit-cv" className="btn-secondary self-start mt-auto">Submit Candidate CV</Link>
          </div>
        </div>
      </section>

      {testimonials.length > 0 && (
        <section className="w-full pb-space-4xl bg-surface">
          <div className="max-w-7xl mx-auto px-margin lg:px-margin-desktop">
            <div className="eyebrow mb-space-sm">What clients say</div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-xl">
              {testimonials.map((t) => (
                <figure key={t.id} className="tv-panel p-space-xl flex flex-col gap-space-md">
                  <Icon name="format_quote" className="text-primary-container text-3xl" />
                  <blockquote className="font-body-md text-body-md text-on-surface">{t.quote}</blockquote>
                  <figcaption className="font-label-md text-label-md text-on-surface-variant mt-auto">{t.author_role}{t.organisation_descriptor ? `, ${t.organisation_descriptor}` : ""}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA band */}
      <section className="w-full bg-surface-alt text-surface-bright py-space-4xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(26,104,64,0.35),transparent_60%)] pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-margin text-center">
          <h2 className="font-display-lg text-[32px] md:text-[44px] font-extrabold tracking-tight leading-tight mb-space-md">{asText(c.cta!.heading)}</h2>
          <p className="font-body-md text-body-md text-surface-variant mb-space-2xl">{asText(c.cta!.lead)}</p>
          <div className="flex flex-col sm:flex-row justify-center gap-space-sm">
            <Link href="/employer/register" className="btn-primary btn-lg">Register as Employer</Link>
            <Link href="/submit-cv" className="btn btn-lg bg-surface-bright/10 text-surface-bright hover:bg-surface-bright/20">Submit Candidate CV</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
