"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function SortSelect({ options, value }: { options: Record<string, string>; value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <label className="flex items-center gap-2 font-label-sm text-label-sm text-text-muted">
      Sort:
      <select
        className="tv-select h-9 w-auto font-label-md text-label-md"
        value={value}
        onChange={(e) => {
          const sp = new URLSearchParams(params.toString());
          sp.set("sort", e.target.value);
          sp.delete("page");
          router.push(`${pathname}?${sp.toString()}`);
        }}
      >
        {Object.entries(options).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
    </label>
  );
}
