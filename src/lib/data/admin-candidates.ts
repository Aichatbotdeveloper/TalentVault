import "server-only";
import { createClient } from "../supabase/server";
import type { Database } from "../supabase/database.types";

type Pipeline = Database["public"]["Enums"]["processing_status"];
type ProfileStatus = Database["public"]["Enums"]["profile_status"];

export interface AdminCandidateFilters {
  q?: string;
  pipeline?: string;
  status?: string;
  availability?: string;
  assigned?: string;
  sample?: string;
  page: number;
  pageSize: number;
}

const clean = (s: string) => s.replace(/[%,()*]/g, " ").trim();

/** Admin candidate list (RLS: admins only; private fields require candidates.read_private). */
export async function listAdminCandidates(f: AdminCandidateFilters, userId: string) {
  const supabase = await createClient();
  let ids: string[] | null = null;
  if (f.q) {
    const q = clean(f.q);
    const [priv, prof, refs] = await Promise.all([
      supabase.from("candidate_private").select("candidate_id").or(`full_name.ilike.%${q}%,email.ilike.%${q}%`).limit(500),
      supabase.from("candidate_profiles").select("candidate_id").or(`headline.ilike.%${q}%,job_title.ilike.%${q}%`).limit(500),
      supabase.from("candidates").select("id").ilike("ref", `%${q}%`).limit(500),
    ]);
    const bySkill = await supabase.from("candidate_profiles").select("candidate_id").contains("skills", [q]).limit(500);
    ids = [...new Set([...(priv.data ?? []).map((r) => r.candidate_id), ...(prof.data ?? []).map((r) => r.candidate_id), ...(refs.data ?? []).map((r) => r.id), ...(bySkill.data ?? []).map((r) => r.candidate_id)])];
    if (ids.length === 0) return { rows: [], total: 0 };
  }

  let query = supabase
    .from("candidates")
    .select(
      "id, ref, source, pipeline_status, profile_status, is_sample, created_at, updated_at, assigned_admin_id, candidate_private(full_name, email, location_full), candidate_profiles!inner(headline, job_title, years_experience, skills, availability, salary_min, salary_max)",
      { count: "exact" },
    );
  if (ids) query = query.in("id", ids);
  if (f.pipeline) query = query.eq("pipeline_status", f.pipeline as Pipeline);
  if (f.status) query = query.eq("profile_status", f.status as ProfileStatus);
  else query = query.neq("profile_status", "archived");
  if (f.availability) query = query.eq("candidate_profiles.availability", f.availability as Database["public"]["Enums"]["availability"]);
  if (f.assigned === "me") query = query.eq("assigned_admin_id", userId);
  if (f.assigned === "none") query = query.is("assigned_admin_id", null);
  if (f.sample === "hide") query = query.eq("is_sample", false);
  const { data, count, error } = await query.order("created_at", { ascending: false }).range((f.page - 1) * f.pageSize, f.page * f.pageSize - 1);
  if (error) console.error("[admin candidates]", error.message);
  return { rows: data ?? [], total: count ?? 0 };
}

export async function listAdmins() {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, full_name, email").in("role", ["super_admin", "recruitment_admin"]).eq("status", "active").order("full_name");
  return data ?? [];
}
