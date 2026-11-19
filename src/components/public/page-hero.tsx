export function PageHero({ eyebrow, heading, lead, children }: { eyebrow?: string; heading: string; lead?: string; children?: React.ReactNode }) {
  return (
    <section className="relative w-full pt-12 pb-16 lg:pt-16 lg:pb-20 overflow-hidden bg-surface">
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[420px] bg-gradient-to-b from-primary-fixed/30 via-secondary-container/15 to-transparent blur-3xl pointer-events-none rounded-full" />
      <div className="relative max-w-7xl mx-auto px-margin lg:px-margin-desktop">
        <div className="max-w-3xl">
          {eyebrow && <div className="eyebrow mb-space-sm">{eyebrow}</div>}
          <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg font-extrabold text-text-primary">{heading}</h1>
          {lead && <p className="font-body-lg text-body-lg text-text-muted mt-space-lg max-w-2xl">{lead}</p>}
          {children}
        </div>
      </div>
    </section>
  );
}
