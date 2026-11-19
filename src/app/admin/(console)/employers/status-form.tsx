"use client";

import { FormMessage, SubmitButton, useFormAction } from "@/components/ui/form";
import { setEmployerStatus } from "./actions";

export function EmployerStatusForm({ employerId, status }: { employerId: string; status: string }) {
  const { state, action, v } = useFormAction(setEmployerStatus);
  return (
    <form action={action} className="space-y-space-sm">
      <input type="hidden" name="employer_id" value={employerId} />
      <FormMessage state={state} />
      <label htmlFor="reason" className="tv-label">Reason / note to employer (required to reject or suspend)</label>
      <textarea id="reason" name="reason" rows={2} defaultValue={v("reason")} className="tv-textarea" />
      <div className="flex flex-wrap gap-2">
        {status !== "approved" && <SubmitButton name="status" value="approved" icon="verified" pendingText="Saving…">{status === "suspended" ? "Reactivate" : "Approve"}</SubmitButton>}
        {status === "pending" && <SubmitButton name="status" value="rejected" className="btn-secondary" icon="block" pendingText="Saving…">Reject</SubmitButton>}
        {status === "approved" && <SubmitButton name="status" value="suspended" className="btn-danger" icon="pause_circle" pendingText="Saving…" confirm="Suspend this employer's access to the candidate directory?">Suspend Access</SubmitButton>}
        {status === "rejected" && <SubmitButton name="status" value="pending" className="btn-secondary" icon="undo" pendingText="Saving…">Return to review</SubmitButton>}
      </div>
    </form>
  );
}
