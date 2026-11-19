"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { markAllNotificationsRead } from "@/lib/actions/notifications";
import { timeAgo } from "@/lib/format";
import { Icon } from "../ui/icon";

export interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export function NotificationsBell({ items }: { items: NotificationItem[] }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const unread = items.filter((i) => !i.read_at).length;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        className="relative w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
      >
        <Icon name="notifications" className="text-xl" />
        {unread > 0 && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary-container" />}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[min(90vw,360px)] tv-card shadow-float z-50 overflow-hidden">
          <div className="flex items-center justify-between px-space-md py-space-sm border-b border-border-subtle">
            <span className="font-label-md text-label-md">Notifications</span>
            {unread > 0 && (
              <button type="button" disabled={pending} onClick={() => start(() => markAllNotificationsRead())} className="font-label-sm text-label-sm text-primary">
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto divide-y divide-border-subtle">
            {items.length === 0 && <li className="px-space-md py-space-lg font-body-sm text-body-sm text-text-muted">No notifications yet.</li>}
            {items.map((n) => (
              <li key={n.id} className={n.read_at ? "" : "bg-secondary-fixed/10"}>
                <Link href={n.link ?? "#"} onClick={() => setOpen(false)} className="block px-space-md py-space-sm hover:bg-surface-container-low">
                  <div className="font-label-md text-label-md text-text-primary">{n.title}</div>
                  {n.body && <div className="font-body-sm text-body-sm text-text-muted line-clamp-2">{n.body}</div>}
                  <div className="font-label-sm text-label-sm text-outline mt-0.5">{timeAgo(n.created_at)}</div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
