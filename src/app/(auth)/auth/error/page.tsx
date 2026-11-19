import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";

export default function AuthErrorPage() {
  return (
    <AuthShell title="Link expired or invalid" subtitle="This verification or reset link is no longer valid. Links expire after one hour and can only be used once.">
      <div className="flex flex-wrap gap-space-sm">
        <Link href="/auth/forgot-password" className="btn-primary">Request a new reset link</Link>
        <Link href="/login" className="btn-outline">Sign in</Link>
      </div>
    </AuthShell>
  );
}
