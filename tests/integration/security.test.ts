/**
 * Security & business-rule integration tests against a real (local) Supabase stack.
 * They exercise RLS, column privileges, storage policies and SQL workflow functions
 * exactly as the browser/API would — not mocks.
 *
 * Requires `supabase start` + migrations. Skipped automatically when not configured.
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const enabled = /127\.0\.0\.1|localhost/.test(URL_) && !!SERVICE;

const PASSWORD = "Integration-Test-1";
const run = randomUUID().slice(0, 8);
const admin = () => createClient<Database>(URL_, SERVICE, { auth: { persistSession: false } });
const anon = () => createClient<Database>(URL_, ANON, { auth: { persistSession: false } });
const created: string[] = [];
const candidateIds: string[] = [];

async function makeUser(label: string, opts: { role?: "super_admin" | "recruitment_admin"; company?: string } = {}) {
  const email = `${label}-${run}@example.com`;
  const { data, error } = await admin().auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: opts.company ? { full_name: label, company_name: opts.company } : { full_name: label },
    app_metadata: opts.role ? { tv_role: opts.role } : {},
  });
  if (error) throw error;
  created.push(data.user.id);
  const c = anon();
  const { error: signErr } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (signErr) throw signErr;
  const { data: prof } = await admin().from("profiles").select("employer_id, role").eq("id", data.user.id).single();
  return { client: c, id: data.user.id, employerId: prof?.employer_id ?? null, role: prof?.role };
}

async function makeCandidate(opts: { published: boolean; pipeline?: Database["public"]["Enums"]["processing_status"] }) {
  const db = admin();
  const { data: c } = await db.from("candidates").insert({ pipeline_status: opts.pipeline ?? "approved", profile_status: opts.published ? "published" : "draft", source: "manual" }).select("id, ref").single();
  candidateIds.push(c!.id);
  await db.from("candidate_private").insert({ candidate_id: c!.id, full_name: `Secret Person ${run}`, email: `secret-${run}@example.com`, phone: "+44 7700 900999" });
  await db.from("candidate_profiles").insert({ candidate_id: c!.id, ref: c!.ref, headline: `Integration Engineer ${run}`, summary: "A summary long enough for publication checks.", job_title: "Engineer", skills: ["IntegrationSkill"], published: opts.published, published_at: opts.published ? new Date().toISOString() : null });
  await db.from("consent_records").insert({ candidate_id: c!.id, consent_type: "anonymised_marketplace", granted: true, consent_text: "test", policy_version: "test" });
  const path = `documents/test-${run}-${c!.ref}.pdf`;
  await db.storage.from("cvs").upload(path, readFileSync("tests/fixtures/cv-sample.pdf"), { contentType: "application/pdf" });
  await db.from("candidate_documents").insert({ candidate_id: c!.id, storage_path: path, original_filename: "cv.pdf", mime_type: "application/pdf", size_bytes: 100, sha256: "x" });
  return { id: c!.id, ref: c!.ref, path };
}

describe.skipIf(!enabled)("security & workflow integration", () => {
  let superAdmin: Awaited<ReturnType<typeof makeUser>>;
  let recruiter: Awaited<ReturnType<typeof makeUser>>;
  let empA: Awaited<ReturnType<typeof makeUser>>;
  let empB: Awaited<ReturnType<typeof makeUser>>;
  let pending: Awaited<ReturnType<typeof makeUser>>;
  let published: Awaited<ReturnType<typeof makeCandidate>>;
  let draft: Awaited<ReturnType<typeof makeCandidate>>;

  beforeAll(async () => {
    superAdmin = await makeUser("super", { role: "super_admin" });
    recruiter = await makeUser("recruiter", { role: "recruitment_admin" });
    empA = await makeUser("empa", { company: `Employer A ${run}` });
    empB = await makeUser("empb", { company: `Employer B ${run}` });
    pending = await makeUser("pending", { company: `Pending Co ${run}` });
    await admin().from("employers").update({ status: "approved" }).in("id", [empA.employerId!, empB.employerId!]);
    published = await makeCandidate({ published: true });
    draft = await makeCandidate({ published: false, pipeline: "awaiting_review" });
  });

  afterAll(async () => {
    if (!enabled) return;
    const db = admin();
    await db.storage.from("cvs").remove([published.path, draft.path]);
    await db.from("candidates").delete().in("id", candidateIds);
    const { data: profs } = await db.from("profiles").select("employer_id").in("id", created);
    for (const id of created) await db.auth.admin.deleteUser(id);
    const empIds = (profs ?? []).map((p) => p.employer_id).filter((x): x is string => !!x);
    if (empIds.length) await db.from("employers").delete().in("id", empIds);
  });

  it("assigns roles only via trusted app_metadata, never user metadata", async () => {
    expect(superAdmin.role).toBe("super_admin");
    expect(recruiter.role).toBe("recruitment_admin");
    const c = anon();
    const email = `escalate-${run}@example.com`;
    const { data } = await c.auth.signUp({ email, password: PASSWORD, options: { data: { tv_role: "super_admin", role: "super_admin" } } });
    if (data.user) {
      created.push(data.user.id);
      const { data: prof } = await admin().from("profiles").select("role").eq("id", data.user.id).single();
      expect(prof?.role).toBe("employer");
    }
  });

  it("gives anonymous visitors no access to candidate data", async () => {
    const c = anon();
    const { data: p } = await c.from("candidate_profiles").select("ref");
    const { data: priv } = await c.from("candidate_private").select("full_name");
    expect(p ?? []).toHaveLength(0);
    expect(priv ?? []).toHaveLength(0);
    const { error } = await c.rpc("search_candidate_profiles", {});
    expect(error).not.toBeNull();
  });

  it("blocks unapproved employers from the candidate database", async () => {
    const { data } = await pending.client.rpc("search_candidate_profiles", { p_query: `Integration Engineer ${run}` });
    expect(data ?? []).toHaveLength(0);
    const { data: direct } = await pending.client.from("candidate_profiles").select("ref").eq("ref", published.ref);
    expect(direct ?? []).toHaveLength(0);
  });

  it("returns only published anonymous profiles to approved employers — never PII", async () => {
    const { data, error } = await empA.client.rpc("search_candidate_profiles", { p_query: `Integration Engineer ${run}`, p_limit: 50 });
    expect(error).toBeNull();
    const refs = (data ?? []).map((r) => r.ref);
    expect(refs).toContain(published.ref);
    expect(refs).not.toContain(draft.ref);
    const serialised = JSON.stringify(data);
    expect(serialised).not.toContain("Secret Person");
    expect(serialised).not.toContain(`secret-${run}@example.com`);
    expect(serialised).not.toContain("7700 900999");
    for (const row of data ?? []) expect(Object.keys(row)).not.toEqual(expect.arrayContaining(["full_name", "email", "phone"]));
  });

  it("denies employers the private record, documents, AI results and the CV file", async () => {
    const { data: priv } = await empA.client.from("candidate_private").select("*").eq("candidate_id", published.id);
    const { data: docs } = await empA.client.from("candidate_documents").select("*").eq("candidate_id", published.id);
    const { data: ai } = await empA.client.from("ai_processing_results").select("*");
    const { data: cands } = await empA.client.from("candidates").select("*");
    expect(priv ?? []).toHaveLength(0);
    expect(docs ?? []).toHaveLength(0);
    expect(ai ?? []).toHaveLength(0);
    expect(cands ?? []).toHaveLength(0);
    const { data: file } = await empA.client.storage.from("cvs").download(published.path);
    expect(file).toBeNull();
    const { data: signed } = await empA.client.storage.from("cvs").createSignedUrl(published.path, 60);
    expect(signed).toBeNull();
    // anonymous visitors also cannot read it
    const { data: anonFile } = await anon().storage.from("cvs").download(published.path);
    expect(anonFile).toBeNull();
  });

  it("prevents employers changing their own approval status or role", async () => {
    const { error: e1 } = await empA.client.from("employers").update({ status: "approved" }).eq("id", pending.employerId!);
    const { error: e2 } = await pending.client.from("employers").update({ status: "approved" } as never).eq("id", pending.employerId!);
    const { error: e3 } = await pending.client.from("profiles").update({ role: "super_admin" } as never).eq("id", pending.id);
    expect(e2).not.toBeNull();
    expect(e3).not.toBeNull();
    const { data } = await admin().from("employers").select("status").eq("id", pending.employerId!).single();
    expect(data?.status).toBe("pending");
    void e1;
  });

  it("isolates enquiries per employer and hides internal notes", async () => {
    const { data: created, error } = await empA.client.rpc("create_enquiry", {
      p_candidate_ref: published.ref,
      p_role_title: "Principal Engineer",
      p_requirement: "We need a principal engineer for our platform team, hybrid in London.",
    });
    expect(error).toBeNull();
    const enquiryId = (created as { id: string }).id;
    const { error: dup } = await empA.client.rpc("create_enquiry", { p_candidate_ref: published.ref, p_role_title: "Again", p_requirement: "A duplicate enquiry that should be rejected by the database." });
    expect(dup?.message).toMatch(/already have an open enquiry/);

    const { data: bView } = await empB.client.from("enquiries").select("id").eq("id", enquiryId);
    expect(bView ?? []).toHaveLength(0);
    const { error: bMsg } = await empB.client.rpc("employer_post_enquiry_message", { p_enquiry_id: enquiryId, p_body: "hijack" });
    expect(bMsg).not.toBeNull();

    await recruiter.client.rpc("admin_update_enquiry", { p_enquiry_id: enquiryId, p_message: `INTERNAL-${run}`, p_visibility: "internal" });
    await recruiter.client.rpc("admin_update_enquiry", { p_enquiry_id: enquiryId, p_message: `PUBLIC-${run}`, p_visibility: "employer" });
    const { data: events } = await empA.client.from("enquiry_events").select("body, visibility").eq("enquiry_id", enquiryId);
    const bodies = (events ?? []).map((e) => e.body).join("|");
    expect(bodies).toContain(`PUBLIC-${run}`);
    expect(bodies).not.toContain(`INTERNAL-${run}`);
    expect((events ?? []).every((e) => e.visibility === "employer")).toBe(true);

    // introductions require recorded candidate consent for this enquiry
    const { error: introErr } = await recruiter.client.rpc("admin_update_enquiry", { p_enquiry_id: enquiryId, p_status: "introduced" });
    expect(introErr?.message).toMatch(/requires recorded candidate consent/);
    const { error: consentErr } = await recruiter.client.rpc("admin_record_identity_consent", { p_enquiry_id: enquiryId, p_note: "Candidate agreed by email reply" });
    expect(consentErr).toBeNull();
    const { error: introOk } = await recruiter.client.rpc("admin_update_enquiry", { p_enquiry_id: enquiryId, p_status: "introduced", p_message: "Intro", p_visibility: "employer" });
    expect(introOk).toBeNull();
  });

  it("blocks employers from admin functions", async () => {
    const { error: a } = await empA.client.rpc("set_candidate_publication", { p_candidate_id: draft.id, p_publish: true });
    const { error: b } = await empA.client.rpc("admin_set_employer_status", { p_employer_id: pending.employerId!, p_status: "approved" });
    const { error: c } = await empA.client.rpc("admin_dashboard_metrics");
    expect(a?.code).toBe("42501");
    expect(b?.code).toBe("42501");
    expect(c?.code).toBe("42501");
    const { error: d } = await empA.client.rpc("claim_cv_job");
    expect(d).not.toBeNull();
  });

  it("requires review approval before publication", async () => {
    const { error } = await recruiter.client.rpc("set_candidate_publication", { p_candidate_id: draft.id, p_publish: true });
    expect(error?.message).toMatch(/only reviewed and approved/);
    const { error: approveErr } = await recruiter.client.rpc("approve_candidate_review", { p_candidate_id: draft.id });
    expect(approveErr).toBeNull();
    const { error: pubErr } = await recruiter.client.rpc("set_candidate_publication", { p_candidate_id: draft.id, p_publish: true });
    expect(pubErr).toBeNull();
    const { data } = await empA.client.from("candidate_profiles").select("ref").eq("ref", draft.ref);
    expect(data).toHaveLength(1);
    await recruiter.client.rpc("set_candidate_publication", { p_candidate_id: draft.id, p_publish: false });
    const { data: after } = await empA.client.from("candidate_profiles").select("ref").eq("ref", draft.ref);
    expect(after ?? []).toHaveLength(0);
  });

  it("enforces the RBAC matrix between administrator roles", async () => {
    const { error: e1 } = await recruiter.client.rpc("admin_set_user_access", { p_user_id: superAdmin.id, p_role: "recruitment_admin", p_status: "suspended" });
    expect(e1?.code).toBe("42501");
    const { error: e2 } = await recruiter.client.rpc("admin_update_setting", { p_key: "employer_registration_open", p_value: false });
    expect(e2?.code).toBe("42501");
    const { data: priv } = await recruiter.client.from("candidate_private").select("full_name").eq("candidate_id", published.id);
    expect(priv).toHaveLength(1);
    const { error: e3 } = await superAdmin.client.rpc("admin_set_user_access", { p_user_id: superAdmin.id, p_role: "recruitment_admin", p_status: "active" });
    expect(e3?.message).toMatch(/your own role/);
  });

  it("suspended administrators lose access immediately (RLS reads profile status)", async () => {
    await superAdmin.client.rpc("admin_set_user_access", { p_user_id: recruiter.id, p_role: "recruitment_admin", p_status: "suspended" });
    const { data } = await recruiter.client.from("candidate_private").select("full_name").eq("candidate_id", published.id);
    expect(data ?? []).toHaveLength(0);
    await superAdmin.client.rpc("admin_set_user_access", { p_user_id: recruiter.id, p_role: "recruitment_admin", p_status: "active" });
  });

  it("rate limiter blocks after the limit within a window", async () => {
    const db = admin();
    const key = `test:${run}`;
    const results: boolean[] = [];
    for (let i = 0; i < 4; i++) results.push((await db.rpc("check_rate_limit", { p_key: key, p_limit: 3, p_window_seconds: 60 })).data === true);
    expect(results).toEqual([true, true, true, false]);
  });
});
