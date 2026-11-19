"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/format";
import { Icon } from "../ui/icon";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: number;
  exact?: boolean;
}

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1" aria-label="Application">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center justify-between px-space-sm py-space-xs rounded-xl transition-all font-label-md text-label-md min-h-10",
              active ? "bg-primary-container text-on-primary font-semibold" : "text-surface-variant hover:bg-surface/10 hover:text-surface-bright",
            )}
          >
            <span className="flex items-center gap-space-sm">
              <Icon name={item.icon} className="text-xl" />
              {item.label}
            </span>
            {!!item.badge && (
              <span className={cn("px-2 py-0.5 rounded-full text-label-sm font-label-sm", active ? "bg-on-primary/20 text-on-primary" : "bg-primary-container text-on-primary")}>{item.badge}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function SidebarNav({ items }: { items: NavItem[] }) {
  return <NavLinks items={items} />;
}

/** Mobile drawer version of the sidebar. */
export function MobileNav({ items, header, footer }: { items: NavItem[]; header: React.ReactNode; footer: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="lg:hidden h-10 w-10 grid place-items-center rounded-full hover:bg-surface-container-high" aria-label="Open navigation" onClick={() => setOpen(true)}>
        <Icon name="menu" />
      </button>
      {open && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          <button type="button" aria-label="Close navigation" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-surface-alt text-surface-bright p-space-md flex flex-col justify-between overflow-y-auto">
            <div className="flex flex-col gap-space-xl">
              <div className="flex items-center justify-between">
                {header}
                <button type="button" aria-label="Close navigation" onClick={() => setOpen(false)} className="text-surface-variant"><Icon name="close" /></button>
              </div>
              <NavLinks items={items} onNavigate={() => setOpen(false)} />
            </div>
            {footer}
          </div>
        </div>
      )}
    </>
  );
}
