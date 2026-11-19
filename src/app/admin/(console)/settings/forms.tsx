"use client";

import { Field, FormMessage, SubmitButton, useFormAction } from "@/components/ui/form";
import { changePassword } from "@/app/portal/actions";
import { inviteAdmin, setUserAccess, updateOwnName, updatePlatformSettings } from "./actions";

export function InviteForm() {
  const { state, action, v, fe } = useFormAction(inviteAdmin);
  return (
    <form action={action} className="space-y-space-sm">
      <FormMessage state={state} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-sm">
        <Field label="Full name" name="full_name" errors={fe.full_name}><input id="full_name" name="full_name" defaultValue={v("full_name")} className="tv-input" /></Field>
        <Field label="Email" name="email" errors={fe.email}><input id="email" name="email" type="email" defaultValue={v("email")} className="tv-input" /></Field>
        <Field label="Role" name="role">
          <select id="role" name="role" defaultValue={v("role", "recruitment_admin")} className="tv-select">
            <option value="recruitment_admin">Recruitment Administrator</option>
            <option value="super_admin">Super Administrator</option>
          </select>
        </Field>
      </div>
      <SubmitButton icon="person_add" pendingText="Inviting…">Invite Admin User</SubmitButton>
    </form>
  );
}

export function AccessForm({ userId, role, status }: { userId: string; role: string; status: string }) {
  const { state, action } = useFormAction(setUserAccess);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="user_id" value={userId} />
      <select name="role" defaultValue={role} aria-label="Role" className="tv-select h-9 w-auto font-body-sm">
        <option value="recruitment_admin">Recruitment Admin</option>
        <option value="super_admin">Super Admin</option>
      </select>
      <select name="status" defaultValue={status} aria-label="Status" className="tv-select h-9 w-auto font-body-sm">
        <option value="active">Active</option>
        <option value="suspended">Suspended</option>
      </select>
      <SubmitButton className="btn-secondary btn-sm">Update</SubmitButton>
      {state.message && <span className={`font-body-sm text-body-sm ${state.ok ? "text-primary" : "text-error"}`}>{state.message}</span>}
    </form>
  );
}

export function PlatformForm({ s }: { s: { contact: Record<string, string>; recipients: string[]; registrationOpen: boolean; autoProcess: boolean } }) {
  const { state, action, v, fe } = useFormAction(updatePlatformSettings);
  return (
    <form action={action} className="space-y-space-lg">
      <FormMessage state={state} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        <Field label="Public contact email" name="contact_email" errors={fe.contact_email}><input id="contact_email" name="contact_email" defaultValue={v("contact_email", s.contact.email ?? "")} className="tv-input" /></Field>
        <Field label="Public phone" name="contact_phone"><input id="contact_phone" name="contact_phone" defaultValue={v("contact_phone", s.contact.phone ?? "")} className="tv-input" /></Field>
        <Field label="Office address" name="contact_address"><textarea id="contact_address" name="contact_address" rows={2} defaultValue={v("contact_address", s.contact.address ?? "")} className="tv-textarea" /></Field>
        <Field label="Opening hours" name="contact_hours"><input id="contact_hours" name="contact_hours" defaultValue={v("contact_hours", s.contact.hours ?? "")} className="tv-input" /></Field>
      </div>
      <Field label="Admin alert email recipients" name="admin_notification_emails" errors={fe.admin_notification_emails} help="Comma-separated. If empty, all active administrators receive alert emails.">
        <input id="admin_notification_emails" name="admin_notification_emails" defaultValue={v("admin_notification_emails", s.recipients.join(", "))} className="tv-input" />
      </Field>
      <label className="flex items-start gap-space-sm"><input type="checkbox" name="employer_registration_open" defaultChecked={s.registrationOpen} className="accent-[#1a6840] h-4 w-4 mt-1" /><span><span className="font-label-md text-label-md block">Employer self-registration open</span><span className="font-body-sm text-body-sm text-text-muted">When off, the registration form is hidden and new sign-ups are refused.</span></span></label>
      <label className="flex items-start gap-space-sm"><input type="checkbox" name="auto_process_cvs" defaultChecked={s.autoProcess} className="accent-[#1a6840] h-4 w-4 mt-1" /><span><span className="font-label-md text-label-md block">Automatically queue CVs for AI processing</span><span className="font-body-sm text-body-sm text-text-muted">When off, new CVs wait as &quot;Uploaded&quot; until a recruiter starts processing (Reprocess).</span></span></label>
      <SubmitButton icon="save" pendingText="Saving…">Save Configuration Changes</SubmitButton>
    </form>
  );
}

export function OwnAccountForms({ name, jobTitle }: { name: string; jobTitle: string }) {
  const n = useFormAction(updateOwnName);
  const p = useFormAction(changePassword);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-xl">
      <form action={n.action} className="space-y-space-sm">
        <FormMessage state={n.state} />
        <Field label="Your name" name="full_name"><input id="full_name_own" name="full_name" defaultValue={n.v("full_name", name)} className="tv-input" /></Field>
        <Field label="Job title" name="job_title"><input id="job_title_own" name="job_title" defaultValue={n.v("job_title", jobTitle)} className="tv-input" /></Field>
        <SubmitButton className="btn-secondary">Save</SubmitButton>
      </form>
      <form action={p.action} className="space-y-space-sm">
        <FormMessage state={p.state} />
        <Field label="Current password" name="current_password" errors={p.fe.current_password}><input id="current_password" name="current_password" type="password" autoComplete="current-password" className="tv-input" /></Field>
        <Field label="New password" name="password" errors={p.fe.password}><input id="password" name="password" type="password" autoComplete="new-password" className="tv-input" /></Field>
        <Field label="Confirm new password" name="confirm_password" errors={p.fe.confirm_password}><input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" className="tv-input" /></Field>
        <SubmitButton className="btn-secondary" icon="lock_reset">Change password</SubmitButton>
      </form>
    </div>
  );
}
