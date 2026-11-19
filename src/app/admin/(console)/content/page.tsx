import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shell/page-header";
import { SubmitButton } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/status";
import { requireAdminPage } from "@/lib/auth";
import { CMS_PAGES, CMS_SECTIONS, type CardItem } from "@/lib/cms/definitions";
import { cn, formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { deleteTestimonial, discardDraft, saveTestimonial } from "./actions";
import { SectionEditor } from "./section-editor";

export const metadata: Metadata = { title: "Website Content" };

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ page?: string; section?: string; v?: string }> }) {
  await requireAdminPage("cms.manage");
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: rows }, { data: testimonials }, { data: stats }] = await Promise.all([
    supabase.from("cms_sections").select("page, section_key, draft_content, published_content, has_unpublished_changes, updated_at, published_at"),
    supabase.from("testimonials").select("*").order("sort_order").order("created_at"),
    supabase.rpc("get_public_stats"),
  ]);
  const byKey = new Map((rows ?? []).map((r) => [`${r.page}/${r.section_key}`, r]));
  const showTestimonials = sp.section === "testimonials";
  const def = showTestimonials ? null : CMS_SECTIONS.find((s) => s.page === (sp.page ?? "home") && s.key === (sp.section ?? "hero")) ?? CMS_SECTIONS[0]!;
  const row = def ? byKey.get(`${def.page}/${def.key}`) : undefined;
  const initial = { ...(def?.defaults ?? {}), ...((row?.draft_content ?? {}) as Record<string, string | string[] | CardItem[]>) };
  const pending = (rows ?? []).filter((r) => r.has_unpublished_changes).length;
  const pub = (stats ?? {}) as { published_profiles?: number; approved_employers?: number };

  return (
    <div>
      <PageHeader
        crumbs={[{ label: "Admin Console", href: "/admin" }, { label: "Website Content Management" }]}
        title="Website Content Management"
        description="Manage published copy, value-proposition modules, legal notices and testimonials on the public website."
        badge={pending ? <Pill tone="red">{pending} unpublished draft{pending > 1 ? "s" : ""}</Pill> : <Pill tone="green" dot>All changes published</Pill>}
        actions={def && <Link href={def.route} target="_blank" className="btn-outline"><Icon name="open_in_new" className="text-lg" /> View live page</Link>}
      />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-space-md mb-space-xl">
        <div className="tv-panel p-space-lg"><div className="font-label-sm text-label-sm uppercase text-on-surface-variant">Managed pages</div><div className="font-display-lg text-[32px] font-extrabold">{CMS_PAGES.length}</div></div>
        <div className="tv-panel p-space-lg"><div className="font-label-sm text-label-sm uppercase text-on-surface-variant">Pending draft changes</div><div className="font-display-lg text-[32px] font-extrabold text-tertiary">{pending}</div></div>
        <div className="tv-panel p-space-lg"><div className="font-label-sm text-label-sm uppercase text-on-surface-variant">Live stat: published profiles</div><div className="font-display-lg text-[32px] font-extrabold">{pub.published_profiles ?? 0}</div><div className="font-body-sm text-body-sm text-text-muted">Database-linked, not editable</div></div>
        <div className="tv-panel p-space-lg"><div className="font-label-sm text-label-sm uppercase text-on-surface-variant">Live stat: approved employers</div><div className="font-display-lg text-[32px] font-extrabold">{pub.approved_employers ?? 0}</div><div className="font-body-sm text-body-sm text-text-muted">Database-linked, not editable</div></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-xl items-start">
        <nav aria-label="Content tree" className="xl:col-span-3 tv-panel p-space-lg space-y-space-md xl:sticky xl:top-24">
          <h2 className="font-heading-sm text-heading-sm font-bold">Content Tree</h2>
          {CMS_PAGES.map((p) => (
            <div key={p.page}>
              <div className="font-label-md text-label-md flex items-center gap-1"><Icon name="article" className="text-base" />{p.label} <span className="font-mono text-[11px] text-text-muted">({p.route})</span></div>
              <ul className="mt-1 ml-5 space-y-0.5">
                {CMS_SECTIONS.filter((s) => s.page === p.page).map((s) => {
                  const r = byKey.get(`${s.page}/${s.key}`);
                  const active = def?.page === s.page && def?.key === s.key;
                  return (
                    <li key={s.key}>
                      <Link href={`/admin/content?page=${s.page}&section=${s.key}`} className={cn("flex items-center justify-between gap-1 rounded-lg px-2 py-1 font-body-sm text-body-sm", active ? "bg-primary-container text-on-primary" : "hover:bg-surface-container-low")}>
                        <span className="truncate">{s.label}</span>
                        {r?.has_unpublished_changes ? <span className="h-2 w-2 rounded-full bg-tertiary shrink-0" title="Unpublished draft" /> : r?.published_at ? <span className="h-2 w-2 rounded-full bg-secondary-fixed-dim shrink-0" title="Published" /> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          <Link href="/admin/content?section=testimonials" className={cn("flex items-center gap-1 rounded-lg px-2 py-1 font-label-md text-label-md", showTestimonials ? "bg-primary-container text-on-primary" : "hover:bg-surface-container-low")}><Icon name="format_quote" className="text-base" /> Testimonials</Link>
          <p className="tv-help">Contact details are managed in Settings → Platform configuration.</p>
        </nav>

        <section className="xl:col-span-9 space-y-space-lg">
          {def && (
            <div className="tv-panel p-space-xl">
              <div className="flex flex-wrap items-start justify-between gap-space-sm mb-space-lg">
                <div>
                  <div className="font-label-sm text-label-sm text-text-muted">Route: {def.route} › {def.label}</div>
                  <h2 className="font-heading-md text-heading-md">{def.label}</h2>
                  <div className="font-body-sm text-body-sm text-text-muted">
                    {row?.published_at ? `Last published ${formatDateTime(row.published_at)}` : "Showing default copy — never published"}{row?.has_unpublished_changes ? ` • Draft saved ${formatDateTime(row.updated_at)}` : ""}
                  </div>
                </div>
                {row?.has_unpublished_changes && (
                  <form action={discardDraft}>
                    <input type="hidden" name="page" value={def.page} /><input type="hidden" name="section_key" value={def.key} />
                    <SubmitButton className="btn-ghost btn-sm" icon="undo" confirm="Discard unpublished changes?">Discard draft</SubmitButton>
                  </form>
                )}
              </div>
              <SectionEditor key={`${def.page}/${def.key}/${sp.v ?? ""}`} def={{ page: def.page, key: def.key, fields: def.fields, label: def.label }} initial={initial} />
            </div>
          )}
          {showTestimonials && (
            <div className="tv-panel p-space-xl space-y-space-lg">
              <h2 className="font-heading-md text-heading-md">Testimonials</h2>
              <p className="font-body-sm text-body-sm text-text-muted">Only publish genuine testimonials you have permission to use.</p>
              {(testimonials ?? []).map((t) => (
                <form key={t.id} action={saveTestimonial} className="rounded-xl bg-surface-container-low p-space-md space-y-2">
                  <input type="hidden" name="id" value={t.id} />
                  {t.is_sample && <Pill tone="amber">Sample — replace before launch</Pill>}
                  <textarea name="quote" defaultValue={t.quote} rows={2} aria-label="Quote" className="tv-textarea" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input name="author_role" defaultValue={t.author_role} aria-label="Author role" className="tv-input" />
                    <input name="organisation_descriptor" defaultValue={t.organisation_descriptor ?? ""} aria-label="Organisation" className="tv-input" />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 font-body-sm text-body-sm"><input type="checkbox" name="is_published" defaultChecked={t.is_published} className="accent-[#1a6840]" /> Published</label>
                    <div className="flex gap-2">
                      <SubmitButton className="btn-secondary btn-sm">Save</SubmitButton>
                      <SubmitButton className="btn-ghost btn-sm text-error" formAction={deleteTestimonial} confirm="Delete this testimonial?">Delete</SubmitButton>
                    </div>
                  </div>
                </form>
              ))}
              <form action={saveTestimonial} className="rounded-xl border border-dashed border-border-subtle p-space-md space-y-2">
                <div className="font-label-md text-label-md">Add testimonial</div>
                <textarea name="quote" rows={2} aria-label="New quote" className="tv-textarea" placeholder="Quote" required />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input name="author_role" aria-label="New author role" className="tv-input" placeholder="Author role (e.g. Head of Talent)" required />
                  <input name="organisation_descriptor" aria-label="New organisation" className="tv-input" placeholder="Organisation descriptor" />
                </div>
                <SubmitButton icon="add">Add testimonial</SubmitButton>
              </form>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
