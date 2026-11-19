import type { Metadata } from "next";
import Link from "next/link";
import { CardGrid } from "@/components/public/card-grid";
import { PageHero } from "@/components/public/page-hero";
import { RichText } from "@/components/public/rich-text";
import { asCards, asText, getPageContent } from "@/lib/cms/content";

export const revalidate = 300;
export const metadata: Metadata = { title: "About Us" };

export default async function AboutPage() {
  const { main } = await getPageContent("about");
  return (
    <>
      <PageHero eyebrow="About TalentVault" heading={asText(main!.heading)} lead={asText(main!.lead)} />
      <section className="max-w-7xl mx-auto px-margin lg:px-margin-desktop pb-space-4xl grid grid-cols-1 lg:grid-cols-12 gap-space-3xl">
        <div className="lg:col-span-7 tv-panel p-space-2xl">
          <h2 className="font-heading-md text-heading-md text-text-primary mb-space-md">Our story</h2>
          <RichText text={asText(main!.story)} />
        </div>
        <aside className="lg:col-span-5 bg-surface-alt text-surface-bright rounded-2xl p-space-2xl flex flex-col justify-between gap-space-xl">
          <p className="font-heading-sm text-heading-sm leading-relaxed">“Great hiring starts with structured information and ends with a human conversation.”</p>
          <div className="flex flex-col sm:flex-row gap-space-sm">
            <Link href="/employers" className="btn-primary">For Employers</Link>
            <Link href="/candidates" className="btn bg-surface-bright/10 text-surface-bright hover:bg-surface-bright/20">For Candidates</Link>
          </div>
        </aside>
      </section>
      <section className="bg-surface-container-low py-space-4xl">
        <div className="max-w-7xl mx-auto px-margin lg:px-margin-desktop">
          <h2 className="font-heading-lg text-heading-lg-mobile md:text-heading-lg font-extrabold text-text-primary mb-space-2xl">What we stand for</h2>
          <CardGrid items={asCards(main!.values)} />
        </div>
      </section>
    </>
  );
}
