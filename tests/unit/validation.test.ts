import { describe, expect, it } from "vitest";
import { candidateSubmissionSchema, employerRegistrationSchema, enquirySchema, passwordSchema } from "@/lib/validation";

const submission = {
  full_name: "Jordan Example",
  email: "JORDAN@example.com",
  location: "London, UK",
  job_title: "Engineer",
  years_experience: "9",
  availability: "immediate",
  work_modes: ["remote"],
  skills: ["AWS"],
  upload_path: "incoming/1b4e28ba-2fa1-11d2-883f-0016d3cca427.pdf",
  original_filename: "cv.pdf",
  consent_data_processing: "on",
  consent_anonymised_marketplace: "on",
  consent_contact: "on",
};

describe("validation schemas", () => {
  it("accepts a complete CV submission and normalises email", () => {
    const r = candidateSubmissionSchema.safeParse(submission);
    expect(r.success).toBe(true);
    expect(r.success && r.data.email).toBe("jordan@example.com");
  });

  it("treats blank salary fields as not provided (not £0)", () => {
    const r = candidateSubmissionSchema.safeParse({ ...submission, salary_min: "", salary_max: "" });
    expect(r.success && [r.data.salary_min, r.data.salary_max]).toEqual([undefined, undefined]);
  });

  it("requires every consent", () => {
    const { consent_contact: _c, ...rest } = submission;
    expect(candidateSubmissionSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects upload paths outside incoming/ (path traversal)", () => {
    expect(candidateSubmissionSchema.safeParse({ ...submission, upload_path: "documents/../secret.pdf" }).success).toBe(false);
    expect(candidateSubmissionSchema.safeParse({ ...submission, upload_path: "incoming/abc.pdf" }).success).toBe(false);
  });

  it("rejects inverted salary ranges and filled honeypots", () => {
    expect(candidateSubmissionSchema.safeParse({ ...submission, salary_min: "100000", salary_max: "50000" }).success).toBe(false);
    expect(candidateSubmissionSchema.safeParse({ ...submission, company_website: "spam" }).success).toBe(false);
  });

  it("enforces password strength and confirmation", () => {
    expect(passwordSchema.safeParse("short").success).toBe(false);
    expect(passwordSchema.safeParse("alllowercase123").success).toBe(false);
    expect(passwordSchema.safeParse("Str0ngEnoughPass").success).toBe(true);
    const reg = { full_name: "A B", job_title: "HR", email: "a@b.co", company_name: "Co", password: "Str0ngEnoughPass", confirm_password: "Different1A", accept_terms: "on" };
    expect(employerRegistrationSchema.safeParse(reg).success).toBe(false);
  });

  it("requires a meaningful enquiry brief and valid candidate reference", () => {
    expect(enquirySchema.safeParse({ candidate_ref: "TV-1001", role_title: "CTO", requirement: "too short" }).success).toBe(false);
    expect(enquirySchema.safeParse({ candidate_ref: "1001; drop", role_title: "CTO", requirement: "x".repeat(40) }).success).toBe(false);
    expect(enquirySchema.safeParse({ candidate_ref: "TV-1001", role_title: "CTO", requirement: "x".repeat(40) }).success).toBe(true);
  });
});
