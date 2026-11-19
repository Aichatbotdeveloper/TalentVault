import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { Icon } from "@/components/ui/icon";
import { ResendForm } from "./resend-form";

export const metadata: Metadata = { title: "Check your email" };

export default async function CheckEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return (
    <AuthShell title="Check your email">
      <div className="tv-card p-space-xl space-y-space-md">
        <span className="h-12 w-12 rounded-full bg-secondary-fixed/40 text-on-secondary-container grid place-items-center"><Icon name="mark_email_unread" /></span>
        <p className="font-body-md text-body-md">
          We&apos;ve sent a verification link{email ? <> to <strong>{email}</strong></> : null}. Click the link to confirm your email address.
        </p>
        <p className="font-body-sm text-body-sm text-text-muted">Once confirmed, our team will review your organisation. We&apos;ll email you when candidate search is enabled.</p>
        <ResendForm email={email ?? ""} />
      </div>
      <Link href="/login" className="btn-ghost mt-space-lg">Back to sign in</Link>
    </AuthShell>
  );
}
