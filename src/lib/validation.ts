import { z } from "zod";
import { AVAILABILITY_VALUES } from "./cv/schema";

const trimmed = (min: number, max: number, msg?: string) => z.string().trim().min(min, msg ?? `Must be at least ${min} characters`).max(max, `Must be at most ${max} characters`);
const optionalTrimmed = (max: number) =>
  z.string().trim().max(max, `Must be at most ${max} characters`).optional().transform((v) => (v ? v : undefined));
const email = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);
const phone = z
  .string()
  .trim()
  .max(30)
  .regex(/^[+()\d\s-]*$/, "Enter a valid phone number")
  .optional()
  .transform((v) => (v ? v : undefined));

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(72, "Use at most 72 characters")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/\d/, "Include a number");

export const contactSchema = z.object({
  name: trimmed(2, 120),
  email,
  company: optionalTrimmed(160),
  enquiry_type: z.enum(["employer", "candidate", "general"]).default("general"),
  message: trimmed(10, 4000),
  website: z.string().max(0).optional(), // honeypot
});

export const employerRegistrationSchema = z
  .object({
    full_name: trimmed(2, 120),
    job_title: trimmed(2, 120),
    email,
    phone,
    company_name: trimmed(2, 200),
    company_number: optionalTrimmed(40),
    website: optionalTrimmed(200),
    industry: optionalTrimmed(100),
    company_size: optionalTrimmed(40),
    city: optionalTrimmed(100),
    hiring_needs: optionalTrimmed(2000),
    password: passwordSchema,
    confirm_password: z.string(),
    accept_terms: z.literal("on", { message: "You must accept the terms to continue" }),
  })
  .refine((d) => d.password === d.confirm_password, { path: ["confirm_password"], message: "Passwords do not match" });

export const loginSchema = z.object({ email, password: z.string().min(1, "Enter your password").max(72) });

export const WORK_MODE_VALUES = ["remote", "hybrid", "onsite"] as const;

const money = z.coerce.number().int().min(0).max(5_000_000).optional();

export const CONSENT_VERSION = "2026-11-v1";
export const CONSENT_TEXT = {
  data_processing:
    "I consent to TalentVault storing and processing my personal data and CV, including AI-assisted extraction and summarisation reviewed by a recruiter, for recruitment purposes as described in the Privacy Policy.",
  anonymised_marketplace:
    "I agree that an anonymised profile (without my name, contact details or named employers) may be shown to employers approved by TalentVault.",
  contact_for_introductions:
    "I agree that TalentVault recruiters may contact me about employer enquiries. My identity will only be shared with an employer after I agree to a specific introduction.",
} as const;

export const candidateSubmissionSchema = z
  .object({
    full_name: trimmed(2, 120),
    email,
    phone,
    location: trimmed(2, 120),
    linkedin_url: z
      .string()
      .trim()
      .max(200)
      .optional()
      .transform((v) => (v ? v : undefined))
      .refine((v) => !v || /^https?:\/\/(www\.)?linkedin\.com\//i.test(v), "Enter a LinkedIn profile URL"),
    job_title: trimmed(2, 120),
    years_experience: z.coerce.number().int().min(0).max(60),
    salary_min: money,
    salary_max: money,
    availability: z.enum(AVAILABILITY_VALUES),
    work_modes: z.array(z.enum(WORK_MODE_VALUES)).min(1, "Select at least one working arrangement"),
    skills: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
    upload_path: z.string().regex(/^incoming\/[0-9a-f-]{36}\.(pdf|docx|doc)$/, "Please upload your CV"),
    original_filename: trimmed(1, 200),
    consent_data_processing: z.literal("on", { message: "This consent is required to process your CV" }),
    consent_anonymised_marketplace: z.literal("on", { message: "This consent is required to include you in the directory" }),
    consent_contact: z.literal("on", { message: "This consent is required so we can contact you about enquiries" }),
    company_website: z.string().max(0).optional(), // honeypot
  })
  .refine((d) => d.salary_min == null || d.salary_max == null || d.salary_min <= d.salary_max, {
    path: ["salary_max"],
    message: "Maximum must be greater than minimum",
  });

export const enquirySchema = z.object({
  candidate_ref: z.string().regex(/^TV-\d+$/),
  role_title: trimmed(3, 200),
  requirement: trimmed(30, 1000, "Please describe the role in at least 30 characters"),
  salary_offer: optionalTrimmed(120),
  contact_phone: phone,
});

export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
