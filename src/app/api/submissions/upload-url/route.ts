import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { validateCvMeta } from "@/lib/cv/files";
import { RATE_LIMIT_MESSAGE, rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({ filename: z.string().min(1).max(200), size: z.number().int().positive() });

/**
 * Issues a short-lived signed upload URL for a single CV in the private bucket's
 * `incoming/` area. The browser uploads directly to storage (with progress), and
 * the submission action then verifies the file's real type and size server-side.
 */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const meta = validateCvMeta(parsed.data.filename, parsed.data.size);
  if (!meta.ok) return NextResponse.json({ error: meta.error }, { status: 400 });
  if (!(await rateLimit("cv-upload-url", 10, 3600))) return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });

  const path = `incoming/${randomUUID()}.${meta.kind}`;
  const { data, error } = await createAdminClient().storage.from("cvs").createSignedUploadUrl(path);
  if (error || !data) return NextResponse.json({ error: "Upload is temporarily unavailable." }, { status: 503 });
  return NextResponse.json({ path, signedUrl: data.signedUrl }, { headers: { "Cache-Control": "no-store" } });
}
