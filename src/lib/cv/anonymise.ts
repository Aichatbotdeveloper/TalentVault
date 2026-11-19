import type { AnonymisedProfile, ExtractedCv } from "./schema";

export interface PiiFinding {
  type: "email" | "phone" | "url" | "name" | "employer" | "institution";
  field: string;
  count: number;
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const URL_RE = /\b(?:https?:\/\/|www\.)\S+|\b(?:linkedin|github)\.com\/\S+/gi;
// 9+ digits allowing spaces, dashes, dots, brackets and a leading +
const PHONE_RE = /(?:\+?\d[\d\s().-]{7,}\d)/g;

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Identifiers we know about for this candidate (from extraction / the submission form). */
export function collectIdentifiers(extracted: ExtractedCv, known: { fullName?: string | null; email?: string | null; phone?: string | null } = {}) {
  const names = new Set<string>();
  const addName = (n?: string | null) => {
    if (!n || n.startsWith("(")) return;
    names.add(n.trim());
    n.split(/\s+/).filter((p) => p.length >= 3).forEach((p) => names.add(p));
  };
  addName(extracted.personal.full_name);
  addName(known.fullName);
  const employers = extracted.employment.map((e) => e.employer_name).filter((x): x is string => !!x && x.trim().length >= 3);
  const institutions = extracted.education.map((e) => e.institution).filter((x): x is string => !!x && x.trim().length >= 3);
  return { names: [...names], employers, institutions };
}

/**
 * Deterministic safety net applied AFTER the AI anonymisation step.
 * Removes contact details and known identifiers from every text field.
 * This reduces — but cannot eliminate — re-identification risk; human review remains mandatory.
 */
export function scrubProfile(profile: AnonymisedProfile, ids: ReturnType<typeof collectIdentifiers>) {
  const findings = new Map<string, PiiFinding>();
  const note = (type: PiiFinding["type"], field: string, count: number) => {
    if (!count) return;
    const key = `${type}:${field}`;
    const f = findings.get(key) ?? { type, field, count: 0 };
    f.count += count;
    findings.set(key, f);
  };

  const replaceAll = (text: string, field: string): string => {
    let out = text;
    const apply = (re: RegExp, type: PiiFinding["type"], replacement: string) => {
      const matches = out.match(re);
      if (matches?.length) {
        note(type, field, matches.length);
        out = out.replace(re, replacement);
      }
    };
    apply(EMAIL_RE, "email", "[email removed]");
    apply(URL_RE, "url", "[link removed]");
    let phoneHits = 0;
    out = out.replace(PHONE_RE, (m) => {
      const digits = m.replace(/\D/g, "");
      // Ignore year ranges ("2018 - 2022") and short numbers; phones have 9–15 digits.
      if (digits.length < 9 || digits.length > 15 || /^\d{4}\s*[-–]\s*\d{4}$/.test(m.trim())) return m;
      phoneHits++;
      return "[phone removed]";
    });
    note("phone", field, phoneHits);
    // Longest first so full names are replaced before their parts.
    for (const n of [...ids.names].sort((a, b) => b.length - a.length)) {
      apply(new RegExp(`\\b${escapeRegExp(n)}\\b`, "gi"), "name", "the candidate");
    }
    for (const e of ids.employers) apply(new RegExp(`\\b${escapeRegExp(e)}\\b`, "gi"), "employer", "[organisation]");
    for (const i of ids.institutions) apply(new RegExp(`\\b${escapeRegExp(i)}\\b`, "gi"), "institution", "[institution]");
    return out;
  };

  const walk = <T>(value: T, path: string): T => {
    if (typeof value === "string") return replaceAll(value, path) as T;
    if (Array.isArray(value)) return value.map((v, i) => walk(v, `${path}[${i}]`)) as T;
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v, path ? `${path}.${k}` : k)])) as T;
    }
    return value;
  };

  const cleaned = walk(profile, "");
  return { profile: cleaned, findings: [...findings.values()] };
}
