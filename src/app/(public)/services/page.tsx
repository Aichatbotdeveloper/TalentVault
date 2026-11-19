import type { Metadata } from "next";
import Link from "next/link";
import { CardGrid } from "@/components/public/card-grid";
import { PageHero } from "@/components/public/page-hero";
import { asCards, asText, getPageContent } from "@/lib/cms/content";

export const revalidate = 300;
export const metadata: Metadata = { title: "Recruitment Services" };

export default async function ServicesPage() {
  const { main } = await getPageContent("services");
  return (
    <>
      <PageHero eyebrow="What we do" heading={asText(main!.heading)} lead={asText(main!.lead)}>
        <div className="flex flex-wrap gap-space-sm mt-space-2xl">
          <Link href="/employer/register" className="btn-primary">Register as Employer</Link>
          <Link href="/contact" className="btn-outline">Talk to our team</Link>
        </div>
      </PageHero>
      <section className="bg-surface-container-low py-space-4xl">
        <div className="max-w-7xl mx-auto px-margin lg:px-margin-desktop">
          <CardGrid items={asCards(main!.services)} cols={2} />
        </div>
      </section>
    </>
  );
}
