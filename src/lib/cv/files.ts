/** Shared (client + server) CV upload rules. */
export const MAX_CV_BYTES = 10 * 1024 * 1024; // 10 MB

export const CV_TYPES = {
  pdf: { ext: ["pdf"], mime: "application/pdf" },
  docx: { ext: ["docx"], mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  doc: { ext: ["doc"], mime: "application/msword" },
} as const;

export type CvKind = keyof typeof CV_TYPES;
export const CV_ACCEPT = ".pdf,.docx,.doc,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function kindFromFilename(filename: string): CvKind | null {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  for (const [kind, def] of Object.entries(CV_TYPES)) {
    if ((def.ext as readonly string[]).includes(ext)) return kind as CvKind;
  }
  return null;
}

export function validateCvMeta(filename: string, size: number): { ok: true; kind: CvKind } | { ok: false; error: string } {
  const kind = kindFromFilename(filename);
  if (!kind) return { ok: false, error: "Unsupported file type. Please upload a PDF, DOCX or DOC file." };
  if (size <= 0) return { ok: false, error: "The selected file is empty." };
  if (size > MAX_CV_BYTES) return { ok: false, error: "File is too large. The maximum size is 10 MB." };
  if (filename.length > 200) return { ok: false, error: "File name is too long." };
  return { ok: true, kind };
}

/** Identify the real document type from its leading bytes (never trust the extension alone). */
export function sniffCvKind(bytes: Uint8Array): CvKind | null {
  const b = bytes;
  if (b.length >= 5 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d) return "pdf";
  if (b.length >= 8 && b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0 && b[4] === 0xa1 && b[5] === 0xb1 && b[6] === 0x1a && b[7] === 0xe1) return "doc";
  if (b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) {
    // OOXML zip: file names are stored in plain text in the archive.
    const haystack = new TextDecoder("latin1").decode(b);
    if (haystack.includes("word/")) return "docx";
  }
  return null;
}

export function safeFilename(name: string) {
  return name.replace(/[^\w.\- ]+/g, "_").slice(0, 120);
}
