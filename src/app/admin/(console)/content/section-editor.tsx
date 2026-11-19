"use client";

import { useState } from "react";
import { FormMessage, SubmitButton, useFormAction } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import type { CardItem, SectionDef } from "@/lib/cms/definitions";
import { saveSection } from "./actions";

type Content = Record<string, string | string[] | CardItem[]>;

export function SectionEditor({ def, initial }: { def: Pick<SectionDef, "page" | "key" | "fields" | "label">; initial: Content }) {
  const { state, action } = useFormAction(saveSection);
  const [content, setContent] = useState<Content>(initial);
  const set = (k: string, v: Content[string]) => setContent((c) => ({ ...c, [k]: v }));

  return (
    <form action={action} className="space-y-space-lg">
      <input type="hidden" name="page" value={def.page} />
      <input type="hidden" name="section_key" value={def.key} />
      <input type="hidden" name="content_json" value={JSON.stringify(content)} />
      <FormMessage state={state} />
      {def.fields.map((f) => {
        const value = content[f.key];
        if (f.type === "text") {
          const s = typeof value === "string" ? value : "";
          return (
            <label key={f.key} className="block">
              <span className="tv-label flex justify-between">{f.label}{f.max && <span className="font-body-sm text-text-muted">{s.length} / {f.max}</span>}</span>
              <input value={s} maxLength={f.max} onChange={(e) => set(f.key, e.target.value)} className="tv-input" />
              {f.help && <span className="tv-help block">{f.help}</span>}
            </label>
          );
        }
        if (f.type === "textarea" || f.type === "richtext") {
          const s = typeof value === "string" ? value : "";
          return (
            <label key={f.key} className="block">
              <span className="tv-label flex justify-between">{f.label}{"max" in f && f.max ? <span className="font-body-sm text-text-muted">{s.length} / {f.max}</span> : null}</span>
              <textarea value={s} rows={f.type === "richtext" ? 16 : 4} onChange={(e) => set(f.key, e.target.value)} className="tv-textarea font-body-sm" />
              {f.help && <span className="tv-help block">{f.help}</span>}
            </label>
          );
        }
        if (f.type === "list") {
          const list = Array.isArray(value) ? (value as string[]) : [];
          return (
            <label key={f.key} className="block">
              <span className="tv-label">{f.label}</span>
              <textarea value={list.join("\n")} rows={Math.max(3, list.length + 1)} onChange={(e) => set(f.key, e.target.value.split("\n"))} onBlur={() => set(f.key, list.map((x) => x.trim()).filter(Boolean))} className="tv-textarea" />
              {f.help && <span className="tv-help block">{f.help}</span>}
            </label>
          );
        }
        const cards = Array.isArray(value) ? (value as CardItem[]) : [];
        const upd = (i: number, patch: Partial<CardItem>) => set(f.key, cards.map((c, n) => (n === i ? { ...c, ...patch } : c)));
        return (
          <fieldset key={f.key}>
            <legend className="tv-label">{f.label}</legend>
            {f.help && <p className="tv-help mb-space-sm">{f.help}</p>}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md">
              {cards.map((c, i) => (
                <div key={i} className="rounded-xl bg-surface-container-low p-space-md space-y-2">
                  <div className="flex justify-between items-center"><span className="font-label-sm text-label-sm uppercase text-text-muted">Card {i + 1}</span>
                    <span className="flex gap-1">
                      <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => { const n = [...cards]; [n[i - 1], n[i]] = [n[i]!, n[i - 1]!]; set(f.key, n); }} className="h-7 w-7 grid place-items-center rounded hover:bg-surface-container-high disabled:opacity-30"><Icon name="arrow_upward" className="text-base" /></button>
                      <button type="button" aria-label="Remove card" onClick={() => set(f.key, cards.filter((_, n) => n !== i))} className="h-7 w-7 grid place-items-center rounded hover:bg-surface-container-high"><Icon name="delete" className="text-base" /></button>
                    </span>
                  </div>
                  <input aria-label="Card title" value={c.title} onChange={(e) => upd(i, { title: e.target.value })} className="tv-input" placeholder="Title" />
                  <textarea aria-label="Card description" value={c.body} onChange={(e) => upd(i, { body: e.target.value })} rows={3} className="tv-textarea" placeholder="Description" />
                  <input aria-label="Card icon or tags" value={c.icon ?? ""} onChange={(e) => upd(i, { icon: e.target.value })} className="tv-input" placeholder="Icon name (Material Symbols) or tags" />
                </div>
              ))}
            </div>
            <button type="button" className="btn-secondary btn-sm mt-space-sm" onClick={() => set(f.key, [...cards, { title: "", body: "", icon: "" }])}><Icon name="add" className="text-base" /> Add card</button>
          </fieldset>
        );
      })}
      <div className="sticky bottom-space-md rounded-2xl bg-surface-alt text-surface-bright px-space-lg py-space-md flex flex-col sm:flex-row items-center justify-between gap-space-sm shadow-2xl">
        <span className="font-label-md text-label-md flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-secondary-fixed" /> Editing: {def.label}</span>
        <div className="flex gap-space-sm">
          <SubmitButton name="intent" value="draft" className="btn bg-surface/10 text-surface-bright hover:bg-surface/20" icon="save" pendingText="Saving…">Save Draft</SubmitButton>
          <SubmitButton name="intent" value="publish" icon="publish" pendingText="Publishing…" confirm="Publish this section to the live website?">Publish to Live</SubmitButton>
        </div>
      </div>
    </form>
  );
}
