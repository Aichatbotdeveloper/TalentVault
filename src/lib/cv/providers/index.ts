import "server-only";
import { env } from "../../env";
import { AnthropicCvProvider } from "./anthropic";
import { LocalHeuristicCvProvider } from "./local";
import type { CvAnalysisProvider } from "./types";

/** Provider selection is configuration-driven so the AI vendor can change without code changes elsewhere. */
export function getCvProvider(): CvAnalysisProvider {
  const e = env();
  if (e.AI_PROVIDER === "anthropic") {
    if (!e.ANTHROPIC_API_KEY) throw new Error("AI_PROVIDER=anthropic but ANTHROPIC_API_KEY is not set");
    return new AnthropicCvProvider(e.ANTHROPIC_API_KEY, e.AI_MODEL);
  }
  return new LocalHeuristicCvProvider();
}

export function describeProvider() {
  const e = env();
  return e.AI_PROVIDER === "anthropic"
    ? { name: "anthropic", isAI: true, model: e.AI_MODEL, configured: Boolean(e.ANTHROPIC_API_KEY) }
    : { name: "local-dev-heuristic", isAI: false, model: null, configured: true };
}
