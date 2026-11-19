import "server-only";
import type { Json } from "./supabase/database.types";
import { createAdminClient } from "./supabase/admin";
import { clientIpHash } from "./request";

/** Append-only audit log entry. Never include raw PII in metadata. */
export async function audit(entry: {
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await createAdminClient()
    .from("audit_logs")
    .insert({
      actor_id: entry.actorId ?? null,
      actor_role: entry.actorRole ?? null,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      metadata: (entry.metadata ?? {}) as { [key: string]: Json },
      ip_hash: await clientIpHash().catch(() => null),
    });
  if (error) console.error("[audit] failed to write", entry.action, error.message);
}
