import type { Metadata } from "next";
import { signOut } from "@/app/(auth)/actions";
import { AppShell } from "@/components/shell/app-shell";
import { Icon } from "@/components/ui/icon";
import { requireEmployerPage } from "@/lib/auth";
import { getMyNotifications } from "@/lib/data/shell";
import { OPEN_ENQUIRY_STATUSES, initials } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: { default: "Employer Portal", template: "%s | TalentVault Employer Portal" }, robots: { index: false } };

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireEmployerPage();
  const approved = profile.employer?.status === "approved";
  const supabase = await createClient();
  const [notifications, openEnquiries] = await Promise.all([
    getMyNotifications(profile.userId),
    approved
      ? supabase.from("enquiries").select("id", { count: "exact", head: true }).in("status", OPEN_ENQUIRY_STATUSES).then((r) => r.count ?? 0)
      : Promise.resolve(0),
  ]);

  const nav = [
    { href: "/portal", label: "Overview", icon: "dashboard", exact: true },
    { href: "/portal/candidates", label: "Candidates / Search", icon: "person_search" },
    { href: "/portal/enquiries", label: "My Enquiries", icon: "forward_to_inbox", badge: openEnquiries },
    { href: "/portal/shortlist", label: "Shortlist", icon: "bookmark" },
    { href: "/portal/company", label: "Company Profile", icon: "domain" },
    { href: "/portal/settings", label: "Settings", icon: "tune" },
  ];

  const account = (
    <div className="flex items-center justify-between gap-space-sm p-space-sm rounded-xl bg-surface/5">
      <div className="flex items-center gap-space-sm min-w-0">
        <span className="h-10 w-10 shrink-0 rounded-full bg-primary-container text-on-primary grid place-items-center font-label-md text-label-md">{initials(profile.employer?.company_name)}</span>
        <div className="min-w-0">
          <div className="font-label-md text-label-md text-surface-bright truncate">{profile.employer?.company_name ?? "Employer"}</div>
          <div className="font-label-sm text-label-sm text-surface-variant truncate">{profile.fullName ?? profile.email}</div>
        </div>
      </div>
      <form action={signOut}>
        <button type="submit" className="text-surface-variant hover:text-surface-bright" aria-label="Sign out" title="Sign out"><Icon name="logout" className="text-xl" /></button>
      </form>
    </div>
  );

  return (
    <AppShell
      nav={nav}
      subtitle="Employer Portal"
      homeHref="/portal"
      searchAction="/portal/candidates"
      searchPlaceholder="Search anonymous profiles, roles, skills..."
      workspaceLabel="TalentVault"
      sectionLabel={profile.employer?.company_name ?? "Employer Workspace"}
      account={account}
      notifications={notifications}
    >
      {children}
    </AppShell>
  );
}
