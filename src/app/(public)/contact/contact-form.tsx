"use client";

import { Field, FormMessage, SubmitButton, useFormAction } from "@/components/ui/form";
import { submitContact } from "./actions";

export function ContactForm() {
  const { state, action, v, fe } = useFormAction(submitContact);
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-space-lg" noValidate>
      <FormMessage state={state} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
        <Field label="Full name" name="name" required errors={fe.name}>
          <input id="name" name="name" defaultValue={v("name")} className="tv-input" autoComplete="name" required />
        </Field>
        <Field label="Email address" name="email" required errors={fe.email}>
          <input id="email" name="email" defaultValue={v("email")} type="email" className="tv-input" autoComplete="email" required />
        </Field>
        <Field label="Company (optional)" name="company" errors={fe.company}>
          <input id="company" name="company" defaultValue={v("company")} className="tv-input" autoComplete="organization" />
        </Field>
        <Field label="I am…" name="enquiry_type" errors={fe.enquiry_type}>
          <select id="enquiry_type" name="enquiry_type" className="tv-select" defaultValue="general">
            <option value="employer">An employer / hiring manager</option>
            <option value="candidate">A candidate</option>
            <option value="general">Other</option>
          </select>
        </Field>
      </div>
      <Field label="Message" name="message" required errors={fe.message}>
        <textarea id="message" name="message" defaultValue={v("message")} rows={6} className="tv-textarea" required maxLength={4000} />
      </Field>
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <SubmitButton pendingText="Sending…" icon="send">Send Message</SubmitButton>
    </form>
  );
}
