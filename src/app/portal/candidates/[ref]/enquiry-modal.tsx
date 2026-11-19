"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Field, FormMessage, SubmitButton, useFormAction } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { createEnquiry } from "../../actions";

interface Props {
  candidate: { ref: string; headline: string; experience: string; salary: string; availability: string };
  employer: { company: string; contactName: string; email: string; phone: string };
  openInitially: boolean;
  existingOpenEnquiryRef: string | null;
}

export function EnquiryModal({ candidate, employer, openInitially, existingOpenEnquiryRef }: Props) {
  const [open, setOpen] = useState(openInitially && !existingOpenEnquiryRef);
  const { state, action, v } = useFormAction(createEnquiry);
  const [chars, setChars] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const fe = state.fieldErrors ?? {};

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>("textarea, input:not([type=hidden]), button")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus();
    };
  }, [open]);

  return (
    <>
      {existingOpenEnquiryRef ? (
        <Link href={`/portal/enquiries/${existingOpenEnquiryRef}`} className="btn-secondary w-full">
          <Icon name="forward_to_inbox" className="text-lg" /> View open enquiry {existingOpenEnquiryRef}
        </Link>
      ) : (
        <button type="button" className="btn-primary w-full" onClick={() => setOpen(true)}>
          <Icon name="mail" className="text-lg" /> Submit Candidate Enquiry
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[70] flex items-start md:items-center justify-center p-space-md overflow-y-auto">
          <button type="button" aria-label="Close" className="fixed inset-0 bg-surface-alt/60 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="enquiry-title" className="relative w-full max-w-3xl bg-surface-container-lowest rounded-2xl shadow-2xl p-space-xl md:p-space-2xl my-space-xl">
            <button type="button" onClick={() => setOpen(false)} aria-label="Close dialog" className="absolute right-space-lg top-space-lg h-10 w-10 rounded-full bg-surface-container-low grid place-items-center hover:bg-surface-container-high">
              <Icon name="close" />
            </button>

            {state.ok ? (
              <div className="text-center py-space-xl" role="status">
                <span className="mx-auto mb-space-md h-16 w-16 rounded-full bg-secondary-fixed/50 text-on-secondary-container grid place-items-center"><Icon name="task_alt" className="text-4xl" /></span>
                <h2 id="enquiry-title" className="font-heading-md text-heading-md">Enquiry submitted</h2>
                <p className="font-body-md text-body-md text-text-muted mt-space-xs max-w-md mx-auto">
                  Reference <strong className="text-primary">{String(state.data?.ref ?? "")}</strong>. A TalentVault recruiter will confirm the candidate&apos;s interest and coordinate next steps.
                </p>
                <div className="flex justify-center gap-space-sm mt-space-xl">
                  <Link href={`/portal/enquiries/${String(state.data?.ref ?? "")}`} className="btn-primary">View in My Enquiries</Link>
                  <button type="button" className="btn-outline" onClick={() => setOpen(false)}>Close</button>
                </div>
              </div>
            ) : (
              <form action={action} noValidate className="space-y-space-lg">
                <div>
                  <div className="font-label-md text-label-md text-primary flex items-center gap-2"><Icon name="verified_user" className="text-lg" /> TalentVault managed enquiry</div>
                  <h2 id="enquiry-title" className="font-heading-md text-heading-md text-text-primary mt-1">Enquire About This Candidate</h2>
                  <p className="font-body-md text-body-md text-text-muted mt-1">Our team will confirm the candidate&apos;s interest and coordinate an introduction. Candidate identity is shared only with their consent.</p>
                </div>

                <div className="rounded-xl bg-secondary-fixed/25 p-space-md flex flex-col md:flex-row md:items-center gap-space-sm">
                  <span className="rounded-full bg-primary px-3 py-1 font-mono text-label-md text-on-primary self-start">Ref: #{candidate.ref}</span>
                  <div className="min-w-0">
                    <div className="font-heading-sm text-heading-sm text-text-primary truncate">{candidate.headline}</div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <span className="chip bg-surface-container-lowest">{candidate.experience}</span>
                      <span className="chip bg-surface-container-lowest">{candidate.salary}</span>
                      <span className="chip-green">{candidate.availability}</span>
                    </div>
                  </div>
                </div>

                <FormMessage state={state} />
                <input type="hidden" name="candidate_ref" value={candidate.ref} />

                <div className="rounded-xl bg-surface-container-low p-space-lg grid grid-cols-1 md:grid-cols-2 gap-space-md">
                  {[
                    ["Employer / client entity", employer.company],
                    ["Authorised contact person", employer.contactName],
                    ["Account email", employer.email],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div className="tv-label flex items-center justify-between">{label} <Icon name="lock" className="text-base text-outline" /></div>
                      <div className="tv-input flex items-center bg-surface-container-lowest">{value}</div>
                    </div>
                  ))}
                  <Field label="Direct contact phone" name="contact_phone" errors={fe.contact_phone} aside={<span className="font-label-sm text-label-sm text-text-muted">Editable</span>}>
                    <input id="contact_phone" name="contact_phone" type="tel" defaultValue={v("contact_phone", employer.phone)} className="tv-input" />
                  </Field>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                  <Field label="Role title" name="role_title" required errors={fe.role_title}>
                    <input id="role_title" name="role_title" defaultValue={v("role_title")} className="tv-input" placeholder="e.g. Principal Cloud Architect" maxLength={200} required />
                  </Field>
                  <Field label="Indicative salary / package (optional)" name="salary_offer" errors={fe.salary_offer}>
                    <input id="salary_offer" name="salary_offer" defaultValue={v("salary_offer")} className="tv-input" placeholder="e.g. £135k base + equity" maxLength={120} />
                  </Field>
                </div>

                <Field
                  label="Recruitment requirement & role overview"
                  name="requirement"
                  required
                  errors={fe.requirement}
                  aside={<span className="font-label-sm text-label-sm text-text-muted">{chars} / 1,000 characters</span>}
                >
                  <textarea
                    id="requirement"
                    name="requirement"
                    defaultValue={v("requirement")}
                    rows={5}
                    maxLength={1000}
                    required
                    onChange={(e) => setChars(e.target.value.length)}
                    className="tv-textarea"
                    placeholder="Explain the proposed role, project scope, tech stack and key responsibilities."
                  />
                </Field>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-space-sm pt-space-sm">
                  <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
                  <SubmitButton pendingText="Submitting enquiry…" icon="send">Submit Enquiry</SubmitButton>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
