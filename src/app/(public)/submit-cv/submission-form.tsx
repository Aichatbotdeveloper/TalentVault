"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { initialActionState } from "@/lib/action-state";
import { CvDropzone, useCvUpload } from "@/components/cv-uploader";
import { cn, formatSalaryRange } from "@/lib/format";
import { submitCandidate } from "./actions";

type Availability = "immediate" | "two_weeks" | "one_month" | "three_months";
type WorkMode = "remote" | "hybrid" | "onsite";

const DRAFT_KEY = "tv-cv-draft-v1";
const AVAILABILITY: [Availability, string][] = [
  ["immediate", "Immediate"],
  ["two_weeks", "2 Weeks"],
  ["one_month", "1 Month"],
  ["three_months", "3 Months"],
];
const MODES: [WorkMode, string][] = [
  ["remote", "Remote"],
  ["hybrid", "Hybrid"],
  ["onsite", "Full On-Site"],
];

interface Draft {
  full_name: string;
  email: string;
  phone: string;
  location: string;
  linkedin_url: string;
  job_title: string;
  years_experience: string;
  salary_min: string;
  salary_max: string;
  availability: Availability | "";
  work_modes: WorkMode[];
  skills: string[];
}

const EMPTY: Draft = {
  full_name: "", email: "", phone: "", location: "", linkedin_url: "", job_title: "", years_experience: "",
  salary_min: "", salary_max: "", availability: "", work_modes: [], skills: [],
};

export function SubmissionForm({
  consentText,
  contactEmail,
  contactPhone,
}: {
  consentText: Record<"data_processing" | "anonymised_marketplace" | "contact_for_introductions", string>;
  contactEmail: string | null;
  contactPhone: string | null;
}) {
  const [state, formAction] = useActionState(submitCandidate, initialActionState);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [skillInput, setSkillInput] = useState("");
  const { upload, start, reset } = useCvUpload("/api/submissions/upload-url");
  const [draftNote, setDraftNote] = useState<string | null>(null);
  const fe = state.fieldErrors ?? {};

  // Restore a locally saved draft (never includes the CV file).
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(DRAFT_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage
      if (saved) setDraft({ ...EMPTY, ...(JSON.parse(saved) as Partial<Draft>) });
    } catch {
      /* storage unavailable */
    }
  }, []);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const saveDraft = () => {
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setDraftNote("Draft saved on this device. Your CV file is not saved — you will need to upload it again.");
    } catch {
      setDraftNote("Your browser does not allow saving drafts.");
    }
  };

  const addSkill = (raw: string) => {
    const s = raw.trim().replace(/,$/, "").slice(0, 60);
    if (!s || draft.skills.some((x) => x.toLowerCase() === s.toLowerCase()) || draft.skills.length >= 30) return;
    set("skills", [...draft.skills, s]);
    setSkillInput("");
  };

  const step1 = Boolean(draft.full_name && draft.email && draft.location);
  const step2 = Boolean(draft.job_title && draft.years_experience && draft.availability && draft.work_modes.length);
  const step3 = upload.state === "done";
  const salaryLabel = formatSalaryRange(Number(draft.salary_min) || null, Number(draft.salary_max) || null);

  return (
    <form action={formAction} noValidate>
      {/* Stepper */}
      <div className="tv-card p-space-sm grid grid-cols-1 md:grid-cols-3 gap-space-sm mb-space-xl">
        {[
          ["Contact & Privacy", step1],
          ["Professional Profile", step2],
          ["Upload & Anonymise", step3],
        ].map(([label, done], i) => (
          <div key={label as string} className={cn("flex items-center gap-space-sm rounded-lg px-space-md py-space-sm", done ? "" : "bg-surface-container-low")}>
            <span className={cn("h-7 w-7 rounded-full grid place-items-center font-label-md text-label-md", done ? "bg-secondary-fixed text-on-secondary-container" : "bg-surface-alt text-surface-bright")}>
              {done ? <Icon name="check" className="text-base" /> : i + 1}
            </span>
            <div>
              <div className="font-label-sm text-label-sm uppercase text-text-muted">Step {i + 1}</div>
              <div className="font-label-md text-label-md text-text-primary">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl">
        <div className="lg:col-span-8 space-y-space-xl">
          <FormMessage state={state} />

          {/* 1. Personal */}
          <section className="tv-card p-space-xl" aria-labelledby="sec-personal">
            <div className="flex items-start justify-between gap-space-sm mb-space-lg">
              <div>
                <h2 id="sec-personal" className="font-heading-sm text-heading-sm font-bold flex items-center gap-2"><Icon name="lock_person" /> 1. Personal &amp; Contact Information</h2>
                <p className="font-body-sm text-body-sm text-text-muted">Visible to TalentVault recruiters only. Never shown to employers.</p>
              </div>
              <span className="chip-green shrink-0"><Icon name="shield" className="text-sm" /> PII Protected</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
              <Field label="Full legal name" name="full_name" required errors={fe.full_name}>
                <input id="full_name" name="full_name" className="tv-input" autoComplete="name" value={draft.full_name} onChange={(e) => set("full_name", e.target.value)} required maxLength={120} />
              </Field>
              <Field label="Personal email" name="email" required errors={fe.email}>
                <input id="email" name="email" type="email" className="tv-input" autoComplete="email" value={draft.email} onChange={(e) => set("email", e.target.value)} required />
              </Field>
              <Field label="Mobile / WhatsApp" name="phone" errors={fe.phone}>
                <input id="phone" name="phone" type="tel" className="tv-input" autoComplete="tel" value={draft.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+44 7700 900000" />
              </Field>
              <Field label="Current city / region" name="location" required errors={fe.location} help="City or region only, e.g. London, UK">
                <input id="location" name="location" className="tv-input" autoComplete="address-level2" value={draft.location} onChange={(e) => set("location", e.target.value)} required maxLength={120} />
              </Field>
              <div className="md:col-span-2">
                <Field label="LinkedIn profile (optional)" name="linkedin_url" errors={fe.linkedin_url}>
                  <input id="linkedin_url" name="linkedin_url" type="url" className="tv-input" value={draft.linkedin_url} onChange={(e) => set("linkedin_url", e.target.value)} placeholder="https://www.linkedin.com/in/…" />
                </Field>
              </div>
            </div>
          </section>

          {/* 2. Professional */}
          <section className="tv-card p-space-xl" aria-labelledby="sec-pro">
            <h2 id="sec-pro" className="font-heading-sm text-heading-sm font-bold flex items-center gap-2"><Icon name="work" /> 2. Professional Details &amp; Role Expectations</h2>
            <p className="font-body-sm text-body-sm text-text-muted mb-space-lg">These details power employer search filters.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
              <div className="md:col-span-2">
                <Field label="Target role / professional headline" name="job_title" required errors={fe.job_title}>
                  <input id="job_title" name="job_title" className="tv-input" value={draft.job_title} onChange={(e) => set("job_title", e.target.value)} placeholder="e.g. Lead Cloud Infrastructure Architect" required maxLength={120} />
                </Field>
              </div>
              <Field label="Years of experience" name="years_experience" required errors={fe.years_experience}>
                <input id="years_experience" name="years_experience" type="number" min={0} max={60} className="tv-input" value={draft.years_experience} onChange={(e) => set("years_experience", e.target.value)} required />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg mt-space-lg">
              <fieldset>
                <legend className="tv-label">Target base salary (GBP per year)</legend>
                <div className="flex items-center gap-2">
                  <input aria-label="Minimum salary" name="salary_min" type="number" min={0} step={1000} className="tv-input" placeholder="Min e.g. 80000" value={draft.salary_min} onChange={(e) => set("salary_min", e.target.value)} />
                  <span className="text-text-muted">to</span>
                  <input aria-label="Maximum salary" name="salary_max" type="number" min={0} step={1000} className="tv-input" placeholder="Max e.g. 95000" value={draft.salary_max} onChange={(e) => set("salary_max", e.target.value)} />
                </div>
                <FieldError errors={fe.salary_max ?? fe.salary_min} />
              </fieldset>
              <fieldset>
                <legend className="tv-label">Notice period / availability <span className="text-error">*</span></legend>
                <div className="grid grid-cols-4 gap-1 rounded-lg bg-surface-container-low p-1">
                  {AVAILABILITY.map(([value, label]) => (
                    <label key={value} className={cn("cursor-pointer rounded-md py-2 text-center font-label-sm text-label-sm transition-colors", draft.availability === value ? "bg-secondary-fixed text-on-secondary-container" : "hover:bg-surface-container-high")}>
                      <input type="radio" name="availability" value={value} className="sr-only" checked={draft.availability === value} onChange={() => set("availability", value)} />
                      {label}
                    </label>
                  ))}
                </div>
                <FieldError errors={fe.availability} />
              </fieldset>
            </div>

            <fieldset className="mt-space-lg">
              <legend className="tv-label">Accepted working arrangements <span className="text-error">*</span></legend>
              <div className="flex flex-wrap gap-space-sm">
                {MODES.map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 rounded-lg border border-border-subtle px-space-md py-2 cursor-pointer has-[:checked]:border-primary-container has-[:checked]:bg-secondary-fixed/20">
                    <input
                      type="checkbox"
                      name="work_modes"
                      value={value}
                      className="accent-[#1a6840] h-4 w-4"
                      checked={draft.work_modes.includes(value)}
                      onChange={(e) => set("work_modes", e.target.checked ? [...draft.work_modes, value] : draft.work_modes.filter((m) => m !== value))}
                    />
                    <span className="font-body-sm text-body-sm">{label}</span>
                  </label>
                ))}
              </div>
              <FieldError errors={fe.work_modes} />
            </fieldset>

            <div className="mt-space-lg">
              <label htmlFor="skill-input" className="tv-label">Key skills</label>
              <div className="rounded-lg border border-border-subtle p-space-sm flex flex-wrap gap-1.5 focus-within:ring-2 focus-within:ring-focus-ring/20">
                {draft.skills.map((s) => (
                  <span key={s} className="chip-green">
                    {s}
                    <input type="hidden" name="skills" value={s} />
                    <button type="button" aria-label={`Remove ${s}`} onClick={() => set("skills", draft.skills.filter((x) => x !== s))}>
                      <Icon name="close" className="text-sm" />
                    </button>
                  </span>
                ))}
                <input
                  id="skill-input"
                  className="flex-1 min-w-[160px] bg-transparent outline-none font-body-sm text-body-sm px-1"
                  placeholder={draft.skills.length ? "Add another skill…" : "Type a skill and press Enter"}
                  value={skillInput}
                  onChange={(e) => (e.target.value.endsWith(",") ? addSkill(e.target.value) : setSkillInput(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSkill(skillInput);
                    }
                  }}
                  onBlur={() => skillInput && addSkill(skillInput)}
                />
              </div>
              <p className="tv-help">Optional — we also extract skills from your CV.</p>
            </div>
          </section>

          {/* 3. Upload */}
          <section className="tv-card p-space-xl" aria-labelledby="sec-cv">
            <h2 id="sec-cv" className="font-heading-sm text-heading-sm font-bold flex items-center gap-2"><Icon name="description" /> 3. CV / Resume Document</h2>
            <p className="font-body-sm text-body-sm text-text-muted mb-space-lg">Upload your full, unredacted CV. It is stored privately and only accessible to our recruiters.</p>
            <CvDropzone upload={upload} onFile={(f) => void start(f)} onRemove={reset} errors={fe.upload_path} />
          </section>

          {/* 4. Consent */}
          <section className="tv-card p-space-xl" aria-labelledby="sec-consent">
            <h2 id="sec-consent" className="font-heading-sm text-heading-sm font-bold flex items-center gap-2"><Icon name="verified_user" /> 4. Anonymisation &amp; Consent</h2>
            <p className="font-body-sm text-body-sm text-text-muted mb-space-lg">You stay in control. We never disclose your identity to an employer without your permission.</p>
            <div className="space-y-space-md">
              {(
                [
                  ["consent_data_processing", consentText.data_processing],
                  ["consent_anonymised_marketplace", consentText.anonymised_marketplace],
                  ["consent_contact", consentText.contact_for_introductions],
                ] as const
              ).map(([name, text]) => (
                <div key={name}>
                  <label className="flex items-start gap-space-sm cursor-pointer">
                    <input type="checkbox" name={name} className="accent-[#1a6840] h-4 w-4 mt-1 shrink-0" required />
                    <span className="font-body-sm text-body-sm text-on-surface">{text}</span>
                  </label>
                  <FieldError errors={fe[name]} />
                </div>
              ))}
            </div>
            <p className="font-body-sm text-body-sm text-text-muted mt-space-lg">
              By submitting you agree to our <Link href="/privacy" className="text-primary underline">Privacy Policy</Link> and{" "}
              <Link href="/terms" className="text-primary underline">Terms</Link>.
            </p>
            <div className="hidden" aria-hidden="true">
              <label htmlFor="company_website">Company website</label>
              <input id="company_website" name="company_website" tabIndex={-1} autoComplete="off" />
            </div>
          </section>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-space-sm">
            <div>
              <button type="button" onClick={saveDraft} className="btn-secondary">Save Draft &amp; Complete Later</button>
              {draftNote && <p className="tv-help max-w-sm" role="status">{draftNote}</p>}
            </div>
            <SubmitButton pendingText="Submitting securely…" className="btn-primary btn-lg">
              Submit CV &amp; Start Anonymisation <Icon name="arrow_forward" className="text-base" />
            </SubmitButton>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-4 space-y-space-lg">
          <div className="tv-card p-space-xl">
            <h2 className="font-heading-sm text-heading-sm font-bold flex items-center gap-2 mb-space-md"><Icon name="psychology" /> How Anonymisation Works</h2>
            <ol className="space-y-space-md">
              {[
                ["Personal details removed", "Your name, contact details, address and named employers or schools are removed from your public profile."],
                ["Experience structured", "AI helps convert your CV into skills, experience, education and certifications."],
                ["Anonymous reference issued", "Employers see a reference (e.g. Candidate #TV-1042) instead of your name."],
                ["Recruiter review", "A recruiter checks everything before your profile is published."],
              ].map(([title, body], i) => (
                <li key={title} className="flex gap-space-sm">
                  <span className="h-6 w-6 shrink-0 rounded-full bg-primary-container text-on-primary grid place-items-center font-label-sm text-label-sm">{i + 1}</span>
                  <div>
                    <div className="font-label-md text-label-md">{title}</div>
                    <div className="font-body-sm text-body-sm text-text-muted">{body}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-xl bg-surface-alt text-surface-bright p-space-xl shadow-lg">
            <div className="flex justify-between font-label-sm text-label-sm uppercase tracking-wider mb-space-md">
              <span className="text-secondary-fixed flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-secondary-fixed" /> Employer view preview</span>
              <span className="text-surface-variant">#TV-••••</span>
            </div>
            <div className="rounded-lg bg-surface/5 border border-surface-container/10 p-space-md">
              <div className="font-label-sm text-label-sm text-surface-variant uppercase">Candidate #TV-••••</div>
              <div className="font-heading-sm text-heading-sm font-bold mt-1">{draft.job_title || "Your target role"}</div>
              <div className="font-body-sm text-body-sm text-surface-variant mt-1">
                {draft.years_experience ? `${draft.years_experience}+ years` : "Experience"} • {draft.location || "Region"}
              </div>
              <div className="flex flex-wrap gap-1 mt-space-sm">
                {(draft.skills.length ? draft.skills.slice(0, 4) : ["Skill", "Skill"]).map((s, i) => (
                  <span key={`${s}-${i}`} className="px-2 py-0.5 rounded bg-surface/10 font-label-sm text-label-sm">{s}</span>
                ))}
              </div>
              <div className="flex justify-between mt-space-md pt-space-sm border-t border-surface-container/10 font-label-sm text-label-sm">
                <span className="text-surface-variant">Target comp.</span>
                <span className="text-secondary-fixed">{salaryLabel}</span>
              </div>
            </div>
            <p className="mt-space-md font-body-sm text-body-sm text-surface-variant flex gap-2"><Icon name="lock" className="text-base" /> Your name and contact details are never shown here.</p>
          </div>

          {(contactEmail || contactPhone) && (
            <div className="tv-card p-space-xl flex gap-space-md">
              <span className="h-10 w-10 shrink-0 rounded-full bg-surface-container-high grid place-items-center"><Icon name="support_agent" /></span>
              <div>
                <div className="font-label-md text-label-md">Need assistance?</div>
                <p className="font-body-sm text-body-sm text-text-muted">Our team can help with your submission.</p>
                <div className="font-body-sm text-body-sm mt-1 space-y-0.5">
                  {contactEmail && <a className="text-primary block" href={`mailto:${contactEmail}`}>{contactEmail}</a>}
                  {contactPhone && <div>{contactPhone}</div>}
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </form>
  );
}
