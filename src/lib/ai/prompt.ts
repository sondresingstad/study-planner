import type { ExtractionInput } from "./provider";

const MAX_CHARS = 60_000;

export const EXTRACTION_SYSTEM_PROMPT = `You extract structured study-plan data from university course documents (syllabi, lecture plans, reading lists, exercise sheets, assignment descriptions).

Rules:
- Only extract information that is actually present in the document. Never invent dates, page counts, or exercise numbers.
- If a value isn't stated, use null rather than guessing — the app will flag it for manual review instead of showing a wrong number.
- "confidence" should be your genuine estimate (0-1) of how certain you are this item is correct and complete. Use lower values for ambiguous or partially-stated items.
- "sourceSnippet" should be a short verbatim excerpt (under ~200 characters) from the document that supports the extraction, so a human can verify it.
- "relatedEventTitle" should match the title/topic of a lecture or event described elsewhere in the SAME document when the text implies a relationship (e.g. "before lecture 7", "Chapter 6 — see week 4"). Leave it null if no relationship is stated.
- requirementLevel: REQUIRED only for explicitly mandatory items; RECOMMENDED for suggested/expected-but-not-graded work; OPTIONAL for supplementary material.
- Deadlines and dates should be actual calendar dates (resolve "next Friday" etc. from context if a reference date is present in the document; otherwise use whatever explicit date is given).
- Do not fabricate milestones, exams, or assignments that aren't mentioned.`;

export function buildExtractionPrompt(input: ExtractionInput): string {
  const truncated = input.text.length > MAX_CHARS;
  const text = truncated ? input.text.slice(0, MAX_CHARS) : input.text;

  return `Course: ${input.courseName} (${input.courseCode})
Source file: ${input.filename} (${input.documentType})
${truncated ? "[Note: document was truncated to fit — extract only from the text below.]\n" : ""}
--- Document content ---
${text}`;
}
