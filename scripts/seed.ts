/**
 * Development seed data. Every record created here is SYNTHETIC and flagged
 * (is_sample = true, "Sample" names, example.com emails).
 *
 *   npm run seed                 # local Supabase only
 *   npm run seed -- --force      # allow a non-local Supabase URL (staging) — never production
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";

config({ path: ".env.local" });
config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
if (!/127\.0\.0\.1|localhost/.test(url) && !process.argv.includes("--force")) {
  throw new Error(`Refusing to seed non-local database ${url}. Pass --force for a staging environment.`);
}

const db = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const PASSWORD = process.env.SEED_PASSWORD ?? "TalentVault-Dev-2026";

async function ensureUser(email: string, opts: { role?: "super_admin" | "recruitment_admin"; meta?: Record<string, string> }) {
  const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
  const existing = list.users.find((u) => u.email === email);
  if (existing) return existing.id;
  const { data, error } = await db.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: opts.meta ?? {},
    app_metadata: opts.role ? { tv_role: opts.role } : {},
  });
  if (error) throw error;
  return data.user.id;
}

type Sample = {
  title: string; headline: string; years: number; region: string; modes: ("remote" | "hybrid" | "onsite")[];
  min: number; max: number; availability: Database["public"]["Enums"]["availability"]; industries: string[]; skills: string[];
  summary: string; highlights: string[];
  experience: { title: string; org: string; start: string; end: string | null; achievements: string[]; skills: string[] }[];
  education: { q: string; f: string; inst: string; year: string }[];
  certs: { name: string; issuer: string; year: string }[];
};

const SAMPLES: Sample[] = [
  {
    title: "Lead Cloud Infrastructure & DevOps Architect", headline: "Lead Cloud Infrastructure & DevOps Architect", years: 11, region: "London, UK", modes: ["remote", "hybrid"],
    min: 125000, max: 140000, availability: "immediate", industries: ["FinTech", "Healthcare"], skills: ["Kubernetes", "Terraform", "AWS", "Docker", "Go", "CI/CD", "FinOps", "ArgoCD"],
    summary: "Cloud infrastructure architect and DevOps leader with over a decade of experience delivering distributed platforms across financial services and healthcare. Has led multi-region AWS migrations, introduced GitOps delivery and established SRE practices for high-availability payment systems. Experienced in mentoring distributed engineering teams and in cost governance for large cloud estates.",
    highlights: ["Migrated 85+ microservices to Kubernetes, reducing infrastructure cost by 34%", "Cut release failure rate from 8.2% to 0.4% with GitOps pipelines", "Led a team of 9 SRE and DevOps engineers across two hubs"],
    experience: [
      { title: "Lead Cloud Infrastructure Architect", org: "Series D FinTech scale-up", start: "2022", end: null, achievements: ["Migrated 85+ services from EC2 to EKS", "Introduced ArgoCD and Terraform Cloud"], skills: ["AWS EKS", "ArgoCD", "Terraform"] },
      { title: "Senior DevOps Engineer", org: "Enterprise healthcare SaaS provider", start: "2018", end: "2022", achievements: ["Built compliant Kubernetes platform handling 120k daily transactions"], skills: ["Prometheus", "Grafana"] },
    ],
    education: [{ q: "BSc (Hons)", f: "Computer Science", inst: "UK university", year: "2015" }],
    certs: [{ name: "AWS Certified Solutions Architect – Professional", issuer: "Amazon Web Services", year: "2025" }, { name: "Certified Kubernetes Administrator", issuer: "CNCF", year: "2024" }],
  },
  {
    title: "Staff Full-Stack Engineer", headline: "Staff Full-Stack Engineer (React / Distributed Systems)", years: 8, region: "Manchester, UK", modes: ["hybrid"],
    min: 95000, max: 110000, availability: "two_weeks", industries: ["FinTech"], skills: ["React", "TypeScript", "Node.js", "PostgreSQL", "Kafka", "GraphQL", "Redis"],
    summary: "Full-stack engineer specialising in high-throughput transactional back ends and React front ends. Has led the redesign of payment processing services and introduced event-driven architecture with Kafka. Comfortable owning systems end to end, from data modelling to user experience.",
    highlights: ["Reduced p95 API latency by 42%", "Led front-end migration to Next.js"],
    experience: [{ title: "Staff Engineer", org: "UK payments scale-up", start: "2021", end: null, achievements: ["Designed event-driven settlement pipeline"], skills: ["Kafka", "Node.js"] }],
    education: [{ q: "MEng", f: "Software Engineering", inst: "UK university", year: "2017" }], certs: [],
  },
  {
    title: "VP of Product Management", headline: "VP of Product Management (Enterprise SaaS / B2B)", years: 14, region: "Bristol, UK", modes: ["remote"],
    min: 140000, max: 160000, availability: "one_month", industries: ["Enterprise SaaS"], skills: ["Product Strategy", "B2B SaaS", "Roadmapping", "PLG", "OKRs", "Pricing"],
    summary: "Product executive who has taken two venture-backed B2B SaaS products from early stage to scale. Experienced in enterprise pricing, product-led growth and building product teams of 20+ managers and designers. Works closely with commercial leadership on strategy and go-to-market.",
    highlights: ["Scaled product from seed to $45M ARR", "Built a 24-person product & design organisation"],
    experience: [{ title: "VP Product", org: "B2B SaaS company (Series C)", start: "2019", end: null, achievements: ["Introduced usage-based pricing"], skills: ["Pricing", "PLG"] }],
    education: [{ q: "MBA", f: "Business Administration", inst: "UK business school", year: "2012" }], certs: [],
  },
  {
    title: "Senior Machine Learning Engineer", headline: "Senior Machine Learning Engineer (LLMs & Computer Vision)", years: 6, region: "Cambridge, UK", modes: ["hybrid"],
    min: 100000, max: 115000, availability: "immediate", industries: ["Artificial Intelligence"], skills: ["PyTorch", "Python", "LLMs", "MLOps", "CUDA", "Vector Databases"],
    summary: "Applied machine learning engineer with production experience in fine-tuning large language models, retrieval-augmented generation and inference optimisation. Has deployed computer vision models in regulated environments and built MLOps tooling for model evaluation.",
    highlights: ["Halved inference cost through quantisation and batching"],
    experience: [{ title: "Senior ML Engineer", org: "AI research company", start: "2021", end: null, achievements: ["Built RAG platform used by 3 product teams"], skills: ["PyTorch", "Triton"] }],
    education: [{ q: "MSc", f: "Machine Learning", inst: "UK university", year: "2019" }], certs: [],
  },
  {
    title: "Head of Information Security", headline: "Head of Information Security & DevSecOps", years: 9, region: "Oxford, UK", modes: ["hybrid", "onsite"],
    min: 115000, max: 130000, availability: "three_months", industries: ["Cyber Security", "Financial Services"], skills: ["ISO 27001", "SOC 2", "SIEM", "Vault", "Threat Modelling", "Cloud Security"],
    summary: "Security leader experienced in building information security programmes for regulated financial services firms. Has led ISO 27001 certification projects, implemented SIEM and secrets management, and embedded security practices into engineering teams.",
    highlights: ["Led two successful ISO 27001 certifications"],
    experience: [{ title: "Head of Security", org: "Wealth management firm", start: "2020", end: null, achievements: ["Built a five-person security team"], skills: ["SIEM"] }],
    education: [{ q: "BSc", f: "Cyber Security", inst: "UK university", year: "2014" }], certs: [{ name: "CISSP", issuer: "ISC2", year: "2019" }],
  },
  {
    title: "Senior Data Analyst", headline: "Senior Data Analyst (Commercial Analytics)", years: 5, region: "Leeds, UK", modes: ["remote", "hybrid"],
    min: 55000, max: 65000, availability: "one_month", industries: ["Retail"], skills: ["SQL", "Power BI", "Python", "Data Analysis", "Excel", "Stakeholder Management"],
    summary: "Data analyst who turns commercial data into clear decisions for retail leadership teams. Experienced in building Power BI reporting suites, pricing analysis and forecasting models, and in presenting findings to non-technical stakeholders.",
    highlights: ["Built pricing dashboard adopted across 120 stores"],
    experience: [{ title: "Senior Data Analyst", org: "National retailer", start: "2022", end: null, achievements: ["Automated weekly trading reports"], skills: ["Power BI", "SQL"] }],
    education: [{ q: "BSc", f: "Mathematics", inst: "UK university", year: "2019" }], certs: [],
  },
  {
    title: "Finance Director", headline: "Finance Director (PE-backed growth businesses)", years: 15, region: "Birmingham, UK", modes: ["hybrid"],
    min: 130000, max: 150000, availability: "three_months", industries: ["Private Equity", "Manufacturing"], skills: ["Financial Modelling", "M&A", "FP&A", "Accounting", "Leadership"],
    summary: "Chartered accountant and finance director with experience leading finance functions through private-equity investment, acquisitions and exits. Strong in FP&A, cash management and building finance teams.",
    highlights: ["Supported two successful PE exits"],
    experience: [{ title: "Finance Director", org: "PE-backed manufacturer", start: "2018", end: null, achievements: ["Integrated three acquisitions"], skills: ["M&A"] }],
    education: [{ q: "BA", f: "Accounting & Finance", inst: "UK university", year: "2008" }], certs: [{ name: "ACA", issuer: "ICAEW", year: "2011" }],
  },
  {
    title: "Senior UX Designer", headline: "Senior UX / Product Designer", years: 7, region: "Edinburgh, UK", modes: ["remote"],
    min: 70000, max: 85000, availability: "two_weeks", industries: ["Enterprise SaaS"], skills: ["Figma", "UX Design", "User Research", "Design Systems", "Accessibility"],
    summary: "Product designer with a track record of shipping accessible, research-led experiences for complex B2B products. Has built and maintained design systems and led discovery work with enterprise customers.",
    highlights: ["Launched a design system used by 40 engineers"],
    experience: [{ title: "Senior Product Designer", org: "B2B software company", start: "2021", end: null, achievements: ["Improved onboarding completion by 28%"], skills: ["Figma"] }],
    education: [{ q: "BA", f: "Interaction Design", inst: "UK university", year: "2017" }], certs: [],
  },
];

async function main() {
  console.log("Seeding TalentVault development data (synthetic)…");

  const superId = await ensureUser("admin@talentvault.local", { role: "super_admin" });
  const recruiterId = await ensureUser("recruiter@talentvault.local", { role: "recruitment_admin" });
  await db.from("profiles").update({ full_name: "Sample Super Admin", job_title: "Platform Owner" }).eq("id", superId);
  await db.from("profiles").update({ full_name: "Sample Recruiter", job_title: "Senior Talent Partner" }).eq("id", recruiterId);

  const approvedId = await ensureUser("employer@example.com", {
    meta: { full_name: "Sample Hiring Manager", job_title: "Talent Director", company_name: "Sample Capital Group (Demo)", industry: "Financial Services", city: "London", company_size: "201–1,000" },
  });
  await ensureUser("pending@example.com", {
    meta: { full_name: "Sample Pending User", job_title: "HR Manager", company_name: "Sample Pending Ltd (Demo)", industry: "Technology", city: "Leeds" },
  });
  const { data: approvedProfile } = await db.from("profiles").select("employer_id").eq("id", approvedId).single();
  await db.from("employers").update({ status: "approved", approved_at: new Date().toISOString(), approved_by: superId }).eq("id", approvedProfile!.employer_id!);
  console.log("  users: admin@talentvault.local (super admin), recruiter@talentvault.local, employer@example.com (approved), pending@example.com (pending)");

  const { count } = await db.from("candidates").select("id", { count: "exact", head: true }).eq("is_sample", true);
  if ((count ?? 0) > 0) {
    console.log(`  ${count} sample candidates already present — skipping candidates.`);
  } else {
    for (const [i, s] of SAMPLES.entries()) {
      const { data: cand, error } = await db
        .from("candidates")
        .insert({ source: "manual", pipeline_status: "approved", profile_status: "published", is_sample: true, reviewed_by: recruiterId, reviewed_at: new Date().toISOString(), published_at: new Date(Date.now() - i * 86400_000).toISOString() })
        .select("id, ref")
        .single();
      if (error) throw error;
      await db.from("candidate_private").insert({ candidate_id: cand.id, full_name: `Sample Candidate ${i + 1}`, email: `sample.candidate${i + 1}@example.com`, phone: "+44 7700 900000", location_full: s.region });
      await db.from("candidate_profiles").insert({
        candidate_id: cand.id, ref: cand.ref, headline: s.headline, job_title: s.title, summary: s.summary, years_experience: s.years, location_region: s.region,
        work_modes: s.modes, salary_min: s.min, salary_max: s.max, availability: s.availability, industries: s.industries, skills: s.skills, highlights: s.highlights,
        published: true, published_at: new Date(Date.now() - i * 86400_000).toISOString(), is_sample: true,
      });
      await db.from("candidate_experience").insert(s.experience.map((e, n) => ({ candidate_id: cand.id, title: e.title, organisation_descriptor: e.org, start_date: e.start, end_date: e.end, is_current: !e.end, achievements: e.achievements, skills: e.skills, sort_order: n })));
      if (s.education.length) await db.from("candidate_education").insert(s.education.map((e, n) => ({ candidate_id: cand.id, qualification: e.q, field_of_study: e.f, institution_descriptor: e.inst, year: e.year, sort_order: n })));
      if (s.certs.length) await db.from("candidate_certifications").insert(s.certs.map((c, n) => ({ candidate_id: cand.id, name: c.name, issuer: c.issuer, year: c.year, sort_order: n })));
      await db.from("consent_records").insert(
        (["data_processing", "anonymised_marketplace", "contact_for_introductions"] as const).map((t) => ({ candidate_id: cand.id, consent_type: t, granted: true, consent_text: "Sample data — synthetic consent record", policy_version: "seed", source: "seed" })),
      );
    }
    console.log(`  ${SAMPLES.length} sample candidates (published, flagged is_sample)`);
  }

  const { count: tCount } = await db.from("testimonials").select("id", { count: "exact", head: true });
  if (!tCount) {
    await db.from("testimonials").insert([
      { quote: "Sample testimonial — replace with a real, approved client quote before launch.", author_role: "Talent Director", organisation_descriptor: "Financial services firm", is_published: false, is_sample: true },
    ]);
  }
  console.log(`Done. Seed password for all users: ${PASSWORD}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
