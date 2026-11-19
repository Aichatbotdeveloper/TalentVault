"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/format";
import { Icon } from "../ui/icon";
import { Logo } from "../ui/logo";

export const PUBLIC_NAV = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/services", label: "Services" },
  { href: "/employers", label: "For Employers" },
  { href: "/candidates", label: "For Candidates" },
  { href: "/contact", label: "Contact" },
];

export function PublicHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-20 max-w-7xl mx-auto px-margin lg:px-margin-desktop flex items-center justify-between gap-space-lg">
        <Logo />
        <nav aria-label="Main" className="hidden lg:flex items-center gap-space-xl">
          {PUBLIC_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "font-label-md text-label-md transition-colors",
                isActive(item.href) ? "text-primary font-semibold" : "text-on-surface-variant hover:text-on-surface",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden lg:flex items-center gap-space-sm">
          <Link href="/login" className="btn-ghost px-space-md">Sign In</Link>
          <Link href="/submit-cv" className="btn-outline">Submit CV</Link>
          <Link href="/employer/register" className="btn-primary">For Employers</Link>
        </div>
        <button
          type="button"
          className="lg:hidden h-10 w-10 grid place-items-center rounded-full hover:bg-surface-container-high"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
        >
          <Icon name={open ? "close" : "menu"} />
        </button>
      </div>
      {open && (
        <div id="mobile-nav" className="lg:hidden border-t border-border-subtle bg-surface-container-lowest px-margin pb-space-lg">
          <nav aria-label="Mobile" className="flex flex-col py-space-sm">
            {PUBLIC_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn("py-space-sm font-label-md text-label-md border-b border-surface-container-low", isActive(item.href) ? "text-primary" : "text-on-surface")}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="grid grid-cols-1 gap-space-xs">
            <Link href="/submit-cv" onClick={() => setOpen(false)} className="btn-outline">Submit CV</Link>
            <Link href="/employer/register" onClick={() => setOpen(false)} className="btn-primary">For Employers</Link>
            <Link href="/login" onClick={() => setOpen(false)} className="btn-ghost">Sign In</Link>
          </div>
        </div>
      )}
    </header>
  );
}
