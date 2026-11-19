"use client";

import { useActionState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Field, FormMessage, SubmitButton } from "@/components/ui/form";
import { initialActionState } from "@/lib/action-state";
import { updatePassword } from "../../actions";

export default function UpdatePasswordPage() {
  const [state, action] = useActionState(updatePassword, initialActionState);
  const fe = state.fieldErrors ?? {};
  return (
    <AuthShell title="Choose a new password" subtitle="Use at least 10 characters including upper and lower case letters and a number.">
      <form action={action} className="space-y-space-lg" noValidate>
        <FormMessage state={state} />
        <Field label="New password" name="password" errors={fe.password}>
          <input id="password" name="password" type="password" autoComplete="new-password" className="tv-input" required />
        </Field>
        <Field label="Confirm new password" name="confirm_password" errors={fe.confirm_password}>
          <input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" className="tv-input" required />
        </Field>
        <SubmitButton className="btn-primary w-full btn-lg" pendingText="Updating…">Update password</SubmitButton>
      </form>
    </AuthShell>
  );
}
