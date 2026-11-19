import "server-only";
import { createClient } from "../supabase/server";

export async function getMyNotifications(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, title, body, link, read_at, created_at")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(15);
  return data ?? [];
}
