import type { Database } from "./supabase/database.types";

type Availability = Database["public"]["Enums"]["availability"];
type WorkMode = Database["public"]["Enums"]["work_mode"];
type EnquiryStatus = Database["public"]["Enums"]["enquiry_status"];
type ProcessingStatus = Database["public"]["Enums"]["processing_status"];
type ProfileStatus = Database["public"]["Enums"]["profile_status"];
type EmployerStatus = Database["public"]["Enums"]["employer_status"];

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  immediate: "Immediate",
  two_weeks: "2 Weeks Notice",
  one_month: "1 Month Notice",
  three_months: "3 Months Notice",
  not_looking: "Passive / Not actively looking",
};
export const AVAILABILITY_OPTIONS = Object.entries(AVAILABILITY_LABELS) as [Availability, string][];

export const WORK_MODE_LABELS: Record<WorkMode, string> = { remote: "Remote", hybrid: "Hybrid", onsite: "On-site" };
export const WORK_MODE_OPTIONS = Object.entries(WORK_MODE_LABELS) as [WorkMode, string][];

export const ENQUIRY_STATUS_LABELS: Record<EnquiryStatus, string> = {
  new: "New",
  under_review: "Under Review",
  candidate_contacted: "Candidate Contacted",
  candidate_consented: "Candidate Consented",
  introduced: "Introduction Made",
  closed_placed: "Closed – Placed",
  closed_declined: "Closed – Declined",
  withdrawn: "Withdrawn",
};
export const ENQUIRY_STATUS_OPTIONS = Object.entries(ENQUIRY_STATUS_LABELS) as [EnquiryStatus, string][];
export const OPEN_ENQUIRY_STATUSES: EnquiryStatus[] = ["new", "under_review", "candidate_contacted", "candidate_consented"];

export const PROCESSING_STATUS_LABELS: Record<ProcessingStatus, string> = {
  uploaded: "Uploaded",
  queued: "Queued",
  processing: "Processing",
  awaiting_review: "Awaiting Review",
  approved: "Approved",
  failed: "Failed",
};
export const PROFILE_STATUS_LABELS: Record<ProfileStatus, string> = {
  draft: "Draft",
  published: "Published",
  unpublished: "Unpublished",
  archived: "Archived",
};
export const EMPLOYER_STATUS_LABELS: Record<EmployerStatus, string> = {
  pending: "Pending Approval",
  approved: "Approved",
  suspended: "Suspended",
  rejected: "Rejected",
};

export function formatMoney(n: number | null | undefined, currency = "GBP") {
  if (n == null) return null;
  const symbol = currency === "GBP" ? "£" : currency === "EUR" ? "€" : currency === "USD" ? "$" : "";
  if (n >= 1000) return `${symbol}${Math.round(n / 1000)}k`;
  return `${symbol}${n}`;
}

export function formatSalaryRange(min: number | null | undefined, max: number | null | undefined, currency = "GBP") {
  const a = formatMoney(min, currency);
  const b = formatMoney(max, currency);
  if (a && b) return a === b ? a : `${a} – ${b}`;
  if (a) return `${a}+`;
  if (b) return `Up to ${b}`;
  return "Not specified";
}

export function formatDate(d: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", ...opts }).format(new Date(d));
}

export function formatDateTime(d: string | Date | null | undefined) {
  return formatDate(d, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function timeAgo(d: string | Date | null | undefined) {
  if (!d) return "—";
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hrs ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} days ago`;
  return formatDate(d);
}

export function initials(name: string | null | undefined) {
  if (!name) return "TV";
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("") || "TV";
}

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
