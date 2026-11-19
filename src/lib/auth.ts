import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Database } from "./supabase/database.types";

export type UserRole = Database["public"]["Enums"]["user_role"];
export type EmployerStatus = Database["public"]["Enums"]["employer_status"];
export type Permission =
  | "candidates.read_private"
  | "candidates.manage"
  | "candidates.publish"
  | "candidates.erase"
  | "employers.manage"
  | "enquiries.manage"
  | "cms.manage"
  | "users.manage"
  | "settings.manage"
  | "audit.read";

export const ADMIN_ROLES: UserRole[] = ["super_admin", "recruitment_admin"];

export interface SessionProfile {
  userId: string;
  email: string;
  emailConfirmed: boolean;
  role: UserRole;
  status: "active" | "suspended";
  fullName: string | null;
  jobTitle: string | null;
  phone: string | null;
  employerId: string | null;
  employerRole: string | null;
  employer: { id: string; company_name: string; status: EmployerStatus; status_reason: string | null } | null;
  permissions: Set<Permission>;
}

export class AuthorizationError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** Current user + profile, memoised per request. Returns null when signed out. */
export const getSessionProfile = cache(async (): Promise<SessionProfile | null> => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, job_title, phone, role, status, employer_id, employer_role, employers(id, company_name, status, status_reason)")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return null;

  const { data: perms } = await supabase.from("role_permissions").select("permission").eq("role", profile.role);

  return {
    userId: user.id,
    email: profile.email,
    emailConfirmed: Boolean(user.email_confirmed_at),
    role: profile.role,
    status: profile.status,
    fullName: profile.full_name,
    jobTitle: profile.job_title,
    phone: profile.phone,
    employerId: profile.employer_id,
    employerRole: profile.employer_role,
    employer: profile.employers ?? null,
    permissions: new Set((perms ?? []).map((p) => p.permission as Permission)),
  };
});

export function isAdminRole(role: UserRole | undefined | null) {
  return !!role && ADMIN_ROLES.includes(role);
}

/** Guard for admin pages. Redirects when not permitted. */
export async function requireAdminPage(permission?: Permission) {
  const profile = await getSessionProfile();
  if (!profile) redirect("/admin/login");
  if (!isAdminRole(profile.role) || profile.status !== "active") redirect("/admin/login?error=forbidden");
  if (permission && !profile.permissions.has(permission)) redirect("/admin?error=forbidden");
  return profile;
}

/** Guard for admin server actions. Throws instead of redirecting. */
export async function requireAdminAction(permission?: Permission) {
  const profile = await getSessionProfile();
  if (!profile || !isAdminRole(profile.role) || profile.status !== "active") throw new AuthorizationError();
  if (permission && !profile.permissions.has(permission)) throw new AuthorizationError();
  return profile;
}

/** Guard for employer pages. `approved` gates the private candidate database. */
export async function requireEmployerPage(opts: { approved?: boolean } = {}) {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (isAdminRole(profile.role)) redirect("/admin");
  if (profile.status !== "active") redirect("/login?error=suspended");
  if (opts.approved && profile.employer?.status !== "approved") redirect("/portal?gate=approval");
  return profile;
}

export async function requireEmployerAction(opts: { approved?: boolean } = {}) {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "employer" || profile.status !== "active") throw new AuthorizationError();
  if (opts.approved && profile.employer?.status !== "approved") {
    throw new AuthorizationError("Your organisation must be approved before you can use this feature.");
  }
  return profile;
}
