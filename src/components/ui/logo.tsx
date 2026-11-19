import Link from "next/link";
import { cn } from "@/lib/format";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-9 w-9 shrink-0", className)} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#1a6840" />
      <path d="M16 6.5l8 3v6.2c0 5-3.4 9.2-8 10.3-4.6-1.1-8-5.3-8-10.3V9.5l8-3z" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M12.4 16.2l2.6 2.6 4.8-5" fill="none" stroke="#a7f3c0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ href = "/", tone = "dark", subtitle }: { href?: string; tone?: "dark" | "light"; subtitle?: string }) {
  return (
    <Link href={href} className="flex items-center gap-space-sm" aria-label="TalentVault home">
      <LogoMark />
      <span className="flex flex-col">
        <span className={cn("font-heading-sm text-heading-sm font-bold tracking-tight leading-none", tone === "dark" ? "text-primary" : "text-surface-bright")}>
          TalentVault
        </span>
        {subtitle && <span className="font-label-sm text-label-sm text-secondary-fixed font-semibold tracking-wide uppercase mt-1">{subtitle}</span>}
      </span>
    </Link>
  );
}
