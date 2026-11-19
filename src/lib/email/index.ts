import "server-only";
import { env, siteUrl } from "../env";
import { createAdminClient } from "../supabase/admin";

export interface EmailMessage {
  to: string;
  subject: string;
  template: string;
  heading: string;
  paragraphs: string[];
  cta?: { label: string; path: string };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function renderEmail(msg: EmailMessage): { html: string; text: string } {
  const body = msg.paragraphs.map((p) => `<p style="font-size:15px;line-height:1.6;color:#404941;margin:0 0 12px">${escapeHtml(p)}</p>`).join("");
  const cta = msg.cta
    ? `<p style="margin:24px 0"><a href="${escapeHtml(siteUrl(msg.cta.path))}" style="background:#1a6840;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:9999px;font-weight:600;display:inline-block">${escapeHtml(msg.cta.label)}</a></p>`
    : "";
  const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#191c20">
<div style="font-weight:800;font-size:20px;color:#1a6840;margin-bottom:24px">TalentVault</div>
<h2 style="font-size:20px;margin:0 0 12px">${escapeHtml(msg.heading)}</h2>${body}${cta}
<p style="font-size:12px;color:#646464;margin-top:32px">This is an automated message from TalentVault.</p></div>`;
  const text = [msg.heading, "", ...msg.paragraphs, msg.cta ? `\n${msg.cta.label}: ${siteUrl(msg.cta.path)}` : ""].join("\n");
  return { html, text };
}

/**
 * Sends a transactional email via the configured provider.
 * EMAIL_PROVIDER=console logs the message instead (development).
 * Failures never throw into business flows — they are recorded in email_log.
 */
export async function sendEmail(msg: EmailMessage): Promise<boolean> {
  const e = env();
  const { html, text } = renderEmail(msg);
  let status: "sent" | "logged" | "failed" = "logged";
  let error: string | null = null;

  if (e.EMAIL_PROVIDER === "resend") {
    if (!e.RESEND_API_KEY) {
      status = "failed";
      error = "RESEND_API_KEY not configured";
    } else {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${e.RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: e.EMAIL_FROM, to: [msg.to], subject: msg.subject, html, text }),
        });
        if (res.ok) status = "sent";
        else {
          status = "failed";
          error = `Resend ${res.status}: ${(await res.text()).slice(0, 300)}`;
        }
      } catch (err) {
        status = "failed";
        error = err instanceof Error ? err.message : String(err);
      }
    }
  } else {
    console.info(`[email:console] to=${msg.to} subject="${msg.subject}"\n${text}`);
  }

  await createAdminClient()
    .from("email_log")
    .insert({ to_address: msg.to, template: msg.template, subject: msg.subject, provider: e.EMAIL_PROVIDER, status, error })
    .then(({ error: logErr }) => logErr && console.error("[email] log failed", logErr.message));
  if (status === "failed") console.error("[email] send failed", msg.template, error);
  return status !== "failed";
}
