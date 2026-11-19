import { cn } from "@/lib/format";

/** Material Symbols Outlined icon (self-hosted font), as used throughout the Stitch designs. */
export function Icon({ name, filled, className }: { name: string; filled?: boolean; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("material-symbols-outlined", filled && "filled", className)}>
      {name}
    </span>
  );
}
