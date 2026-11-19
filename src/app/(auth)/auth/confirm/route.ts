import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED: EmailOtpType[] = ["email", "signup", "recovery", "invite", "email_change", "magiclink"];

function safePath(p: string | null, fallback: string) {
  return p && p.startsWith("/") && !p.startsWith("//") && !p.startsWith("/\\") ? p : fallback;
}

/**
 * Completes email links. Supports both link styles:
 *  - custom templates: ?token_hash=…&type=…   (works on any device)
 *  - Supabase default templates (PKCE): ?code=… (same browser that started the flow)
 * Our own `flow` parameter (set in emailRedirectTo / redirectTo) says what the link is for.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const flow = searchParams.get("flow");
  const next = safePath(searchParams.get("next"), "/portal");
  const go = (path: string) => NextResponse.redirect(new URL(path, origin));
  const supabase = await createClient();

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  if (tokenHash && type && ALLOWED.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      if (type === "recovery" || type === "invite") return go("/auth/update-password");
      return go(type === "email" || type === "signup" ? `${next}${next.includes("?") ? "&" : "?"}verified=1` : next);
    }
    return go("/auth/error");
  }

  const code = searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (flow === "recovery") return go("/auth/update-password");
      return go(flow === "signup" ? `${next}${next.includes("?") ? "&" : "?"}verified=1` : next);
    }
    // Supabase has already confirmed the address before redirecting here; the session could not be
    // created because the link was opened in a different browser. The user can simply sign in.
    if (flow === "signup") return go("/login?confirmed=1");
  }

  return go("/auth/error");
}
