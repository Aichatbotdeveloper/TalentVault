"use client";

import { useState } from "react";
import { saveAnonymousProfile } from "@/app/admin/(console)/candidates/actions";
import { AVAILABILITY_OPTIONS, WORK_MODE_OPTIONS } from "@/lib/format";
import { Field, FormMessage, SubmitButton, useFormAction } from "../ui/form";
import { Icon } from "../ui/icon";

export interface EditableProfile {
  headline: string | null;
  job_title: string | null;
  seniority: string | null;
  summary: string | null;
  years_experience: number | null;
  location_region: string | null;
  salary_min: number | null;
  salary_max: number | null;
  availability: string | null;
  notice_period: string | null;
  work_modes: string[];
  skills: string[];
  industries: string[];
  highlights: string[];
}
type Exp = { title: string; organisation_descriptor: string; start_date: string; end_date: string; is_current: boolean; summary: string; achievements: string; skills: string };
type Edu = { qualification: string; field_of_study: string; institution_descriptor: string; year: string };
type Cert = { name: string; issuer: string; year: string };

export function ProfileEditor({
  candidateId,
  profile,
  experience,
  education,
  certifications,
}: {
  candidateId: string;
  profile: EditableProfile;
  experience: { title: string; organisation_descriptor: string | null; start_date: string | null; end_date: string | null; is_current: boolean; summary: string | null; achievements: string[]; skills: string[] }[];
  education: { qualification: string; field_of_study: string | null; institution_descriptor: string | null; year: string | null }[];
  certifications: { name: string; issuer: string | null; year: string | null }[];
}) {
  const { state, action, v, fe } = useFormAction(saveAnonymousProfile);
  const [exp, setExp] = useState<Exp[]>(
    experience.map((e) => ({ title: e.title, organisation_descriptor: e.organisation_descriptor ?? "", start_date: e.start_date ?? "", end_date: e.end_date ?? "", is_current: e.is_current, summary: e.summary ?? "", achievements: e.achievements.join("\n"), skills: e.skills.join(", ") })),
  );
  const [edu, setEdu] = useState<Edu[]>(education.map((e) => ({ qualification: e.qualification, field_of_study: e.field_of_study ?? "", institution_descriptor: e.institution_descriptor ?? "", year: e.year ?? "" })));
  const [certs, setCerts] = useState<Cert[]>(certifications.map((c) => ({ name: c.name, issuer: c.issuer ?? "", year: c.year ?? "" })));
  const [summaryLen, setSummaryLen] = useState((profile.summary ?? "").length);

  const historyJson = JSON.stringify({
    experience: exp.map((e) => ({ ...e, achievements: e.achievements.split("\n").map((x) => x.trim()).filter(Boolean), skills: e.skills.split(",").map((x) => x.trim()).filter(Boolean) })),
    education: edu,
    certifications: certs,
  });
  const upd = <T,>(list: T[], set: (l: T[]) => void, i: number, patch: Partial<T>) => set(list.map((x, n) => (n === i ? { ...x, ...patch } : x)));
  const str = (n: number | null) => (n == null ? "" : String(n));

  return (
    <form action={action} className="space-y-space-lg" id="profile-editor">
      <input type="hidden" name="candidate_id" value={candidateId} />
      <input type="hidden" name="history_json" value={historyJson} />
      <FormMessage state={state} />

      <Field label="Candidate public headline" name="headline" required errors={fe.headline} aside={<span className="font-label-sm text-label-sm text-text-muted">Marketplace banner</span>}>
        <input id="headline" name="headline" defaultValue={v("headline", profile.headline ?? "")} className="tv-input font-heading-sm text-heading-sm" maxLength={160} />
      </Field>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        <Field label="Job title" name="job_title" errors={fe.job_title}><input id="job_title" name="job_title" defaultValue={v("job_title", profile.job_title ?? "")} className="tv-input" /></Field>
        <Field label="Seniority" name="seniority" errors={fe.seniority}><input id="seniority" name="seniority" defaultValue={v("seniority", profile.seniority ?? "")} className="tv-input" placeholder="e.g. Lead / Principal" /></Field>
      </div>
      <Field label="Executive summary" name="summary" required errors={fe.summary} aside={<span className="font-label-sm text-label-sm text-text-muted">{summaryLen} / 2,000</span>}>
        <textarea id="summary" name="summary" rows={7} maxLength={2000} defaultValue={v("summary", profile.summary ?? "")} onChange={(e) => setSummaryLen(e.target.value.length)} className="tv-textarea" />
      </Field>
      <Field label="Key highlights (one per line)" name="highlights">
        <textarea id="highlights" name="highlights" rows={3} defaultValue={v("highlights", profile.highlights.join("\n"))} className="tv-textarea" />
      </Field>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        <Field label="Skills (comma or line separated)" name="skills"><textarea id="skills" name="skills" rows={3} defaultValue={v("skills", profile.skills.join(", "))} className="tv-textarea" /></Field>
        <Field label="Industries" name="industries"><textarea id="industries" name="industries" rows={3} defaultValue={v("industries", profile.industries.join(", "))} className="tv-textarea" /></Field>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-space-md">
        <Field label="Years exp." name="years_experience" errors={fe.years_experience}><input id="years_experience" name="years_experience" type="number" min={0} max={60} defaultValue={v("years_experience", str(profile.years_experience))} className="tv-input" /></Field>
        <Field label="Region" name="location_region" errors={fe.location_region}><input id="location_region" name="location_region" defaultValue={v("location_region", profile.location_region ?? "")} className="tv-input" placeholder="City, UK" /></Field>
        <Field label="Salary min (£)" name="salary_min" errors={fe.salary_min}><input id="salary_min" name="salary_min" type="number" min={0} step={1000} defaultValue={v("salary_min", str(profile.salary_min))} className="tv-input" /></Field>
        <Field label="Salary max (£)" name="salary_max" errors={fe.salary_max}><input id="salary_max" name="salary_max" type="number" min={0} step={1000} defaultValue={v("salary_max", str(profile.salary_max))} className="tv-input" /></Field>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
        <Field label="Availability" name="availability">
          <select id="availability" name="availability" defaultValue={v("availability", profile.availability ?? "")} className="tv-select">
            <option value="">Not specified</option>
            {AVAILABILITY_OPTIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Field>
        <Field label="Notice period detail" name="notice_period"><input id="notice_period" name="notice_period" defaultValue={v("notice_period", profile.notice_period ?? "")} className="tv-input" /></Field>
        <fieldset>
          <legend className="tv-label">Work arrangements</legend>
          <div className="flex flex-wrap gap-space-sm pt-2">
            {WORK_MODE_OPTIONS.map(([k, l]) => (
              <label key={k} className="flex items-center gap-1.5 font-body-sm text-body-sm"><input type="checkbox" name="work_modes" value={k} defaultChecked={profile.work_modes.includes(k)} className="accent-[#1a6840]" />{l}</label>
            ))}
          </div>
        </fieldset>
      </div>

      <details className="rounded-xl border border-border-subtle p-space-md" open={exp.length > 0}>
        <summary className="cursor-pointer font-label-md text-label-md flex items-center gap-2"><Icon name="timeline" className="text-lg" /> Anonymised career history ({exp.length})</summary>
        <div className="space-y-space-md mt-space-md">
          {exp.map((e, i) => (
            <div key={i} className="rounded-lg bg-surface-container-low p-space-md space-y-space-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
                <input aria-label="Role title" value={e.title} onChange={(ev) => upd(exp, setExp, i, { title: ev.target.value })} className="tv-input" placeholder="Role title" />
                <input aria-label="Organisation descriptor" value={e.organisation_descriptor} onChange={(ev) => upd(exp, setExp, i, { organisation_descriptor: ev.target.value })} className="tv-input" placeholder="Anonymised organisation, e.g. Series B FinTech" />
                <input aria-label="Start" value={e.start_date} onChange={(ev) => upd(exp, setExp, i, { start_date: ev.target.value })} className="tv-input" placeholder="Start (e.g. 2019)" />
                <div className="flex items-center gap-2">
                  <input aria-label="End" value={e.end_date} disabled={e.is_current} onChange={(ev) => upd(exp, setExp, i, { end_date: ev.target.value })} className="tv-input" placeholder="End" />
                  <label className="flex items-center gap-1 font-body-sm text-body-sm whitespace-nowrap"><input type="checkbox" checked={e.is_current} onChange={(ev) => upd(exp, setExp, i, { is_current: ev.target.checked })} className="accent-[#1a6840]" /> Current</label>
                </div>
              </div>
              <textarea aria-label="Role summary" value={e.summary} onChange={(ev) => upd(exp, setExp, i, { summary: ev.target.value })} rows={2} className="tv-textarea" placeholder="Summary" />
              <textarea aria-label="Achievements" value={e.achievements} onChange={(ev) => upd(exp, setExp, i, { achievements: ev.target.value })} rows={2} className="tv-textarea" placeholder="Achievements (one per line)" />
              <div className="flex gap-2">
                <input aria-label="Role skills" value={e.skills} onChange={(ev) => upd(exp, setExp, i, { skills: ev.target.value })} className="tv-input" placeholder="Skills (comma separated)" />
                <button type="button" className="btn-ghost btn-sm text-error" onClick={() => setExp(exp.filter((_, n) => n !== i))}>Remove</button>
              </div>
            </div>
          ))}
          <button type="button" className="btn-secondary btn-sm" onClick={() => setExp([...exp, { title: "", organisation_descriptor: "", start_date: "", end_date: "", is_current: false, summary: "", achievements: "", skills: "" }])}><Icon name="add" className="text-base" /> Add role</button>
        </div>
      </details>

      <details className="rounded-xl border border-border-subtle p-space-md" open={edu.length + certs.length > 0}>
        <summary className="cursor-pointer font-label-md text-label-md flex items-center gap-2"><Icon name="school" className="text-lg" /> Education ({edu.length}) &amp; certifications ({certs.length})</summary>
        <div className="space-y-space-sm mt-space-md">
          {edu.map((e, i) => (
            <div key={`e${i}`} className="grid grid-cols-1 md:grid-cols-[2fr_2fr_2fr_1fr_auto] gap-2">
              <input aria-label="Qualification" value={e.qualification} onChange={(ev) => upd(edu, setEdu, i, { qualification: ev.target.value })} className="tv-input" placeholder="Qualification" />
              <input aria-label="Field of study" value={e.field_of_study} onChange={(ev) => upd(edu, setEdu, i, { field_of_study: ev.target.value })} className="tv-input" placeholder="Field" />
              <input aria-label="Institution descriptor" value={e.institution_descriptor} onChange={(ev) => upd(edu, setEdu, i, { institution_descriptor: ev.target.value })} className="tv-input" placeholder="e.g. UK university" />
              <input aria-label="Year" value={e.year} onChange={(ev) => upd(edu, setEdu, i, { year: ev.target.value })} className="tv-input" placeholder="Year" />
              <button type="button" className="btn-ghost btn-sm" aria-label="Remove education" onClick={() => setEdu(edu.filter((_, n) => n !== i))}><Icon name="close" /></button>
            </div>
          ))}
          <button type="button" className="btn-secondary btn-sm" onClick={() => setEdu([...edu, { qualification: "", field_of_study: "", institution_descriptor: "", year: "" }])}><Icon name="add" className="text-base" /> Add education</button>
          <div className="h-px bg-border-subtle my-space-sm" />
          {certs.map((c, i) => (
            <div key={`c${i}`} className="grid grid-cols-1 md:grid-cols-[3fr_2fr_1fr_auto] gap-2">
              <input aria-label="Certification" value={c.name} onChange={(ev) => upd(certs, setCerts, i, { name: ev.target.value })} className="tv-input" placeholder="Certification" />
              <input aria-label="Issuer" value={c.issuer} onChange={(ev) => upd(certs, setCerts, i, { issuer: ev.target.value })} className="tv-input" placeholder="Issuer" />
              <input aria-label="Certification year" value={c.year} onChange={(ev) => upd(certs, setCerts, i, { year: ev.target.value })} className="tv-input" placeholder="Year" />
              <button type="button" className="btn-ghost btn-sm" aria-label="Remove certification" onClick={() => setCerts(certs.filter((_, n) => n !== i))}><Icon name="close" /></button>
            </div>
          ))}
          <button type="button" className="btn-secondary btn-sm" onClick={() => setCerts([...certs, { name: "", issuer: "", year: "" }])}><Icon name="add" className="text-base" /> Add certification</button>
        </div>
      </details>

      <SubmitButton icon="save" className="btn-outline" pendingText="Saving draft…">Save Draft</SubmitButton>
    </form>
  );
}
