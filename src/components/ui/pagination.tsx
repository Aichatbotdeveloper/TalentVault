import Link from "next/link";
import { cn } from "@/lib/format";
import { Icon } from "./icon";

/** Link-based pagination preserving existing query params. */
export function Pagination({ page, pageSize, total, basePath, params }: { page: number; pageSize: number; total: number; basePath: string; params: Record<string, string | string[] | undefined> }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (k === "page") return;
      (Array.isArray(v) ? v : v ? [v] : []).forEach((x) => sp.append(k, x));
    });
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const window = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages));
  const list = [...window].sort((a, b) => a - b);
  return (
    <nav aria-label="Pagination" className="flex items-center gap-1">
      <Link aria-disabled={page <= 1} href={href(Math.max(1, page - 1))} className={cn("h-9 w-9 grid place-items-center rounded-lg border border-border-subtle bg-surface-container-lowest", page <= 1 && "pointer-events-none opacity-40")}>
        <Icon name="chevron_left" className="text-lg" />
        <span className="sr-only">Previous</span>
      </Link>
      {list.map((p, i) => (
        <span key={p} className="flex items-center gap-1">
          {i > 0 && list[i - 1]! < p - 1 && <span className="px-1 text-text-muted">…</span>}
          <Link
            href={href(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(
              "h-9 min-w-9 px-2 grid place-items-center rounded-lg font-label-md text-label-md",
              p === page ? "bg-primary-container text-on-primary" : "border border-border-subtle bg-surface-container-lowest hover:bg-surface-container-low",
            )}
          >
            {p}
          </Link>
        </span>
      ))}
      <Link aria-disabled={page >= pages} href={href(Math.min(pages, page + 1))} className={cn("h-9 w-9 grid place-items-center rounded-lg border border-border-subtle bg-surface-container-lowest", page >= pages && "pointer-events-none opacity-40")}>
        <Icon name="chevron_right" className="text-lg" />
        <span className="sr-only">Next</span>
      </Link>
    </nav>
  );
}
