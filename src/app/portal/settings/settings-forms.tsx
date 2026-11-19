"use client";

import { useActionState } from "react";
import { Field, FormMessage, SubmitButton, useFormAction } from "@/components/ui/form";
import { initialActionState } from "@/lib/action-state";
import { changePassword, updateMyProfile } from "../actions";

export function ProfileForm({ fullName, jobTitle, phone, email }: { fullName: string; jobTitle: string; phone: string; email: string }) {
  const { state, action, v, fe } = useFormAction(updateMyProfile);
  return (
    <form action={action} className="space-y-space-lg">
      <FormMessage state={state} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
        <Field label="Full name" name="full_name" errors={fe.full_name} required><input id="full_name" name="full_name" defaultValue={v("full_name", fullName)} className="tv-input" /></Field>
        <Field label="Job title" name="job_title" errors={fe.job_title}><input id="job_title" name="job_title" defaultValue={v("job_title", jobTitle)} className="tv-input" /></Field>
        <Field label="Phone" name="phone" errors={fe.phone}><input id="phone" name="phone" defaultValue={v("phone", phone)} className="tv-input" /></Field>
        <Field label="Email" name="email_display" help="Contact TalentVault to change your login email."><input id="email_display" value={email} disabled className="tv-input" /></Field>
      </div>
      <SubmitButton icon="save">Save details</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, initialActionState);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-space-lg">
      <FormMessage state={state} />
      <Field label="Current password" name="current_password" errors={fe.current_password}><input id="current_password" name="current_password" type="password" autoComplete="current-password" className="tv-input" /></Field>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
        <Field label="New password" name="password" errors={fe.password} help="10+ characters, upper & lower case and a number."><input id="password" name="password" type="password" autoComplete="new-password" className="tv-input" /></Field>
        <Field label="Confirm new password" name="confirm_password" errors={fe.confirm_password}><input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" className="tv-input" /></Field>
      </div>
      <SubmitButton icon="lock_reset" pendingText="Updating…">Change password</SubmitButton>
    </form>
  );
}
