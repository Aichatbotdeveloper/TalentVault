# TalentVault

TalentVault is a recruitment technology platform built with Next.js and Supabase. It is one application with three environments:

| Environment | Who | Where |
| --- | --- | --- |
| **Public website** | Visitors, candidates | `/`, `/about`, `/services`, `/employers`, `/candidates`, `/contact`, `/privacy`, `/terms`, `/submit-cv` |
| **Employer portal** | Approved employers | `/portal/*` — anonymous candidate search, profiles, enquiries, shortlist, company profile |
| **Administrator console** | Recruitment staff | `/admin/*` — AI CV processing, candidate database, employer governance, enquiries, CMS, users & settings |

The UI implements the Google Stitch designs. Their Tailwind config is ported verbatim in `tailwind.config.ts`, so Stitch class names map 1:1.

---

## Contents

1. [Technology](#technology)
2. [Architecture](#architecture)
3. [Local development](#local-development)
4. [Environment variables](#environment-variables)
5. [Database, migrations & seed data](#database-migrations--seed-data)
6. [AI CV processing](#ai-cv-processing)
7. [File storage](#file-storage)
8. [Email](#email)
9. [Testing](#testing)
10. [Deployment (GitHub → Supabase → Vercel)](#deployment-github--supabase--vercel)
11. [Security model](#security-model)
12. [Design → route map](#design--route-map)
13. [Scope decisions & items for client review](#scope-decisions--items-for-client-review)

---

## Technology

- **Next.js 16** (App Router, Server Components, Server Actions, Route Handlers, `proxy.ts`), **React 19**, **TypeScript**
- **Tailwind CSS 3.4** with the Stitch design tokens; Material Symbols (self-hosted); Inter / Red Hat Display / Hanken Grotesk via `next/font`
- **Supabase**: Postgres, Auth, Storage, Row Level Security; schema managed by SQL migrations in `supabase/migrations`
- **Anthropic Claude** (`@anthropic-ai/sdk`) for CV analysis, behind a provider interface; **unpdf**, **mammoth** and **word-extractor** for text extraction
- **Zod** for all input validation and the AI output contract
- **Vitest** (unit and integration) and **Playwright** (end-to-end)
- **Vercel** hosting, with Vercel Cron for the CV job queue

## Architecture

```
Browser ──► Next.js (Vercel)
             ├─ proxy.ts ............ refreshes Supabase session, redirects signed-out users
             ├─ Server Components ... read data AS THE USER (RLS enforced)
             ├─ Server Actions ...... validate (zod) → permission check → SQL function (transactional)
             ├─ /api/submissions/upload-url, /api/admin/upload-url ... short-lived signed upload URLs
             ├─ /api/admin/documents/[id] .... audited 60-second signed download for staff
             └─ /api/cron/process-cv-jobs .... queue drain (Vercel Cron, Bearer CRON_SECRET)
Supabase
             ├─ Postgres + RLS ........ candidate_private (admin only) vs candidate_profiles (anonymous)
             ├─ SQL functions ......... create_enquiry, approve/publish, claim_cv_job, complete_cv_job, …
             ├─ Auth .................. email/password, email verification, recovery, admin invitations
             └─ Storage (private `cvs` bucket) ... no public access; staff read via storage policy
Anthropic API ◄── CV processor (server only)
```

Key folders:

```
src/app/(public)          public website + CV submission
src/app/(auth)            login, registration, verification, password recovery
src/app/portal            employer portal
src/app/admin/(console)   admin console (guarded layout); src/app/admin/login
src/app/api               upload URLs, document download, cron
src/lib/cv                file validation, text extraction, AI providers, anonymisation, job processor
src/lib/cms               CMS content model + defaults
src/lib/supabase          clients (user / service role) + generated types
supabase/migrations       schema, RLS, functions, storage bucket
scripts/seed.ts           development seed (synthetic data)
scripts/worker.ts         optional long-running CV worker
tests/{unit,integration,e2e}
```

### CV processing lifecycle

`uploaded → queued → processing → awaiting_review → approved` (or `failed`), then a separate publication step (`draft → published / unpublished / archived`).

1. The candidate (or a recruiter) uploads the CV directly to private storage using a signed URL, with progress shown.
2. The submit action re-validates the file **server-side** (magic bytes, size, type), stores it under `documents/`, and in one transaction creates the candidate, private record, draft profile, document, consent records and job (`create_candidate_submission`).
3. The job is processed by `after()` immediately after the response, by Vercel Cron every 5 minutes, or by `npm run worker`. Jobs are claimed with `FOR UPDATE SKIP LOCKED`, retried with exponential backoff (3 attempts), and recovered if a worker dies.
4. Text is extracted. A PDF without a text layer is sent to Claude as a document for OCR.
5. The provider returns structured JSON that is **validated against `CvAnalysisSchema`**. Values are then sanitised, and a deterministic PII scrubber removes names, emails, phone numbers, URLs, employer names and institutions from every anonymised field.
6. `complete_cv_job` stores the raw extraction (admin only) and applies the proposed profile **as a draft**. Nothing is ever auto-published. Reprocessing a published profile unpublishes it until it is approved again.
7. A recruiter reviews the result in `/admin/candidates/[id]/review`, edits it, ticks both sign-off confirmations, and approves (and optionally publishes). Publishing requires approval plus a marketplace consent record.

### Enquiry & introduction workflow

The employer submits an enquiry (`create_enquiry`: approved employers only, published candidates only, no duplicate open enquiries). Admins are notified. The recruiter then works through:

triage → assign → email the candidate a consent request → **record the candidate's identity-disclosure consent** → send the introduction.

The database **refuses** the `introduced` status unless a consent record exists for that specific enquiry. Internal notes (`visibility = internal`) are never returned to employers by RLS.

## Local development

**Requirements:** Node.js ≥ 20.9 (22 recommended), Docker (for the local Supabase stack). The Supabase CLI is a dev dependency (`npx supabase`).

```bash
npm install
```

```bash
npx supabase start
```

```bash
npx supabase status -o env
```

Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` (`API_URL`), `NEXT_PUBLIC_SUPABASE_ANON_KEY` (`ANON_KEY`) and `SUPABASE_SERVICE_ROLE_KEY` (`SERVICE_ROLE_KEY`) from the output above. Also set `CRON_SECRET` and `IP_HASH_SALT` to random strings.

```bash
npm run seed
```

```bash
npm run dev
```

- App: http://localhost:3000
- Local email inbox (Mailpit; verification and reset emails land here): http://127.0.0.1:54324

Seeded accounts (password `TalentVault-Dev-2026`, override with `SEED_PASSWORD`):

| Email | Role |
| --- | --- |
| `admin@talentvault.local` | Super Administrator — `/admin/login` |
| `recruiter@talentvault.local` | Recruitment Administrator — `/admin/login` |
| `employer@example.com` | Approved employer — `/login` |
| `pending@example.com` | Employer awaiting approval |

Seed candidates are synthetic and flagged `is_sample` ("Sample data" badges in the UI). The seed refuses to run against a non-local database unless `--force` is passed.

Optional worker process (instead of / in addition to cron):

```bash
npm run worker
```

## Environment variables

| Variable | Required | Exposed to browser | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | yes | Public anon key (RLS applies) |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | **no** | Server-only. CV intake, job worker, auth admin, notifications |
| `NEXT_PUBLIC_SITE_URL` | yes | yes | Canonical URL used in emails and auth redirects |
| `AI_PROVIDER` | yes | no | `anthropic` (real AI) or `local` (labelled development adapter) |
| `ANTHROPIC_API_KEY` | when `AI_PROVIDER=anthropic` | no | Claude API key |
| `AI_MODEL` | no | no | Defaults to `claude-opus-5-5` |
| `EMAIL_PROVIDER` | yes | no | `resend` or `console` |
| `RESEND_API_KEY` / `EMAIL_FROM` | when `resend` | no | Transactional email |
| `ADMIN_NOTIFICATION_EMAILS` | no | no | Extra comma-separated admin alert recipients |
| `CRON_SECRET` | yes (prod) | no | Bearer token for `/api/cron/process-cv-jobs` |
| `IP_HASH_SALT` | yes | no | Salt for hashed IPs in rate limits and consent records |

Never commit `.env*` files (they are git-ignored). Configure production values in Vercel → Project → Settings → Environment Variables.

## Database, migrations & seed data

Migrations (apply in order):

| File | Contents |
| --- | --- |
| `20261119000001_core_schema.sql` | Enums, tables, indexes, triggers, `profiles` bootstrap, role-permission matrix, settings |
| `20261119000002_security_and_functions.sql` | RLS policies, column privileges, search, queue and workflow functions, private `cvs` bucket + storage policy |
| `20261119000003_admin_workflows.sql` | Atomic profile editing, consent-gated introductions, user access, CMS publishing, settings |
| `20261119000004_app_metadata_role_sync.sql` | Syncs admin roles assigned via Auth `app_metadata` |

Commands:

```bash
npx supabase migration new <name>
```

```bash
npx supabase db reset
```

```bash
npx supabase db push
```

```bash
npm run db:types
```

- `migration new` creates a new migration.
- `db reset` rebuilds the local database from migrations. It is destructive, so use it locally only.
- `db push` applies pending migrations to the linked remote project.
- `db:types` regenerates `src/lib/supabase/database.types.ts`.

**Backups:** Supabase Pro includes daily backups, and Point-in-Time Recovery is available as an add-on. Before running `db push` against production, take a manual backup (Dashboard → Database → Backups) or run `npx supabase db dump -f backup.sql --linked`. Test every migration locally with `db reset` and on a staging project first.

## AI CV processing

- **Real AI:** set `AI_PROVIDER=anthropic` and `ANTHROPIC_API_KEY`. The provider (`src/lib/cv/providers/anthropic.ts`) uses Claude structured outputs with the `CvAnalysisSchema` Zod schema, effort `medium`, and server-side refusal fallback (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`). Refusals and credential errors fail permanently; rate limits and 5xx errors retry.
- **Prompting rules** (`providers/prompt.ts`): extract only what is in the CV, use `null` for missing data, never invent anything, never infer protected characteristics, use generic descriptors for employers and institutions, and never score candidates.
- **OCR:** a PDF with fewer than 200 extracted characters is sent to Claude as a PDF document, so it is read visually.
- **Local development adapter** (`AI_PROVIDER=local`): simple pattern matching so the workflow can run offline. Its output is stored with `is_ai = false`, the summary is prefixed `[LOCAL DEVELOPMENT PLACEHOLDER — NOT AI-GENERATED]`, the admin UI shows a warning banner, and approval is blocked until the placeholder summary is replaced.
- **Switching provider:** implement `CvAnalysisProvider` (`providers/types.ts`) and register it in `providers/index.ts`.

## File storage

- CVs are stored in the private Supabase bucket `cvs` (10 MB limit; PDF, DOCX and DOC MIME types), which is created by migration.
- `incoming/…` holds uploads that are not yet attached to a submission. Orphans older than 24 hours are purged by the cron job and the worker. `documents/…` holds attached CVs.
- There is no public URL. Uploads use one-time signed upload URLs issued by the server after validation. Staff downloads go through `/api/admin/documents/[id]`, which checks permissions, issues a 60-second signed URL and writes an audit entry.
- Employers and anonymous users have no storage policy, so any read is denied (covered by the integration tests).

## Email

- **Auth emails** (verification, password reset, admin invitations, email change) are sent by Supabase Auth.
  - Locally they appear in Mailpit, using the templates in `supabase/templates`.
  - In production, configure SMTP under Supabase Dashboard → Authentication → SMTP.
  - Paste the same templates under Authentication → Email Templates. They use the `token_hash` link format `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=…`, which works across devices.
- **Application emails** (receipt to candidates, admin alerts, employer approval and enquiry updates, candidate consent requests) go through `src/lib/email`. They are sent via Resend (`EMAIL_PROVIDER=resend`) or logged (`console`). Every attempt is recorded in `email_log` (Admin → Settings → Email Log). In-app notifications are stored in `notifications` (bell icon).

## Testing

```bash
npm run lint
```

```bash
npm run typecheck
```

```bash
npm run test:unit
```

```bash
npm run test:integration
```

```bash
npm run test:e2e
```

- `test:unit` runs file validation, PII scrubber, schema contract, extraction, local adapter, validation, and the Claude request/response contract against a fake API server.
- `test:integration` runs against the local Supabase stack. It covers RLS, storage, the RBAC matrix, enquiry isolation and the CV pipeline.
- `test:e2e` runs the Playwright browser journeys. It needs local Supabase plus `npm run seed`, and starts `npm run dev` automatically. Set `E2E_BASE_URL` to test a running server.

| Suite | Count | Covers |
| --- | --- | --- |
| Unit | 25 | Business rules and contracts |
| Integration | 14 | Real Postgres/RLS/Storage: anonymous and unapproved access denied, no PII in employer responses, private CVs unreadable, role escalation blocked, internal notes hidden, consent-gated introductions, publication rules, rate limiter, CV pipeline incl. OCR-failure path |
| End-to-end | 31 | Public pages and navigation, contact form, CV submission with invalid-file rejection, registration → email verification (Mailpit) → approval gate → search → enquiry, admin review → sign-off → publish → visible to employer, CMS publish, access control, mobile layouts |

CI (`.github/workflows/ci.yml`) runs everything, including a local Supabase stack, on each push and pull request.

## Deployment (GitHub → Supabase → Vercel)

### 1. Supabase project

1. Create a project at supabase.com (pick an EU/UK region if candidate data must stay there).
2. Link it and apply the migrations:

   ```bash
   npx supabase login
   ```

   ```bash
   npx supabase link --project-ref <project-ref>
   ```

   ```bash
   npx supabase db push
   ```

3. Under Authentication → URL Configuration, set **Site URL** to your production URL and add `https://<domain>/**` to Redirect URLs.
4. Under Authentication → Providers → Email, enable **Confirm email** and set the minimum password length to 10 with letters + digits. Optionally enable leaked-password protection and MFA for administrators.
5. Under Authentication → Email Templates, paste the four templates from `supabase/templates/` (Confirm signup, Reset password, Invite user, Change email).
6. Under Authentication → SMTP, configure your email provider (the built-in sender is rate-limited and only for testing).
7. Create the first super administrator:
   - Authentication → Users → **Invite user**.
   - Then, in the SQL editor:

   ```sql
   update auth.users set raw_app_meta_data = raw_app_meta_data || '{"tv_role":"super_admin"}' where email = 'you@yourcompany.com';
   ```

   After that, invite further admins from **Admin → Settings → Administrative Users**.
8. Do **not** run the seed script against production.

### 2. GitHub

```bash
git remote add origin git@github.com:<org>/<repo>.git
```

```bash
git push -u origin main
```

### 3. Vercel

1. Import the GitHub repository in Vercel. The framework is detected as Next.js and the defaults are fine.
2. Add the environment variables from the table above for Production and Preview. Use a separate Supabase project for Preview if possible.
3. Deploy. `vercel.json` registers the cron job `*/5 * * * *` → `/api/cron/process-cv-jobs`. Vercel sends `Authorization: Bearer $CRON_SECRET` automatically when `CRON_SECRET` is set.
   - Vercel **Hobby** only allows daily crons. On Hobby, CVs are still processed immediately after each submission (`after()`), and admins can use **Process Queue Now** in the admin console.
   - **Pro** is recommended: the 5-minute cron and the 300-second function duration used for AI processing need it.
4. Smoke test:
   - Submit a CV.
   - Check that it reaches *Awaiting Review*.
   - Register an employer and confirm the verification email arrives.

## Security model

- **Separation of identity:**
  - `candidate_private` (name, email, phone, notes) is readable only with `candidates.read_private`.
  - `candidate_profiles` contains **no identifying columns** and is readable by employers only when `published = true` *and* the caller is an active user of an *approved* employer (`is_approved_employer()`).
  - Employers cannot read `candidates`, `candidate_documents`, `ai_processing_results`, consent records or storage.
- **Server-side authorisation everywhere:**
  - Page guards (`requireAdminPage`, `requireEmployerPage({ approved: true })`) and action guards run on every request.
  - Every mutation goes through a `SECURITY DEFINER` SQL function that re-checks `has_permission(...)`, or through RLS-limited table access with column-level `UPDATE` grants.
  - Hiding navigation is never the only control.
- **Roles:** `super_admin`, `recruitment_admin` and `employer`, with the permission matrix in the `role_permissions` table (Admin → Settings → Roles & Permissions). Roles cannot come from user-editable sign-up metadata, and suspended users lose access immediately (RLS checks `profiles.status`, and Auth bans the account).
- **Passwords:** handled by Supabase Auth (bcrypt). Policy: 10+ characters with upper case, lower case and a digit. The current password is verified before a change.
- **Rate limiting:** Postgres-backed and serverless-safe. Applies to login (per IP and per email), registration, password reset, CV upload and submission, contact form, enquiries and messages.
- **Uploads:** extension, size and magic-byte checks on both client and server; private storage; generated file names; orphan purge.
- **Headers:** CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy and Permissions-Policy. CSV exports neutralise spreadsheet formulas.
- **Audit log:** logins, profile edits, approvals, publications, document access, exports, employer status changes, enquiry updates, CMS publishing and user access changes (Admin → Settings → Audit Log). Raw IPs are never stored, only salted hashes.
- **Privacy operations:** consent records with wording and version, recruiter-recorded identity-disclosure consent per enquiry, and permanent erasure of a candidate and their files (super admin).

These controls reduce risk; they do not make the platform "zero-risk" or certify compliance. GDPR / UK GDPR compliance also depends on organisational measures: a DPIA, records of processing, data processing agreements with Supabase, Vercel, Anthropic and Resend, retention schedules and staff training. Those are for the client and its advisers.

## Design → route map

| Stitch screen | Route |
| --- | --- |
| Recruitment AI talent platform (homepage) | `/` |
| Candidate CV Submission Portal | `/submit-cv` |
| Candidate CV Submission Confirmation | `/submit-cv/confirmation` |
| Candidate Search & Discovery | `/portal/candidates` |
| Anonymous Candidate Profile (TV-9041) | `/portal/candidates/[ref]` |
| Employer Candidate Enquiry Modal | modal on `/portal/candidates/[ref]` |
| Employer My Enquiries Dashboard | `/portal/enquiries` (+ `/portal/enquiries/[ref]`) |
| AI CV Processing Interface | `/admin/candidates/[id]/review` (+ queue `/admin/processing`) |
| Administrator Candidate Management Database | `/admin/candidates` (+ `/admin/candidates/[id]`) |
| Administrator Employer Management & Governance | `/admin/employers` |
| Administrator Enquiry Management & Coordination | `/admin/enquiries` |
| Website Content Management (CMS) | `/admin/content` |
| User Management & Platform Settings | `/admin/settings` |
| *Not in the export — built in the same design language* | About, Services, For Employers, For Candidates, Contact, Privacy, Terms, Employer register/login, verification & password pages, Employer overview, Company profile, Account settings, Shortlist, Admin login, Admin overview |

## Scope decisions & items for client review

- **Claims and metrics:**
  - Fictional figures in the designs ("4,850+ vetted", "98.4% retention", "48 hrs", "SOC 2 / ISO 27001 certified", "Zero bias", AI match scores) are **not** reproduced as facts.
  - Public counts are live database figures.
  - Marketing promises are CMS-editable copy.
  - Example candidate cards on the homepage are labelled *Illustrative*.
- **Not built** (outside the original brief): AI match / suitability scores, payroll, ATS, job posting, interview scheduling, billing, seat licensing, CDN/edge management. Design panels for these were simplified to real data (e.g. the "Edge delivery" CMS panel and "API & webhook feeds").
- **Candidates have no accounts** in this release. Data-rights requests (update, hide, erase) are handled by staff, and erasure is available in the admin console.
- **MFA for administrators** is available in Supabase Auth and recommended, but the in-app enrolment UI is not built.
- **Legal copy:** Privacy Policy and Terms are CMS-editable *drafts* and must be reviewed by legal advisers before launch.
- **Brand assets:** the Stitch export referenced remotely hosted images (logo and photos) that could not be downloaded. An SVG shield logo matching the screens that show it is included (`public/brand/`). Replace it with final brand assets as needed.
