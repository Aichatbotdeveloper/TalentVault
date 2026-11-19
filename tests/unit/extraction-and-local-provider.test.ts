import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractCvText } from "@/lib/cv/extract";
import { LocalHeuristicCvProvider } from "@/lib/cv/providers/local";
import { NonRetryableProcessingError } from "@/lib/cv/providers/types";
import { CvAnalysisSchema } from "@/lib/cv/schema";

describe("document text extraction", () => {
  it("extracts text from PDF", async () => {
    const r = await extractCvText(readFileSync("tests/fixtures/cv-sample.pdf"), "pdf");
    expect(r.method).toBe("pdf-text");
    expect(r.text).toContain("Senior Platform Engineer");
  });

  it("extracts text from DOCX", async () => {
    const r = await extractCvText(readFileSync("tests/fixtures/cv-sample.docx"), "docx");
    expect(r.method).toBe("docx-text");
    expect(r.text).toContain("Kubernetes");
  });

  it("returns little or no text for an image-only PDF (OCR path)", async () => {
    const r = await extractCvText(readFileSync("tests/fixtures/cv-scanned.pdf"), "pdf");
    expect(r.text.length).toBeLessThan(200);
  });
});

describe("local development adapter", () => {
  const provider = new LocalHeuristicCvProvider();

  it("is clearly flagged as not AI", () => {
    expect(provider.isAI).toBe(false);
    expect(provider.name).toBe("local-dev-heuristic");
  });

  it("produces schema-valid, clearly-labelled placeholder output", async () => {
    const { text } = await extractCvText(readFileSync("tests/fixtures/cv-sample.pdf"), "pdf");
    const out = await provider.analyse({ text });
    expect(CvAnalysisSchema.safeParse(out.analysis).success).toBe(true);
    expect(out.analysis.anonymised.summary).toContain("NOT AI-GENERATED");
    expect(out.analysis.extracted.personal.email).toBe("jordan.example@example.com");
    expect(out.analysis.anonymised.skills).toEqual(expect.arrayContaining(["Kubernetes", "Terraform"]));
    // does not invent employment history
    expect(out.analysis.anonymised.experience).toEqual([]);
  });

  it("fails permanently on documents with no text", async () => {
    await expect(provider.analyse({ text: "" })).rejects.toBeInstanceOf(NonRetryableProcessingError);
  });
});
