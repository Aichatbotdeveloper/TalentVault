import type { Metadata } from "next";
import { RichText } from "@/components/public/rich-text";
import { asText, getPageContent } from "@/lib/cms/content";

export const revalidate = 300;
export const metadata: Metadata = { title: "Privacy Policy" };

export default async function LegalPage() {
  const content = await getPageContent("legal");
  return (
    <section className="max-w-3xl mx-auto px-margin lg:px-margin-desktop py-space-4xl">
      <div className="eyebrow mb-space-sm">Legal</div>
      <h1 className="font-display-lg text-display-lg-mobile md:text-[44px] font-extrabold text-text-primary mb-space-2xl">Privacy Policy</h1>
      <div className="tv-panel p-space-2xl">
        <RichText text={asText(content.privacy!.body)} />
      </div>
    </section>
  );
}
