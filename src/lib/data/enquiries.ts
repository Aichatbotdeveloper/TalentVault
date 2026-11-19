import "server-only";
import { createClient } from "../supabase/server";
import type { Database } from "../supabase/database.types";

type EnquiryStatus = Database["public"]["Enums"]["enquiry_status"];

export interface EmployerEnquiryFilters {
  q?: string;
  status?: string;
  sort?: string;
  page?: number;
}

/** Enquiries visible to the signed-in employer (RLS limits rows to their organisation). */
export async function listEmployerEnquiries(f: EmployerEnquiryFilters, pageSize = 10) {
  const supabase = await createClient();
  let query = supabase
    .from("enquiries")
    .select("id, ref, status, role_title, requirement, salary_offer, created_at, updated_at, candidate_id", { count: "exact" });
  if (f.q) query = query.or(`ref.ilike.%${f.q.replace(/[%,()]/g, "")}%,role_title.ilike.%${f.q.replace(/[%,()]/g, "")}%`);
  if (f.status === "open") query = query.in("status", ["new", "under_review", "candidate_contacted", "candidate_consented"]);
  else if (f.status === "closed") query = query.in("status", ["introduced", "closed_placed", "closed_declined", "withdrawn"]);
  else if (f.status) query = query.eq("status", f.status as EnquiryStatus);
  query = query.order(f.sort === "oldest" ? "created_at" : f.sort === "updated" ? "updated_at" : "created_at", { ascending: f.sort === "oldest" });
  const page = Math.max(1, f.page ?? 1);
  const { data, count } = await query.range((page - 1) * pageSize, page * pageSize - 1);
  const rows = data ?? [];
  const profiles = await candidateSnippets(rows.map((r) => r.candidate_id));
  return { rows: rows.map((r) => ({ ...r, candidate: profiles.get(r.candidate_id) ?? null })), total: count ?? 0, page };
}

export async function candidateSnippets(candidateIds: string[]) {
  const map = new Map<string, { ref: string; headline: string | null; skills: string[]; salary_min: number | null; salary_max: number | null; availability: string | null }>();
  if (!candidateIds.length) return map;
  const supabase = await createClient();
  const { data } = await supabase
    .from("candidate_profiles")
    .select("candidate_id, ref, headline, skills, salary_min, salary_max, availability")
    .in("candidate_id", [...new Set(candidateIds)]);
  data?.forEach((d) => map.set(d.candidate_id, d));
  return map;
}

export async function employerEnquiryStats() {
  const supabase = await createClient();
  const { data } = await supabase.from("enquiries").select("status, created_at");
  const rows = data ?? [];
  const monthAgo = Date.now() - 30 * 86400_000;
  return {
    total: rows.length,
    last30: rows.filter((r) => new Date(r.created_at).getTime() > monthAgo).length,
    new: rows.filter((r) => r.status === "new").length,
    inProgress: rows.filter((r) => ["under_review", "candidate_contacted", "candidate_consented"].includes(r.status)).length,
    introduced: rows.filter((r) => ["introduced", "closed_placed"].includes(r.status)).length,
    closed: rows.filter((r) => ["closed_declined", "withdrawn"].includes(r.status)).length,
  };
}

export async function getEmployerEnquiry(ref: string) {
  const supabase = await createClient();
  const { data: e } = await supabase
    .from("enquiries")
    .select("id, ref, status, role_title, requirement, salary_offer, contact_phone, created_at, updated_at, candidate_id, created_by")
    .eq("ref", ref)
    .maybeSingle();
  if (!e) return null;
  const [{ data: events }, snippets, { data: creator }] = await Promise.all([
    // RLS returns only employer-visible events; internal notes are never sent to employers.
    supabase.from("enquiry_events").select("id, type, from_status, to_status, body, author_id, created_at").eq("enquiry_id", e.id).order("created_at", { ascending: false }),
    candidateSnippets([e.candidate_id]),
    e.created_by ? supabase.from("profiles").select("full_name").eq("id", e.created_by).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  return { ...e, events: events ?? [], candidate: snippets.get(e.candidate_id) ?? null, createdByName: creator?.full_name ?? null };
}
