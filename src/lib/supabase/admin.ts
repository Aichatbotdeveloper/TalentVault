import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * SERVICE-ROLE client. Bypasses RLS — only for trusted server-side workflows
 * (candidate intake, CV job worker, auth admin operations, audit/notification writes).
 * Never import from client components; `server-only` enforces this at build time.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service role is not configured");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
