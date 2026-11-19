import Link from "next/link";
import { Icon } from "../ui/icon";

export function PageHeader({
  crumbs,
  title,
  description,
  actions,
  badge,
}: {
  crumbs?: { label: string; href?: string }[];
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="mb-space-xl">
      {crumbs && (
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant mb-space-sm">
          {crumbs.map((c, i) => (
            <span key={c.label} className="flex items-center gap-1">
              {i > 0 && <Icon name="chevron_right" className="text-sm" />}
              {c.href ? <Link href={c.href} className="hover:text-on-surface">{c.label}</Link> : <span className="text-primary">{c.label}</span>}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-space-lg">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-space-sm">
            <h1 className="page-title">{title}</h1>
            {badge}
          </div>
          {description && <p className="font-body-md text-body-md text-on-surface-variant mt-space-xs">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-space-sm">{actions}</div>}
      </div>
    </div>
  );
}
