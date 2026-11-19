import Link from "next/link";
import { ENQUIRY_STATUS_LABELS, OPEN_ENQUIRY_STATUSES, formatDateTime, formatSalaryRange } from "@/lib/format";
import type { getEmployerEnquiry } from "@/lib/data/enquiries";
import { withdrawEnquiry } from "@/app/portal/actions";
import { ENQUIRY_TONE, Pill } from "../ui/status";
import { Icon } from "../ui/icon";
import { SubmitButton } from "../ui/form";
import { ReplyForm } from "./reply-form";

type Enquiry = NonNullable<Awaited<ReturnType<typeof getEmployerEnquiry>>>;

function eventTitle(ev: Enquiry["events"][number]) {
  switch (ev.type) {
    case "created": return "Enquiry submitted";
    case "status_change": return `Status: ${ev.to_status ? ENQUIRY_STATUS_LABELS[ev.to_status] : "updated"}`;
    case "introduction": return "Introduction arranged";
    case "message": return "Message";
    default: return "Update";
  }
}

export function EnquiryDetail({ e, userId }: { e: Enquiry; userId: string }) {
  const open = OPEN_ENQUIRY_STATUSES.includes(e.status);
  return (
    <div className="space-y-space-lg">
      <div className="flex items-start justify-between gap-space-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-mono font-bold text-heading-md text-text-primary">#{e.ref}</h2>
            <Pill tone={ENQUIRY_TONE[e.status]} dot>{ENQUIRY_STATUS_LABELS[e.status]}</Pill>
          </div>
          <p className="font-body-sm text-body-sm text-text-muted mt-1">Submitted {formatDateTime(e.created_at)}{e.createdByName ? ` by ${e.createdByName}` : ""}</p>
        </div>
        <Link href={`/portal/enquiries/${e.ref}`} className="h-9 w-9 grid place-items-center rounded-full bg-surface-container-low hover:bg-surface-container-high" aria-label="Open full page"><Icon name="open_in_full" className="text-lg" /></Link>
      </div>

      <div className="rounded-xl bg-surface-container-low p-space-md">
        <div className="flex justify-between font-label-sm text-label-sm uppercase text-text-muted">
          <span>Target profile</span>
          {e.candidate && <span className="text-on-surface">{formatSalaryRange(e.candidate.salary_min, e.candidate.salary_max)}</span>}
        </div>
        {e.candidate ? (
          <Link href={`/portal/candidates/${e.candidate.ref}`} className="flex items-center gap-space-sm mt-space-sm group">
            <span className="h-11 w-11 rounded-lg bg-primary text-on-primary grid place-items-center font-bold">TV</span>
            <div className="min-w-0">
              <div className="font-heading-sm text-heading-sm font-bold group-hover:text-primary-container">Candidate #{e.candidate.ref}</div>
              <div className="font-body-sm text-body-sm text-text-muted truncate">{e.candidate.headline}</div>
            </div>
          </Link>
        ) : (
          <p className="font-body-sm text-body-sm text-text-muted mt-space-sm">This profile is no longer published. Your enquiry history is retained.</p>
        )}
      </div>

      <div>
        <h3 className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant mb-space-xs">Original brief — {e.role_title}</h3>
        <blockquote className="rounded-xl bg-surface-container-low p-space-md font-body-sm text-body-sm text-on-surface whitespace-pre-line">“{e.requirement}”</blockquote>
        {e.salary_offer && <p className="font-body-sm text-body-sm text-text-muted mt-1">Indicative package: {e.salary_offer}</p>}
      </div>

      <div>
        <h3 className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant mb-space-sm">Activity &amp; audit trail</h3>
        <ol className="relative border-l-2 border-surface-container-high ml-1.5 space-y-space-md">
          {e.events.map((ev, i) => {
            const mine = ev.author_id === userId;
            const fromTeam = ev.type === "message" && !mine;
            return (
              <li key={ev.id} className="pl-space-md relative">
                <span className={`absolute -left-[7px] top-1.5 h-3 w-3 rounded-full ${i === 0 ? "bg-primary-container" : "bg-outline"}`} />
                <div className="flex justify-between gap-2">
                  <span className="font-label-md text-label-md text-text-primary">{fromTeam ? "TalentVault team" : mine && ev.type === "message" ? "You" : eventTitle(ev)}</span>
                  <span className="font-label-sm text-label-sm text-text-muted whitespace-nowrap">{formatDateTime(ev.created_at)}</span>
                </div>
                {ev.body && (
                  <p className={`font-body-sm text-body-sm mt-1 whitespace-pre-line ${fromTeam ? "rounded-lg bg-secondary-fixed/25 p-space-sm text-on-surface" : "text-on-surface-variant"}`}>{ev.body}</p>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {open && (
        <div className="space-y-space-sm">
          <ReplyForm enquiryId={e.id} />
          <form action={withdrawEnquiry}>
            <input type="hidden" name="enquiry_id" value={e.id} />
            <SubmitButton className="btn-ghost btn-sm text-error" pendingText="Withdrawing…" confirm="Withdraw this enquiry? This cannot be undone.">Withdraw enquiry</SubmitButton>
          </form>
        </div>
      )}
    </div>
  );
}
