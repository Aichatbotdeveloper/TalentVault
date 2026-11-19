import { NextResponse, type NextRequest } from "next/server";
import { audit } from "@/lib/audit";
import { getSessionProfile } from "@/lib/auth";
import { listAdminCandidates } from "@/lib/data/admin-candidates";
import { PROCESSING_STATUS_LABELS, PROFILE_STATUS_LABELS } from "@/lib/format";

const cell = (v: unknown) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

/** CSV export of the filtered candidate list (contains PII — permission-checked and audited). */
export async function GET(request: NextRequest) {
  const profile = await getSessionProfile();
  if (!profile || profile.status !== "active" || !profile.permissions.has("candidates.read_private")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const sp = Object.fromEntries(request.nextUrl.searchParams);
  const { rows } = await listAdminCandidates({ ...sp, page: 1, pageSize: 5000 }, profile.userId);
  await audit({ actorId: profile.userId, actorRole: profile.role, action: "candidates.exported", entityType: "candidate", metadata: { count: rows.length, filters: sp } });
  const header = ["Ref", "Name", "Email", "Location", "Headline", "Years", "Salary Min", "Salary Max", "Availability", "Skills", "Pipeline", "Profile", "Sample", "Created"];
  const lines = rows.map((c) =>
    [c.ref, c.candidate_private?.full_name, c.candidate_private?.email, c.candidate_private?.location_full, c.candidate_profiles.headline, c.candidate_profiles.years_experience, c.candidate_profiles.salary_min, c.candidate_profiles.salary_max, c.candidate_profiles.availability, c.candidate_profiles.skills.join("; "), PROCESSING_STATUS_LABELS[c.pipeline_status], PROFILE_STATUS_LABELS[c.profile_status], c.is_sample ? "yes" : "no", c.created_at]
      .map(cell)
      .join(","),
  );
  return new NextResponse([header.map(cell).join(","), ...lines].join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="candidates-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" },
  });
}
