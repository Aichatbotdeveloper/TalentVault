import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { requireEmployerPage } from "@/lib/auth";
import { PasswordForm, ProfileForm } from "./settings-forms";

export const metadata: Metadata = { title: "Account Settings" };

export default async function SettingsPage() {
  const profile = await requireEmployerPage();
  return (
    <div className="max-w-4xl">
      <PageHeader crumbs={[{ label: "Employer Workspace", href: "/portal" }, { label: "Settings" }]} title="Account Settings" description="Manage your personal details and sign-in security." />
      <section className="tv-panel p-space-xl mb-space-xl">
        <h2 className="font-heading-sm text-heading-sm font-bold mb-space-lg">Your details</h2>
        <ProfileForm fullName={profile.fullName ?? ""} jobTitle={profile.jobTitle ?? ""} phone={profile.phone ?? ""} email={profile.email} />
      </section>
      <section className="tv-panel p-space-xl mb-space-xl">
        <h2 className="font-heading-sm text-heading-sm font-bold mb-space-lg">Password</h2>
        <PasswordForm />
      </section>
      <section className="tv-panel p-space-xl">
        <h2 className="font-heading-sm text-heading-sm font-bold mb-space-xs">Data &amp; account closure</h2>
        <p className="font-body-sm text-body-sm text-text-muted">To close your account or request a copy of your data, please contact the TalentVault team. Enquiry records are retained for audit purposes in line with our privacy policy.</p>
      </section>
    </div>
  );
}
