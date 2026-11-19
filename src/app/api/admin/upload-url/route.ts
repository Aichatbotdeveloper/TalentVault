import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionProfile } from "@/lib/auth";
import { validateCvMeta } from "@/lib/cv/files";
import { createAdminClient } from "@/lib/supabase/admin";

/** Signed upload URL for recruiters uploading CVs on a candidate's behalf. */
export async function POST(request: Request) {
  const profile = await getSessionProfile();
  if (!profile || profile.status !== "active" || !profile.permissions.has("candidates.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = z.object({ filename: z.string().min(1).max(200), size: z.number().int().positive() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const meta = validateCvMeta(parsed.data.filename, parsed.data.size);
  if (!meta.ok) return NextResponse.json({ error: meta.error }, { status: 400 });
  const path = `incoming/${randomUUID()}.${meta.kind}`;
  const { data, error } = await createAdminClient().storage.from("cvs").createSignedUploadUrl(path);
  if (error || !data) return NextResponse.json({ error: "Upload is temporarily unavailable." }, { status: 503 });
  return NextResponse.json({ path, signedUrl: data.signedUrl }, { headers: { "Cache-Control": "no-store" } });
}
