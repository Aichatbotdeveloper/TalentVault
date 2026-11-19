import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EnquiryDetail } from "@/components/portal/enquiry-detail";
import { Icon } from "@/components/ui/icon";
import { requireEmployerPage } from "@/lib/auth";
import { getEmployerEnquiry } from "@/lib/data/enquiries";

export async function generateMetadata({ params }: { params: Promise<{ ref: string }> }): Promise<Metadata> {
  return { title: `Enquiry ${(await params).ref}` };
}

export default async function EnquiryPage({ params }: { params: Promise<{ ref: string }> }) {
  const profile = await requireEmployerPage({ approved: true });
  const { ref } = await params;
  const e = await getEmployerEnquiry(ref);
  if (!e) notFound();
  return (
    <div className="max-w-3xl">
      <Link href="/portal/enquiries" className="btn-ghost mb-space-md -ml-space-md"><Icon name="arrow_back" className="text-lg" /> All enquiries</Link>
      <div className="tv-panel p-space-xl md:p-space-2xl border-t-4 border-primary-container">
        <EnquiryDetail e={e} userId={profile.userId} />
      </div>
    </div>
  );
}
