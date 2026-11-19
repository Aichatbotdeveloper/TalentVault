"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Field, FormMessage, SubmitButton, useFormAction } from "@/components/ui/form";
import { updatePassword } from "../../actions";

export default function UpdatePasswordPage() {
  const { state, action, fe } = useFormAction(updatePassword);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Default Supabase invitation links deliver the session in the URL fragment.
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (!hash.size) return;
    window.history.replaceState(null, "", window.location.pathname);
    if (hash.get("error")) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reflects a one-time URL fragment
      setLinkError(hash.get("error_description")?.replace(/\+/g, " ") ?? "This link is invalid or has expired.");
      return;
    }
    const access_token = hash.get("access_token");
    const refresh_token = hash.get("refresh_token");
    if (access_token && refresh_token) {
      void fetch("/auth/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ access_token, refresh_token }) }).then(
        (r) => !r.ok && setLinkError("This link is invalid or has expired."),
      );
    }
  }, []);

  if (linkError) {
    return (
      <AuthShell title="Link expired or invalid" subtitle={linkError}>
        <div className="flex flex-wrap gap-space-sm">
          <Link href="/auth/forgot-password" className="btn-primary">Request a new link</Link>
          <Link href="/login" className="btn-outline">Sign in</Link>
        </div>
      </AuthShell>
    );
  }

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
