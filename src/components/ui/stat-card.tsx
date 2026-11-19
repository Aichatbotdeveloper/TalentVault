import { cn } from "@/lib/format";
import { Icon } from "./icon";

/** Metric card matching the Stitch KPI tiles (label, big number, icon chip, accent bar). */
export function StatCard({ label, value, icon, foot, accent = "green" }: { label: string; value: React.ReactNode; icon: string; foot?: React.ReactNode; accent?: "green" | "red" | "dark" | "mint" }) {
  const bar = { green: "from-primary-container to-secondary-fixed", red: "from-tertiary to-tertiary-fixed-dim", dark: "from-surface-alt to-outline", mint: "from-secondary-fixed-dim to-secondary-fixed" }[accent];
  const chip = { green: "bg-secondary-fixed/40 text-on-secondary-container", red: "bg-error-container text-on-error-container", dark: "bg-surface-container-high text-on-surface", mint: "bg-surface-container-high text-primary" }[accent];
  return (
    <div className="tv-panel relative overflow-hidden p-space-lg flex flex-col justify-between min-h-[150px]">
      <div className="flex items-start justify-between gap-space-sm">
        <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{label}</span>
        <span className={cn("h-9 w-9 shrink-0 rounded-full grid place-items-center", chip)}>
          <Icon name={icon} className="text-lg" />
        </span>
      </div>
      <div className={cn("font-display-lg text-[40px] font-extrabold tracking-tight leading-none my-space-sm", accent === "red" ? "text-tertiary" : "text-text-primary")}>{value}</div>
      {foot && <div className="font-body-sm text-body-sm text-text-muted">{foot}</div>}
      <div className={cn("absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r", bar)} />
    </div>
  );
}
