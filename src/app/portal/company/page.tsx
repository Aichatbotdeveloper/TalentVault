import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { EMPLOYER_TONE, Pill } from "@/components/ui/status";
import { requireEmployerPage } from "@/lib/auth";
import { EMPLOYER_STATUS_LABELS, formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { CompanyForm } from "./company-form";

export const metadata: Metadata = { title: "Company Profile" };

export default async function CompanyPage() {
  const profile = await requireEmployerPage();
  const supabase = await createClient();
  const [{ data: company }, { data: team }] = await Promise.all([
    supabase.from("employers").select("company_name, company_number, vat_number, website, industry, company_size, address_line, city, country, description, hiring_needs, status, approved_at, created_at").eq("id", profile.employerId!).single(),
    supabase.from("profiles").select("id, full_name, email, job_title, employer_role, last_seen_at").eq("employer_id", profile.employerId!),
  ]);
  if (!company) return null;
  return (
    <div>
      <PageHeader
        crumbs={[{ label: "Employer Workspace", href: "/portal" }, { label: "Company Profile" }]}
        title="Company Profile"
        badge={<Pill tone={EMPLOYER_TONE[company.status]} dot>{EMPLOYER_STATUS_LABELS[company.status]}</Pill>}
        description={`Registered ${formatDate(company.created_at)}${company.approved_at ? ` • Approved ${formatDate(company.approved_at)}` : ""}`}
      />
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-xl">
        <section className="xl:col-span-8 tv-panel p-space-xl">
          <CompanyForm company={company as unknown as Record<string, string | null>} canEdit={profile.employerRole === "owner"} />
        </section>
        <aside className="xl:col-span-4 tv-panel p-space-xl">
          <h2 className="font-heading-sm text-heading-sm font-bold mb-space-md">Team members</h2>
          <ul className="space-y-space-sm">
            {team?.map((m) => (
              <li key={m.id} className="rounded-lg bg-surface-container-low p-space-md">
                <div className="font-label-md text-label-md">{m.full_name ?? m.email} {m.employer_role === "owner" && <span className="chip-green ml-1">Owner</span>}</div>
                <div className="font-body-sm text-body-sm text-text-muted">{m.job_title ?? ""} {m.email}</div>
              </li>
            ))}
          </ul>
          <p className="tv-help mt-space-md">To add colleagues, contact the TalentVault team.</p>
        </aside>
      </div>
    </div>
  );
}
