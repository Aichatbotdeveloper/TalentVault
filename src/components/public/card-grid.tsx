import type { CardItem } from "@/lib/cms/definitions";
import { Icon } from "../ui/icon";

export function CardGrid({ items, numbered, cols = 3 }: { items: CardItem[]; numbered?: boolean; cols?: 2 | 3 | 4 }) {
  const grid = { 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-2 lg:grid-cols-4" }[cols];
  return (
    <div className={`grid grid-cols-1 ${grid} gap-space-xl`}>
      {items.map((item, i) => (
        <div key={item.title} className="bg-surface-container-lowest p-space-xl rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <div className="w-12 h-12 rounded-full bg-primary-fixed/40 text-primary flex items-center justify-center font-heading-sm text-heading-sm font-bold mb-space-lg">
            {numbered ? String(i + 1).padStart(2, "0") : <Icon name={item.icon ?? "check"} />}
          </div>
          <h3 className="font-heading-sm text-heading-sm text-text-primary font-bold mb-space-xs">{item.title}</h3>
          <p className="font-body-md text-body-md text-text-muted leading-relaxed">{item.body}</p>
        </div>
      ))}
    </div>
  );
}
