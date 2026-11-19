import type { Metadata } from "next";
import Link from "next/link";
import { CardGrid } from "@/components/public/card-grid";
import { PageHero } from "@/components/public/page-hero";
import { Icon } from "@/components/ui/icon";
import { asCards, asList, asText, getPageContent } from "@/lib/cms/content";

export const revalidate = 300;
export const metadata: Metadata = { title: "For Candidates" };

export default async function CandidatesPage() {
  const { main } = await getPageContent("candidates");
  return (
    <>
      <PageHero eyebrow="Senior & executive talent" heading={asText(main!.heading)} lead={asText(main!.lead)}>
        <div className="flex flex-wrap gap-space-sm mt-space-2xl">
          <Link href="/submit-cv" className="btn-primary">Submit Your CV <Icon name="arrow_forward" className="text-base" /></Link>
          <Link href="/contact" className="btn-outline">Ask a question</Link>
        </div>
      </PageHero>
      <section className="bg-surface-container-low py-space-4xl">
        <div className="max-w-7xl mx-auto px-margin lg:px-margin-desktop">
          <h2 className="font-heading-lg text-heading-lg-mobile md:text-heading-lg font-extrabold text-text-primary mb-space-2xl">How it works</h2>
          <CardGrid items={asCards(main!.steps)} numbered cols={4} />
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-margin lg:px-margin-desktop py-space-4xl">
        <div className="tv-panel p-space-2xl grid grid-cols-1 lg:grid-cols-12 gap-space-2xl items-center">
          <div className="lg:col-span-5">
            <div className="h-14 w-14 rounded-2xl bg-primary-container text-on-primary grid place-items-center mb-space-md"><Icon name="shield_lock" className="text-3xl" /></div>
            <h2 className="font-heading-md text-heading-md text-text-primary">Our privacy commitments</h2>
            <p className="font-body-md text-body-md text-text-muted mt-space-xs">Read the full <Link href="/privacy" className="text-primary underline">privacy policy</Link>.</p>
          </div>
          <ul className="lg:col-span-7 space-y-space-md">
            {asList(main!.privacy_points).map((p) => (
              <li key={p} className="flex items-start gap-space-sm font-body-md text-body-md"><Icon name="verified_user" className="text-primary-container" />{p}</li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
