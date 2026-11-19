import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED: EmailOtpType[] = ["email", "signup", "recovery", "invite", "email_change", "magiclink"];

/** Verifies email links (sign-up confirmation, recovery, invitation, email change) via token_hash. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next") ?? "/portal";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/portal";

  if (tokenHash && type && ALLOWED.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      const dest = type === "recovery" || type === "invite" ? "/auth/update-password" : next;
      return NextResponse.redirect(new URL(dest + (type === "email" || type === "signup" ? "?verified=1" : ""), origin));
    }
  }
  return NextResponse.redirect(new URL("/auth/error", origin));
}
