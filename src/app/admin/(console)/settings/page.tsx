import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shell/page-header";
import { SubmitButton } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Pagination } from "@/components/ui/pagination";
import { Pill } from "@/components/ui/status";
import { requireAdminPage, type Permission } from "@/lib/auth";
import { describeProvider } from "@/lib/cv/providers";
import { cn, formatDateTime, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { setContactMessageStatus } from "./actions";
import { AccessForm, InviteForm, OwnAccountForms, PlatformForm } from "./forms";

export const metadata: Metadata = { title: "Users & Platform Settings" };

const PERMISSION_LABELS: Record<Permission, string> = {
  "candidates.read_private": "View candidate identities, contact details & CVs",
  "candidates.manage": "Edit candidates, review AI output, upload CVs",
  "candidates.publish": "Publish / unpublish candidate profiles",
  "candidates.erase": "Permanently erase candidates",
  "employers.manage": "Approve, suspend & manage employers",
  "enquiries.manage": "Manage enquiries & introductions",
  "cms.manage": "Edit & publish website content",
  "users.manage": "Invite & manage administrators",
  "settings.manage": "Change platform configuration",
  "audit.read": "View the audit log",
};

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string; page?: string }> }) {
  const profile = await requireAdminPage();
  const sp = await searchParams;
  const can = (p: Permission) => profile.permissions.has(p);
  const tabs = [
    ["account", "My Account", true],
    ["users", "Administrative Users", can("users.manage")],
    ["roles", "Roles & Permissions Matrix", true],
    ["platform", "Platform Configuration", can("settings.manage")],
    ["messages", "Contact Messages", true],
    ["audit", "Audit Log", can("audit.read")],
    ["emails", "Email Log", true],
  ].filter((t) => t[2]) as [string, string, boolean][];
  const tab = tabs.find((t) => t[0] === sp.tab)?.[0] ?? (can("users.manage") ? "users" : "account");
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();

  let body: React.ReactNode = null;
  if (tab === "account") {
    body = <div className="tv-panel p-space-xl"><h2 className="font-heading-sm text-heading-sm font-bold mb-space-md">My account • {profile.email}</h2><OwnAccountForms name={profile.fullName ?? ""} jobTitle={profile.jobTitle ?? ""} /></div>;
  } else if (tab === "users") {
    const { data: admins } = await supabase.from("profiles").select("id, full_name, email, job_title, role, status, last_seen_at, created_at").in("role", ["super_admin", "recruitment_admin"]).order("created_at");
    const suspended = (admins ?? []).filter((a) => a.status === "suspended");
    body = (
      <div className="space-y-space-lg">
        <div className="tv-panel p-space-xl"><h2 className="font-heading-sm text-heading-sm font-bold mb-space-md">Invite administrator</h2><InviteForm /></div>
        {suspended.length > 0 && <div className="rounded-xl bg-surface-alt text-surface-bright p-space-md font-body-sm text-body-sm"><span className="text-tertiary-fixed-dim">●</span> {suspended.length} account(s) suspended: {suspended.map((s) => s.full_name ?? s.email).join(", ")}</div>}
        <div className="tv-panel overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-surface-container-low"><tr><th className="table-head">Administrator &amp; role</th><th className="table-head">Last active</th><th className="table-head">Access</th></tr></thead>
            <tbody className="divide-y divide-border-subtle">
              {(admins ?? []).map((a) => (
                <tr key={a.id} className={a.status === "suspended" ? "bg-error-container/20" : ""}>
                  <td className="table-cell"><div className="font-label-md text-label-md text-[15px]">{a.full_name ?? "(invited)"} {a.status === "suspended" && <Pill tone="red">Suspended</Pill>}</div><div className="font-mono text-[12px] text-text-muted">{a.email}</div><div className="text-primary-container">{a.role === "super_admin" ? "Super Administrator" : "Recruitment Administrator"}</div></td>
                  <td className="table-cell">{a.last_seen_at ? timeAgo(a.last_seen_at) : "Never"}</td>
                  <td className="table-cell">{a.id === profile.userId ? <span className="text-text-muted">You</span> : <AccessForm userId={a.id} role={a.role} status={a.status} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="tv-help">Suspending an administrator also blocks sign-in at the authentication layer. Multi-factor authentication can be enforced in the Supabase Auth settings (see README).</p>
      </div>
    );
  } else if (tab === "roles") {
    const { data: rp } = await supabase.from("role_permissions").select("role, permission");
    const has = (role: string, p: string) => (rp ?? []).some((r) => r.role === role && r.permission === p);
    body = (
      <div className="tv-panel overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="bg-surface-container-low"><tr><th className="table-head">Permission</th><th className="table-head text-center">Super Administrator</th><th className="table-head text-center">Recruitment Administrator</th><th className="table-head text-center">Employer</th></tr></thead>
          <tbody className="divide-y divide-border-subtle">
            {(Object.keys(PERMISSION_LABELS) as Permission[]).map((p) => (
              <tr key={p}>
                <td className="table-cell"><div className="font-label-md text-label-md">{PERMISSION_LABELS[p]}</div><div className="font-mono text-[11px] text-text-muted">{p}</div></td>
                {["super_admin", "recruitment_admin", "employer"].map((r) => <td key={r} className="table-cell text-center">{has(r, p) ? <Icon name="check_circle" filled className="text-primary-container" /> : <Icon name="remove" className="text-outline" />}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="tv-help p-space-md">Enforced server-side by database functions and Row Level Security. Employers can only search approved, published anonymous profiles and manage their own organisation&apos;s enquiries.</p>
      </div>
    );
  } else if (tab === "platform") {
    const { data: settings } = await supabase.from("site_settings").select("key, value");
    const map = Object.fromEntries((settings ?? []).map((s) => [s.key, s.value]));
    const provider = describeProvider();
    body = (
      <div className="space-y-space-lg">
        <div className="tv-panel p-space-xl"><PlatformForm s={{ contact: (map.contact ?? {}) as Record<string, string>, recipients: (map.admin_notification_emails ?? []) as string[], registrationOpen: map.employer_registration_open !== false, autoProcess: map.auto_process_cvs !== false }} /></div>
        <div className="tv-panel p-space-xl">
          <h2 className="font-heading-sm text-heading-sm font-bold mb-space-sm">Integrations (configured via environment variables)</h2>
          <ul className="space-y-1 font-body-sm text-body-sm">
            <li>AI CV analysis: {provider.isAI ? <Pill tone="green">Anthropic — {provider.model}</Pill> : <Pill tone="amber">Local development adapter (not AI)</Pill>}</li>
            <li>Transactional email: <Pill tone={process.env.EMAIL_PROVIDER === "resend" ? "green" : "amber"}>{process.env.EMAIL_PROVIDER === "resend" ? "Resend" : "Console (not sending)"}</Pill></li>
            <li>Scheduled processing: <Pill tone={process.env.CRON_SECRET ? "green" : "amber"}>{process.env.CRON_SECRET ? "Cron secret configured" : "CRON_SECRET missing"}</Pill></li>
          </ul>
        </div>
      </div>
    );
  } else if (tab === "messages") {
    const { data: msgs, count } = await supabase.from("contact_messages").select("*", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * 20, page * 20 - 1);
    body = (
      <div className="space-y-space-md">
        {(msgs ?? []).map((m) => (
          <article key={m.id} className="tv-panel p-space-lg">
            <div className="flex flex-wrap justify-between gap-2">
              <div><span className="font-label-md text-label-md">{m.name}</span> <a href={`mailto:${m.email}`} className="text-primary font-body-sm">{m.email}</a> {m.company && <span className="text-text-muted font-body-sm">• {m.company}</span>}</div>
              <div className="flex items-center gap-2"><Pill tone={m.status === "new" ? "green" : "grey"}>{m.status}</Pill><span className="font-body-sm text-body-sm text-text-muted">{formatDateTime(m.created_at)} • {m.enquiry_type}</span></div>
            </div>
            <p className="font-body-sm text-body-sm mt-space-sm whitespace-pre-line">{m.message}</p>
            <div className="flex gap-2 mt-space-sm">
              {(["handled", "spam", "new"] as const).filter((s) => s !== m.status).map((s) => (
                <form key={s} action={setContactMessageStatus}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="status" value={s} /><SubmitButton className="btn-ghost btn-sm">Mark {s}</SubmitButton></form>
              ))}
            </div>
          </article>
        ))}
        {!msgs?.length && <p className="tv-panel p-space-xl text-text-muted">No messages.</p>}
        <Pagination page={page} pageSize={20} total={count ?? 0} basePath="/admin/settings" params={{ tab }} />
      </div>
    );
  } else if (tab === "audit") {
    const { data: logs, count } = await supabase.from("audit_logs").select("id, action, entity_type, entity_id, actor_role, metadata, created_at, profiles(full_name, email)", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * 50, page * 50 - 1);
    body = (
      <div className="tv-panel overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead className="bg-surface-container-low"><tr><th className="table-head">Time</th><th className="table-head">Actor</th><th className="table-head">Action</th><th className="table-head">Entity</th></tr></thead>
          <tbody className="divide-y divide-border-subtle">
            {(logs ?? []).map((l) => (
              <tr key={l.id}><td className="table-cell font-mono whitespace-nowrap">{formatDateTime(l.created_at)}</td><td className="table-cell">{l.profiles?.full_name ?? l.profiles?.email ?? "System"}<div className="text-text-muted">{l.actor_role}</div></td><td className="table-cell font-semibold">{l.action}</td><td className="table-cell">{l.entity_type} <span className="font-mono text-text-muted">{l.entity_id?.slice(0, 12)}</span></td></tr>
            ))}
          </tbody>
        </table>
        <div className="p-space-md flex justify-end"><Pagination page={page} pageSize={50} total={count ?? 0} basePath="/admin/settings" params={{ tab }} /></div>
      </div>
    );
  } else if (tab === "emails") {
    const { data: emails } = await supabase.from("email_log").select("*").order("created_at", { ascending: false }).limit(50);
    body = (
      <div className="tv-panel overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="bg-surface-container-low"><tr><th className="table-head">Time</th><th className="table-head">To</th><th className="table-head">Template / subject</th><th className="table-head">Status</th></tr></thead>
          <tbody className="divide-y divide-border-subtle">
            {(emails ?? []).map((e) => (
              <tr key={e.id}><td className="table-cell whitespace-nowrap">{formatDateTime(e.created_at)}</td><td className="table-cell font-mono text-[12px]">{e.to_address}</td><td className="table-cell">{e.subject}<div className="text-text-muted">{e.template}</div></td><td className="table-cell"><Pill tone={e.status === "sent" ? "green" : e.status === "logged" ? "amber" : "red"}>{e.status}</Pill>{e.error && <div className="text-error">{e.error}</div>}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      <PageHeader crumbs={[{ label: "Admin Console", href: "/admin" }, { label: "User Management & Platform Settings" }]} title="User Management & Platform Governance" description="Administrator access, role permissions, platform configuration and audit records." />
      <div className="flex flex-wrap gap-2 mb-space-xl">
        {tabs.map(([k, label]) => (
          <Link key={k} href={`/admin/settings?tab=${k}`} className={cn("px-space-md py-2 rounded-full font-label-md text-label-md", tab === k ? "bg-primary-container text-on-primary" : "bg-surface-container-high hover:bg-surface-variant")}>{label}</Link>
        ))}
      </div>
      {body}
    </div>
  );
}
