import type { Metadata } from "next";
import Link from "next/link";
import { CardGrid } from "@/components/public/card-grid";
import { PageHero } from "@/components/public/page-hero";
import { Icon } from "@/components/ui/icon";
import { asCards, asList, asText, getPageContent, getPublicSettings } from "@/lib/cms/content";

export const revalidate = 300;
export const metadata: Metadata = { title: "For Employers" };

export default async function EmployersPage() {
  const [{ main }, settings] = await Promise.all([getPageContent("employers"), getPublicSettings()]);
  return (
    <>
      <PageHero eyebrow="Enterprise hiring teams" heading={asText(main!.heading)} lead={asText(main!.lead)}>
        <div className="flex flex-wrap gap-space-sm mt-space-2xl">
          {settings.employerRegistrationOpen ? (
            <Link href="/employer/register" className="btn-primary">Create Employer Account</Link>
          ) : (
            <Link href="/contact" className="btn-primary">Request Access</Link>
          )}
          <Link href="/login" className="btn-outline">Employer Sign In</Link>
        </div>
      </PageHero>
      <section className="bg-surface-container-low py-space-4xl">
        <div className="max-w-7xl mx-auto px-margin lg:px-margin-desktop">
          <h2 className="font-heading-lg text-heading-lg-mobile md:text-heading-lg font-extrabold text-text-primary mb-space-2xl">How it works</h2>
          <CardGrid items={asCards(main!.steps)} numbered cols={4} />
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-margin lg:px-margin-desktop py-space-4xl grid grid-cols-1 lg:grid-cols-2 gap-space-3xl items-center">
        <div>
          <h2 className="font-heading-lg text-heading-lg-mobile md:text-heading-lg font-extrabold text-text-primary mb-space-lg">What you get</h2>
          <ul className="space-y-space-md">
            {asList(main!.points).map((p) => (
              <li key={p} className="flex items-start gap-space-sm font-body-md text-body-md"><Icon name="check_circle" filled className="text-primary-container" />{p}</li>
            ))}
          </ul>
        </div>
        <div className="bg-surface-alt text-surface-bright rounded-2xl p-space-2xl">
          <div className="font-label-sm text-label-sm uppercase tracking-wider text-secondary-fixed mb-space-sm">Example anonymised profile</div>
          <div className="font-heading-sm text-heading-sm font-bold mb-1">Lead Cloud Infrastructure &amp; DevOps Architect</div>
          <div className="font-body-sm text-body-sm text-surface-variant mb-space-md">11+ years • London, UK • Remote / Hybrid</div>
          <div className="flex flex-wrap gap-1.5 mb-space-md">
            {["AWS EKS", "Terraform", "FinOps"].map((s) => <span key={s} className="chip bg-surface/10 text-surface-bright">{s}</span>)}
          </div>
          <div className="flex justify-between font-label-md text-label-md border-t border-surface-container/10 pt-space-sm">
            <span className="text-surface-variant">Target compensation</span><span className="text-secondary-fixed">£125k – £140k</span>
          </div>
          <p className="mt-space-md font-body-sm text-body-sm text-surface-variant flex items-center gap-2"><Icon name="lock" className="text-base" /> Illustrative example — identity is shared only with consent.</p>
        </div>
      </section>
    </>
  );
}
