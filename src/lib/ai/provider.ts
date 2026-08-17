import type { ExtractionResult } from "./schema";

export type ExtractionInput = {
  filename: string;
  documentType: string;
  courseName: string;
  courseCode: string;
  /** Normalized text (and, for spreadsheets, a table dump appended as text). */
  text: string;
};

export type ExtractionProvider = {
  name: string;
  extract(input: ExtractionInput): Promise<ExtractionResult>;
};

export type ProviderStatus =
  | { available: true; provider: string }
  | { available: false; reason: string };

/**
 * Selects the AI provider from env vars. Returns null (with a reason) when
 * extraction isn't configured — callers fall back to deterministic parsing
 * rather than failing.
 */
export function getProviderStatus(): ProviderStatus {
  const configured = (process.env.AI_PROVIDER ?? "none").toLowerCase();

  if (configured === "anthropic") {
    if (!process.env.ANTHROPIC_API_KEY) {
      return { available: false, reason: "AI_PROVIDER is set to anthropic but ANTHROPIC_API_KEY is missing." };
    }
    return { available: true, provider: "anthropic" };
  }

  if (configured === "openai") {
    if (!process.env.OPENAI_API_KEY) {
      return { available: false, reason: "AI_PROVIDER is set to openai but OPENAI_API_KEY is missing." };
    }
    return { available: true, provider: "openai" };
  }

  return { available: false, reason: "No AI_PROVIDER configured — intelligent extraction is disabled." };
}

export async function getExtractionProvider(): Promise<ExtractionProvider | null> {
  const status = getProviderStatus();
  if (!status.available) return null;

  if (status.provider === "anthropic") {
    const { AnthropicExtractionProvider } = await import("./anthropic-provider");
    return new AnthropicExtractionProvider();
  }
  if (status.provider === "openai") {
    const { OpenAiExtractionProvider } = await import("./openai-provider");
    return new OpenAiExtractionProvider();
  }
  return null;
}
