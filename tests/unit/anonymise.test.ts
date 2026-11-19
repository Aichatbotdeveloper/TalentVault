import { describe, expect, it } from "vitest";
import { collectIdentifiers, scrubProfile } from "@/lib/cv/anonymise";
import type { AnonymisedProfile, ExtractedCv } from "@/lib/cv/schema";

const extracted: ExtractedCv = {
  personal: { full_name: "Jordan Example", email: "jordan@example.com", phone: "+44 7700 900123", location: "London", linkedin_url: null },
  current_job_title: "Engineer",
  total_years_experience: 9,
  skills: [],
  industries: [],
  employment: [{ title: "Engineer", employer_name: "Acmepay Ltd", start: "2019", end: null, is_current: true, description: null, achievements: [] }],
  education: [{ qualification: "BSc", field_of_study: "CS", institution: "University of Exampleshire", year: "2014" }],
  certifications: [],
  salary_expectation: null,
  availability_text: null,
};

const profile = (summary: string): AnonymisedProfile => ({
  headline: "Senior Engineer",
  job_title: "Engineer",
  seniority: null,
  summary,
  years_experience: 9,
  location_region: "London, UK",
  industries: [],
  skills: ["AWS"],
  highlights: ["Contact jordan@example.com for details"],
  availability: null,
  notice_period: null,
  salary_min: null,
  salary_max: null,
  experience: [{ title: "Engineer", organisation_descriptor: "Acmepay Ltd", start_date: "2019", end_date: null, is_current: true, summary: null, achievements: [], skills: [] }],
  education: [{ qualification: "BSc", field_of_study: "CS", institution_descriptor: "University of Exampleshire", year: "2014" }],
  certifications: [],
});

describe("PII scrubber safety net", () => {
  const ids = collectIdentifiers(extracted);

  it("removes names, emails, phone numbers, URLs, employers and institutions everywhere", () => {
    const { profile: out, findings } = scrubProfile(
      profile("Jordan Example worked at Acmepay Ltd. Call +44 7700 900123 or see https://jordan.dev. Jordan studied at University of Exampleshire."),
      ids,
    );
    const all = JSON.stringify(out);
    for (const leak of ["Jordan", "Acmepay", "7700 900123", "jordan@example.com", "jordan.dev", "Exampleshire"]) {
      expect(all).not.toContain(leak);
    }
    expect(findings.map((f) => f.type)).toEqual(expect.arrayContaining(["name", "phone", "url", "employer", "institution", "email"]));
  });

  it("keeps year ranges and ordinary numbers intact", () => {
    const { profile: out } = scrubProfile(profile("Led platform work 2018 - 2022 serving 20,000,000 users with 99.99% uptime."), ids);
    expect(out.summary).toContain("2018 - 2022");
    expect(out.summary).toContain("99.99%");
  });
});
