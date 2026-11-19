"use client";

import { approveCandidate, eraseCandidate, requestReprocess, savePrivateDetails } from "@/app/admin/(console)/candidates/actions";
import { Field, FieldError, FormMessage, SubmitButton, useFormAction } from "../ui/form";
import { Icon } from "../ui/icon";

export function ApproveForm({ candidateId, salaryText, canPublish, isAI }: { candidateId: string; salaryText: string; canPublish: boolean; isAI: boolean }) {
  const { state, action, fe } = useFormAction(approveCandidate);
  return (
    <form action={action} className="space-y-space-md">
      <input type="hidden" name="candidate_id" value={candidateId} />
      <FormMessage state={state} />
      <h3 className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Consultant sign-off requirements</h3>
      <label className="flex gap-space-sm rounded-xl bg-surface-container-low p-space-md cursor-pointer">
        <input type="checkbox" name="confirm_sanitised" className="accent-[#1a6840] h-4 w-4 mt-1 shrink-0" />
        <span>
          <span className="font-label-md text-label-md block">Confirm sanitisation safeguards</span>
          <span className="font-body-sm text-body-sm text-text-muted">I confirm the anonymised profile contains no name, contact details, address, named employers or institutions, or other identifying details.</span>
        </span>
      </label>
      <label className="flex gap-space-sm rounded-xl bg-surface-container-low p-space-md cursor-pointer">
        <input type="checkbox" name="confirm_details" className="accent-[#1a6840] h-4 w-4 mt-1 shrink-0" />
        <span>
          <span className="font-label-md text-label-md block">Validate accuracy, remuneration &amp; availability</span>
          <span className="font-body-sm text-body-sm text-text-muted">I have checked the profile against the original CV{isAI ? " and the AI output" : ""} — nothing has been invented — and the salary expectation ({salaryText}) and availability are correct.</span>
        </span>
      </label>
      <FieldError errors={fe.signoff} />
      <div className="flex flex-wrap gap-space-sm">
        <SubmitButton className="btn-outline" icon="task_alt" name="publish" value="0" pendingText="Approving…">Approve only</SubmitButton>
        {canPublish && <SubmitButton icon="rocket_launch" name="publish" value="1" pendingText="Publishing…">Approve &amp; Publish</SubmitButton>}
      </div>
      <p className="tv-help">Save any edits to the profile (Save Draft) before approving.</p>
    </form>
  );
}

export function ReprocessForm({ candidateId }: { candidateId: string }) {
  const { state, action, v } = useFormAction(requestReprocess);
  return (
    <form action={action} className="space-y-space-sm">
      <input type="hidden" name="candidate_id" value={candidateId} />
      <FormMessage state={state} />
      <label htmlFor="instructions" className="tv-label">Custom instructions (optional)</label>
      <textarea id="instructions" name="instructions" rows={3} defaultValue={v("instructions")} maxLength={2000} className="tv-textarea" placeholder="e.g. Emphasise regulatory compliance experience; the candidate is seeking contract roles." />
      <p className="tv-help">Re-running replaces the draft profile with new results. A published profile is unpublished until it is approved again.</p>
      <SubmitButton className="btn-secondary" icon="tune" pendingText="Queuing…" confirm="Reprocess this CV? The current draft profile will be replaced.">Reprocess with Custom Prompt</SubmitButton>
    </form>
  );
}

export function PrivateDetailsForm({ candidateId, p }: { candidateId: string; p: { full_name: string; email: string; phone: string | null; location_full: string | null; linkedin_url: string | null; right_to_work: string | null; internal_notes: string | null } }) {
  const { state, action, v, fe } = useFormAction(savePrivateDetails);
  return (
    <form action={action} className="space-y-space-md">
      <input type="hidden" name="candidate_id" value={candidateId} />
      <FormMessage state={state} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        <Field label="Full legal name" name="full_name" errors={fe.full_name}><input id="full_name" name="full_name" defaultValue={v("full_name", p.full_name)} className="tv-input" /></Field>
        <Field label="Email" name="email" errors={fe.email}><input id="email" name="email" defaultValue={v("email", p.email)} className="tv-input" /></Field>
        <Field label="Phone" name="phone" errors={fe.phone}><input id="phone" name="phone" defaultValue={v("phone", p.phone ?? "")} className="tv-input" /></Field>
        <Field label="Location" name="location_full" errors={fe.location_full}><input id="location_full" name="location_full" defaultValue={v("location_full", p.location_full ?? "")} className="tv-input" /></Field>
        <Field label="LinkedIn" name="linkedin_url" errors={fe.linkedin_url}><input id="linkedin_url" name="linkedin_url" defaultValue={v("linkedin_url", p.linkedin_url ?? "")} className="tv-input" /></Field>
        <Field label="Right to work" name="right_to_work" errors={fe.right_to_work}><input id="right_to_work" name="right_to_work" defaultValue={v("right_to_work", p.right_to_work ?? "")} className="tv-input" /></Field>
      </div>
      <Field label="Internal verification log & consultant notes" name="internal_notes" help="Internal only — never shown to employers.">
        <textarea id="internal_notes" name="internal_notes" rows={4} defaultValue={v("internal_notes", p.internal_notes ?? "")} className="tv-textarea" />
      </Field>
      <SubmitButton icon="save" className="btn-outline">Save private record</SubmitButton>
    </form>
  );
}

export function EraseForm({ candidateId, candidateRef }: { candidateId: string; candidateRef: string }) {
  const { state, action } = useFormAction(eraseCandidate);
  return (
    <form action={action} className="space-y-space-sm">
      <input type="hidden" name="candidate_id" value={candidateId} />
      <FormMessage state={state} />
      <p className="font-body-sm text-body-sm text-text-muted">Permanently deletes the candidate, private record, profile, consent records, enquiries and stored CV files. This cannot be undone.</p>
      <label htmlFor="confirm_ref" className="tv-label">Type <span className="font-mono">{candidateRef}</span> to confirm</label>
      <div className="flex gap-2">
        <input id="confirm_ref" name="confirm_ref" className="tv-input" autoComplete="off" />
        <SubmitButton className="btn-danger" pendingText="Erasing…"><Icon name="delete_forever" className="text-lg" /> Erase</SubmitButton>
      </div>
    </form>
  );
}
