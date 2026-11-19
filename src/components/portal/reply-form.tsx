"use client";

import { useActionState, useEffect, useRef } from "react";
import { postEnquiryMessage } from "@/app/portal/actions";
import { initialActionState } from "@/lib/action-state";
import { FormMessage, SubmitButton } from "../ui/form";

export function ReplyForm({ enquiryId }: { enquiryId: string }) {
  const [state, action] = useActionState(postEnquiryMessage, initialActionState);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-space-sm">
      <FormMessage state={state} />
      <input type="hidden" name="enquiry_id" value={enquiryId} />
      <label htmlFor={`reply-${enquiryId}`} className="tv-label">Reply / add a note for the TalentVault team</label>
      <textarea id={`reply-${enquiryId}`} name="body" rows={3} maxLength={4000} className="tv-textarea" required />
      <SubmitButton icon="reply" pendingText="Sending…">Send Reply</SubmitButton>
    </form>
  );
}
