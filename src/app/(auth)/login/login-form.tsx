"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, FormMessage, SubmitButton, useFormAction } from "@/components/ui/form";
import { initialActionState } from "@/lib/action-state";
import { adminLogin, employerLogin, resendConfirmation } from "../actions";

export function LoginForm({ next, variant = "employer" }: { next?: string; variant?: "employer" | "admin" }) {
  const { state, action, v } = useFormAction(variant === "admin" ? adminLogin : employerLogin);
  const [resendState, resendAction] = useActionState(resendConfirmation, initialActionState);
  const fe = state.fieldErrors ?? {};
  return (
    <div className="space-y-space-lg">
      <form action={action} className="space-y-space-lg" noValidate>
        <FormMessage state={state} />
        <input type="hidden" name="next" value={next ?? ""} />
        <Field label="Email address" name="email" errors={fe.email}>
          <input id="email" name="email" type="email" autoComplete="email" className="tv-input" defaultValue={v("email")} required />
        </Field>
        <Field
          label="Password"
          name="password"
          errors={fe.password}
          aside={<Link href="/auth/forgot-password" className="font-label-sm text-label-sm text-primary">Forgot password?</Link>}
        >
          <input id="password" name="password" type="password" autoComplete="current-password" className="tv-input" required />
        </Field>
        <SubmitButton pendingText="Signing in…" className="btn-primary w-full btn-lg">Sign In</SubmitButton>
      </form>
      {state.data?.unconfirmed === true && (
        <form action={resendAction} className="tv-card p-space-md space-y-space-sm">
          <FormMessage state={resendState} />
          <p className="font-body-sm text-body-sm text-text-muted">Didn&apos;t receive the verification email?</p>
          <div className="flex gap-2">
            <input name="email" type="email" defaultValue={v("email")} placeholder="Your email" className="tv-input" aria-label="Email for verification" />
            <SubmitButton className="btn-secondary" pendingText="Sending…">Resend</SubmitButton>
          </div>
        </form>
      )}
    </div>
  );
}
