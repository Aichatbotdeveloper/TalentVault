import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MAX_CV_BYTES, kindFromFilename, sniffCvKind, validateCvMeta } from "@/lib/cv/files";

const fx = (n: string) => new Uint8Array(readFileSync(`tests/fixtures/${n}`));

describe("CV file validation", () => {
  it("accepts PDF, DOCX and DOC extensions", () => {
    expect(kindFromFilename("cv.PDF")).toBe("pdf");
    expect(kindFromFilename("cv.docx")).toBe("docx");
    expect(kindFromFilename("old.doc")).toBe("doc");
    expect(kindFromFilename("photo.png")).toBeNull();
  });

  it("rejects oversize, empty and unsupported files", () => {
    expect(validateCvMeta("cv.pdf", MAX_CV_BYTES + 1).ok).toBe(false);
    expect(validateCvMeta("cv.pdf", 0).ok).toBe(false);
    expect(validateCvMeta("cv.exe", 100).ok).toBe(false);
    expect(validateCvMeta("cv.pdf", 2048)).toEqual({ ok: true, kind: "pdf" });
  });

  it("identifies real document types from magic bytes", () => {
    expect(sniffCvKind(fx("cv-sample.pdf"))).toBe("pdf");
    expect(sniffCvKind(fx("cv-sample.docx"))).toBe("docx");
    expect(sniffCvKind(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0]))).toBe("doc");
  });

  it("rejects a renamed non-document file", () => {
    expect(sniffCvKind(fx("not-a-cv.pdf"))).toBeNull();
    // a ZIP that is not a Word document
    expect(sniffCvKind(new TextEncoder().encode("PK\u0003\u0004 random.txt content"))).toBeNull();
  });
});
