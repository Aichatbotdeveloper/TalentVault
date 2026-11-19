"use client";

import { CvDropzone, useCvUpload } from "@/components/cv-uploader";
import { Field, FormMessage, SubmitButton, useFormAction } from "@/components/ui/form";
import { adminCreateCandidate } from "../actions";

export function AdminUploadForm() {
  const { state, action, v, fe } = useFormAction(adminCreateCandidate);
  const { upload, start, reset } = useCvUpload("/api/admin/upload-url");
  return (
    <form action={action} className="space-y-space-xl">
      <FormMessage state={state} />
      <section className="tv-panel p-space-xl space-y-space-md">
        <h2 className="font-heading-sm text-heading-sm font-bold">1. CV document</h2>
        <CvDropzone upload={upload} onFile={(f) => void start(f)} onRemove={reset} errors={fe.upload_path} />
      </section>
      <section className="tv-panel p-space-xl space-y-space-md">
        <h2 className="font-heading-sm text-heading-sm font-bold">2. Candidate details <span className="font-body-sm text-body-sm text-text-muted">(optional — extracted from the CV if left blank)</span></h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
          <Field label="Full name" name="full_name" errors={fe.full_name}><input id="full_name" name="full_name" defaultValue={v("full_name")} className="tv-input" /></Field>
          <Field label="Email" name="email" errors={fe.email}><input id="email" name="email" type="email" defaultValue={v("email")} className="tv-input" /></Field>
          <Field label="Phone" name="phone" errors={fe.phone}><input id="phone" name="phone" defaultValue={v("phone")} className="tv-input" /></Field>
          <Field label="City / region" name="location" errors={fe.location}><input id="location" name="location" defaultValue={v("location")} className="tv-input" /></Field>
          <Field label="Target role" name="job_title" errors={fe.job_title}><input id="job_title" name="job_title" defaultValue={v("job_title")} className="tv-input" /></Field>
        </div>
      </section>
      <section className="tv-panel p-space-xl space-y-space-md">
        <h2 className="font-heading-sm text-heading-sm font-bold">3. Candidate consent</h2>
        <label className="flex items-start gap-space-sm">
          <input type="checkbox" name="consent_confirmed" className="accent-[#1a6840] h-4 w-4 mt-1" />
          <span className="font-body-sm text-body-sm">The candidate has agreed to TalentVault processing their CV (including AI-assisted extraction), showing an anonymised profile to approved employers, and contacting them about enquiries.</span>
        </label>
        {fe.consent_confirmed && <p className="tv-error">{fe.consent_confirmed[0]}</p>}
        <Field label="How and when was consent obtained?" name="consent_source" errors={fe.consent_source}>
          <input id="consent_source" name="consent_source" defaultValue={v("consent_source")} className="tv-input" placeholder="e.g. Email confirmation from candidate, 19 Nov 2026" />
        </Field>
      </section>
      <SubmitButton icon="upload" pendingText="Creating candidate…" className="btn-primary btn-lg">Create Candidate &amp; Queue Processing</SubmitButton>
    </form>
  );
}
