"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeDbMessage, type ActionState } from "@/lib/action-state";
import { AuthorizationError, requireAdminAction } from "@/lib/auth";
import { sectionDef } from "@/lib/cms/definitions";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

const cardSchema = z.object({ title: z.string().trim().min(1).max(120), body: z.string().trim().max(600), icon: z.string().trim().max(120).optional() });

/** Validates submitted content strictly against the section's field definitions. */
function validateContent(page: string, key: string, raw: unknown) {
  const def = sectionDef(page, key);
  if (!def) return { error: "Unknown section." };
  const input = (raw ?? {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const f of def.fields) {
    const v = input[f.key];
    if (f.type === "text" || f.type === "textarea" || f.type === "richtext") {
      const max = "max" in f && f.max ? f.max : f.type === "richtext" ? 20000 : f.type === "textarea" ? 1200 : 200;
      const r = z.string().trim().max(max, `${f.label}: maximum ${max} characters`).safeParse(v ?? "");
      if (!r.success) return { error: r.error.issues[0]!.message };
      out[f.key] = r.data;
    } else if (f.type === "list") {
      const r = z.array(z.string().trim().min(1).max(200)).max(20).safeParse(v ?? []);
      if (!r.success) return { error: `${f.label}: up to 20 items of 200 characters` };
      out[f.key] = r.data;
    } else {
      const r = z.array(cardSchema).max(12).safeParse(v ?? []);
      if (!r.success) return { error: `${f.label}: each card needs a title (max 12 cards)` };
      out[f.key] = r.data;
    }
  }
  return { content: out, route: def.route };
}

export async function saveSection(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdminAction("cms.manage");
  } catch (e) {
    if (e instanceof AuthorizationError) return { ok: false, message: e.message };
    throw e;
  }
  const page = String(formData.get("page"));
  const key = String(formData.get("section_key"));
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(String(formData.get("content_json") ?? "{}"));
  } catch {
    return { ok: false, message: "Content could not be read." };
  }
  const v = validateContent(page, key, parsedJson);
  if ("error" in v) return { ok: false, message: v.error };
  const supabase = await createClient();
  const { error } = await supabase.rpc("cms_save_draft", { p_page: page, p_section: key, p_content: v.content as Json });
  if (error) return { ok: false, message: safeDbMessage(error) };
  if (formData.get("intent") === "publish") {
    const { error: pubErr } = await supabase.rpc("cms_publish_section", { p_page: page, p_section: key });
    if (pubErr) return { ok: false, message: safeDbMessage(pubErr) };
    revalidatePath(v.route);
    if (page === "legal") revalidatePath("/terms");
    revalidatePath("/admin/content");
    return { ok: true, message: "Published to the live website." };
  }
  revalidatePath("/admin/content");
  return { ok: true, message: "Draft saved. Publish to make it live." };
}

export async function discardDraft(formData: FormData) {
  await requireAdminAction("cms.manage");
  const supabase = await createClient();
  const page = String(formData.get("page"));
  const section = String(formData.get("section_key"));
  await supabase.rpc("cms_discard_draft", { p_page: page, p_section: section });
  revalidatePath("/admin/content");
  redirect(`/admin/content?${new URLSearchParams({ page, section, v: String(Date.now()) })}`);
}

export async function saveTestimonial(formData: FormData) {
  await requireAdminAction("cms.manage");
  const parsed = z
    .object({ id: z.string().uuid().optional().or(z.literal("")), quote: z.string().trim().min(10).max(600), author_role: z.string().trim().min(2).max(120), organisation_descriptor: z.string().trim().max(120).optional(), is_published: z.string().optional() })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const d = parsed.data;
  const supabase = await createClient();
  const row = { quote: d.quote, author_role: d.author_role, organisation_descriptor: d.organisation_descriptor || null, is_published: d.is_published === "on" };
  if (d.id) await supabase.from("testimonials").update(row).eq("id", d.id);
  else await supabase.from("testimonials").insert(row);
  revalidatePath("/admin/content");
  revalidatePath("/");
}

export async function deleteTestimonial(formData: FormData) {
  await requireAdminAction("cms.manage");
  const supabase = await createClient();
  await supabase.from("testimonials").delete().eq("id", z.string().uuid().parse(formData.get("id")));
  revalidatePath("/admin/content");
}
