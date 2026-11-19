"use client";

import { Field, FormMessage, SubmitButton, useFormAction } from "@/components/ui/form";
import { updateCompany } from "../actions";

type Company = Record<string, string | null>;

export function CompanyForm({ company, canEdit }: { company: Company; canEdit: boolean }) {
  const { state, action, v, fe } = useFormAction(updateCompany);
  const field = (name: string, label: string, opts: { required?: boolean; textarea?: boolean } = {}) => (
    <Field label={label} name={name} required={opts.required} errors={fe[name]}>
      {opts.textarea ? (
        <textarea id={name} name={name} rows={4} defaultValue={v(name, company[name] ?? "")} className="tv-textarea" disabled={!canEdit} />
      ) : (
        <input id={name} name={name} defaultValue={v(name, company[name] ?? "")} className="tv-input" disabled={!canEdit} required={opts.required} />
      )}
    </Field>
  );
  return (
    <form action={action} className="space-y-space-lg">
      <FormMessage state={state} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
        {field("company_name", "Company name", { required: true })}
        {field("company_number", "Registration number")}
        {field("vat_number", "VAT number")}
        {field("website", "Website")}
        {field("industry", "Industry")}
        {field("company_size", "Company size")}
        {field("address_line", "Address")}
        {field("city", "City")}
        {field("country", "Country")}
      </div>
      {field("description", "About the company", { textarea: true })}
      {field("hiring_needs", "Typical hiring needs", { textarea: true })}
      {canEdit ? <SubmitButton icon="save">Save Company Profile</SubmitButton> : <p className="tv-help">Only the account owner can edit company details.</p>}
    </form>
  );
}
