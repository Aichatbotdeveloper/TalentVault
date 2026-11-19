-- =============================================================================
-- TalentVault core schema
-- Separation of concerns:
--   * candidate_private  -> identifying data, ADMIN ONLY (RLS)
--   * candidate_profiles -> anonymous marketplace data (no PII columns at all)
--   * candidate_documents / ai_processing_results -> ADMIN ONLY
-- =============================================================================

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('super_admin', 'recruitment_admin', 'employer');
create type public.account_status as enum ('active', 'suspended');
create type public.employer_status as enum ('pending', 'approved', 'suspended', 'rejected');
create type public.processing_status as enum ('uploaded', 'queued', 'processing', 'awaiting_review', 'approved', 'failed');
create type public.profile_status as enum ('draft', 'published', 'unpublished', 'archived');
create type public.availability as enum ('immediate', 'two_weeks', 'one_month', 'three_months', 'not_looking');
create type public.work_mode as enum ('remote', 'hybrid', 'onsite');
create type public.enquiry_status as enum (
  'new', 'under_review', 'candidate_contacted', 'candidate_consented',
  'introduced', 'closed_placed', 'closed_declined', 'withdrawn'
);
create type public.enquiry_event_type as enum ('created', 'status_change', 'message', 'internal_note', 'assignment', 'introduction');
create type public.event_visibility as enum ('internal', 'employer');

-- ---------------------------------------------------------------------------
-- Utility: updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Employers & profiles
-- ---------------------------------------------------------------------------
create table public.employers (
  id uuid primary key default gen_random_uuid(),
  company_name text not null check (char_length(company_name) between 2 and 200),
  company_number text,
  vat_number text,
  website text,
  email_domain text,
  industry text,
  company_size text,
  address_line text,
  city text,
  country text default 'United Kingdom',
  description text,
  hiring_needs text,
  status public.employer_status not null default 'pending',
  status_reason text,
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index employers_status_idx on public.employers (status);
create trigger employers_updated_at before update on public.employers
  for each row execute function public.set_updated_at();

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  job_title text,
  phone text,
  role public.user_role not null default 'employer',
  status public.account_status not null default 'active',
  employer_id uuid references public.employers (id) on delete set null,
  employer_role text check (employer_role in ('owner', 'member')),
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employer_link check (
    (role = 'employer') or (employer_id is null)
  )
);
create index profiles_employer_idx on public.profiles (employer_id);
create index profiles_role_idx on public.profiles (role);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Role/permission matrix (source of truth for fine-grained admin permissions)
create table public.role_permissions (
  role public.user_role not null,
  permission text not null,
  primary key (role, permission)
);

insert into public.role_permissions (role, permission) values
  ('super_admin', 'candidates.read_private'),
  ('super_admin', 'candidates.manage'),
  ('super_admin', 'candidates.publish'),
  ('super_admin', 'candidates.erase'),
  ('super_admin', 'employers.manage'),
  ('super_admin', 'enquiries.manage'),
  ('super_admin', 'cms.manage'),
  ('super_admin', 'users.manage'),
  ('super_admin', 'settings.manage'),
  ('super_admin', 'audit.read'),
  ('recruitment_admin', 'candidates.read_private'),
  ('recruitment_admin', 'candidates.manage'),
  ('recruitment_admin', 'candidates.publish'),
  ('recruitment_admin', 'employers.manage'),
  ('recruitment_admin', 'enquiries.manage'),
  ('recruitment_admin', 'cms.manage'),
  ('recruitment_admin', 'audit.read');

-- ---------------------------------------------------------------------------
-- Security helper functions (SECURITY DEFINER, fixed search_path)
-- ---------------------------------------------------------------------------
create or replace function public.current_role_name()
returns public.user_role
language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p
  where p.id = auth.uid() and p.status = 'active';
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.status = 'active'
      and p.role in ('super_admin', 'recruitment_admin')
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'active' and p.role = 'super_admin'
  );
$$;

create or replace function public.has_permission(p_permission text)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.profiles p
    join public.role_permissions rp on rp.role = p.role
    where p.id = auth.uid() and p.status = 'active' and rp.permission = p_permission
  );
$$;

create or replace function public.current_employer_id()
returns uuid
language sql stable security definer set search_path = '' as $$
  select p.employer_id from public.profiles p
  where p.id = auth.uid() and p.status = 'active' and p.role = 'employer';
$$;

-- Approved employer = active employer user whose organisation is approved.
create or replace function public.is_approved_employer()
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.profiles p
    join public.employers e on e.id = p.employer_id
    where p.id = auth.uid()
      and p.status = 'active'
      and p.role = 'employer'
      and e.status = 'approved'
  );
$$;

-- ---------------------------------------------------------------------------
-- New auth user -> profile (+ employer organisation for self-registration)
-- Role is NEVER taken from user-editable metadata. Admin roles can only be
-- granted through app_metadata (service-role only) or by a super admin.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_role public.user_role := 'employer';
  v_employer_id uuid;
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  if (new.raw_app_meta_data ->> 'tv_role') in ('super_admin', 'recruitment_admin') then
    v_role := (new.raw_app_meta_data ->> 'tv_role')::public.user_role;
  end if;

  if v_role = 'employer' and coalesce(v_meta ->> 'company_name', '') <> '' then
    insert into public.employers (company_name, company_number, website, industry, company_size, city, country, hiring_needs, email_domain)
    values (
      left(v_meta ->> 'company_name', 200),
      nullif(left(v_meta ->> 'company_number', 40), ''),
      nullif(left(v_meta ->> 'website', 200), ''),
      nullif(left(v_meta ->> 'industry', 100), ''),
      nullif(left(v_meta ->> 'company_size', 40), ''),
      nullif(left(v_meta ->> 'city', 100), ''),
      coalesce(nullif(left(v_meta ->> 'country', 100), ''), 'United Kingdom'),
      nullif(left(v_meta ->> 'hiring_needs', 2000), ''),
      lower(split_part(new.email, '@', 2))
    )
    returning id into v_employer_id;
  end if;

  insert into public.profiles (id, email, full_name, job_title, phone, role, employer_id, employer_role)
  values (
    new.id,
    new.email,
    nullif(left(v_meta ->> 'full_name', 120), ''),
    nullif(left(v_meta ->> 'job_title', 120), ''),
    nullif(left(v_meta ->> 'phone', 40), ''),
    v_role,
    v_employer_id,
    case when v_employer_id is not null then 'owner' else null end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profile email in sync with auth email changes
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------------
-- Candidates
-- ---------------------------------------------------------------------------
create sequence public.candidate_ref_seq start 1001;
create sequence public.enquiry_ref_seq start 1001;

create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('TV-' || nextval('public.candidate_ref_seq')::text),
  submission_ref text unique,
  source text not null default 'portal' check (source in ('portal', 'admin_upload', 'manual')),
  pipeline_status public.processing_status not null default 'uploaded',
  profile_status public.profile_status not null default 'draft',
  assigned_admin_id uuid references public.profiles (id) on delete set null,
  is_sample boolean not null default false,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index candidates_pipeline_idx on public.candidates (pipeline_status);
create index candidates_profile_status_idx on public.candidates (profile_status);
create trigger candidates_updated_at before update on public.candidates
  for each row execute function public.set_updated_at();

-- PRIVATE identifying record — admins only.
create table public.candidate_private (
  candidate_id uuid primary key references public.candidates (id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  location_full text,
  linkedin_url text,
  right_to_work text,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index candidate_private_email_idx on public.candidate_private (lower(email));
create index candidate_private_name_trgm on public.candidate_private using gin (full_name extensions.gin_trgm_ops);
create trigger candidate_private_updated_at before update on public.candidate_private
  for each row execute function public.set_updated_at();

-- array_to_string is STABLE; for text[] it is safe to treat as immutable.
create or replace function public.text_array_to_string(text[])
returns text language sql immutable parallel safe set search_path = '' as $$
  select array_to_string($1, ' ');
$$;

-- ANONYMOUS marketplace profile. Contains NO identifying columns by design.
create table public.candidate_profiles (
  candidate_id uuid primary key references public.candidates (id) on delete cascade,
  ref text not null unique,
  headline text,
  summary text,
  job_title text,
  seniority text,
  years_experience integer check (years_experience between 0 and 60),
  location_region text,
  work_modes public.work_mode[] not null default '{}',
  salary_min integer check (salary_min >= 0),
  salary_max integer check (salary_max >= 0),
  salary_currency text not null default 'GBP',
  availability public.availability,
  notice_period text,
  industries text[] not null default '{}',
  skills text[] not null default '{}',
  highlights text[] not null default '{}',
  published boolean not null default false,
  published_at timestamptz,
  is_sample boolean not null default false,
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(job_title, '') || ' ' || coalesce(headline, '')), 'A') ||
    setweight(to_tsvector('english', public.text_array_to_string(skills)), 'A') ||
    setweight(to_tsvector('english', public.text_array_to_string(industries)), 'B') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'C')
  ) stored,
  updated_at timestamptz not null default now(),
  constraint salary_range check (salary_min is null or salary_max is null or salary_min <= salary_max)
);
create index candidate_profiles_published_idx on public.candidate_profiles (published, published_at desc);
create index candidate_profiles_search_idx on public.candidate_profiles using gin (search_vector);
create index candidate_profiles_skills_idx on public.candidate_profiles using gin (skills);
create index candidate_profiles_industries_idx on public.candidate_profiles using gin (industries);
create index candidate_profiles_title_trgm on public.candidate_profiles using gin (job_title extensions.gin_trgm_ops);
create trigger candidate_profiles_updated_at before update on public.candidate_profiles
  for each row execute function public.set_updated_at();

-- Anonymised career history (employer names replaced by descriptors)
create table public.candidate_experience (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  title text not null,
  organisation_descriptor text,
  start_date text,
  end_date text,
  is_current boolean not null default false,
  summary text,
  achievements text[] not null default '{}',
  skills text[] not null default '{}',
  sort_order integer not null default 0
);
create index candidate_experience_candidate_idx on public.candidate_experience (candidate_id, sort_order);

create table public.candidate_education (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  qualification text not null,
  field_of_study text,
  institution_descriptor text,
  year text,
  sort_order integer not null default 0
);
create index candidate_education_candidate_idx on public.candidate_education (candidate_id, sort_order);

create table public.candidate_certifications (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  name text not null,
  issuer text,
  year text,
  sort_order integer not null default 0
);
create index candidate_certifications_candidate_idx on public.candidate_certifications (candidate_id, sort_order);

-- Original documents (stored in the private `cvs` bucket) — admins only
create table public.candidate_documents (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0),
  sha256 text not null,
  extracted_text text,
  extraction_method text,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index candidate_documents_candidate_idx on public.candidate_documents (candidate_id);

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  consent_type text not null check (consent_type in ('data_processing', 'anonymised_marketplace', 'contact_for_introductions', 'identity_disclosure')),
  granted boolean not null,
  consent_text text not null,
  policy_version text not null,
  source text not null default 'submission_form',
  ip_hash text,
  user_agent text,
  recorded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index consent_records_candidate_idx on public.consent_records (candidate_id, created_at desc);

-- ---------------------------------------------------------------------------
-- CV processing (queue + results)
-- ---------------------------------------------------------------------------
create table public.cv_processing_jobs (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  document_id uuid not null references public.candidate_documents (id) on delete cascade,
  status public.processing_status not null default 'queued',
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  last_error text,
  custom_instructions text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index cv_jobs_claim_idx on public.cv_processing_jobs (status, run_after);
create index cv_jobs_candidate_idx on public.cv_processing_jobs (candidate_id, created_at desc);
create trigger cv_jobs_updated_at before update on public.cv_processing_jobs
  for each row execute function public.set_updated_at();

create table public.ai_processing_results (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.cv_processing_jobs (id) on delete cascade,
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  provider text not null,
  model text,
  is_ai boolean not null,               -- false => local development heuristic, NOT AI analysis
  extraction_method text,
  extracted jsonb not null,             -- structured data incl. identifying fields (admin only)
  anonymised jsonb not null,            -- proposed anonymous profile
  pii_findings jsonb not null default '[]',
  warnings jsonb not null default '[]',
  input_tokens integer,
  output_tokens integer,
  duration_ms integer,
  created_at timestamptz not null default now()
);
create index ai_results_candidate_idx on public.ai_processing_results (candidate_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Enquiries
-- ---------------------------------------------------------------------------
create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('ENQ-' || nextval('public.enquiry_ref_seq')::text),
  employer_id uuid not null references public.employers (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  status public.enquiry_status not null default 'new',
  role_title text not null,
  requirement text not null,
  salary_offer text,
  contact_phone text,
  assigned_admin_id uuid references public.profiles (id) on delete set null,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index enquiries_employer_idx on public.enquiries (employer_id, created_at desc);
create index enquiries_candidate_idx on public.enquiries (candidate_id);
create index enquiries_status_idx on public.enquiries (status);
create trigger enquiries_updated_at before update on public.enquiries
  for each row execute function public.set_updated_at();

create table public.enquiry_events (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.enquiries (id) on delete cascade,
  type public.enquiry_event_type not null,
  visibility public.event_visibility not null default 'internal',
  from_status public.enquiry_status,
  to_status public.enquiry_status,
  body text check (body is null or char_length(body) <= 4000),
  author_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index enquiry_events_enquiry_idx on public.enquiry_events (enquiry_id, created_at);

create table public.shortlists (
  employer_id uuid not null references public.employers (id) on delete cascade,
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (employer_id, candidate_id)
);

-- ---------------------------------------------------------------------------
-- Notifications, audit, contact, rate limits
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);

create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  to_address text not null,
  template text not null,
  subject text not null,
  provider text not null,
  status text not null check (status in ('sent', 'logged', 'failed')),
  error text,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}',
  ip_hash text,
  created_at timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company text,
  enquiry_type text,
  message text not null,
  status text not null default 'new' check (status in ('new', 'handled', 'spam')),
  ip_hash text,
  created_at timestamptz not null default now()
);

create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);

-- ---------------------------------------------------------------------------
-- CMS & settings
-- ---------------------------------------------------------------------------
create table public.cms_sections (
  id uuid primary key default gen_random_uuid(),
  page text not null,
  section_key text not null,
  draft_content jsonb not null default '{}',
  published_content jsonb,
  has_unpublished_changes boolean not null default false,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  published_by uuid references public.profiles (id) on delete set null,
  published_at timestamptz,
  unique (page, section_key)
);

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  quote text not null,
  author_role text not null,
  organisation_descriptor text,
  is_published boolean not null default false,
  is_sample boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.site_settings (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default false,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (key, value, is_public) values
  ('contact', '{"email":"hello@talentvault.example","phone":"+44 (0)20 0000 0000","address":"London, United Kingdom","hours":"Mon–Fri, 09:00–18:00 GMT"}', true),
  ('employer_registration_open', 'true', true),
  ('auto_process_cvs', 'true', false),
  ('admin_notification_emails', '[]', false);
