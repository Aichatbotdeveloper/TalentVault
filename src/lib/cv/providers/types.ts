import type { CvAnalysis } from "../schema";

export interface CvAnalysisInput {
  /** Plain text extracted from the CV (may be empty for scanned PDFs). */
  text: string;
  /** Original PDF bytes (base64) — supplied when the text layer is missing so the provider can OCR. */
  pdfBase64?: string;
  /** Self-reported details from the submission form; these take precedence for salary/availability. */
  selfReported?: Record<string, unknown>;
  /** Optional reviewer instructions for a re-run ("Reprocess with custom prompt"). */
  customInstructions?: string | null;
}

export interface CvAnalysisOutput {
  analysis: CvAnalysis;
  model: string | null;
  inputTokens?: number;
  outputTokens?: number;
  usedDocumentInput: boolean;
}

export interface CvAnalysisProvider {
  readonly name: string;
  /** false => heuristic development adapter. Its output is NOT AI analysis and is labelled as such. */
  readonly isAI: boolean;
  readonly supportsDocumentInput: boolean;
  analyse(input: CvAnalysisInput): Promise<CvAnalysisOutput>;
}

export class NonRetryableProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NonRetryableProcessingError";
  }
}
