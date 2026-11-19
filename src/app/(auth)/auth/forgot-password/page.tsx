"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Field, FormMessage, SubmitButton } from "@/components/ui/form";
import { initialActionState } from "@/lib/action-state";
import { requestPasswordReset } from "../../actions";

export default function ForgotPasswordPage() {
  const [state, action] = useActionState(requestPasswordReset, initialActionState);
  return (
    <AuthShell title="Reset your password" subtitle="Enter your account email and we'll send you a secure reset link.">
      <form action={action} className="space-y-space-lg" noValidate>
        <FormMessage state={state} />
        <Field label="Email address" name="email" errors={state.fieldErrors?.email}>
          <input id="email" name="email" type="email" autoComplete="email" className="tv-input" required />
        </Field>
        <SubmitButton className="btn-primary w-full btn-lg" pendingText="Sending…">Send reset link</SubmitButton>
      </form>
      <Link href="/login" className="btn-ghost mt-space-lg">Back to sign in</Link>
    </AuthShell>
  );
}
