import "server-only";
import { env } from "./env";
import { sendEmail } from "./email";
import { createAdminClient } from "./supabase/admin";

interface Notice {
  type: string;
  title: string;
  body: string;
  link?: string;
}

/** In-app notification for every active administrator + email alert. */
export async function notifyAdmins(notice: Notice, opts: { email?: boolean; onlyAdminIds?: string[] } = {}) {
  const db = createAdminClient();
  let query = db.from("profiles").select("id, email").in("role", ["super_admin", "recruitment_admin"]).eq("status", "active");
  if (opts.onlyAdminIds?.length) query = query.in("id", opts.onlyAdminIds);
  const { data: admins } = await query;
  if (admins?.length) {
    await db.from("notifications").insert(
      admins.map((a) => ({ recipient_id: a.id, type: notice.type, title: notice.title, body: notice.body, link: notice.link ?? null })),
    );
  }
  if (opts.email === false) return;

  const { data: setting } = await db.from("site_settings").select("value").eq("key", "admin_notification_emails").maybeSingle();
  const configured = Array.isArray(setting?.value) ? (setting!.value as string[]) : [];
  const fromEnv = (env().ADMIN_NOTIFICATION_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const recipients = new Set([...configured, ...fromEnv]);
  if (opts.onlyAdminIds?.length) admins?.forEach((a) => recipients.add(a.email));
  if (recipients.size === 0) admins?.forEach((a) => recipients.add(a.email));

  await Promise.all(
    [...recipients].map((to) =>
      sendEmail({
        to,
        template: notice.type,
        subject: `[TalentVault] ${notice.title}`,
        heading: notice.title,
        paragraphs: [notice.body],
        cta: notice.link ? { label: "Open in admin console", path: notice.link } : undefined,
      }),
    ),
  );
}

export async function notifyUser(userId: string, notice: Notice) {
  await createAdminClient()
    .from("notifications")
    .insert({ recipient_id: userId, type: notice.type, title: notice.title, body: notice.body, link: notice.link ?? null });
}

/** Notify every active user belonging to an employer organisation. */
export async function notifyEmployer(employerId: string, notice: Notice, email = true) {
  const db = createAdminClient();
  const { data: users } = await db.from("profiles").select("id, email").eq("employer_id", employerId).eq("status", "active");
  if (!users?.length) return;
  await db.from("notifications").insert(
    users.map((u) => ({ recipient_id: u.id, type: notice.type, title: notice.title, body: notice.body, link: notice.link ?? null })),
  );
  if (email) {
    await Promise.all(
      users.map((u) =>
        sendEmail({
          to: u.email,
          template: notice.type,
          subject: `[TalentVault] ${notice.title}`,
          heading: notice.title,
          paragraphs: [notice.body],
          cta: notice.link ? { label: "Open TalentVault", path: notice.link } : undefined,
        }),
      ),
    );
  }
}
