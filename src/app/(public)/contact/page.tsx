import type { Metadata } from "next";
import { PageHero } from "@/components/public/page-hero";
import { Icon } from "@/components/ui/icon";
import { asText, getPageContent, getPublicSettings } from "@/lib/cms/content";
import { ContactForm } from "./contact-form";

export const revalidate = 300;
export const metadata: Metadata = { title: "Contact Us" };

export default async function ContactPage() {
  const [{ main }, { contact }] = await Promise.all([getPageContent("contact"), getPublicSettings()]);
  const rows = [
    { icon: "mail", label: "Email", value: contact.email, href: contact.email ? `mailto:${contact.email}` : undefined },
    { icon: "call", label: "Telephone", value: contact.phone },
    { icon: "location_on", label: "Office", value: contact.address },
    { icon: "schedule", label: "Hours", value: contact.hours },
  ].filter((r) => r.value);
  return (
    <>
      <PageHero eyebrow="Get in touch" heading={asText(main!.heading)} lead={asText(main!.lead)} />
      <section className="max-w-7xl mx-auto px-margin lg:px-margin-desktop pb-space-4xl grid grid-cols-1 lg:grid-cols-12 gap-space-2xl">
        <div className="lg:col-span-8 tv-panel p-space-xl md:p-space-2xl">
          <h2 className="font-heading-md text-heading-md text-text-primary mb-space-lg">Send us a message</h2>
          <ContactForm />
        </div>
        <aside className="lg:col-span-4 space-y-space-md">
          {rows.map((r) => (
            <div key={r.label} className="tv-panel p-space-lg flex items-start gap-space-md">
              <span className="h-10 w-10 rounded-full bg-secondary-fixed/40 text-on-secondary-container grid place-items-center shrink-0"><Icon name={r.icon} /></span>
              <div>
                <div className="font-label-sm text-label-sm uppercase tracking-wider text-text-muted">{r.label}</div>
                {r.href ? <a href={r.href} className="font-body-md text-body-md text-primary">{r.value}</a> : <div className="font-body-md text-body-md whitespace-pre-line">{r.value}</div>}
              </div>
            </div>
          ))}
        </aside>
      </section>
    </>
  );
}
