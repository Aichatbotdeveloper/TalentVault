/** Minimal, safe renderer for CMS rich text: blank-line paragraphs and "## " headings. No HTML is interpreted. */
export function RichText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}|\n(?=## )/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="space-y-space-md">
      {blocks.map((block, i) => {
        if (block.startsWith("## ")) {
          const [heading, ...rest] = block.split("\n");
          return (
            <div key={i} className="space-y-space-xs pt-space-sm">
              <h2 className="font-heading-sm text-heading-sm font-bold text-text-primary">{heading!.slice(3)}</h2>
              {rest.length > 0 && <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">{rest.join(" ")}</p>}
            </div>
          );
        }
        return (
          <p key={i} className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            {block}
          </p>
        );
      })}
    </div>
  );
}
