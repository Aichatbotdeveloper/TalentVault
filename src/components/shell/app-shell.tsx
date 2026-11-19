import { Icon } from "../ui/icon";
import { Logo } from "../ui/logo";
import { MobileNav, SidebarNav, type NavItem } from "./sidebar-nav";
import { NotificationsBell, type NotificationItem } from "./notifications-bell";

/**
 * Application shell from the Stitch dashboards: fixed dark-slate sidebar (#121519, w-72)
 * and a translucent top bar with breadcrumb, quick search and notifications.
 */
export function AppShell({
  nav,
  subtitle,
  homeHref,
  searchAction,
  searchPlaceholder,
  workspaceLabel,
  sectionLabel,
  account,
  notifications,
  children,
}: {
  nav: NavItem[];
  subtitle: string;
  homeHref: string;
  searchAction: string;
  searchPlaceholder: string;
  workspaceLabel: string;
  sectionLabel: string;
  account: React.ReactNode;
  notifications: NotificationItem[];
  children: React.ReactNode;
}) {
  const brand = <Logo tone="light" href={homeHref} subtitle={subtitle} />;
  return (
    <div className="min-h-screen bg-surface">
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-72 bg-surface-alt text-surface-bright z-50 flex-col justify-between p-space-md overflow-y-auto">
        <div className="flex flex-col gap-space-xl">
          <div className="px-space-xs pt-space-xs">{brand}</div>
          <form action={searchAction} method="get" className="px-space-xs" role="search">
            <label className="h-10 rounded-full bg-surface/10 flex items-center px-space-sm gap-space-xs text-surface-variant">
              <Icon name="search" className="text-lg" />
              <span className="sr-only">Quick search</span>
              <input name="q" className="bg-transparent border-0 outline-none w-full text-body-sm font-body-sm text-surface-bright placeholder:text-surface-variant/70" placeholder="Quick scan candidates..." />
            </label>
          </form>
          <SidebarNav items={nav} />
        </div>
        <div className="pt-space-md border-t border-surface-container/10 px-space-xs">{account}</div>
      </aside>

      <header className="fixed top-0 left-0 lg:left-72 right-0 h-16 bg-surface/90 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between gap-space-sm px-margin lg:px-margin-desktop">
        <div className="flex items-center gap-space-sm">
          <MobileNav items={nav} header={brand} footer={<div className="pt-space-md border-t border-surface-container/10">{account}</div>} />
          <div className="hidden sm:flex items-center gap-space-sm text-on-surface-variant font-label-md text-label-md">
            <span>{workspaceLabel}</span>
            <Icon name="chevron_right" className="text-sm" />
            <span className="text-on-surface font-semibold">{sectionLabel}</span>
          </div>
        </div>
        <div className="flex items-center gap-space-md">
          <form action={searchAction} method="get" role="search" className="relative hidden md:block w-72">
            <Icon name="manage_search" className="absolute left-3 top-2.5 text-on-surface-variant text-lg" />
            <input name="q" aria-label="Search" className="w-full h-10 pl-9 pr-space-sm rounded-full bg-surface-container-low text-on-surface text-body-sm font-body-sm outline-none focus:ring-2 focus:ring-focus-ring/20" placeholder={searchPlaceholder} />
          </form>
          <NotificationsBell items={notifications} />
        </div>
      </header>

      <main id="main" className="lg:pl-72 pt-16">
        <div className="max-w-[1400px] mx-auto px-margin lg:px-margin-desktop py-space-xl">{children}</div>
      </main>
    </div>
  );
}
