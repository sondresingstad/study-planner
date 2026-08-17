import { z } from "zod";
import { ExtractionResult } from "./schema";
import { EXTRACTION_SYSTEM_PROMPT, buildExtractionPrompt } from "./prompt";
import type { ExtractionInput, ExtractionProvider } from "./provider";

export class OpenAiExtractionProvider implements ExtractionProvider {
  name = "openai";

  async extract(input: ExtractionInput): Promise<ExtractionResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
    const model = process.env.OPENAI_MODEL || "gpt-4o";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
          { role: "user", content: buildExtractionPrompt(input) },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "study_plan_extraction",
            schema: z.toJSONSchema(ExtractionResult),
          },
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`OpenAI API error ${response.status}: ${body.slice(0, 500)}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenAI response did not include content.");

    const parsedJson = JSON.parse(content);
    return ExtractionResult.parse(parsedJson);
  }
}
