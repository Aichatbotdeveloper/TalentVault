import { describe, expect, it } from "vitest";
import { CvAnalysisSchema, sanitiseAnalysis, type CvAnalysis } from "@/lib/cv/schema";

const base = (): CvAnalysis => ({
  extracted: {
    personal: { full_name: null, email: null, phone: null, location: null, linkedin_url: null },
    current_job_title: null,
    total_years_experience: 80,
    skills: [],
    industries: [],
    employment: [],
    education: [],
    certifications: [],
    salary_expectation: null,
    availability_text: null,
  },
  anonymised: {
    headline: "x".repeat(300),
    job_title: "Engineer",
    seniority: null,
    summary: "Summary",
    years_experience: -3,
    location_region: null,
    industries: [],
    skills: ["AWS", "aws", " Go ", ""],
    highlights: [],
    availability: null,
    notice_period: null,
    salary_min: 120000,
    salary_max: 90000,
    experience: [],
    education: [],
    certifications: [],
  },
  warnings: [],
});

describe("AI output contract", () => {
  it("rejects output that does not match the schema", () => {
    const bad = { ...base(), anonymised: { ...base().anonymised, availability: "tomorrow" } };
    expect(CvAnalysisSchema.safeParse(bad).success).toBe(false);
    expect(CvAnalysisSchema.safeParse({ extracted: {} }).success).toBe(false);
  });

  it("accepts null for unknown values rather than requiring invented data", () => {
    expect(CvAnalysisSchema.safeParse(base()).success).toBe(true);
  });

  it("sanitises out-of-range values and duplicates", () => {
    const s = sanitiseAnalysis(base());
    expect(s.extracted.total_years_experience).toBe(60);
    expect(s.anonymised.years_experience).toBe(0);
    expect(s.anonymised.headline.length).toBe(160);
    expect(s.anonymised.skills).toEqual(["aws", "Go"]);
    expect([s.anonymised.salary_min, s.anonymised.salary_max]).toEqual([90000, 120000]);
  });
});
