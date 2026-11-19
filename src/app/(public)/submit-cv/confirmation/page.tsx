import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { getPublicSettings } from "@/lib/cms/content";
import { cn, formatSalaryRange, formatDateTime } from "@/lib/format";
import { readSubmissionCookie } from "@/lib/submission-cookie";
import { createAdminClient } from "@/lib/supabase/admin";
import { AutoRefresh } from "@/components/ui/auto-refresh";

export const metadata: Metadata = { title: "Submission Received", robots: { index: false } };
export const dynamic = "force-dynamic";

const STEPS = [
  { key: "ingested", title: "CV Received", body: "Your document is stored privately." },
  { key: "processing", title: "Extraction & Anonymisation", body: "Structuring your experience and removing personal identifiers." },
  { key: "review", title: "Recruiter Review", body: "A recruiter checks your anonymised profile." },
  { key: "published", title: "Visible to Employers", body: "Approved employers can discover your anonymous profile." },
];

function stepIndex(pipeline: string, profile: string) {
  if (profile === "published") return 4;
  if (pipeline === "approved") return 3;
  if (pipeline === "awaiting_review") return 2;
  if (pipeline === "processing" || pipeline === "queued" || pipeline === "uploaded") return 1;
  return 1;
}

export default async function ConfirmationPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  const cookieRef = await readSubmissionCookie();
  const { contact } = await getPublicSettings();
  const authorised = Boolean(ref && cookieRef && ref === cookieRef);

  if (!authorised) {
    return (
      <section className="max-w-2xl mx-auto px-margin py-space-4xl text-center">
        <span className="mx-auto mb-space-md h-14 w-14 rounded-full bg-secondary-fixed/40 text-on-secondary-container grid place-items-center"><Icon name="mark_email_read" className="text-3xl" /></span>
        <h1 className="font-display-lg text-display-lg-mobile font-extrabold">Submission received</h1>
        <p className="font-body-md text-body-md text-text-muted mt-space-sm">
          For your privacy, submission details are only shown in the browser session used to submit. Check your email for your reference, or contact us{contact.email ? ` at ${contact.email}` : ""}.
        </p>
        <Link href="/" className="btn-primary mt-space-xl">Return to homepage</Link>
      </section>
    );
  }

  const db = createAdminClient();
  const { data: c } = await db
    .from("candidates")
    .select("id, ref, submission_ref, pipeline_status, profile_status, created_at, candidate_private(full_name), candidate_profiles(headline, job_title, skills, salary_min, salary_max, location_region, years_experience, availability)")
    .eq("submission_ref", ref!)
    .maybeSingle();
  if (!c) return <p className="p-space-4xl text-center">Submission not found.</p>;

  const firstName = c.candidate_private?.full_name?.split(" ")[0] ?? "";
  const prof = c.candidate_profiles;
  const current = stepIndex(c.pipeline_status, c.profile_status);
  const processing = ["uploaded", "queued", "processing"].includes(c.pipeline_status);
  const failed = c.pipeline_status === "failed";

  return (
    <div className="max-w-7xl mx-auto px-margin lg:px-margin-desktop py-space-2xl">
      <AutoRefresh active={processing} />
      <div className="flex flex-wrap items-center justify-between gap-space-sm mb-space-md">
        <span className="chip-green"><span className="h-1.5 w-1.5 rounded-full bg-current" /> Submission Confirmed{processing ? " • Processing" : ""}</span>
        <div className="flex gap-2">
          <span className="chip font-mono">REF: {c.submission_ref}</span>
          <span className="chip font-mono">ID: {c.ref}</span>
        </div>
      </div>
      <h1 className="font-display-lg text-display-lg-mobile md:text-[40px] font-extrabold tracking-tight">Your Credentials Have Been Received{firstName ? `, ${firstName}` : ""}.</h1>
      <p className="font-body-md text-body-md text-text-muted mt-1">
        Application reference: <strong className="text-on-surface">{c.submission_ref}</strong> • Anonymous reference: <strong className="text-primary">Candidate #{c.ref}</strong>
      </p>

      <div className="tv-card p-space-md mt-space-lg flex items-center gap-space-md">
        <span className={cn("h-10 w-10 rounded-lg grid place-items-center text-on-primary", failed ? "bg-error" : "bg-primary-container")}>
          <Icon name={failed ? "error" : processing ? "sync" : "task_alt"} className={processing ? "animate-spin" : ""} />
        </span>
        <div className="font-body-sm text-body-sm">
          <div className="font-label-md text-label-md text-text-primary">
            {failed
              ? "Automatic processing could not complete — a recruiter will review your CV manually."
              : processing
                ? "Current stage: structuring and anonymising your CV."
                : current === 2
                  ? "Current stage: awaiting recruiter review."
                  : current === 3
                    ? "Approved — your profile is ready for publication."
                    : "Your anonymous profile is live for approved employers."}
          </div>
          <div className="text-text-muted">Submitted {formatDateTime(c.created_at)}. This page updates automatically.</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md mt-space-xl">
        {STEPS.map((s, i) => {
          const done = i < current;
          const active = i === current && !failed;
          return (
            <div key={s.key} className={cn("tv-card p-space-lg border-t-4", done ? "border-t-primary-container" : active ? "border-t-secondary-fixed-dim ring-1 ring-outline-variant" : "border-t-surface-container-high")}>
              <div className="flex items-center justify-between mb-space-sm">
                <span className="font-label-sm text-label-sm uppercase text-text-muted">Step 0{i + 1}{active ? " • Active" : ""}</span>
                <Icon name={done ? "check_circle" : active ? "autorenew" : "schedule"} filled={done} className={cn("text-xl", done ? "text-primary-container" : "text-outline")} />
              </div>
              <div className="font-label-md text-label-md text-[15px] text-text-primary">{s.title}</div>
              <p className="font-body-sm text-body-sm text-text-muted mt-1">{s.body}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl mt-space-xl">
        <section className="lg:col-span-7 tv-card p-space-xl">
          <div className="eyebrow mb-1">Workflow breakdown</div>
          <h2 className="font-heading-md text-heading-md mb-space-lg">What Happens Next</h2>
          {[
            ["lock", "1. Anonymisation", "Your name, contact details and previous employers' names are removed from the profile employers will see. Employers are described generically (e.g. \"FinTech scale-up\")."],
            ["fact_check", "2. Recruiter Verification", "A TalentVault recruiter reviews the extracted information and summary, and may contact you to confirm details such as salary expectations and availability."],
            ["how_to_reg", "3. Employer Enquiries & Your Consent", "Approved employers can enquire about your anonymous profile. We contact you about each enquiry, and your identity is only shared if you agree."],
          ].map(([icon, title, body]) => (
            <div key={title} className="flex gap-space-md rounded-xl bg-surface-container-low p-space-lg mb-space-md">
              <span className="h-10 w-10 shrink-0 rounded-full bg-primary-container text-on-primary grid place-items-center"><Icon name={icon!} /></span>
              <div>
                <h3 className="font-label-md text-label-md text-[15px] text-text-primary">{title}</h3>
                <p className="font-body-sm text-body-sm text-text-muted mt-1">{body}</p>
              </div>
            </div>
          ))}
          <div className="rounded-xl border border-border-subtle p-space-lg">
            <h3 className="font-label-md text-label-md text-[15px] flex items-center gap-2"><Icon name="policy" className="text-primary" /> Your data rights</h3>
            <p className="font-body-sm text-body-sm text-text-muted mt-1">
              You can ask us to update, hide or delete your profile and CV at any time{contact.email ? <> by emailing <a className="text-primary" href={`mailto:${contact.email}`}>{contact.email}</a></> : null}. Quote your reference {c.submission_ref}.
            </p>
          </div>
        </section>

        <aside className="lg:col-span-5 space-y-space-md">
          <div className="tv-card p-space-xl">
            <div className="flex justify-between items-center mb-space-md">
              <span className="font-label-sm text-label-sm uppercase tracking-wider flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary-container" /> Profile preview</span>
              <span className="chip font-mono">Candidate #{c.ref}</span>
            </div>
            <div className="rounded-xl bg-surface-container-low p-space-lg">
              <div className="font-label-sm text-label-sm uppercase text-text-muted">Target position</div>
              <div className="font-heading-sm text-heading-sm font-bold">{prof?.headline ?? prof?.job_title ?? "—"}</div>
              <div className="font-body-sm text-body-sm text-text-muted mt-1">
                {prof?.years_experience != null ? `${prof.years_experience}+ years exp.` : ""} {prof?.location_region ? `• ${prof.location_region}` : ""}
              </div>
              {!!prof?.skills?.length && (
                <div className="flex flex-wrap gap-1 mt-space-md">
                  {prof.skills.slice(0, 6).map((s) => <span key={s} className="chip bg-surface-container-lowest">{s}</span>)}
                  {prof.skills.length > 6 && <span className="chip-green">+{prof.skills.length - 6} more</span>}
                </div>
              )}
              <div className="mt-space-md rounded-lg bg-surface-container-lowest p-space-md">
                <div className="font-label-sm text-label-sm uppercase text-text-muted">Target remuneration</div>
                <div className="font-heading-sm text-heading-sm font-bold text-primary">{formatSalaryRange(prof?.salary_min, prof?.salary_max)}</div>
              </div>
            </div>
            <p className="mt-space-md font-body-sm text-body-sm text-text-muted flex gap-2"><Icon name="lock" className="text-base" /> This preview may change after recruiter review. Identity and contact details are never part of it.</p>
          </div>
          <Link href="/candidates" className="btn-primary w-full">Learn more about how we protect candidates <Icon name="arrow_forward" className="text-base" /></Link>
          <Link href="/" className="btn-ghost w-full">Return to homepage</Link>
        </aside>
      </div>
    </div>
  );
}
