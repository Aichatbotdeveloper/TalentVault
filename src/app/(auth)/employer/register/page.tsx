import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { getPublicSettings } from "@/lib/cms/content";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Employer Registration" };
export const revalidate = 300;

export default async function RegisterPage() {
  const { employerRegistrationOpen } = await getPublicSettings();
  return (
    <AuthShell wide title="Register Your Organisation" subtitle={<>Already registered? <Link href="/login" className="text-primary font-semibold">Sign in</Link></>}>
      {employerRegistrationOpen ? (
        <RegisterForm />
      ) : (
        <div className="tv-card p-space-xl">
          <p className="font-body-md text-body-md">Employer self-registration is currently closed. Please <Link href="/contact" className="text-primary underline">contact our team</Link> to request access.</p>
        </div>
      )}
    </AuthShell>
  );
}
