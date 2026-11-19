/**
 * CMS content model. Each section has typed fields (rendered as an editor form
 * in /admin/content) and default copy used until an administrator publishes
 * changes. Defaults avoid unverifiable claims (certifications, "bias-free",
 * invented statistics) — the client should review all copy before launch.
 */
export type CardItem = { title: string; body: string; icon?: string };

export type FieldDef =
  | { key: string; label: string; type: "text"; max?: number; help?: string }
  | { key: string; label: string; type: "textarea"; max?: number; help?: string }
  | { key: string; label: string; type: "list"; help?: string }
  | { key: string; label: string; type: "cards"; help?: string }
  | { key: string; label: string; type: "richtext"; help?: string };

export interface SectionDef {
  page: string;
  key: string;
  label: string;
  route: string;
  fields: FieldDef[];
  defaults: Record<string, string | string[] | CardItem[]>;
}

export const CMS_PAGES: { page: string; label: string; route: string }[] = [
  { page: "home", label: "Homepage", route: "/" },
  { page: "about", label: "About Us", route: "/about" },
  { page: "services", label: "Recruitment Services", route: "/services" },
  { page: "employers", label: "For Employers", route: "/employers" },
  { page: "candidates", label: "For Candidates", route: "/candidates" },
  { page: "contact", label: "Contact Us", route: "/contact" },
  { page: "legal", label: "Privacy & Terms", route: "/privacy" },
];

export const CMS_SECTIONS: SectionDef[] = [
  {
    page: "home", key: "hero", label: "Hero Messaging & Value Proposition", route: "/",
    fields: [
      { key: "badge", label: "Eyebrow badge", type: "text", max: 80 },
      { key: "heading_line1", label: "Heading – line 1", type: "text", max: 40 },
      { key: "heading_highlight", label: "Heading – highlighted line", type: "text", max: 40 },
      { key: "heading_line3", label: "Heading – line 3", type: "text", max: 40 },
      { key: "lead", label: "Lead paragraph", type: "textarea", max: 320 },
      { key: "trust_points", label: "Trust indicators (one per line)", type: "list" },
    ],
    defaults: {
      badge: "Confidential candidate directory for approved employers",
      heading_line1: "Curated Talent.",
      heading_highlight: "AI-Assisted Profiles.",
      heading_line3: "Anonymous by Default.",
      lead: "Access our recruiter-reviewed, anonymised candidate directory. Discover experienced professionals by skills, experience, salary expectations and availability — identities are only shared with the candidate's consent.",
      trust_points: ["Every profile reviewed by a recruiter", "Identity shared only with consent", "Search by skills, salary & availability"],
    },
  },
  {
    page: "home", key: "promises", label: "Platform Promise Cards (metrics band)", route: "/",
    fields: [{ key: "cards", label: "Promise cards (shown beside live counts)", type: "cards", help: "Live profile and employer counts are calculated from the database automatically." }],
    defaults: {
      cards: [
        { title: "Human review", body: "No profile is published until a recruiter has checked the AI-assisted summary.", icon: "fact_check" },
        { title: "£0 upfront", body: "Fees are agreed with employers in writing; searching the directory is free for approved employers.", icon: "payments" },
      ],
    },
  },
  {
    page: "home", key: "samples", label: "Illustrative Candidate Cards", route: "/",
    fields: [{ key: "cards", label: "Example cards (title = role, body = summary, icon = skills comma-separated)", type: "cards", help: "These are illustrative examples and are labelled as such on the website." }],
    defaults: {
      cards: [
        { title: "Principal Cloud Systems Engineer", body: "12 yrs exp • London / Remote • £130k–£145k. Led multi-region Kubernetes platforms for high-volume transaction systems.", icon: "AWS EKS, Terraform, Go, SOC 2" },
        { title: "Head of Product Growth", body: "9 yrs exp • Manchester / Hybrid • £110k–£120k. Owned B2B SaaS growth strategy across product-led and sales-led motions.", icon: "PLG Funnels, Amplitude, Pricing" },
        { title: "Senior Machine Learning Engineer", body: "7 yrs exp • Cambridge / Hybrid • £105k–£115k. Built and deployed LLM inference pipelines in regulated environments.", icon: "PyTorch, Vector DBs, MLOps" },
      ],
    },
  },
  {
    page: "home", key: "methodology", label: "Platform Methodology (3 steps)", route: "/",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "heading", label: "Heading", type: "text" },
      { key: "lead", label: "Lead", type: "textarea" },
      { key: "steps", label: "Steps", type: "cards" },
    ],
    defaults: {
      eyebrow: "How it works",
      heading: "Platform Architecture & Methodology",
      lead: "A three-stage process combining AI-assisted CV processing with recruiter judgement.",
      steps: [
        { title: "AI-Assisted CV Processing", body: "Submitted CVs are converted into a structured profile — skills, experience, education and certifications — and personal identifiers are removed. A recruiter reviews every result.", icon: "memory" },
        { title: "Anonymous Discovery", body: "Approved employers search profiles by role, skills, experience, salary expectations and availability without seeing names, contact details or employer names.", icon: "visibility_off" },
        { title: "Consent-Led Introductions", body: "When an employer enquires, our recruiters contact the candidate. Identity is only shared after the candidate agrees to the introduction.", icon: "handshake" },
      ],
    },
  },
  {
    page: "home", key: "audiences", label: "Employer & Candidate Panels", route: "/",
    fields: [
      { key: "employer_heading", label: "Employer heading", type: "text" },
      { key: "employer_lead", label: "Employer lead", type: "textarea" },
      { key: "employer_points", label: "Employer points (one per line)", type: "list" },
      { key: "candidate_heading", label: "Candidate heading", type: "text" },
      { key: "candidate_lead", label: "Candidate lead", type: "textarea" },
      { key: "candidate_points", label: "Candidate points (one per line)", type: "list" },
    ],
    defaults: {
      employer_heading: "For Forward-Thinking Employers",
      employer_lead: "Reduce recruitment noise. Search a curated pool of reviewed, anonymised candidate profiles and let our recruiters manage introductions.",
      employer_points: ["Structured profiles: skills, experience, salary and availability at a glance", "Skills-first discovery: identities hidden at the shortlisting stage", "Recruiter-managed enquiries with a full status history"],
      candidate_heading: "For Exceptional Candidates",
      candidate_lead: "Be discovered by approved employers without broadcasting your CV. You stay in control of who learns your identity.",
      candidate_points: ["Confidential by default: your name and contact details are never shown to employers", "Recruiter-reviewed profile: we check your anonymised summary before it goes live", "Consent first: we ask before sharing your details for any introduction"],
    },
  },
  {
    page: "home", key: "cta", label: "Closing Call-to-Action", route: "/",
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "lead", label: "Lead", type: "textarea" },
    ],
    defaults: {
      heading: "Ready to Transform Your Talent Acquisition Pipeline?",
      lead: "Register your organisation to search anonymised profiles, or submit your CV to be considered for confidential opportunities.",
    },
  },
  {
    page: "about", key: "main", label: "About Us", route: "/about",
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "lead", label: "Lead", type: "textarea" },
      { key: "story", label: "Our story", type: "richtext" },
      { key: "values", label: "Values", type: "cards" },
    ],
    defaults: {
      heading: "A recruitment company built around discretion",
      lead: "TalentVault combines specialist recruiters with modern technology so employers can find the right people quickly — and candidates can explore opportunities confidentially.",
      story: "TalentVault was founded to fix two problems with traditional recruitment: employers spend too long sifting unstructured CVs, and strong candidates are reluctant to circulate their details widely.\n\nOur approach is simple. We represent candidates, structure their experience into clear anonymised profiles with the help of AI, and review every profile by hand. Approved employers search those profiles and enquire through us. We only make an introduction once the candidate agrees.",
      values: [
        { title: "Confidentiality", body: "Personal details stay private until a candidate consents to an introduction.", icon: "lock" },
        { title: "Human judgement", body: "AI helps us structure information; recruiters make the decisions.", icon: "psychology" },
        { title: "Transparency", body: "Employers see consistent, comparable information and a clear enquiry history.", icon: "visibility" },
      ],
    },
  },
  {
    page: "services", key: "main", label: "Recruitment Services", route: "/services",
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "lead", label: "Lead", type: "textarea" },
      { key: "services", label: "Services", type: "cards" },
    ],
    defaults: {
      heading: "Recruitment Services",
      lead: "From confidential candidate discovery to fully managed introductions, our services are designed around quality and discretion.",
      services: [
        { title: "Anonymous Candidate Directory", body: "Approved employers search reviewed profiles by role, skills, experience, salary expectations, availability and working preferences.", icon: "person_search" },
        { title: "AI-Assisted CV Processing", body: "Every submitted CV is structured into a consistent profile and anonymised, then checked by a recruiter before publication.", icon: "document_scanner" },
        { title: "Managed Enquiries & Introductions", body: "Send an enquiry about any profile. Our recruiters confirm the candidate's interest and arrange introductions with their consent.", icon: "forward_to_inbox" },
        { title: "Specialist Search", body: "Need someone who isn't in the directory yet? Our recruiters can run a targeted search on your behalf.", icon: "travel_explore" },
      ],
    },
  },
  {
    page: "employers", key: "main", label: "For Employers", route: "/employers",
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "lead", label: "Lead", type: "textarea" },
      { key: "steps", label: "How it works", type: "cards" },
      { key: "points", label: "What you get (one per line)", type: "list" },
    ],
    defaults: {
      heading: "Hire from a curated, anonymised talent pool",
      lead: "Register your organisation, get approved by our team, then search reviewed candidate profiles and enquire in a few clicks.",
      steps: [
        { title: "Register", body: "Create an employer account and tell us about your organisation and hiring needs.", icon: "app_registration" },
        { title: "Get approved", body: "Our team verifies your organisation before giving access to the private directory.", icon: "verified_user" },
        { title: "Search & enquire", body: "Filter profiles by skills, experience, salary, availability and location, then send an enquiry.", icon: "manage_search" },
        { title: "Meet candidates", body: "We contact the candidate, confirm their interest and arrange an introduction.", icon: "handshake" },
      ],
      points: ["Structured, comparable profiles", "Salary expectations and availability up front", "A full history of every enquiry", "Dedicated recruiter support"],
    },
  },
  {
    page: "candidates", key: "main", label: "For Candidates", route: "/candidates",
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "lead", label: "Lead", type: "textarea" },
      { key: "steps", label: "How it works", type: "cards" },
      { key: "privacy_points", label: "Privacy commitments (one per line)", type: "list" },
    ],
    defaults: {
      heading: "Be discovered — confidentially",
      lead: "Submit your CV once. We create an anonymised profile, review it with care and show it only to approved employers. Your identity stays private until you agree to an introduction.",
      steps: [
        { title: "Submit your CV", body: "Tell us about your target role, salary expectations, availability and working preferences.", icon: "upload_file" },
        { title: "We build your profile", body: "AI helps structure your experience and removes personal identifiers; a recruiter reviews the result.", icon: "auto_awesome" },
        { title: "Employers enquire", body: "Approved employers search anonymised profiles and enquire through our recruiters.", icon: "mark_email_unread" },
        { title: "You decide", body: "We contact you about each opportunity. Nothing is shared without your consent.", icon: "how_to_reg" },
      ],
      privacy_points: ["Your name, email, phone and CV are never shown to employers", "Previous employers are described generically, not named", "You can ask us to update, hide or delete your profile at any time"],
    },
  },
  {
    page: "contact", key: "main", label: "Contact Us", route: "/contact",
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "lead", label: "Lead", type: "textarea" },
    ],
    defaults: {
      heading: "Contact Us",
      lead: "Questions about hiring through TalentVault, your candidate profile or our services? Send us a message and a member of the team will reply.",
    },
  },
  {
    page: "legal", key: "privacy", label: "Privacy Policy", route: "/privacy",
    fields: [{ key: "body", label: "Privacy policy", type: "richtext", help: "Lines starting with '## ' become headings. Must be reviewed by your legal adviser." }],
    defaults: {
      body: "## Draft – subject to legal review\nThis privacy policy is a starting template provided with the platform. It must be reviewed and completed by the business and its legal advisers before launch.\n\n## Who we are\nTalentVault (\"we\") is a recruitment business. We act as the data controller for personal data submitted through this website.\n\n## What we collect\nCandidates: your name, contact details, location, CV and the professional information it contains, salary expectations, availability, work preferences and your consent choices. Employers: account holder details and organisation information.\n\n## How we use it\nWe use candidate data to assess suitability, create an anonymised profile for approved employers and contact you about opportunities. AI tools assist us in extracting and summarising CV information; a recruiter reviews all results. We do not make automated hiring decisions.\n\n## Sharing\nEmployers see anonymised profiles only. We share your identity with an employer only after you agree to a specific introduction. Service providers (hosting, email, AI processing) process data on our instructions.\n\n## Retention and your rights\nYou may request access, correction, deletion or restriction of your data, or withdraw consent, by contacting us. We retain data only as long as necessary for recruitment purposes.\n\n## Contact\nUse the details on our Contact page for any privacy request.",
    },
  },
  {
    page: "legal", key: "terms", label: "Terms & Conditions", route: "/terms",
    fields: [{ key: "body", label: "Terms and conditions", type: "richtext", help: "Must be reviewed by your legal adviser." }],
    defaults: {
      body: "## Draft – subject to legal review\nThese terms are a starting template and must be reviewed and completed by the business and its legal advisers before launch.\n\n## Employer accounts\nAccess to the candidate directory is granted at our discretion to verified organisations. Account holders must keep credentials secure and use candidate information only for genuine recruitment purposes.\n\n## Candidate information\nProfiles are anonymised summaries prepared from information supplied by candidates. While we review each profile, we do not guarantee its completeness or accuracy. Employers must not attempt to identify candidates or contact them other than through TalentVault.\n\n## Fees\nFees for introductions and placements are agreed separately in writing.\n\n## Acceptable use\nScraping, bulk export, reverse engineering or attempts to re-identify candidates are prohibited and may result in suspension.\n\n## Liability and governing law\nTo be completed by legal advisers.",
    },
  },
];

export function sectionDef(page: string, key: string) {
  return CMS_SECTIONS.find((s) => s.page === page && s.key === key);
}
