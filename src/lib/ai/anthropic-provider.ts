import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { ExtractionResult } from "./schema";
import { EXTRACTION_SYSTEM_PROMPT, buildExtractionPrompt } from "./prompt";
import type { ExtractionInput, ExtractionProvider } from "./provider";

export class AnthropicExtractionProvider implements ExtractionProvider {
  name = "anthropic";
  private client = new Anthropic();

  async extract(input: ExtractionInput): Promise<ExtractionResult> {
    const model = process.env.ANTHROPIC_MODEL || "claude-opus-5";

    const response = await this.client.messages.parse({
      model,
      max_tokens: 8000,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildExtractionPrompt(input) }],
      output_config: {
        format: zodOutputFormat(ExtractionResult),
      },
    });

    if (response.stop_reason === "refusal") {
      throw new Error("Extraction was declined by the model's safety classifiers.");
    }
    if (!response.parsed_output) {
      throw new Error("The model did not return a parseable extraction result.");
    }

    return response.parsed_output;
  }
}
