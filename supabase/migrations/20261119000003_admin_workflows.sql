-- =============================================================================
-- Admin workflow functions: atomic profile editing and consent-gated introductions
-- =============================================================================

-- Save the anonymous profile and its history tables in one transaction.
create or replace function public.admin_save_candidate_profile(p_candidate_id uuid, p jsonb)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_item jsonb;
  v_i integer := 0;
begin
  if not public.has_permission('candidates.manage') then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from public.candidates where id = p_candidate_id) then raise exception 'candidate not found'; end if;

  update public.candidate_profiles set
    headline = nullif(left(p ->> 'headline', 160), ''),
    job_title = nullif(left(p ->> 'job_title', 120), ''),
    seniority = nullif(left(p ->> 'seniority', 60), ''),
    summary = nullif(left(p ->> 'summary', 2000), ''),
    years_experience = nullif(p ->> 'years_experience', '')::integer,
    location_region = nullif(left(p ->> 'location_region', 120), ''),
    work_modes = coalesce((select array_agg(x::public.work_mode) from jsonb_array_elements_text(coalesce(p -> 'work_modes', '[]')) x), '{}'),
    salary_min = nullif(p ->> 'salary_min', '')::integer,
    salary_max = nullif(p ->> 'salary_max', '')::integer,
    availability = nullif(p ->> 'availability', '')::public.availability,
    notice_period = nullif(left(p ->> 'notice_period', 80), ''),
    industries = coalesce((select array_agg(left(x, 60)) from jsonb_array_elements_text(coalesce(p -> 'industries', '[]')) x), '{}'),
    skills = coalesce((select array_agg(left(x, 60)) from jsonb_array_elements_text(coalesce(p -> 'skills', '[]')) x), '{}'),
    highlights = coalesce((select array_agg(left(x, 240)) from jsonb_array_elements_text(coalesce(p -> 'highlights', '[]')) x), '{}')
  where candidate_id = p_candidate_id;

  if p ? 'experience' then
    delete from public.candidate_experience where candidate_id = p_candidate_id;
    for v_item in select * from jsonb_array_elements(p -> 'experience') loop
      continue when coalesce(trim(v_item ->> 'title'), '') = '';
      insert into public.candidate_experience (candidate_id, title, organisation_descriptor, start_date, end_date, is_current, summary, achievements, skills, sort_order)
      values (p_candidate_id, left(v_item ->> 'title', 160), nullif(left(v_item ->> 'organisation_descriptor', 160), ''),
              nullif(left(v_item ->> 'start_date', 40), ''), nullif(left(v_item ->> 'end_date', 40), ''),
              coalesce((v_item ->> 'is_current')::boolean, false), nullif(left(v_item ->> 'summary', 1500), ''),
              coalesce((select array_agg(left(x, 300)) from jsonb_array_elements_text(coalesce(v_item -> 'achievements', '[]')) x where trim(x) <> ''), '{}'),
              coalesce((select array_agg(left(x, 60)) from jsonb_array_elements_text(coalesce(v_item -> 'skills', '[]')) x where trim(x) <> ''), '{}'),
              v_i);
      v_i := v_i + 1;
    end loop;
  end if;

  if p ? 'education' then
    delete from public.candidate_education where candidate_id = p_candidate_id;
    v_i := 0;
    for v_item in select * from jsonb_array_elements(p -> 'education') loop
      continue when coalesce(trim(v_item ->> 'qualification'), '') = '';
      insert into public.candidate_education (candidate_id, qualification, field_of_study, institution_descriptor, year, sort_order)
      values (p_candidate_id, left(v_item ->> 'qualification', 160), nullif(left(v_item ->> 'field_of_study', 160), ''),
              nullif(left(v_item ->> 'institution_descriptor', 160), ''), nullif(left(v_item ->> 'year', 20), ''), v_i);
      v_i := v_i + 1;
    end loop;
  end if;

  if p ? 'certifications' then
    delete from public.candidate_certifications where candidate_id = p_candidate_id;
    v_i := 0;
    for v_item in select * from jsonb_array_elements(p -> 'certifications') loop
      continue when coalesce(trim(v_item ->> 'name'), '') = '';
      insert into public.candidate_certifications (candidate_id, name, issuer, year, sort_order)
      values (p_candidate_id, left(v_item ->> 'name', 200), nullif(left(v_item ->> 'issuer', 160), ''), nullif(left(v_item ->> 'year', 20), ''), v_i);
      v_i := v_i + 1;
    end loop;
  end if;

  perform public.write_audit('candidate.profile_edited', 'candidate', p_candidate_id::text);
end;
$$;

-- Records that the candidate agreed to have their identity shared for a specific enquiry.
create or replace function public.admin_record_identity_consent(p_enquiry_id uuid, p_note text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_e public.enquiries;
begin
  if not public.has_permission('enquiries.manage') then raise exception 'forbidden' using errcode = '42501'; end if;
  if char_length(coalesce(trim(p_note), '')) < 10 then
    raise exception 'describe how and when the candidate gave consent (at least 10 characters)';
  end if;
  select * into v_e from public.enquiries where id = p_enquiry_id for update;
  if v_e.id is null then raise exception 'enquiry not found'; end if;
  if v_e.status not in ('new', 'under_review', 'candidate_contacted') then
    raise exception 'consent can only be recorded for an open enquiry';
  end if;

  insert into public.consent_records (candidate_id, consent_type, granted, consent_text, policy_version, source, recorded_by)
  values (v_e.candidate_id, 'identity_disclosure', true,
          'Candidate agreed to identity disclosure for enquiry ' || v_e.ref || '. Recorded by recruiter: ' || left(p_note, 1000),
          'enquiry:' || v_e.ref, 'recruiter_recorded', auth.uid());

  update public.enquiries set status = 'candidate_consented' where id = p_enquiry_id;
  insert into public.enquiry_events (enquiry_id, type, visibility, from_status, to_status, author_id)
  values (p_enquiry_id, 'status_change', 'employer', v_e.status, 'candidate_consented', auth.uid());
  insert into public.enquiry_events (enquiry_id, type, visibility, body, author_id)
  values (p_enquiry_id, 'internal_note', 'internal', 'Identity-disclosure consent recorded: ' || left(p_note, 1000), auth.uid());
  perform public.write_audit('enquiry.identity_consent_recorded', 'enquiry', p_enquiry_id::text, jsonb_build_object('candidate_id', v_e.candidate_id));
end;
$$;

-- Re-define admin_update_enquiry so "introduced" requires recorded identity consent for THIS enquiry.
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

  if p_status = 'candidate_consented' and v_e.status <> 'candidate_consented' then
    raise exception 'use "Record candidate consent" to move an enquiry to Candidate Consented';
  end if;
  if p_status = 'introduced' and v_e.status <> 'introduced' and not exists (
      select 1 from public.consent_records
       where candidate_id = v_e.candidate_id and consent_type = 'identity_disclosure' and granted
         and policy_version = 'enquiry:' || v_e.ref) then
    raise exception 'an introduction requires recorded candidate consent for this enquiry';
  end if;

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

-- Super-admin role / status management for administrator accounts.
create or replace function public.admin_set_user_access(p_user_id uuid, p_role public.user_role, p_status public.account_status)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_old public.profiles;
begin
  if not public.has_permission('users.manage') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_user_id = auth.uid() then raise exception 'you cannot change your own role or status'; end if;
  select * into v_old from public.profiles where id = p_user_id for update;
  if v_old.id is null then raise exception 'user not found'; end if;
  if v_old.role = 'employer' and p_role <> 'employer' then raise exception 'employer accounts cannot be promoted to administrators'; end if;
  if v_old.role <> 'employer' and p_role = 'employer' then raise exception 'administrators cannot be converted to employer accounts'; end if;
  update public.profiles set role = p_role, status = p_status where id = p_user_id;
  perform public.write_audit('user.access_changed', 'user', p_user_id::text,
    jsonb_build_object('from_role', v_old.role, 'to_role', p_role, 'from_status', v_old.status, 'to_status', p_status));
end;
$$;

-- CMS publishing (draft -> published) in one statement with audit.
create or replace function public.cms_publish_section(p_page text, p_section text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_permission('cms.manage') then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.cms_sections
     set published_content = draft_content, has_unpublished_changes = false, published_by = auth.uid(), published_at = now()
   where page = p_page and section_key = p_section;
  if not found then raise exception 'section has no saved draft'; end if;
  perform public.write_audit('cms.published', 'cms_section', p_page || '/' || p_section);
end;
$$;

create or replace function public.cms_save_draft(p_page text, p_section text, p_content jsonb)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_permission('cms.manage') then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into public.cms_sections (page, section_key, draft_content, has_unpublished_changes, updated_by, updated_at)
  values (p_page, p_section, p_content, true, auth.uid(), now())
  on conflict (page, section_key) do update
    set draft_content = excluded.draft_content, has_unpublished_changes = true, updated_by = auth.uid(), updated_at = now();
  perform public.write_audit('cms.draft_saved', 'cms_section', p_page || '/' || p_section);
end;
$$;

create or replace function public.cms_discard_draft(p_page text, p_section text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_permission('cms.manage') then raise exception 'forbidden' using errcode = '42501'; end if;
  delete from public.cms_sections where page = p_page and section_key = p_section and published_content is null;
  update public.cms_sections set draft_content = published_content, has_unpublished_changes = false
   where page = p_page and section_key = p_section and published_content is not null;
  perform public.write_audit('cms.draft_discarded', 'cms_section', p_page || '/' || p_section);
end;
$$;

create or replace function public.admin_update_setting(p_key text, p_value jsonb)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_permission('settings.manage') then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.site_settings set value = p_value, updated_by = auth.uid(), updated_at = now() where key = p_key;
  if not found then raise exception 'unknown setting'; end if;
  perform public.write_audit('settings.updated', 'site_setting', p_key);
end;
$$;

revoke execute on all functions in schema public from public, anon;
grant execute on function public.get_published_cms() to anon, authenticated;
grant execute on function public.get_public_settings() to anon, authenticated;
grant execute on function public.get_published_testimonials() to anon, authenticated;
grant execute on function public.get_public_stats() to anon, authenticated;
grant execute on all functions in schema public to service_role;
