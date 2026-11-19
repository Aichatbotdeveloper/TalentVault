import { cn } from "@/lib/format";

const TONES = {
  green: "bg-secondary-fixed/40 text-on-secondary-container",
  greenSolid: "bg-primary-container text-on-primary",
  amber: "bg-[#fff3cd] text-[#7a5a00]",
  red: "bg-error-container text-on-error-container",
  grey: "bg-surface-container-high text-on-surface-variant",
  blue: "bg-[#dbeafe] text-[#1e3a8a]",
  dark: "bg-surface-alt text-surface-bright",
} as const;
export type Tone = keyof typeof TONES;

export function Pill({ tone = "grey", children, dot, className }: { tone?: Tone; children: React.ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-label-sm text-label-sm whitespace-nowrap", TONES[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export const PROCESSING_TONE: Record<string, Tone> = {
  uploaded: "grey", queued: "blue", processing: "amber", awaiting_review: "amber", approved: "green", failed: "red",
};
export const PROFILE_TONE: Record<string, Tone> = { draft: "grey", published: "greenSolid", unpublished: "amber", archived: "dark" };
export const EMPLOYER_TONE: Record<string, Tone> = { pending: "amber", approved: "green", suspended: "red", rejected: "dark" };
export const ENQUIRY_TONE: Record<string, Tone> = {
  new: "green", under_review: "blue", candidate_contacted: "amber", candidate_consented: "amber",
  introduced: "greenSolid", closed_placed: "greenSolid", closed_declined: "grey", withdrawn: "grey",
};
