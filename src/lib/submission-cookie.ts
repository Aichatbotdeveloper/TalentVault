import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Candidates have no account, so the confirmation page is protected by a short-lived,
 * HMAC-signed, httpOnly cookie issued on submission. Without it the page shows no personal data.
 */
const COOKIE = "tv_submission";

function sign(value: string) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "dev";
  return createHmac("sha256", `submission:${key}`).update(value).digest("base64url");
}

export async function setSubmissionCookie(submissionRef: string) {
  (await cookies()).set(COOKIE, `${submissionRef}.${sign(submissionRef)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/submit-cv",
    maxAge: 60 * 60 * 24,
  });
}

export async function readSubmissionCookie(): Promise<string | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const idx = raw.lastIndexOf(".");
  const ref = raw.slice(0, idx);
  const sig = raw.slice(idx + 1);
  const expected = sign(ref);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  return ref;
}
