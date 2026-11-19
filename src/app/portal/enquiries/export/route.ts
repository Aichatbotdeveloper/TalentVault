import { NextResponse, type NextRequest } from "next/server";
import { getSessionProfile } from "@/lib/auth";
import { listEmployerEnquiries } from "@/lib/data/enquiries";
import { ENQUIRY_STATUS_LABELS } from "@/lib/format";

function csvCell(v: unknown) {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // neutralise spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "employer" || profile.employer?.status !== "approved") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const sp = request.nextUrl.searchParams;
  const { rows } = await listEmployerEnquiries({ q: sp.get("q") ?? undefined, status: sp.get("status") ?? undefined, sort: sp.get("sort") ?? undefined, page: 1 }, 1000);
  const header = ["Enquiry Ref", "Candidate Ref", "Role Title", "Status", "Submitted", "Last Updated"];
  const lines = rows.map((r) => [r.ref, r.candidate?.ref ?? "", r.role_title, ENQUIRY_STATUS_LABELS[r.status], r.created_at, r.updated_at].map(csvCell).join(","));
  return new NextResponse([header.map(csvCell).join(","), ...lines].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="talentvault-enquiries-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
