import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { CvAnalysisSchema } from "../schema";
import { CV_SYSTEM_PROMPT, buildUserPrompt } from "./prompt";
import { NonRetryableProcessingError, type CvAnalysisInput, type CvAnalysisOutput, type CvAnalysisProvider } from "./types";

/**
 * Claude-backed CV analysis using structured outputs (JSON validated against CvAnalysisSchema).
 * Server-side refusal fallback is enabled so a safety-classifier decline is retried on another model.
 */
export class AnthropicCvProvider implements CvAnalysisProvider {
  readonly name = "anthropic";
  readonly isAI = true;
  readonly supportsDocumentInput = true;
  private client: Anthropic;

  constructor(apiKey: string, private model: string) {
    this.client = new Anthropic({ apiKey, maxRetries: 2, timeout: 240_000 });
  }

  async analyse(input: CvAnalysisInput): Promise<CvAnalysisOutput> {
    const hasText = input.text.trim().length > 0 && !input.pdfBase64;
    const content: Anthropic.Beta.BetaContentBlockParam[] = [];
    if (input.pdfBase64) {
      content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: input.pdfBase64 } });
    }
    content.push({ type: "text", text: buildUserPrompt({ selfReported: input.selfReported, customInstructions: input.customInstructions, hasText }) });
    if (hasText) content.push({ type: "text", text: `<cv>\n${input.text}\n</cv>` });

    try {
      const response = await this.client.beta.messages.parse({
        model: this.model,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "medium", format: betaZodOutputFormat(CvAnalysisSchema) },
        system: CV_SYSTEM_PROMPT,
        messages: [{ role: "user", content }],
      });

      if (response.stop_reason === "refusal") {
        throw new NonRetryableProcessingError("The AI provider declined to analyse this document. Review the CV manually.");
      }
      if (response.stop_reason === "max_tokens") {
        throw new Error("AI response was truncated (max_tokens). The job will be retried.");
      }
      if (!response.parsed_output) {
        throw new Error("AI response did not match the required output schema.");
      }
      return {
        analysis: response.parsed_output,
        model: response.model,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        usedDocumentInput: Boolean(input.pdfBase64),
      };
    } catch (err) {
      if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
        throw new NonRetryableProcessingError("AI provider credentials were rejected. Check ANTHROPIC_API_KEY.");
      }
      if (err instanceof Anthropic.BadRequestError) {
        throw new NonRetryableProcessingError(`AI provider rejected the request: ${err.message.slice(0, 200)}`);
      }
      throw err; // rate limits, 5xx, network: retryable
    }
  }
}
