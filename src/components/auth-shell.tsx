import Link from "next/link";
import { Icon } from "./ui/icon";
import { Logo } from "./ui/logo";

/** Split-screen authentication layout in the TalentVault visual language. */
export function AuthShell({ title, subtitle, children, variant = "employer", wide }: { title: string; subtitle?: React.ReactNode; children: React.ReactNode; variant?: "employer" | "admin"; wide?: boolean }) {
  const points =
    variant === "admin"
      ? [
          ["admin_panel_settings", "Role-based access", "Every action is permission-checked on the server and audited."],
          ["lock", "Confidential records", "Candidate identities and original CVs are visible to authorised staff only."],
        ]
      : [
          ["person_search", "Anonymous candidate discovery", "Search reviewed profiles by skills, experience, salary and availability."],
          ["forward_to_inbox", "Managed enquiries", "Our recruiters coordinate every introduction with candidate consent."],
          ["verified_user", "Verified organisations", "Directory access is enabled once your organisation is approved."],
        ];
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-surface">
      <aside className="hidden lg:flex lg:col-span-5 bg-surface-alt text-surface-bright p-space-4xl flex-col justify-between relative overflow-hidden">
        <div className="absolute -right-24 -bottom-24 w-96 h-96 bg-primary-container/25 rounded-full blur-3xl pointer-events-none" />
        <Logo tone="light" subtitle={variant === "admin" ? "Recruiter Core" : "Employer Portal"} />
        <div className="relative space-y-space-xl">
          <h2 className="font-display-lg text-[34px] font-extrabold leading-tight tracking-tight">
            {variant === "admin" ? "Recruitment operations console" : "Curated talent, discovered confidentially."}
          </h2>
          <ul className="space-y-space-lg">
            {points.map(([icon, t, b]) => (
              <li key={t} className="flex gap-space-md">
                <span className="h-10 w-10 rounded-full bg-primary-container/40 text-secondary-fixed grid place-items-center shrink-0"><Icon name={icon!} /></span>
                <div>
                  <div className="font-label-md text-label-md text-[15px]">{t}</div>
                  <div className="font-body-sm text-body-sm text-surface-variant">{b}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative font-body-sm text-body-sm text-surface-variant">
          <Link href="/" className="hover:text-surface-bright">← Back to website</Link>
        </div>
      </aside>
      <main className="lg:col-span-7 flex items-center justify-center px-margin py-space-3xl">
        <div className={wide ? "w-full max-w-2xl" : "w-full max-w-md"}>
          <div className="lg:hidden mb-space-2xl"><Logo /></div>
          <h1 className="font-display-lg text-display-lg-mobile font-extrabold tracking-tight text-text-primary">{title}</h1>
          {subtitle && <div className="font-body-md text-body-md text-text-muted mt-space-xs mb-space-xl">{subtitle}</div>}
          {children}
        </div>
      </main>
    </div>
  );
}
