-- =============================================================================
-- Explicit privileges.
-- Newer Supabase projects no longer grant the API roles (anon / authenticated /
-- service_role) DML or EXECUTE on objects created by migrations, so the access
-- model must not depend on platform defaults. This migration states the
-- intended privileges explicitly. Row Level Security still decides WHICH rows
-- each role can see or change; these grants only decide WHAT operations exist.
-- Idempotent: safe on projects that already had the old defaults.
-- =============================================================================

grant usage on schema public to anon, authenticated, service_role;

-- Service role (server-only key): full access, bypasses RLS by design.
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Anonymous visitors: no table access at all (public pages use narrow functions).
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

-- Signed-in users: read access filtered by RLS on every table except rate limits.
grant select on all tables in schema public to authenticated;
revoke all on public.rate_limits from authenticated;

-- Writes allowed through RLS policies (admin editing of history, shortlists, CMS testimonials).
grant insert, update, delete on public.candidate_experience, public.candidate_education,
  public.candidate_certifications, public.shortlists, public.testimonials to authenticated;

-- Column-scoped updates (other columns can only change through SECURITY DEFINER functions).
grant update (company_name, company_number, vat_number, website, industry, company_size,
              address_line, city, country, description, hiring_needs)
  on public.employers to authenticated;
grant update (full_name, job_title, phone, last_seen_at) on public.profiles to authenticated;
grant update (headline, summary, job_title, seniority, years_experience, location_region,
              work_modes, salary_min, salary_max, salary_currency, availability,
              notice_period, industries, skills, highlights)
  on public.candidate_profiles to authenticated;
grant update (full_name, email, phone, location_full, linkedin_url, right_to_work, internal_notes)
  on public.candidate_private to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant update (status) on public.contact_messages to authenticated;

-- Functions: signed-in users may call the RLS helpers and the workflow functions
-- (each re-checks permissions internally); service-only internals stay revoked.
grant execute on all functions in schema public to authenticated;
revoke execute on function public.check_rate_limit(text, integer, integer) from authenticated;
revoke execute on function public.create_candidate_submission(jsonb) from authenticated;
revoke execute on function public.claim_cv_job() from authenticated;
revoke execute on function public.complete_cv_job(uuid, jsonb) from authenticated;
revoke execute on function public.fail_cv_job(uuid, text, boolean) from authenticated;
revoke execute on function public.write_audit(text, text, text, jsonb) from authenticated;
revoke execute on function public.handle_new_user() from authenticated;
revoke execute on function public.handle_user_email_change() from authenticated;
revoke execute on function public.handle_user_app_metadata_change() from authenticated;

revoke execute on all functions in schema public from anon;
grant execute on function public.get_published_cms() to anon;
grant execute on function public.get_public_settings() to anon;
grant execute on function public.get_published_testimonials() to anon;
grant execute on function public.get_public_stats() to anon;

-- Future objects created by migrations: keep the server role working by default.
alter default privileges for role postgres in schema public grant all on tables to service_role;
alter default privileges for role postgres in schema public grant all on sequences to service_role;
alter default privileges for role postgres in schema public grant execute on functions to service_role;
