import { z } from "zod";

/**
 * Output contract for CV analysis. Every provider (AI or local) must return
 * data that validates against `CvAnalysisSchema`. Fields not present in the
 * CV must be null / empty — providers must never invent information.
 */
const str = z.string();
const nstr = z.string().nullable();

export const ExtractedCvSchema = z.object({
  personal: z.object({
    full_name: nstr,
    email: nstr,
    phone: nstr,
    location: nstr,
    linkedin_url: nstr,
  }),
  current_job_title: nstr,
  total_years_experience: z.number().nullable(),
  skills: z.array(str),
  industries: z.array(str),
  employment: z.array(
    z.object({
      title: str,
      employer_name: nstr,
      start: nstr,
      end: nstr,
      is_current: z.boolean(),
      description: nstr,
      achievements: z.array(str),
    }),
  ),
  education: z.array(z.object({ qualification: str, field_of_study: nstr, institution: nstr, year: nstr })),
  certifications: z.array(z.object({ name: str, issuer: nstr, year: nstr })),
  salary_expectation: z.object({ min: z.number().nullable(), max: z.number().nullable(), currency: nstr }).nullable(),
  availability_text: nstr,
});

export const AVAILABILITY_VALUES = ["immediate", "two_weeks", "one_month", "three_months", "not_looking"] as const;

export const AnonymisedProfileSchema = z.object({
  headline: str,
  job_title: str,
  seniority: nstr,
  summary: str,
  years_experience: z.number().nullable(),
  location_region: nstr,
  industries: z.array(str),
  skills: z.array(str),
  highlights: z.array(str),
  availability: z.enum(AVAILABILITY_VALUES).nullable(),
  notice_period: nstr,
  salary_min: z.number().nullable(),
  salary_max: z.number().nullable(),
  experience: z.array(
    z.object({
      title: str,
      organisation_descriptor: nstr,
      start_date: nstr,
      end_date: nstr,
      is_current: z.boolean(),
      summary: nstr,
      achievements: z.array(str),
      skills: z.array(str),
    }),
  ),
  education: z.array(z.object({ qualification: str, field_of_study: nstr, institution_descriptor: nstr, year: nstr })),
  certifications: z.array(z.object({ name: str, issuer: nstr, year: nstr })),
});

export const CvAnalysisSchema = z.object({
  extracted: ExtractedCvSchema,
  anonymised: AnonymisedProfileSchema,
  warnings: z.array(str),
});

export type ExtractedCv = z.infer<typeof ExtractedCvSchema>;
export type AnonymisedProfile = z.infer<typeof AnonymisedProfileSchema>;
export type CvAnalysis = z.infer<typeof CvAnalysisSchema>;

/** Post-validation sanity rules beyond the JSON schema. */
export function sanitiseAnalysis(a: CvAnalysis): CvAnalysis {
  const clampYears = (n: number | null) => (n == null || !Number.isFinite(n) ? null : Math.max(0, Math.min(60, Math.round(n))));
  const clampMoney = (n: number | null) => (n == null || !Number.isFinite(n) || n <= 0 || n > 5_000_000 ? null : Math.round(n));
  const uniq = (xs: string[], max: number, len = 60) =>
    [...new Map(xs.map((x) => x.trim()).filter(Boolean).map((x) => [x.toLowerCase(), x.slice(0, len)])).values()].slice(0, max);
  const anon = a.anonymised;
  let salaryMin = clampMoney(anon.salary_min);
  let salaryMax = clampMoney(anon.salary_max);
  if (salaryMin && salaryMax && salaryMin > salaryMax) [salaryMin, salaryMax] = [salaryMax, salaryMin];
  return {
    ...a,
    extracted: { ...a.extracted, total_years_experience: clampYears(a.extracted.total_years_experience) },
    anonymised: {
      ...anon,
      headline: anon.headline.slice(0, 160),
      job_title: anon.job_title.slice(0, 120),
      summary: anon.summary.slice(0, 2000),
      years_experience: clampYears(anon.years_experience),
      salary_min: salaryMin,
      salary_max: salaryMax,
      skills: uniq(anon.skills, 30),
      industries: uniq(anon.industries, 8),
      highlights: uniq(anon.highlights, 6, 240),
      experience: anon.experience.slice(0, 12),
      education: anon.education.slice(0, 8),
      certifications: anon.certifications.slice(0, 15),
    },
    warnings: a.warnings.slice(0, 20),
  };
}
