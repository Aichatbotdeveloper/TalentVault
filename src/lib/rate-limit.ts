import "server-only";
import { createAdminClient } from "./supabase/admin";
import { clientIpHash } from "./request";

/**
 * Fixed-window rate limit stored in Postgres (works across serverless instances).
 * Fails CLOSED: if the limiter cannot be evaluated the request is refused.
 */
export async function rateLimit(bucket: string, limit: number, windowSeconds: number, identity?: string) {
  const id = identity ?? (await clientIpHash());
  const { data, error } = await createAdminClient().rpc("check_rate_limit", {
    p_key: `${bucket}:${id}`,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("[rate-limit] evaluation failed", error.message);
    return false;
  }
  return data === true;
}

export const RATE_LIMIT_MESSAGE = "Too many attempts. Please wait a few minutes and try again.";
