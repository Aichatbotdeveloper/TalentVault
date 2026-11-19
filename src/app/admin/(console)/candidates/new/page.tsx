import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { requireAdminPage } from "@/lib/auth";
import { AdminUploadForm } from "./upload-form";

export const metadata: Metadata = { title: "Upload Candidate CV" };
export const maxDuration = 300;

export default async function NewCandidatePage() {
  await requireAdminPage("candidates.manage");
  return (
    <div className="max-w-4xl">
      <PageHeader crumbs={[{ label: "Candidate Directory", href: "/admin/candidates" }, { label: "Upload CV" }]} title="Upload Candidate CV" description="Add a candidate on their behalf. The CV is stored privately and processed through the same AI pipeline and review workflow as website submissions." />
      <AdminUploadForm />
    </div>
  );
}
