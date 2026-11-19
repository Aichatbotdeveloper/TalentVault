"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  // RLS restricts the update to the caller's own notifications.
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null).eq("recipient_id", data.user.id);
  revalidatePath("/", "layout");
}
