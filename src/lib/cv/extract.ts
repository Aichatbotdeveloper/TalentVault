import "server-only";
import type { CvKind } from "./files";

export interface ExtractionResult {
  text: string;
  method: "pdf-text" | "docx-text" | "doc-text";
}

function normalise(text: string) {
  return text.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
}

/** Extracts plain text from a CV document. Scanned PDFs yield little/no text (OCR handled by the AI provider). */
export async function extractCvText(buffer: Buffer, kind: CvKind): Promise<ExtractionResult> {
  if (kind === "pdf") {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    return { text: normalise(Array.isArray(text) ? text.join("\n") : text), method: "pdf-text" };
  }
  if (kind === "docx") {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer });
    return { text: normalise(value), method: "docx-text" };
  }
  const { default: WordExtractor } = await import("word-extractor");
  const doc = await new WordExtractor().extract(buffer);
  return { text: normalise(doc.getBody()), method: "doc-text" };
}

/** Below this many characters a PDF is treated as scanned/image-only. */
export const MIN_TEXT_CHARS = 200;
