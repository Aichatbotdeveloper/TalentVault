import type { Metadata } from "next";
import { adminSignOut } from "@/app/(auth)/actions";
import { AppShell } from "@/components/shell/app-shell";
import type { NavItem } from "@/components/shell/sidebar-nav";
import { Icon } from "@/components/ui/icon";
import { requireAdminPage } from "@/lib/auth";
import { getMyNotifications } from "@/lib/data/shell";
import { initials } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: { default: "Admin Console", template: "%s | TalentVault Admin" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdminPage();
  const supabase = await createClient();
  const [notifications, review, pendingEmployers, newEnquiries] = await Promise.all([
    getMyNotifications(profile.userId),
    supabase.from("candidates").select("id", { count: "exact", head: true }).eq("pipeline_status", "awaiting_review").then((r) => r.count ?? 0),
    supabase.from("employers").select("id", { count: "exact", head: true }).eq("status", "pending").then((r) => r.count ?? 0),
    supabase.from("enquiries").select("id", { count: "exact", head: true }).eq("status", "new").then((r) => r.count ?? 0),
  ]);
  const can = (p: Parameters<typeof profile.permissions.has>[0]) => profile.permissions.has(p);

  const nav: NavItem[] = [
    { href: "/admin", label: "Overview", icon: "dashboard", exact: true },
    { href: "/admin/candidates", label: "Candidates / Search", icon: "person_search" },
    { href: "/admin/processing", label: "CV Upload / AI", icon: "document_scanner", badge: review },
    ...(can("employers.manage") ? [{ href: "/admin/employers", label: "Employers", icon: "domain", badge: pendingEmployers }] : []),
    ...(can("enquiries.manage") ? [{ href: "/admin/enquiries", label: "Enquiries", icon: "forward_to_inbox", badge: newEnquiries }] : []),
    ...(can("cms.manage") ? [{ href: "/admin/content", label: "Website Content", icon: "web" }] : []),
    { href: "/admin/settings", label: "Settings", icon: "settings" },
  ];

  const account = (
    <div className="flex flex-col gap-space-md">
      <div className="p-space-sm rounded-xl bg-surface/5 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-label-sm font-label-sm text-surface-variant">Access level</span>
          <span className="text-body-sm font-body-sm text-surface-bright font-semibold">{profile.role === "super_admin" ? "Super Administrator" : "Recruitment Administrator"}</span>
        </div>
        <Icon name="admin_panel_settings" className="text-secondary-fixed text-lg" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-space-xs min-w-0">
          <span className="w-8 h-8 shrink-0 rounded-full bg-primary-container text-on-primary grid place-items-center text-label-sm font-label-sm">{initials(profile.fullName ?? profile.email)}</span>
          <div className="flex flex-col min-w-0">
            <span className="text-label-sm font-label-sm text-surface-bright font-semibold leading-tight truncate">{profile.fullName ?? "Administrator"}</span>
            <span className="text-label-sm font-label-sm text-surface-variant leading-tight truncate">{profile.email}</span>
          </div>
        </div>
        <form action={adminSignOut}>
          <button className="text-surface-variant hover:text-surface-bright transition-colors" aria-label="Sign out" title="Sign out"><Icon name="logout" className="text-xl" /></button>
        </form>
      </div>
    </div>
  );

  return (
    <AppShell
      nav={nav}
      subtitle="Recruiter Core"
      homeHref="/admin"
      searchAction="/admin/candidates"
      searchPlaceholder="Filter candidates, skills, tags..."
      workspaceLabel="Admin Console"
      sectionLabel="Talent Operations"
      account={account}
      notifications={notifications}
    >
      {children}
    </AppShell>
  );
}
