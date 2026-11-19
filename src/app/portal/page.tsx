import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shell/page-header";
import { FormMessage } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { ENQUIRY_TONE, Pill } from "@/components/ui/status";
import { requireEmployerPage } from "@/lib/auth";
import { employerEnquiryStats, listEmployerEnquiries } from "@/lib/data/enquiries";
import { ENQUIRY_STATUS_LABELS, EMPLOYER_STATUS_LABELS, formatSalaryRange, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Employer Overview" };

export default async function PortalOverview({ searchParams }: { searchParams: Promise<{ gate?: string; verified?: string; password?: string }> }) {
  const profile = await requireEmployerPage();
  const sp = await searchParams;
  const status = profile.employer?.status ?? "pending";

  if (status !== "approved") {
    const copy = {
      pending: { icon: "hourglass_top", title: "Your organisation is being verified", body: "Thank you for registering. Our team is reviewing your organisation details. You'll receive an email as soon as candidate search is enabled — usually within one working day.", tone: "bg-[#fff3cd] text-[#7a5a00]" },
      rejected: { icon: "block", title: "Registration not approved", body: "We were unable to approve this registration. Please contact our team if you believe this is a mistake.", tone: "bg-error-container text-on-error-container" },
      suspended: { icon: "pause_circle", title: "Account access suspended", body: "Access to the candidate directory has been suspended for your organisation. Please contact our team.", tone: "bg-error-container text-on-error-container" },
    }[status as "pending" | "rejected" | "suspended"];
    return (
      <div className="max-w-3xl">
        <PageHeader crumbs={[{ label: "Employer Workspace" }]} title={`Welcome${profile.fullName ? `, ${profile.fullName.split(" ")[0]}` : ""}`} />
        {sp.verified && <div className="mb-space-md"><FormMessage state={{ ok: true, message: "Your email address has been verified." }} /></div>}
        {sp.gate && <div className="mb-space-md"><FormMessage state={{ ok: false, message: "Candidate search is available once your organisation has been approved." }} /></div>}
        <div className="tv-panel p-space-2xl">
          <span className={`inline-flex h-14 w-14 rounded-2xl items-center justify-center ${copy.tone}`}><Icon name={copy.icon} className="text-3xl" /></span>
          <h2 className="font-heading-md text-heading-md mt-space-md">{copy.title}</h2>
          <p className="font-body-md text-body-md text-text-muted mt-space-xs">{copy.body}</p>
          {profile.employer?.status_reason && <p className="mt-space-md rounded-lg bg-surface-container-low p-space-md font-body-sm text-body-sm"><strong>Note from our team:</strong> {profile.employer.status_reason}</p>}
          <ol className="mt-space-xl space-y-space-sm">
            {[
              ["Account created", true],
              ["Email verified", profile.emailConfirmed],
              ["Organisation approved", false],
            ].map(([label, done]) => (
              <li key={label as string} className="flex items-center gap-space-sm font-body-md text-body-md">
                <Icon name={done ? "check_circle" : "radio_button_unchecked"} filled={!!done} className={done ? "text-primary-container" : "text-outline"} /> {label}
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-space-sm mt-space-xl">
            <Link href="/portal/company" className="btn-primary">Complete company profile</Link>
            <Link href="/contact" className="btn-outline">Contact our team</Link>
          </div>
          <p className="font-body-sm text-body-sm text-text-muted mt-space-lg">Status: {EMPLOYER_STATUS_LABELS[status]}</p>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const [stats, recent, { count: shortlisted }, { data: latest }] = await Promise.all([
    employerEnquiryStats(),
    listEmployerEnquiries({ page: 1 }, 5),
    supabase.from("shortlists").select("candidate_id", { count: "exact", head: true }),
    supabase.from("candidate_profiles").select("ref, headline, years_experience, location_region, salary_min, salary_max, skills, published_at").eq("published", true).order("published_at", { ascending: false }).limit(3),
  ]);

  return (
    <div>
      {sp.password && <div className="mb-space-md"><FormMessage state={{ ok: true, message: "Your password has been updated." }} /></div>}
      <PageHeader
        crumbs={[{ label: "Employer Workspace" }, { label: "Overview" }]}
        title={`Welcome back${profile.fullName ? `, ${profile.fullName.split(" ")[0]}` : ""}`}
        description={`${profile.employer?.company_name} — search anonymised candidates and track your enquiries.`}
        actions={<Link href="/portal/candidates" className="btn-primary"><Icon name="person_search" className="text-lg" /> Search Candidates</Link>}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-md mb-space-xl">
        {[
          ["forward_to_inbox", "Open enquiries", stats.new + stats.inProgress, "/portal/enquiries?status=open"],
          ["handshake", "Introductions", stats.introduced, "/portal/enquiries?status=introduced"],
          ["bookmark", "Shortlisted", shortlisted ?? 0, "/portal/shortlist"],
          ["history", "Enquiries (30 days)", stats.last30, "/portal/enquiries"],
        ].map(([icon, label, value, href]) => (
          <Link key={label as string} href={href as string} className="tv-panel p-space-lg hover:shadow-float transition-shadow">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{label}</span>
              <span className="h-9 w-9 rounded-full bg-secondary-fixed/40 text-on-secondary-container grid place-items-center"><Icon name={icon as string} className="text-lg" /></span>
            </div>
            <div className="font-display-lg text-[36px] font-extrabold mt-space-xs">{value}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-xl">
        <section className="xl:col-span-7 tv-panel p-space-xl">
          <div className="flex items-center justify-between mb-space-md">
            <h2 className="font-heading-sm text-heading-sm font-bold">Recent enquiries</h2>
            <Link href="/portal/enquiries" className="font-label-md text-label-md text-primary">View all</Link>
          </div>
          {recent.rows.length === 0 ? (
            <p className="font-body-sm text-body-sm text-text-muted">You haven&apos;t sent any enquiries yet.</p>
          ) : (
            <ul className="divide-y divide-border-subtle">
              {recent.rows.map((r) => (
                <li key={r.id}>
                  <Link href={`/portal/enquiries/${r.ref}`} className="flex items-center justify-between gap-space-sm py-space-sm hover:bg-surface-container-low -mx-2 px-2 rounded-lg">
                    <div className="min-w-0">
                      <div className="font-label-md text-label-md truncate"><span className="font-mono">#{r.ref}</span> • {r.role_title}</div>
                      <div className="font-body-sm text-body-sm text-text-muted">Candidate #{r.candidate?.ref ?? "—"} • {timeAgo(r.updated_at)}</div>
                    </div>
                    <Pill tone={ENQUIRY_TONE[r.status]} dot>{ENQUIRY_STATUS_LABELS[r.status]}</Pill>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="xl:col-span-5 tv-panel p-space-xl">
          <div className="flex items-center justify-between mb-space-md">
            <h2 className="font-heading-sm text-heading-sm font-bold">Newly published profiles</h2>
            <Link href="/portal/candidates?sort=newest" className="font-label-md text-label-md text-primary">Browse</Link>
          </div>
          <ul className="space-y-space-sm">
            {(latest ?? []).map((c) => (
              <li key={c.ref}>
                <Link href={`/portal/candidates/${c.ref}`} className="block rounded-xl bg-surface-container-low p-space-md hover:bg-surface-container">
                  <div className="font-label-sm text-label-sm text-text-muted font-mono">#{c.ref} • {timeAgo(c.published_at)}</div>
                  <div className="font-label-md text-label-md text-text-primary">{c.headline}</div>
                  <div className="font-body-sm text-body-sm text-text-muted">{[c.years_experience != null && `${c.years_experience} yrs`, c.location_region, formatSalaryRange(c.salary_min, c.salary_max)].filter(Boolean).join(" • ")}</div>
                </Link>
              </li>
            ))}
            {!latest?.length && <li className="font-body-sm text-body-sm text-text-muted">No published profiles yet.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
