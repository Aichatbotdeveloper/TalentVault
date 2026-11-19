import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { FormMessage } from "@/components/ui/form";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Employer Sign In" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; signed_out?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthShell title="Employer Sign In" subtitle={<>New to TalentVault? <Link href="/employer/register" className="text-primary font-semibold">Register your organisation</Link></>}>
      {sp.signed_out && <div className="mb-space-md"><FormMessage state={{ ok: true, message: "You have been signed out." }} /></div>}
      {sp.error === "suspended" && <div className="mb-space-md"><FormMessage state={{ ok: false, message: "This account is suspended. Please contact TalentVault." }} /></div>}
      <LoginForm next={sp.next} />
      <p className="mt-space-2xl font-body-sm text-body-sm text-text-muted">
        TalentVault staff? <Link href="/admin/login" className="text-primary">Use the administrator login</Link>.
      </p>
    </AuthShell>
  );
}
