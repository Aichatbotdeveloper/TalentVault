import "server-only";
import { createAdminClient } from "../supabase/admin";

/** Removes abandoned uploads from incoming/ (files never attached to a submission) older than 24h. */
export async function purgeOrphanedUploads() {
  const bucket = createAdminClient().storage.from("cvs");
  const { data } = await bucket.list("incoming", { limit: 1000, sortBy: { column: "created_at", order: "asc" } });
  const cutoff = Date.now() - 24 * 3600_000;
  const stale = (data ?? []).filter((f) => f.created_at && new Date(f.created_at).getTime() < cutoff).map((f) => `incoming/${f.name}`);
  if (stale.length) await bucket.remove(stale);
  return stale.length;
}
