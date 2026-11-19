import type { CvAnalysis } from "../schema";
import { NonRetryableProcessingError, type CvAnalysisInput, type CvAnalysisOutput, type CvAnalysisProvider } from "./types";

/**
 * LOCAL DEVELOPMENT ADAPTER — NOT AI ANALYSIS.
 *
 * Used when AI_PROVIDER=local (no API credentials). It performs simple pattern
 * matching so the end-to-end workflow (queue → review → publish) can be exercised
 * offline. Results are stored with is_ai=false and the admin UI shows a prominent
 * warning. It does not understand the CV and must not be used in production.
 */
const SKILL_DICTIONARY = [
  "JavaScript", "TypeScript", "React", "Next.js", "Node.js", "Python", "Java", "C#", ".NET", "Go", "Rust", "C++", "PHP", "Ruby",
  "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Kafka", "GraphQL", "REST", "AWS", "Azure", "GCP", "Kubernetes", "Docker",
  "Terraform", "Ansible", "CI/CD", "Jenkins", "GitHub Actions", "Linux", "Machine Learning", "PyTorch", "TensorFlow", "Data Analysis",
  "Power BI", "Tableau", "Excel", "Salesforce", "SAP", "Agile", "Scrum", "Project Management", "Product Management", "Stakeholder Management",
  "Financial Modelling", "Accounting", "Recruitment", "Sales", "Marketing", "SEO", "Leadership", "Team Management", "Figma", "UX Design",
  "Cyber Security", "ISO 27001", "SOC 2", "Microservices", "System Design", "FinOps", "Prometheus", "Grafana",
];

const MONTHS = "jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec";
const RANGE_RE = new RegExp(
  `((?:(?:${MONTHS})[a-z]*\\.?\\s+)?(?:19|20)\\d{2})\\s*(?:-|–|—|to)\\s*((?:(?:${MONTHS})[a-z]*\\.?\\s+)?(?:(?:19|20)\\d{2})|present|current|now)`,
  "gi",
);

function yearsFromRanges(text: string): number | null {
  let earliest = Infinity;
  let latest = -Infinity;
  const now = new Date().getFullYear();
  for (const m of text.matchAll(RANGE_RE)) {
    const start = Number(m[1]!.match(/\d{4}/)![0]);
    const endRaw = m[2]!.toLowerCase();
    const end = /present|current|now/.test(endRaw) ? now : Number(endRaw.match(/\d{4}/)?.[0] ?? now);
    if (start >= 1960 && start <= now) earliest = Math.min(earliest, start);
    if (end >= 1960 && end <= now + 1) latest = Math.max(latest, end);
  }
  if (!Number.isFinite(earliest) || !Number.isFinite(latest) || latest < earliest) return null;
  return Math.min(50, latest - earliest);
}

export class LocalHeuristicCvProvider implements CvAnalysisProvider {
  readonly name = "local-dev-heuristic";
  readonly isAI = false;
  readonly supportsDocumentInput = false;

  async analyse(input: CvAnalysisInput): Promise<CvAnalysisOutput> {
    const text = input.text;
    if (text.trim().length < 50) {
      throw new NonRetryableProcessingError(
        "No readable text found (scanned/image-only document). OCR requires the Anthropic provider — set AI_PROVIDER=anthropic and ANTHROPIC_API_KEY.",
      );
    }
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
    const phone = text.match(/(?:\+44\s?|0)\d[\d\s]{8,12}\d/)?.[0]?.replace(/\s+/g, " ") ?? null;
    const linkedin = text.match(/linkedin\.com\/in\/[\w-]+/i)?.[0] ?? null;
    const firstLine = lines[0] ?? "";
    const fullName = /^[A-Z][a-zA-Z'’-]+(?:\s+[A-Z][a-zA-Z'’-]+){1,3}$/.test(firstLine) ? firstLine : null;
    const titleLine = lines.slice(1, 6).find((l) => l.length < 80 && !l.includes("@") && !/\d{5,}/.test(l) && /[a-z]/i.test(l)) ?? null;
    const lower = text.toLowerCase();
    const skills = SKILL_DICTIONARY.filter((s) => {
      const needle = s.toLowerCase();
      return /^[a-z0-9]/.test(needle) && needle.length > 2 ? new RegExp(`\\b${needle.replace(/[.+#/]/g, "\\$&")}\\b`).test(lower) : lower.includes(needle);
    }).slice(0, 15);
    const years = yearsFromRanges(text);
    const selfTitle = typeof input.selfReported?.job_title === "string" ? (input.selfReported.job_title as string) : null;
    const title = selfTitle ?? titleLine ?? "Professional";

    const analysis: CvAnalysis = {
      extracted: {
        personal: { full_name: fullName, email, phone, location: null, linkedin_url: linkedin },
        current_job_title: titleLine,
        total_years_experience: years,
        skills,
        industries: [],
        employment: [],
        education: [],
        certifications: [],
        salary_expectation: null,
        availability_text: null,
      },
      anonymised: {
        headline: title,
        job_title: title,
        seniority: null,
        summary:
          `[LOCAL DEVELOPMENT PLACEHOLDER — NOT AI-GENERATED] ${title}` +
          (years ? ` with approximately ${years} years of experience inferred from CV dates` : "") +
          (skills.length ? `. Keywords detected: ${skills.slice(0, 8).join(", ")}.` : ".") +
          " A recruiter must write or replace this summary before approval.",
        years_experience: years,
        location_region: null,
        industries: [],
        skills,
        highlights: [],
        availability: null,
        notice_period: null,
        salary_min: null,
        salary_max: null,
        experience: [],
        education: [],
        certifications: [],
      },
      warnings: [
        "Generated by the local development heuristic adapter, not by AI. Employment history, education and certifications were not extracted.",
        "Review every field against the original CV before approval.",
      ],
    };
    return { analysis, model: null, usedDocumentInput: false };
  }
}
