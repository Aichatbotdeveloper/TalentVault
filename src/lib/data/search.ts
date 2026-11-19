import "server-only";
import { AVAILABILITY_VALUES } from "../cv/schema";
import { createClient } from "../supabase/server";
import type { Database } from "../supabase/database.types";

type Availability = Database["public"]["Enums"]["availability"];
type WorkMode = Database["public"]["Enums"]["work_mode"];

export const EXPERIENCE_BANDS: Record<string, [number | null, number | null, string]> = {
  "0-3": [0, 3, "0–3 yrs"],
  "4-6": [4, 6, "4–6 yrs"],
  "7-10": [7, 10, "7–10 yrs"],
  "10+": [10, null, "10+ yrs"],
};
export const SORTS: Record<string, string> = {
  relevance: "Most relevant",
  newest: "Newest profiles",
  experience_desc: "Most experienced",
  salary_asc: "Salary: low to high",
  salary_desc: "Salary: high to low",
};
export const PAGE_SIZE = 10;

export type SearchParams = Record<string, string | string[] | undefined>;

const list = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []).map((x) => x.trim()).filter(Boolean);
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
const int = (v: string | undefined) => {
  const n = v ? Number(v.replace(/[^\d]/g, "")) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.min(n, 5_000_000) : null;
};

export function parseSearchParams(sp: SearchParams) {
  const exp = list(sp.exp).filter((e) => e in EXPERIENCE_BANDS);
  const mins = exp.map((e) => EXPERIENCE_BANDS[e]![0] ?? 0);
  const maxes = exp.map((e) => EXPERIENCE_BANDS[e]![1]);
  return {
    q: one(sp.q)?.slice(0, 120),
    title: one(sp.title)?.slice(0, 120),
    location: one(sp.location)?.slice(0, 120),
    salaryMin: int(one(sp.salary_min)),
    salaryMax: int(one(sp.salary_max)),
    exp,
    expMin: exp.length ? Math.min(...mins) : null,
    expMax: exp.length && !maxes.includes(null) ? Math.max(...(maxes as number[])) : null,
    availability: list(sp.availability).filter((a): a is Availability => (AVAILABILITY_VALUES as readonly string[]).includes(a)),
    workModes: list(sp.work_mode).filter((m): m is WorkMode => ["remote", "hybrid", "onsite"].includes(m)),
    skills: list(sp.skill).slice(0, 10),
    industries: list(sp.industry).slice(0, 10),
    sort: one(sp.sort) && one(sp.sort)! in SORTS ? one(sp.sort)! : "relevance",
    page: Math.max(1, Math.min(500, Number(one(sp.page)) || 1)),
  };
}
export type ParsedSearch = ReturnType<typeof parseSearchParams>;

/** Runs the employer search as the signed-in user (RLS: approved employers, published profiles only). */
export async function searchCandidates(p: ParsedSearch) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_candidate_profiles", {
    p_query: p.q ?? undefined,
    p_title: p.title ?? undefined,
    p_location: p.location ?? undefined,
    p_salary_min: p.salaryMin ?? undefined,
    p_salary_max: p.salaryMax ?? undefined,
    p_exp_min: p.expMin ?? undefined,
    p_exp_max: p.expMax ?? undefined,
    p_availability: p.availability.length ? p.availability : undefined,
    p_work_modes: p.workModes.length ? p.workModes : undefined,
    p_skills: p.skills.length ? p.skills : undefined,
    p_industries: p.industries.length ? p.industries : undefined,
    p_sort: p.sort,
    p_limit: PAGE_SIZE,
    p_offset: (p.page - 1) * PAGE_SIZE,
  });
  if (error) {
    console.error("[search] failed", error.message);
    return { rows: [], total: 0, error: true as const };
  }
  return { rows: data ?? [], total: Number(data?.[0]?.total_count ?? 0), error: false as const };
}

export async function getFacets() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("candidate_facets");
  const f = (data ?? {}) as { skills?: string[]; industries?: string[] };
  return { skills: f.skills ?? [], industries: f.industries ?? [] };
}

export function activeFilterChips(p: ParsedSearch) {
  const chips: { key: string; value?: string; label: string }[] = [];
  if (p.q) chips.push({ key: "q", label: `“${p.q}”` });
  if (p.title) chips.push({ key: "title", label: `Title: ${p.title}` });
  if (p.location) chips.push({ key: "location", label: `Location: ${p.location}` });
  if (p.salaryMin) chips.push({ key: "salary_min", label: `Min £${Math.round(p.salaryMin / 1000)}k` });
  if (p.salaryMax) chips.push({ key: "salary_max", label: `Max £${Math.round(p.salaryMax / 1000)}k` });
  p.exp.forEach((e) => chips.push({ key: "exp", value: e, label: EXPERIENCE_BANDS[e]![2] }));
  p.availability.forEach((a) => chips.push({ key: "availability", value: a, label: a.replace("_", " ") }));
  p.workModes.forEach((m) => chips.push({ key: "work_mode", value: m, label: m }));
  p.skills.forEach((s) => chips.push({ key: "skill", value: s, label: s }));
  p.industries.forEach((s) => chips.push({ key: "industry", value: s, label: s }));
  return chips;
}
