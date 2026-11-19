"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { initialActionState } from "@/lib/action-state";
import { resendConfirmation } from "../../actions";

export function ResendForm({ email }: { email: string }) {
  const [state, action] = useActionState(resendConfirmation, initialActionState);
  return (
    <form action={action} className="space-y-space-sm">
      <FormMessage state={state} />
      <input type="hidden" name="email" value={email} />
      <SubmitButton className="btn-secondary btn-sm" pendingText="Sending…">Resend verification email</SubmitButton>
    </form>
  );
}
