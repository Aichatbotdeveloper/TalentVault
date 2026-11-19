import { NextResponse, type NextRequest } from "next/server";
import { audit } from "@/lib/audit";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Original CV access for authorised staff only. Issues a 60-second signed URL
 * (the bucket is private) and records the access in the audit log.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getSessionProfile();
  if (!profile || profile.status !== "active" || !profile.permissions.has("candidates.read_private")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const supabase = await createClient(); // RLS + storage policy enforce access as this user
  const { data: doc } = await supabase.from("candidate_documents").select("id, candidate_id, storage_path, original_filename").eq("id", id).maybeSingle();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { data, error } = await supabase.storage.from("cvs").createSignedUrl(doc.storage_path, 60, { download: doc.original_filename });
  if (error || !data) return NextResponse.json({ error: "Unavailable" }, { status: 500 });
  await audit({ actorId: profile.userId, actorRole: profile.role, action: "candidate.document_accessed", entityType: "candidate", entityId: doc.candidate_id, metadata: { document_id: doc.id } });
  return NextResponse.redirect(data.signedUrl, { headers: { "Cache-Control": "no-store" } });
}
