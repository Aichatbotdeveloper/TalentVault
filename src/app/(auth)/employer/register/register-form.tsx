"use client";

import Link from "next/link";
import { Field, FormMessage, SubmitButton, useFormAction } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { registerEmployer } from "../../actions";

export function RegisterForm() {
  const { state, action, v, fe } = useFormAction(registerEmployer);
  return (
    <form action={action} className="space-y-space-xl" noValidate>
      <FormMessage state={state} />
      <fieldset className="tv-card p-space-xl space-y-space-lg">
        <legend className="font-heading-sm text-heading-sm font-bold flex items-center gap-2 px-1"><Icon name="badge" /> Your details</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
          <Field label="Full name" name="full_name" required errors={fe.full_name}><input id="full_name" name="full_name" defaultValue={v("full_name")} className="tv-input" autoComplete="name" required /></Field>
          <Field label="Job title" name="job_title" required errors={fe.job_title}><input id="job_title" name="job_title" defaultValue={v("job_title")} className="tv-input" autoComplete="organization-title" required /></Field>
          <Field label="Work email" name="email" required errors={fe.email} help="Use your corporate email address."><input id="email" name="email" defaultValue={v("email")} type="email" className="tv-input" autoComplete="email" required /></Field>
          <Field label="Direct phone" name="phone" errors={fe.phone}><input id="phone" name="phone" defaultValue={v("phone")} type="tel" className="tv-input" autoComplete="tel" /></Field>
        </div>
      </fieldset>
      <fieldset className="tv-card p-space-xl space-y-space-lg">
        <legend className="font-heading-sm text-heading-sm font-bold flex items-center gap-2 px-1"><Icon name="domain" /> Organisation</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
          <Field label="Company name" name="company_name" required errors={fe.company_name}><input id="company_name" name="company_name" defaultValue={v("company_name")} className="tv-input" autoComplete="organization" required /></Field>
          <Field label="Company registration number" name="company_number" errors={fe.company_number}><input id="company_number" name="company_number" defaultValue={v("company_number")} className="tv-input" /></Field>
          <Field label="Website" name="website" errors={fe.website}><input id="website" name="website" defaultValue={v("website")} className="tv-input" placeholder="https://" /></Field>
          <Field label="Industry" name="industry" errors={fe.industry}><input id="industry" name="industry" defaultValue={v("industry")} className="tv-input" /></Field>
          <Field label="Company size" name="company_size" errors={fe.company_size}>
            <select id="company_size" name="company_size" className="tv-select" defaultValue="">
              <option value="">Select…</option>
              {["1–10", "11–50", "51–200", "201–1,000", "1,001–5,000", "5,000+"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="City" name="city" errors={fe.city}><input id="city" name="city" defaultValue={v("city")} className="tv-input" autoComplete="address-level2" /></Field>
        </div>
        <Field label="Hiring needs (optional)" name="hiring_needs" errors={fe.hiring_needs}>
          <textarea id="hiring_needs" name="hiring_needs" defaultValue={v("hiring_needs")} rows={3} className="tv-textarea" placeholder="Roles and skills you are typically hiring for" />
        </Field>
      </fieldset>
      <fieldset className="tv-card p-space-xl space-y-space-lg">
        <legend className="font-heading-sm text-heading-sm font-bold flex items-center gap-2 px-1"><Icon name="key" /> Security</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
          <Field label="Password" name="password" required errors={fe.password} help="At least 10 characters with upper & lower case letters and a number.">
            <input id="password" name="password" type="password" className="tv-input" autoComplete="new-password" required />
          </Field>
          <Field label="Confirm password" name="confirm_password" required errors={fe.confirm_password}>
            <input id="confirm_password" name="confirm_password" type="password" className="tv-input" autoComplete="new-password" required />
          </Field>
        </div>
        <label className="flex items-start gap-space-sm">
          <input type="checkbox" name="accept_terms" className="accent-[#1a6840] h-4 w-4 mt-1" required />
          <span className="font-body-sm text-body-sm">
            I agree to the <Link href="/terms" className="text-primary underline" target="_blank">Terms</Link> and{" "}
            <Link href="/privacy" className="text-primary underline" target="_blank">Privacy Policy</Link>, and will use candidate information only for genuine recruitment purposes.
          </span>
        </label>
        {fe.accept_terms && <p className="tv-error">{fe.accept_terms[0]}</p>}
      </fieldset>
      <div className="rounded-xl bg-secondary-fixed/20 p-space-md flex gap-space-sm font-body-sm text-body-sm text-on-secondary-container">
        <Icon name="info" className="text-lg" />
        After you verify your email, our team reviews your organisation. Candidate search is enabled once your account is approved.
      </div>
      <SubmitButton pendingText="Creating account…" className="btn-primary btn-lg w-full">Create Employer Account</SubmitButton>
    </form>
  );
}
