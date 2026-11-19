import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AnthropicCvProvider } from "@/lib/cv/providers/anthropic";
import { NonRetryableProcessingError } from "@/lib/cv/providers/types";
import type { CvAnalysis } from "@/lib/cv/schema";

/**
 * Contract test against a local fake of the Messages API (no network, no real key).
 * Verifies the request we send and how responses/refusals are handled.
 */
const analysis: CvAnalysis = {
  extracted: {
    personal: { full_name: "Jordan Example", email: "j@example.com", phone: null, location: "London", linkedin_url: null },
    current_job_title: "Platform Engineer",
    total_years_experience: 9,
    skills: ["AWS"],
    industries: ["FinTech"],
    employment: [],
    education: [],
    certifications: [],
    salary_expectation: null,
    availability_text: null,
  },
  anonymised: {
    headline: "Senior Platform Engineer",
    job_title: "Platform Engineer",
    seniority: "Senior",
    summary: "Platform engineer with nine years of experience.",
    years_experience: 9,
    location_region: "London, UK",
    industries: ["FinTech"],
    skills: ["AWS"],
    highlights: [],
    availability: null,
    notice_period: null,
    salary_min: null,
    salary_max: null,
    experience: [],
    education: [],
    certifications: [],
  },
  warnings: [],
};

let server: Server;
let lastBody: Record<string, unknown> = {};
let lastHeaders: IncomingMessage["headers"] = {};
let mode: "ok" | "refusal" | "auth" = "ok";

beforeAll(async () => {
  server = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      lastBody = JSON.parse(raw);
      lastHeaders = req.headers;
      res.setHeader("content-type", "application/json");
      if (mode === "auth") {
        res.statusCode = 401;
        return res.end(JSON.stringify({ type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } }));
      }
      res.end(
        JSON.stringify({
          id: "msg_test",
          type: "message",
          role: "assistant",
          model: "claude-opus-5-5",
          content: mode === "refusal" ? [] : [{ type: "text", text: JSON.stringify(analysis) }],
          stop_reason: mode === "refusal" ? "refusal" : "end_turn",
          stop_sequence: null,
          usage: { input_tokens: 1234, output_tokens: 567 },
        }),
      );
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  delete process.env.ANTHROPIC_BASE_URL;
  server.close();
});

describe("AnthropicCvProvider", () => {
  it("sends CV text with structured output, adaptive effort and refusal fallback, and parses the result", async () => {
    mode = "ok";
    const p = new AnthropicCvProvider("test-key", "claude-opus-5-5");
    const out = await p.analyse({ text: "Jordan Example\nPlatform Engineer", selfReported: { salary_min: 90000 } });
    expect(out.analysis.anonymised.headline).toBe("Senior Platform Engineer");
    expect(out.inputTokens).toBe(1234);
    expect(lastBody.model).toBe("claude-opus-5-5");
    expect(lastBody.fallbacks).toBe("default");
    expect(String(lastHeaders["anthropic-beta"])).toContain("server-side-fallback-2026-07-01");
    expect((lastBody.output_config as { format: { type: string } }).format.type).toBe("json_schema");
    const content = (lastBody.messages as { content: { type: string; text?: string }[] }[])[0]!.content;
    expect(content.some((b) => b.text?.includes("<cv>"))).toBe(true);
    expect(content.some((b) => b.type === "document")).toBe(false);
  });

  it("sends the original PDF as a document block when OCR is needed", async () => {
    mode = "ok";
    const p = new AnthropicCvProvider("test-key", "claude-opus-5-5");
    const out = await p.analyse({ text: "", pdfBase64: Buffer.from("%PDF-1.4").toString("base64") });
    expect(out.usedDocumentInput).toBe(true);
    const content = (lastBody.messages as { content: { type: string }[] }[])[0]!.content;
    expect(content[0]!.type).toBe("document");
  });

  it("treats refusals and rejected credentials as non-retryable", async () => {
    const p = new AnthropicCvProvider("test-key", "claude-opus-5-5");
    mode = "refusal";
    await expect(p.analyse({ text: "cv" })).rejects.toBeInstanceOf(NonRetryableProcessingError);
    mode = "auth";
    await expect(p.analyse({ text: "cv" })).rejects.toBeInstanceOf(NonRetryableProcessingError);
  });
});
