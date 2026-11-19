-- =============================================================================
-- Row Level Security, column privileges, transactional RPCs and storage.
-- Principle: deny by default. Every table has RLS enabled; anonymous visitors
-- get no table access at all (public pages read through narrow functions).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
alter table public.employers enable row level security;
alter table public.profiles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.candidates enable row level security;
alter table public.candidate_private enable row level security;
alter table public.candidate_profiles enable row level security;
alter table public.candidate_experience enable row level security;
alter table public.candidate_education enable row level security;
alter table public.candidate_certifications enable row level security;
alter table public.candidate_documents enable row level security;
alter table public.consent_records enable row level security;
alter table public.cv_processing_jobs enable row level security;
alter table public.ai_processing_results enable row level security;
alter table public.enquiries enable row level security;
alter table public.enquiry_events enable row level security;
alter table public.shortlists enable row level security;
alter table public.notifications enable row level security;
alter table public.email_log enable row level security;
alter table public.audit_logs enable row level security;
alter table public.contact_messages enable row level security;
alter table public.rate_limits enable row level security;
alter table public.cms_sections enable row level security;
alter table public.testimonials enable row level security;
alter table public.site_settings enable row level security;

-- Defence in depth: anonymous role has no direct table privileges.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;

-- Writes to these tables only happen through SECURITY DEFINER functions or the
-- service role, so authenticated users get read (RLS-filtered) privileges only.
revoke insert, update, delete on
  public.candidates, public.candidate_documents, public.consent_records,
  public.cv_processing_jobs, public.ai_processing_results, public.enquiries,
  public.enquiry_events, public.email_log, public.audit_logs, public.rate_limits,
  public.role_permissions, public.employers, public.profiles, public.candidate_profiles,
  public.site_settings, public.cms_sections
from authenticated;
revoke all on public.rate_limits from authenticated;

-- Column-scoped update grants
grant update (company_name, company_number, vat_number, website, industry, company_size,
              address_line, city, country, description, hiring_needs)
  on public.employers to authenticated;
grant update (full_name, job_title, phone, last_seen_at) on public.profiles to authenticated;
grant update (headline, summary, job_title, seniority, years_experience, location_region,
              work_modes, salary_min, salary_max, salary_currency, availability,
              notice_period, industries, skills, highlights)
  on public.candidate_profiles to authenticated;
grant update (read_at) on public.notifications to authenticated;

-- ---------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------
-- employers
create policy employers_select on public.employers for select to authenticated
  using (public.is_admin() or id = public.current_employer_id());
create policy employers_update_owner on public.employers for update to authenticated
  using (
    id = public.current_employer_id()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.employer_role = 'owner')
  )
  with check (id = public.current_employer_id());
create policy employers_update_admin on public.employers for update to authenticated
  using (public.has_permission('employers.manage'))
  with check (public.has_permission('employers.manage'));

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or public.is_admin()
    or (employer_id is not null and employer_id = public.current_employer_id())
  );
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- role permissions are readable by signed-in users (used to render menus)
create policy role_permissions_read on public.role_permissions for select to authenticated using (true);

-- candidates (no PII; admin only)
create policy candidates_admin_select on public.candidates for select to authenticated
  using (public.is_admin());

-- candidate_private (PII; admins holding candidates.read_private)
create policy candidate_private_select on public.candidate_private for select to authenticated
  using (public.has_permission('candidates.read_private'));
create policy candidate_private_update on public.candidate_private for update to authenticated
  using (public.has_permission('candidates.manage'))
  with check (public.has_permission('candidates.manage'));
revoke insert, delete on public.candidate_private from authenticated;

-- candidate_profiles (anonymous)
create policy candidate_profiles_employer_select on public.candidate_profiles for select to authenticated
  using (published = true and public.is_approved_employer());
create policy candidate_profiles_admin_select on public.candidate_profiles for select to authenticated
  using (public.is_admin());
create policy candidate_profiles_admin_update on public.candidate_profiles for update to authenticated
  using (public.has_permission('candidates.manage'))
  with check (public.has_permission('candidates.manage'));

-- anonymised history tables
create policy candidate_experience_select on public.candidate_experience for select to authenticated
  using (
    public.is_admin()
    or (public.is_approved_employer() and exists (
      select 1 from public.candidate_profiles cp
      where cp.candidate_id = candidate_experience.candidate_id and cp.published))
  );
create policy candidate_experience_admin_write on public.candidate_experience for all to authenticated
  using (public.has_permission('candidates.manage'))
  with check (public.has_permission('candidates.manage'));

create policy candidate_education_select on public.candidate_education for select to authenticated
  using (
    public.is_admin()
    or (public.is_approved_employer() and exists (
      select 1 from public.candidate_profiles cp
      where cp.candidate_id = candidate_education.candidate_id and cp.published))
  );
create policy candidate_education_admin_write on public.candidate_education for all to authenticated
  using (public.has_permission('candidates.manage'))
  with check (public.has_permission('candidates.manage'));

create policy candidate_certifications_select on public.candidate_certifications for select to authenticated
  using (
    public.is_admin()
    or (public.is_approved_employer() and exists (
      select 1 from public.candidate_profiles cp
      where cp.candidate_id = candidate_certifications.candidate_id and cp.published))
  );
create policy candidate_certifications_admin_write on public.candidate_certifications for all to authenticated
  using (public.has_permission('candidates.manage'))
  with check (public.has_permission('candidates.manage'));

-- admin-only operational tables
create policy candidate_documents_admin on public.candidate_documents for select to authenticated
  using (public.has_permission('candidates.read_private'));
create policy consent_records_admin on public.consent_records for select to authenticated
  using (public.has_permission('candidates.read_private'));
create policy cv_jobs_admin on public.cv_processing_jobs for select to authenticated
  using (public.is_admin());
create policy ai_results_admin on public.ai_processing_results for select to authenticated
  using (public.has_permission('candidates.read_private'));

-- enquiries
create policy enquiries_select on public.enquiries for select to authenticated
  using (
    public.has_permission('enquiries.manage')
    or (employer_id = public.current_employer_id() and public.is_approved_employer())
  );

create policy enquiry_events_select on public.enquiry_events for select to authenticated
  using (
    public.has_permission('enquiries.manage')
    or (
      visibility = 'employer'
      and public.is_approved_employer()
      and exists (
        select 1 from public.enquiries e
        where e.id = enquiry_events.enquiry_id and e.employer_id = public.current_employer_id())
    )
  );

-- shortlists
create policy shortlists_employer on public.shortlists for all to authenticated
  using (employer_id = public.current_employer_id() and public.is_approved_employer())
  with check (
    employer_id = public.current_employer_id()
    and public.is_approved_employer()
    and exists (select 1 from public.candidate_profiles cp where cp.candidate_id = shortlists.candidate_id and cp.published)
  );

-- notifications
create policy notifications_own_select on public.notifications for select to authenticated
  using (recipient_id = auth.uid());
create policy notifications_own_update on public.notifications for update to authenticated
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

-- logs
create policy audit_logs_admin on public.audit_logs for select to authenticated
  using (public.has_permission('audit.read'));
create policy email_log_admin on public.email_log for select to authenticated
  using (public.is_admin());
create policy contact_messages_admin_select on public.contact_messages for select to authenticated
  using (public.is_admin());
create policy contact_messages_admin_update on public.contact_messages for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke insert, delete on public.contact_messages from authenticated;

-- CMS
create policy cms_admin_select on public.cms_sections for select to authenticated
  using (public.has_permission('cms.manage'));
create policy testimonials_public on public.testimonials for select to authenticated
  using (is_published or public.has_permission('cms.manage'));
create policy testimonials_admin_write on public.testimonials for all to authenticated
  using (public.has_permission('cms.manage')) with check (public.has_permission('cms.manage'));
create policy site_settings_select on public.site_settings for select to authenticated
  using (is_public or public.is_admin());

-- ---------------------------------------------------------------------------
-- Internal: audit helper (callable only from definer functions / service role)
-- ---------------------------------------------------------------------------
create or replace function public.write_audit(p_action text, p_entity_type text, p_entity_id text, p_metadata jsonb default '{}')
returns void
language sql security definer set search_path = '' as $$
  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, metadata)
  values (auth.uid(), (select role::text from public.profiles where id = auth.uid()), p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'));
$$;

-- ---------------------------------------------------------------------------
-- Public read functions
-- ---------------------------------------------------------------------------
create or replace function public.get_published_cms()
returns table (page text, section_key text, content jsonb)
language sql stable security definer set search_path = '' as $$
  select s.page, s.section_key, s.published_content
  from public.cms_sections s where s.published_content is not null;
$$;

create or replace function public.get_public_settings()
returns table (key text, value jsonb)
language sql stable security definer set search_path = '' as $$
  select s.key, s.value from public.site_settings s where s.is_public;
$$;

create or replace function public.get_published_testimonials()
returns table (id uuid, quote text, author_role text, organisation_descriptor text, is_sample boolean)
language sql stable security definer set search_path = '' as $$
  select t.id, t.quote, t.author_role, t.organisation_descriptor, t.is_sample
  from public.testimonials t where t.is_published order by t.sort_order, t.created_at;
$$;

-- Aggregate marketplace numbers for the public site (real counts only).
create or replace function public.get_public_stats()
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'published_profiles', (select count(*) from public.candidate_profiles where published),
    'approved_employers', (select count(*) from public.employers where status = 'approved')
  );
$$;

-- ---------------------------------------------------------------------------
-- Employer-facing candidate search (SECURITY INVOKER => RLS applies).
-- Returns ONLY anonymous columns.
-- ---------------------------------------------------------------------------
create or replace function public.search_candidate_profiles(
  p_query text default null,
  p_title text default null,
  p_location text default null,
  p_salary_min integer default null,
  p_salary_max integer default null,
  p_exp_min integer default null,
  p_exp_max integer default null,
  p_availability public.availability[] default null,
  p_work_modes public.work_mode[] default null,
  p_skills text[] default null,
  p_industries text[] default null,
  p_sort text default 'relevance',
  p_limit integer default 10,
  p_offset integer default 0
)
returns table (
  candidate_id uuid, ref text, headline text, summary text, job_title text, seniority text,
  years_experience integer, location_region text, work_modes public.work_mode[],
  salary_min integer, salary_max integer, salary_currency text, availability public.availability,
  notice_period text, industries text[], skills text[], highlights text[],
  published_at timestamptz, is_sample boolean, total_count bigint
)
language sql stable security invoker set search_path = public, extensions as $$
  with q as (
    select case when coalesce(trim(p_query), '') = '' then null
                else websearch_to_tsquery('english', p_query) end as tsq
  ),
  filtered as (
    select cp.*, case when q.tsq is null then 0 else ts_rank(cp.search_vector, q.tsq) end as rank
    from public.candidate_profiles cp, q
    where cp.published = true
      and (q.tsq is null or cp.search_vector @@ q.tsq
           or cp.job_title ilike '%' || p_query || '%'
           or exists (select 1 from unnest(cp.skills) s where s ilike '%' || p_query || '%'))
      and (coalesce(p_title, '') = '' or cp.job_title ilike '%' || p_title || '%' or cp.headline ilike '%' || p_title || '%')
      and (coalesce(p_location, '') = '' or cp.location_region ilike '%' || p_location || '%')
      and (p_salary_min is null or cp.salary_max is null or cp.salary_max >= p_salary_min)
      and (p_salary_max is null or cp.salary_min is null or cp.salary_min <= p_salary_max)
      and (p_exp_min is null or cp.years_experience >= p_exp_min)
      and (p_exp_max is null or cp.years_experience <= p_exp_max)
      and (p_availability is null or cardinality(p_availability) = 0 or cp.availability = any (p_availability))
      and (p_work_modes is null or cardinality(p_work_modes) = 0 or cp.work_modes && p_work_modes)
      and (p_skills is null or cardinality(p_skills) = 0 or (
            select bool_and(exists (select 1 from unnest(cp.skills) s where lower(s) = lower(req)))
            from unnest(p_skills) req))
      and (p_industries is null or cardinality(p_industries) = 0 or exists (
            select 1 from unnest(cp.industries) i, unnest(p_industries) r where lower(i) = lower(r)))
  )
  select f.candidate_id, f.ref, f.headline, f.summary, f.job_title, f.seniority, f.years_experience,
         f.location_region, f.work_modes, f.salary_min, f.salary_max, f.salary_currency, f.availability,
         f.notice_period, f.industries, f.skills, f.highlights, f.published_at, f.is_sample,
         count(*) over () as total_count
  from filtered f
  order by
    case when p_sort = 'relevance' then f.rank end desc nulls last,
    case when p_sort = 'experience_desc' then f.years_experience end desc nulls last,
    case when p_sort = 'experience_asc' then f.years_experience end asc nulls last,
    case when p_sort = 'salary_asc' then f.salary_min end asc nulls last,
    case when p_sort = 'salary_desc' then f.salary_max end desc nulls last,
    f.published_at desc nulls last,
    f.ref
  limit least(greatest(p_limit, 1), 50)
  offset greatest(p_offset, 0);
$$;

-- Distinct facet values for the filter sidebar (published profiles only, RLS applies).
create or replace function public.candidate_facets()
returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'skills', coalesce((select jsonb_agg(x.s order by x.n desc, x.s) from (
        select s, count(*) n from public.candidate_profiles cp, unnest(cp.skills) s
        where cp.published group by s order by count(*) desc, s limit 40) x), '[]'),
    'industries', coalesce((select jsonb_agg(x.i order by x.i) from (
        select distinct i from public.candidate_profiles cp, unnest(cp.industries) i where cp.published) x), '[]')
  );
$$;

-- ---------------------------------------------------------------------------
-- Rate limiting (service role only)
-- ---------------------------------------------------------------------------
create or replace function public.check_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count integer;
begin
  insert into public.rate_limits as rl (key, window_start, count)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set count = rl.count + 1
  returning count into v_count;
  -- opportunistic cleanup
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;
  return v_count <= p_limit;
end;
$$;

-- ---------------------------------------------------------------------------
-- Candidate submission (service role only; one transaction)
-- ---------------------------------------------------------------------------
create or replace function public.create_candidate_submission(p jsonb)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_candidate_id uuid;
  v_ref text;
  v_sub_ref text;
  v_doc_id uuid;
  v_job_id uuid;
  v_auto boolean := coalesce((p ->> 'auto_process')::boolean, true);
  v_consent jsonb;
begin
  insert into public.candidates (source, pipeline_status, assigned_admin_id)
  values (coalesce(p ->> 'source', 'portal'), case when v_auto then 'queued' else 'uploaded' end::public.processing_status,
          nullif(p ->> 'uploaded_by', '')::uuid)
  returning id, ref into v_candidate_id, v_ref;

  v_sub_ref := 'SUB-' || to_char(now(), 'YYYY') || '-' || split_part(v_ref, '-', 2);
  update public.candidates set submission_ref = v_sub_ref where id = v_candidate_id;

  insert into public.candidate_private (candidate_id, full_name, email, phone, location_full, linkedin_url, right_to_work)
  values (v_candidate_id,
          coalesce(nullif(p ->> 'full_name', ''), '(pending extraction)'),
          coalesce(nullif(lower(p ->> 'email'), ''), '(pending extraction)'),
          nullif(p ->> 'phone', ''), nullif(p ->> 'location', ''),
          nullif(p ->> 'linkedin_url', ''), nullif(p ->> 'right_to_work', ''));

  insert into public.candidate_profiles (candidate_id, ref, job_title, headline, years_experience, location_region,
     work_modes, salary_min, salary_max, availability, skills)
  values (v_candidate_id, v_ref,
          nullif(p ->> 'job_title', ''), nullif(p ->> 'job_title', ''),
          nullif(p ->> 'years_experience', '')::integer,
          nullif(p ->> 'location_region', ''),
          coalesce((select array_agg(x::public.work_mode) from jsonb_array_elements_text(coalesce(p -> 'work_modes', '[]')) x), '{}'),
          nullif(p ->> 'salary_min', '')::integer, nullif(p ->> 'salary_max', '')::integer,
          nullif(p ->> 'availability', '')::public.availability,
          coalesce((select array_agg(left(x, 60)) from jsonb_array_elements_text(coalesce(p -> 'skills', '[]')) x), '{}'));

  insert into public.candidate_documents (candidate_id, storage_path, original_filename, mime_type, size_bytes, sha256, uploaded_by)
  values (v_candidate_id, p ->> 'storage_path', p ->> 'original_filename', p ->> 'mime_type',
          (p ->> 'size_bytes')::integer, p ->> 'sha256', nullif(p ->> 'uploaded_by', '')::uuid)
  returning id into v_doc_id;

  for v_consent in select * from jsonb_array_elements(coalesce(p -> 'consents', '[]')) loop
    insert into public.consent_records (candidate_id, consent_type, granted, consent_text, policy_version, source, ip_hash, user_agent, recorded_by)
    values (v_candidate_id, v_consent ->> 'type', (v_consent ->> 'granted')::boolean, v_consent ->> 'text',
            coalesce(p ->> 'policy_version', 'v1'), coalesce(p ->> 'source', 'portal'),
            p ->> 'ip_hash', left(p ->> 'user_agent', 300), nullif(p ->> 'uploaded_by', '')::uuid);
  end loop;

  insert into public.cv_processing_jobs (candidate_id, document_id, status, created_by)
  values (v_candidate_id, v_doc_id, case when v_auto then 'queued' else 'uploaded' end::public.processing_status,
          nullif(p ->> 'uploaded_by', '')::uuid)
  returning id into v_job_id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (nullif(p ->> 'uploaded_by', '')::uuid, 'candidate.submitted', 'candidate', v_candidate_id::text,
          jsonb_build_object('source', coalesce(p ->> 'source', 'portal'), 'ref', v_ref));

  return jsonb_build_object('candidate_id', v_candidate_id, 'ref', v_ref, 'submission_ref', v_sub_ref,
                            'document_id', v_doc_id, 'job_id', v_job_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- CV job queue (service role only)
-- ---------------------------------------------------------------------------
create or replace function public.claim_cv_job()
returns setof public.cv_processing_jobs
language plpgsql security definer set search_path = '' as $$
declare
  v_job public.cv_processing_jobs;
begin
  -- recover jobs whose worker died mid-run
  update public.cv_processing_jobs
     set status = 'queued', locked_at = null,
         last_error = coalesce(last_error || ' ', '') || '[recovered stale lock]'
   where status = 'processing' and locked_at < now() - interval '15 minutes';

  update public.cv_processing_jobs j
     set status = 'processing', locked_at = now(), started_at = now(), attempts = j.attempts + 1
   where j.id = (
     select id from public.cv_processing_jobs
      where status = 'queued' and run_after <= now()
      order by created_at
      for update skip locked
      limit 1)
  returning j.* into v_job;

  if v_job.id is not null then
    update public.candidates set pipeline_status = 'processing' where id = v_job.candidate_id;
    return next v_job;
  end if;
  return;
end;
$$;

create or replace function public.complete_cv_job(p_job_id uuid, p_result jsonb)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_job public.cv_processing_jobs;
  v_anon jsonb := p_result -> 'anonymised';
  v_ext jsonb := p_result -> 'extracted';
  v_item jsonb;
  v_i integer := 0;
  v_was_published boolean;
begin
  select * into v_job from public.cv_processing_jobs where id = p_job_id for update;
  if v_job.id is null then raise exception 'job not found'; end if;

  insert into public.ai_processing_results (job_id, candidate_id, provider, model, is_ai, extraction_method,
     extracted, anonymised, pii_findings, warnings, input_tokens, output_tokens, duration_ms)
  values (v_job.id, v_job.candidate_id, p_result ->> 'provider', p_result ->> 'model',
          (p_result ->> 'is_ai')::boolean, p_result ->> 'extraction_method', v_ext, v_anon,
          coalesce(p_result -> 'pii_findings', '[]'), coalesce(p_result -> 'warnings', '[]'),
          nullif(p_result ->> 'input_tokens', '')::integer, nullif(p_result ->> 'output_tokens', '')::integer,
          nullif(p_result ->> 'duration_ms', '')::integer);

  update public.candidate_documents
     set extracted_text = p_result ->> 'extracted_text', extraction_method = p_result ->> 'extraction_method'
   where id = v_job.document_id;

  select published into v_was_published from public.candidate_profiles where candidate_id = v_job.candidate_id;

  -- Apply proposed anonymous profile as a DRAFT; never auto-publish.
  update public.candidate_profiles cp set
    headline = coalesce(nullif(v_anon ->> 'headline', ''), cp.headline),
    summary = coalesce(nullif(v_anon ->> 'summary', ''), cp.summary),
    job_title = coalesce(cp.job_title, nullif(v_anon ->> 'job_title', '')),
    seniority = coalesce(nullif(v_anon ->> 'seniority', ''), cp.seniority),
    years_experience = coalesce(cp.years_experience, nullif(v_anon ->> 'years_experience', '')::integer),
    location_region = coalesce(cp.location_region, nullif(v_anon ->> 'location_region', '')),
    salary_min = coalesce(cp.salary_min, nullif(v_anon ->> 'salary_min', '')::integer),
    salary_max = coalesce(cp.salary_max, nullif(v_anon ->> 'salary_max', '')::integer),
    availability = coalesce(cp.availability, nullif(v_anon ->> 'availability', '')::public.availability),
    notice_period = coalesce(nullif(v_anon ->> 'notice_period', ''), cp.notice_period),
    industries = coalesce((select array_agg(x) from jsonb_array_elements_text(v_anon -> 'industries') x), cp.industries),
    skills = coalesce((select array_agg(distinct x) from (
                select jsonb_array_elements_text(v_anon -> 'skills') x
                union select unnest(cp.skills)) s), cp.skills),
    highlights = coalesce((select array_agg(x) from jsonb_array_elements_text(v_anon -> 'highlights') x), cp.highlights),
    published = false,
    published_at = case when v_was_published then null else cp.published_at end
  where cp.candidate_id = v_job.candidate_id;

  delete from public.candidate_experience where candidate_id = v_job.candidate_id;
  for v_item in select * from jsonb_array_elements(coalesce(v_anon -> 'experience', '[]')) loop
    insert into public.candidate_experience (candidate_id, title, organisation_descriptor, start_date, end_date, is_current, summary, achievements, skills, sort_order)
    values (v_job.candidate_id, coalesce(v_item ->> 'title', 'Role'), v_item ->> 'organisation_descriptor',
            v_item ->> 'start_date', v_item ->> 'end_date', coalesce((v_item ->> 'is_current')::boolean, false),
            v_item ->> 'summary',
            coalesce((select array_agg(x) from jsonb_array_elements_text(v_item -> 'achievements') x), '{}'),
            coalesce((select array_agg(x) from jsonb_array_elements_text(v_item -> 'skills') x), '{}'),
            v_i);
    v_i := v_i + 1;
  end loop;

  delete from public.candidate_education where candidate_id = v_job.candidate_id;
  v_i := 0;
  for v_item in select * from jsonb_array_elements(coalesce(v_anon -> 'education', '[]')) loop
    insert into public.candidate_education (candidate_id, qualification, field_of_study, institution_descriptor, year, sort_order)
    values (v_job.candidate_id, coalesce(v_item ->> 'qualification', 'Qualification'), v_item ->> 'field_of_study',
            v_item ->> 'institution_descriptor', v_item ->> 'year', v_i);
    v_i := v_i + 1;
  end loop;

  delete from public.candidate_certifications where candidate_id = v_job.candidate_id;
  v_i := 0;
  for v_item in select * from jsonb_array_elements(coalesce(v_anon -> 'certifications', '[]')) loop
    insert into public.candidate_certifications (candidate_id, name, issuer, year, sort_order)
    values (v_job.candidate_id, coalesce(v_item ->> 'name', 'Certification'), v_item ->> 'issuer', v_item ->> 'year', v_i);
    v_i := v_i + 1;
  end loop;

  -- Fill identifying placeholders (admin uploads without details) from extraction.
  update public.candidate_private cpv set
    full_name = case when cpv.full_name = '(pending extraction)' then coalesce(nullif(v_ext #>> '{personal,full_name}', ''), cpv.full_name) else cpv.full_name end,
    email = case when cpv.email = '(pending extraction)' then coalesce(nullif(lower(v_ext #>> '{personal,email}'), ''), cpv.email) else cpv.email end,
    phone = coalesce(cpv.phone, nullif(v_ext #>> '{personal,phone}', '')),
    location_full = coalesce(cpv.location_full, nullif(v_ext #>> '{personal,location}', '')),
    linkedin_url = coalesce(cpv.linkedin_url, nullif(v_ext #>> '{personal,linkedin_url}', ''))
  where cpv.candidate_id = v_job.candidate_id;

  update public.cv_processing_jobs set status = 'awaiting_review', completed_at = now(), locked_at = null, last_error = null
   where id = v_job.id;
  update public.candidates set pipeline_status = 'awaiting_review',
         profile_status = case when v_was_published then 'unpublished' else profile_status end,
         published_at = case when v_was_published then null else published_at end
   where id = v_job.candidate_id;

  insert into public.audit_logs (action, entity_type, entity_id, metadata)
  values ('cv.processed', 'candidate', v_job.candidate_id::text,
          jsonb_build_object('job_id', v_job.id, 'provider', p_result ->> 'provider', 'is_ai', p_result ->> 'is_ai',
                             'unpublished_for_review', coalesce(v_was_published, false)));
end;
$$;

create or replace function public.fail_cv_job(p_job_id uuid, p_error text, p_retryable boolean default true)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_job public.cv_processing_jobs;
  v_status public.processing_status;
begin
  select * into v_job from public.cv_processing_jobs where id = p_job_id for update;
  if v_job.id is null then raise exception 'job not found'; end if;
  if p_retryable and v_job.attempts < v_job.max_attempts then
    v_status := 'queued';
  else
    v_status := 'failed';
  end if;
  update public.cv_processing_jobs
     set status = v_status, locked_at = null, last_error = left(p_error, 2000),
         run_after = now() + make_interval(secs => 30 * power(2, v_job.attempts)),
         completed_at = case when v_status = 'failed' then now() else null end
   where id = v_job.id;
  update public.candidates set pipeline_status = v_status where id = v_job.candidate_id;
  if v_status = 'failed' then
    insert into public.audit_logs (action, entity_type, entity_id, metadata)
    values ('cv.failed', 'candidate', v_job.candidate_id::text, jsonb_build_object('job_id', v_job.id, 'error', left(p_error, 500)));
  end if;
  return v_status::text;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin candidate workflow (permission checked inside)
-- ---------------------------------------------------------------------------
create or replace function public.request_cv_reprocess(p_candidate_id uuid, p_instructions text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_doc uuid;
  v_job uuid;
begin
  if not public.has_permission('candidates.manage') then raise exception 'forbidden' using errcode = '42501'; end if;
  select id into v_doc from public.candidate_documents where candidate_id = p_candidate_id order by created_at desc limit 1;
  if v_doc is null then raise exception 'candidate has no document'; end if;
  if exists (select 1 from public.cv_processing_jobs where candidate_id = p_candidate_id and status in ('queued', 'processing')) then
    raise exception 'a processing job is already pending for this candidate';
  end if;
  insert into public.cv_processing_jobs (candidate_id, document_id, status, custom_instructions, created_by)
  values (p_candidate_id, v_doc, 'queued', nullif(left(p_instructions, 2000), ''), auth.uid())
  returning id into v_job;
  update public.candidates set pipeline_status = 'queued' where id = p_candidate_id;
  perform public.write_audit('cv.reprocess_requested', 'candidate', p_candidate_id::text, jsonb_build_object('job_id', v_job));
  return v_job;
end;
$$;

create or replace function public.approve_candidate_review(p_candidate_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_status public.processing_status;
  v_profile public.candidate_profiles;
begin
  if not public.has_permission('candidates.manage') then raise exception 'forbidden' using errcode = '42501'; end if;
  select pipeline_status into v_status from public.candidates where id = p_candidate_id for update;
  if v_status is null then raise exception 'candidate not found'; end if;
  if v_status not in ('awaiting_review', 'approved') then
    raise exception 'candidate must be awaiting review (current: %)', v_status;
  end if;
  select * into v_profile from public.candidate_profiles where candidate_id = p_candidate_id;
  if coalesce(v_profile.headline, '') = '' or coalesce(v_profile.summary, '') = '' then
    raise exception 'profile needs a headline and summary before approval';
  end if;
  update public.candidates set pipeline_status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_candidate_id;
  update public.cv_processing_jobs set status = 'approved'
   where id = (select id from public.cv_processing_jobs where candidate_id = p_candidate_id and status = 'awaiting_review'
               order by created_at desc limit 1);
  perform public.write_audit('candidate.review_approved', 'candidate', p_candidate_id::text);
end;
$$;

create or replace function public.set_candidate_publication(p_candidate_id uuid, p_publish boolean)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_c public.candidates;
begin
  if not public.has_permission('candidates.publish') then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into v_c from public.candidates where id = p_candidate_id for update;
  if v_c.id is null then raise exception 'candidate not found'; end if;
  if p_publish then
    if v_c.pipeline_status <> 'approved' then
      raise exception 'only reviewed and approved profiles can be published';
    end if;
    if v_c.profile_status = 'archived' then raise exception 'archived candidates cannot be published'; end if;
    if not exists (select 1 from public.consent_records cr where cr.candidate_id = p_candidate_id
                   and cr.consent_type = 'anonymised_marketplace' and cr.granted) then
      raise exception 'no marketplace consent on record for this candidate';
    end if;
    update public.candidate_profiles set published = true, published_at = now() where candidate_id = p_candidate_id;
    update public.candidates set profile_status = 'published', published_at = now() where id = p_candidate_id;
  else
    update public.candidate_profiles set published = false where candidate_id = p_candidate_id;
    update public.candidates set profile_status = 'unpublished' where id = p_candidate_id;
  end if;
  perform public.write_audit(case when p_publish then 'candidate.published' else 'candidate.unpublished' end,
                             'candidate', p_candidate_id::text);
end;
$$;

create or replace function public.set_candidate_archived(p_candidate_id uuid, p_archived boolean)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_permission('candidates.manage') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_archived then
    update public.candidate_profiles set published = false where candidate_id = p_candidate_id;
    update public.candidates set profile_status = 'archived', archived_at = now() where id = p_candidate_id;
  else
    update public.candidates set profile_status = 'draft', archived_at = null where id = p_candidate_id and profile_status = 'archived';
  end if;
  perform public.write_audit(case when p_archived then 'candidate.archived' else 'candidate.restored' end,
                             'candidate', p_candidate_id::text);
end;
$$;

create or replace function public.assign_candidate(p_candidate_id uuid, p_admin_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_permission('candidates.manage') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_admin_id is not null and not exists (select 1 from public.profiles where id = p_admin_id and role in ('super_admin', 'recruitment_admin')) then
    raise exception 'assignee must be an administrator';
  end if;
  update public.candidates set assigned_admin_id = p_admin_id where id = p_candidate_id;
  perform public.write_audit('candidate.assigned', 'candidate', p_candidate_id::text, jsonb_build_object('admin_id', p_admin_id));
end;
$$;

-- ---------------------------------------------------------------------------
-- Employer governance
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_employer_status(p_employer_id uuid, p_status public.employer_status, p_reason text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_old public.employer_status;
begin
  if not public.has_permission('employers.manage') then raise exception 'forbidden' using errcode = '42501'; end if;
  select status into v_old from public.employers where id = p_employer_id for update;
  if v_old is null then raise exception 'employer not found'; end if;
  update public.employers set
    status = p_status,
    status_reason = nullif(left(p_reason, 1000), ''),
    approved_at = case when p_status = 'approved' then coalesce(approved_at, now()) else approved_at end,
    approved_by = case when p_status = 'approved' then auth.uid() else approved_by end
  where id = p_employer_id;
  perform public.write_audit('employer.status_changed', 'employer', p_employer_id::text,
                             jsonb_build_object('from', v_old, 'to', p_status, 'reason', p_reason));
end;
$$;

-- ---------------------------------------------------------------------------
-- Enquiries
-- ---------------------------------------------------------------------------
create or replace function public.create_enquiry(p_candidate_ref text, p_role_title text, p_requirement text,
                                                 p_salary_offer text default null, p_contact_phone text default null)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_employer uuid := public.current_employer_id();
  v_candidate uuid;
  v_id uuid;
  v_ref text;
begin
  if not public.is_approved_employer() then raise exception 'employer account is not approved' using errcode = '42501'; end if;
  select candidate_id into v_candidate from public.candidate_profiles where ref = p_candidate_ref and published;
  if v_candidate is null then raise exception 'candidate not available'; end if;
  if char_length(coalesce(p_role_title, '')) < 3 or char_length(coalesce(p_requirement, '')) < 30 then
    raise exception 'role title and requirement are required';
  end if;
  if exists (select 1 from public.enquiries where employer_id = v_employer and candidate_id = v_candidate
             and status in ('new', 'under_review', 'candidate_contacted', 'candidate_consented')) then
    raise exception 'you already have an open enquiry for this candidate';
  end if;

  insert into public.enquiries (employer_id, created_by, candidate_id, role_title, requirement, salary_offer, contact_phone)
  values (v_employer, auth.uid(), v_candidate, left(p_role_title, 200), left(p_requirement, 1000),
          nullif(left(p_salary_offer, 120), ''), nullif(left(p_contact_phone, 40), ''))
  returning id, ref into v_id, v_ref;

  insert into public.enquiry_events (enquiry_id, type, visibility, to_status, body, author_id)
  values (v_id, 'created', 'employer', 'new', 'Enquiry submitted via the Employer Portal.', auth.uid());

  perform public.write_audit('enquiry.created', 'enquiry', v_id::text, jsonb_build_object('ref', v_ref, 'candidate_ref', p_candidate_ref));
  return jsonb_build_object('id', v_id, 'ref', v_ref);
end;
$$;

create or replace function public.employer_post_enquiry_message(p_enquiry_id uuid, p_body text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_approved_employer() then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from public.enquiries where id = p_enquiry_id and employer_id = public.current_employer_id()) then
    raise exception 'enquiry not found';
  end if;
  if char_length(coalesce(trim(p_body), '')) < 2 then raise exception 'message is empty'; end if;
  insert into public.enquiry_events (enquiry_id, type, visibility, body, author_id)
  values (p_enquiry_id, 'message', 'employer', left(p_body, 4000), auth.uid());
  update public.enquiries set updated_at = now() where id = p_enquiry_id;
end;
$$;

create or replace function public.employer_withdraw_enquiry(p_enquiry_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_status public.enquiry_status;
begin
  if not public.is_approved_employer() then raise exception 'forbidden' using errcode = '42501'; end if;
  select status into v_status from public.enquiries
   where id = p_enquiry_id and employer_id = public.current_employer_id() for update;
  if v_status is null then raise exception 'enquiry not found'; end if;
  if v_status in ('introduced', 'closed_placed', 'closed_declined', 'withdrawn') then
    raise exception 'enquiry is already closed';
  end if;
  update public.enquiries set status = 'withdrawn', closed_at = now() where id = p_enquiry_id;
  insert into public.enquiry_events (enquiry_id, type, visibility, from_status, to_status, body, author_id)
  values (p_enquiry_id, 'status_change', 'employer', v_status, 'withdrawn', 'Withdrawn by employer.', auth.uid());
end;
$$;

create or replace function public.admin_update_enquiry(
  p_enquiry_id uuid,
  p_status public.enquiry_status default null,
  p_assigned_admin_id uuid default null,
  p_unassign boolean default false,
  p_message text default null,
  p_visibility public.event_visibility default 'internal'
)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_e public.enquiries;
begin
  if not public.has_permission('enquiries.manage') then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into v_e from public.enquiries where id = p_enquiry_id for update;
  if v_e.id is null then raise exception 'enquiry not found'; end if;

  if p_status is not null and p_status <> v_e.status then
    update public.enquiries set status = p_status,
      closed_at = case when p_status in ('closed_placed', 'closed_declined', 'withdrawn') then now() else null end
    where id = p_enquiry_id;
    insert into public.enquiry_events (enquiry_id, type, visibility, from_status, to_status, author_id)
    values (p_enquiry_id, case when p_status = 'introduced' then 'introduction' else 'status_change' end::public.enquiry_event_type,
            'employer', v_e.status, p_status, auth.uid());
  end if;

  if p_unassign or (p_assigned_admin_id is not null and p_assigned_admin_id is distinct from v_e.assigned_admin_id) then
    if p_assigned_admin_id is not null and not exists (
        select 1 from public.profiles where id = p_assigned_admin_id and role in ('super_admin', 'recruitment_admin')) then
      raise exception 'assignee must be an administrator';
    end if;
    update public.enquiries set assigned_admin_id = case when p_unassign then null else p_assigned_admin_id end where id = p_enquiry_id;
    insert into public.enquiry_events (enquiry_id, type, visibility, body, author_id)
    values (p_enquiry_id, 'assignment', 'internal',
            case when p_unassign then 'Unassigned' else
              'Assigned to ' || coalesce((select full_name from public.profiles where id = p_assigned_admin_id), 'administrator') end,
            auth.uid());
  end if;

  if coalesce(trim(p_message), '') <> '' then
    insert into public.enquiry_events (enquiry_id, type, visibility, body, author_id)
    values (p_enquiry_id, case when p_visibility = 'internal' then 'internal_note' else 'message' end::public.enquiry_event_type,
            p_visibility, left(p_message, 4000), auth.uid());
  end if;

  update public.enquiries set updated_at = now() where id = p_enquiry_id;
  perform public.write_audit('enquiry.updated', 'enquiry', p_enquiry_id::text,
    jsonb_build_object('status', p_status, 'assigned', p_assigned_admin_id, 'message_visibility',
                       case when coalesce(trim(p_message), '') <> '' then p_visibility else null end));
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin dashboard metrics (real counts)
-- ---------------------------------------------------------------------------
create or replace function public.admin_dashboard_metrics()
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'candidates_total', (select count(*) from public.candidates where profile_status <> 'archived'),
    'candidates_published', (select count(*) from public.candidates where profile_status = 'published'),
    'candidates_awaiting_review', (select count(*) from public.candidates where pipeline_status = 'awaiting_review'),
    'candidates_processing', (select count(*) from public.candidates where pipeline_status in ('uploaded', 'queued', 'processing')),
    'candidates_failed', (select count(*) from public.candidates where pipeline_status = 'failed'),
    'candidates_new_7d', (select count(*) from public.candidates where created_at > now() - interval '7 days'),
    'employers_total', (select count(*) from public.employers),
    'employers_pending', (select count(*) from public.employers where status = 'pending'),
    'employers_approved', (select count(*) from public.employers where status = 'approved'),
    'employers_suspended', (select count(*) from public.employers where status = 'suspended'),
    'enquiries_total', (select count(*) from public.enquiries),
    'enquiries_new', (select count(*) from public.enquiries where status = 'new'),
    'enquiries_open', (select count(*) from public.enquiries where status in ('new', 'under_review', 'candidate_contacted', 'candidate_consented')),
    'enquiries_introduced', (select count(*) from public.enquiries where status in ('introduced', 'closed_placed')),
    'enquiries_30d', (select count(*) from public.enquiries where created_at > now() - interval '30 days'),
    'contact_messages_new', (select count(*) from public.contact_messages where status = 'new')
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon;
-- service-role-only internals
revoke execute on function public.check_rate_limit(text, integer, integer) from authenticated;
revoke execute on function public.create_candidate_submission(jsonb) from authenticated;
revoke execute on function public.claim_cv_job() from authenticated;
revoke execute on function public.complete_cv_job(uuid, jsonb) from authenticated;
revoke execute on function public.fail_cv_job(uuid, text, boolean) from authenticated;
revoke execute on function public.write_audit(text, text, text, jsonb) from authenticated;
revoke execute on function public.handle_new_user() from authenticated;
revoke execute on function public.handle_user_email_change() from authenticated;
grant execute on all functions in schema public to service_role;

-- functions visitors may call (public website)
grant execute on function public.get_published_cms() to anon, authenticated;
grant execute on function public.get_public_settings() to anon, authenticated;
grant execute on function public.get_published_testimonials() to anon, authenticated;
grant execute on function public.get_public_stats() to anon, authenticated;

alter default privileges in schema public revoke execute on functions from public, anon;

-- ---------------------------------------------------------------------------
-- Storage: private CV bucket. No public access; only the service role writes
-- (via short-lived signed upload URLs) and permitted admins read.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cvs', 'cvs', false, 10485760, array[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword'
])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "cvs: admins can read" on storage.objects for select to authenticated
  using (bucket_id = 'cvs' and public.has_permission('candidates.read_private'));
