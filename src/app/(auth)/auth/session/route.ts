import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * Stores a session delivered in a URL fragment (#access_token=…&refresh_token=…), which is how
 * Supabase's default invitation emails sign the invited administrator in. Same-origin only.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = z
    .object({ access_token: z.string().min(20).max(4096), refresh_token: z.string().min(5).max(512) })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase.auth.setSession(parsed.data);
  if (error || !data.user) return NextResponse.json({ error: "Invalid or expired link" }, { status: 401 });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
