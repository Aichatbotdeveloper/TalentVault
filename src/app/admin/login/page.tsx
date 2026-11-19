import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { FormMessage } from "@/components/ui/form";
import { LoginForm } from "../../(auth)/login/login-form";

export const metadata: Metadata = { title: "Administrator Login", robots: { index: false } };

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <AuthShell variant="admin" title="Administrator Login" subtitle="Authorised TalentVault staff only. All access is logged.">
      {error === "forbidden" && <div className="mb-space-md"><FormMessage state={{ ok: false, message: "Your account does not have administrator access." }} /></div>}
      <LoginForm variant="admin" />
    </AuthShell>
  );
}
