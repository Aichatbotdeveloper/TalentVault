import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { getPublicSettings } from "@/lib/cms/content";
import { CONSENT_TEXT } from "@/lib/validation";
import { SubmissionForm } from "./submission-form";

export const metadata: Metadata = { title: "Submit Your CV" };
export const maxDuration = 300;
export const revalidate = 300;

export default async function SubmitCvPage() {
  const { contact } = await getPublicSettings();
  return (
    <div className="max-w-7xl mx-auto px-margin lg:px-margin-desktop py-space-2xl">
      <div className="flex flex-wrap items-center justify-between gap-space-sm mb-space-md">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 font-body-sm text-body-sm text-text-muted">
          <Link href="/candidates" className="hover:text-on-surface">Candidate Portal</Link>
          <Icon name="chevron_right" className="text-sm" />
          <span className="text-primary font-semibold">Submit CV</span>
        </nav>
        <span className="chip-green"><Icon name="lock" className="text-sm" /> Private, access-controlled storage</span>
      </div>
      <h1 className="font-display-lg text-display-lg-mobile md:text-[40px] font-extrabold tracking-tight text-text-primary">Join the Anonymous Talent Marketplace</h1>
      <p className="font-body-md text-body-md text-text-muted max-w-3xl mt-space-sm">
        Submit your professional details and CV. We use AI to help structure your experience and remove personal identifiers, and a recruiter reviews your anonymised profile before approved employers can see it. You do not need to create an account.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md my-space-xl">
        {[
          ["visibility_off", "Anonymous to employers", "No names or contact details are shown to hiring managers."],
          ["lock", "Private document storage", "Your CV is stored privately and only accessible to our recruiters."],
          ["fact_check", "Recruiter-reviewed", "Every profile is checked by a person before publication."],
          ["handshake", "Consent before introduction", "We ask you before sharing your identity with any employer."],
        ].map(([icon, title, body]) => (
          <div key={title} className="tv-card p-space-md flex items-start gap-space-sm">
            <span className="h-9 w-9 shrink-0 rounded-lg bg-surface-container-high grid place-items-center text-primary"><Icon name={icon!} className="text-lg" /></span>
            <div>
              <div className="font-label-md text-label-md text-text-primary">{title}</div>
              <div className="font-body-sm text-body-sm text-text-muted">{body}</div>
            </div>
          </div>
        ))}
      </div>

      <SubmissionForm consentText={CONSENT_TEXT} contactEmail={contact.email ?? null} contactPhone={contact.phone ?? null} />
    </div>
  );
}
