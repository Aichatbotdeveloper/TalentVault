"use server";

import { audit } from "@/lib/audit";
import type { ActionState } from "@/lib/action-state";
import { notifyAdmins } from "@/lib/notifications";
import { RATE_LIMIT_MESSAGE, rateLimit } from "@/lib/rate-limit";
import { clientIpHash } from "@/lib/request";
import { createAdminClient } from "@/lib/supabase/admin";
import { contactSchema, fieldErrors } from "@/lib/validation";

export async function submitContact(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please correct the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  if (!(await rateLimit("contact", 5, 3600))) return { ok: false, message: RATE_LIMIT_MESSAGE };

  const { website: _honeypot, ...data } = parsed.data;
  const { data: row, error } = await createAdminClient()
    .from("contact_messages")
    .insert({ ...data, ip_hash: await clientIpHash() })
    .select("id")
    .single();
  if (error) return { ok: false, message: "We could not send your message. Please try again." };

  await notifyAdmins({
    type: "contact.new",
    title: "New website contact message",
    body: `A ${data.enquiry_type} enquiry was submitted via the contact form.`,
    link: "/admin/settings?tab=messages",
  });
  await audit({ action: "contact.submitted", entityType: "contact_message", entityId: row.id });
  return { ok: true, message: "Thank you — your message has been sent. We aim to reply within two working days." };
}
