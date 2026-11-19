"use client";

import { useEffect, useState } from "react";
import { Icon } from "../ui/icon";

/** Selection bar for a <form id={formId}> containing checkboxes named "ids" (Stitch "3 Candidates Selected" bar). */
export function BatchBar({ formId, actions }: { formId: string; actions: { op: string; label: string; icon: string; tone?: "primary" | "danger" | "dark"; confirm?: string }[] }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    const update = () => setCount(form.querySelectorAll<HTMLInputElement>('input[name="ids"]:checked').length);
    form.addEventListener("change", update);
    update();
    return () => form.removeEventListener("change", update);
  }, [formId]);
  return (
    <div className={`sticky bottom-space-md z-30 transition-all ${count ? "opacity-100 translate-y-0" : "opacity-0 pointer-events-none translate-y-4"}`}>
      <div className="rounded-2xl bg-surface-alt text-surface-bright px-space-lg py-space-md flex flex-col md:flex-row md:items-center justify-between gap-space-md shadow-2xl">
        <div className="flex items-center gap-space-sm font-heading-sm text-heading-sm">
          <span className="h-2.5 w-2.5 rounded-full bg-secondary-fixed" /> {count} Selected
        </div>
        <div className="flex flex-wrap gap-space-sm">
          {actions.map((a) => (
            <button
              key={a.op}
              form={formId}
              type="submit"
              name="op"
              value={a.op}
              onClick={(e) => {
                if (a.confirm && !window.confirm(a.confirm)) e.preventDefault();
              }}
              className={a.tone === "danger" ? "btn bg-tertiary text-on-tertiary hover:bg-tertiary-container" : a.tone === "dark" ? "btn bg-surface/10 text-surface-bright hover:bg-surface/20" : "btn-primary"}
            >
              <Icon name={a.icon} className="text-lg" /> {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SelectAll({ formId }: { formId: string }) {
  return (
    <input
      type="checkbox"
      aria-label="Select all rows"
      className="accent-[#1a6840] h-4 w-4"
      onChange={(e) => {
        const form = document.getElementById(formId);
        form?.querySelectorAll<HTMLInputElement>('input[name="ids"]').forEach((cb) => (cb.checked = e.target.checked));
        form?.dispatchEvent(new Event("change", { bubbles: true }));
      }}
    />
  );
}
