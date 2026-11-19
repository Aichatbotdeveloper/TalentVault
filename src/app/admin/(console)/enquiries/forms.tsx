"use client";

import { useEffect, useRef } from "react";
import { FormMessage, SubmitButton, useFormAction } from "@/components/ui/form";
import { ENQUIRY_STATUS_OPTIONS } from "@/lib/format";
import { makeIntroduction, recordIdentityConsent, sendConsentRequest, updateEnquiry } from "./actions";

export function TriageForm({ enquiryId, status, assigned, admins }: { enquiryId: string; status: string; assigned: string | null; admins: { id: string; name: string }[] }) {
  const { state, action } = useFormAction(updateEnquiry);
  return (
    <form action={action} className="space-y-space-sm">
      <input type="hidden" name="enquiry_id" value={enquiryId} />
      <FormMessage state={state} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
        <label className="block"><span className="tv-label">Status</span>
          <select name="status" defaultValue={status} className="tv-select">
            {ENQUIRY_STATUS_OPTIONS.map(([k, l]) => <option key={k} value={k} disabled={k === "candidate_consented" && status !== k}>{l}</option>)}
          </select>
        </label>
        <label className="block"><span className="tv-label">Assigned recruiter</span>
          <select name="assigned_admin_id" defaultValue={assigned ?? ""} className="tv-select">
            <option value="">Unassigned</option>
            {admins.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
      </div>
      <SubmitButton className="btn-secondary btn-sm" icon="save">Update status / assignment</SubmitButton>
    </form>
  );
}

export function NoteForm({ enquiryId }: { enquiryId: string }) {
  const { state, action } = useFormAction(updateEnquiry);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-space-sm">
      <input type="hidden" name="enquiry_id" value={enquiryId} />
      <FormMessage state={state} />
      <textarea name="message" rows={3} required maxLength={4000} aria-label="Note or message" className="tv-textarea" placeholder="Add an internal note or a message to the employer" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <fieldset className="flex gap-space-md font-body-sm text-body-sm">
          <legend className="sr-only">Visibility</legend>
          <label className="flex items-center gap-1"><input type="radio" name="visibility" value="internal" defaultChecked className="accent-[#1a6840]" /> Internal note (staff only)</label>
          <label className="flex items-center gap-1"><input type="radio" name="visibility" value="employer" className="accent-[#1a6840]" /> Message to employer</label>
        </fieldset>
        <SubmitButton className="btn-primary btn-sm" icon="send" pendingText="Posting…">Post</SubmitButton>
      </div>
    </form>
  );
}

export function ConsentRequestForm({ enquiryId, template }: { enquiryId: string; template: string }) {
  const { state, action, v } = useFormAction(sendConsentRequest);
  return (
    <form action={action} className="space-y-space-sm">
      <input type="hidden" name="enquiry_id" value={enquiryId} />
      <FormMessage state={state} />
      <textarea name="body" rows={6} defaultValue={v("body", template)} aria-label="Consent request message" className="tv-textarea font-mono text-[13px]" />
      <SubmitButton icon="send" pendingText="Sending…" className="btn-primary w-full">Send Candidate Authorisation Request</SubmitButton>
    </form>
  );
}

export function RecordConsentForm({ enquiryId }: { enquiryId: string }) {
  const { state, action, v } = useFormAction(recordIdentityConsent);
  return (
    <form action={action} className="space-y-space-sm">
      <input type="hidden" name="enquiry_id" value={enquiryId} />
      <FormMessage state={state} />
      <input name="note" defaultValue={v("note")} aria-label="Consent evidence" className="tv-input" placeholder="e.g. Candidate confirmed by email reply, 19 Nov 2026 14:30" />
      <SubmitButton icon="how_to_reg" pendingText="Recording…" className="btn-secondary w-full">Record candidate consent</SubmitButton>
    </form>
  );
}

export function IntroductionForm({ enquiryId, template }: { enquiryId: string; template: string }) {
  const { state, action, v } = useFormAction(makeIntroduction);
  return (
    <form action={action} className="space-y-space-sm">
      <input type="hidden" name="enquiry_id" value={enquiryId} />
      <FormMessage state={state} />
      <textarea name="body" rows={6} defaultValue={v("body", template)} aria-label="Introduction message" className="tv-textarea" />
      <p className="tv-help">This message is shown to the employer. Only include details the candidate agreed to share.</p>
      <SubmitButton icon="handshake" pendingText="Sending…" className="btn-primary w-full" confirm="Send this introduction to the employer? It may disclose the candidate's identity.">Send introduction to employer</SubmitButton>
    </form>
  );
}
