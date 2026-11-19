import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";
import { CMS_SECTIONS, type CardItem } from "./definitions";

/** Anonymous (cookie-free) client for public pages — only calls the narrow public functions. */
function publicClient() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type SectionContent = Record<string, string | string[] | CardItem[]>;

/** Published CMS content for a page, merged over defaults. */
export async function getPageContent(page: string): Promise<Record<string, SectionContent>> {
  const result: Record<string, SectionContent> = {};
  for (const s of CMS_SECTIONS.filter((x) => x.page === page)) result[s.key] = { ...s.defaults };
  const { data, error } = await publicClient().rpc("get_published_cms");
  if (error) {
    console.error("[cms] failed to load content", error.message);
    return result;
  }
  for (const row of data ?? []) {
    if (row.page !== page || !result[row.section_key]) continue;
    result[row.section_key] = { ...result[row.section_key], ...(row.content as SectionContent) };
  }
  return result;
}

export async function getPublicSettings() {
  const { data } = await publicClient().rpc("get_public_settings");
  const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  const contact = (map.contact ?? {}) as { email?: string; phone?: string; address?: string; hours?: string };
  return { contact, employerRegistrationOpen: map.employer_registration_open !== false };
}

export async function getPublicStats() {
  const { data } = await publicClient().rpc("get_public_stats");
  return (data ?? { published_profiles: 0, approved_employers: 0 }) as { published_profiles: number; approved_employers: number };
}

export async function getTestimonials() {
  const { data } = await publicClient().rpc("get_published_testimonials");
  return data ?? [];
}

export const asText = (v: unknown) => (typeof v === "string" ? v : "");
export const asList = (v: unknown) => (Array.isArray(v) ? (v as unknown[]).filter((x): x is string => typeof x === "string") : []);
export const asCards = (v: unknown) =>
  Array.isArray(v) ? (v as unknown[]).filter((x): x is CardItem => !!x && typeof x === "object" && "title" in (x as object)) : [];
