import { z } from "zod";

// Structured-output schema for AI extraction. Every field is required but
// nullable (rather than optional) — that shape works best for constrained
// JSON generation, and it forces the model to make an explicit "I don't
// know" choice instead of silently omitting a key.

const confidence = z.number().min(0).max(1);

export const ExtractedEvent = z.object({
  title: z.string().min(1),
  type: z.enum(["LECTURE", "SEMINAR", "EXERCISE_CLASS", "WORKSHOP", "EXAM", "PRESENTATION", "OTHER"]),
  date: z.string().min(1).describe("ISO date, e.g. 2026-09-12"),
  startTime: z.string().nullable().describe("HH:mm 24h, or null"),
  endTime: z.string().nullable(),
  location: z.string().nullable(),
  topic: z.string().nullable(),
  description: z.string().nullable(),
  confidence,
  sourceSnippet: z.string().nullable().describe("Short excerpt this was extracted from"),
});

export const ExtractedReading = z.object({
  title: z.string().min(1),
  chapterOrSection: z.string().nullable(),
  pageCount: z.number().nullable(),
  isArticle: z.boolean().describe("true for a journal article (faster reading speed), false for a textbook chapter"),
  relatedEventTitle: z.string().nullable().describe("Title of the lecture/event this relates to, matched by text, or null"),
  relation: z.enum(["PREPARATION_FOR", "FOLLOW_UP_TO", "RELATED_TO"]).nullable(),
  requirementLevel: z.enum(["REQUIRED", "RECOMMENDED", "OPTIONAL"]),
  confidence,
  sourceSnippet: z.string().nullable(),
});

export const ExtractedExercise = z.object({
  title: z.string().min(1),
  exerciseCount: z.number().nullable(),
  relatedEventTitle: z.string().nullable(),
  relation: z.enum(["PREPARATION_FOR", "FOLLOW_UP_TO", "RELATED_TO"]).nullable(),
  requirementLevel: z.enum(["REQUIRED", "RECOMMENDED", "OPTIONAL"]),
  confidence,
  sourceSnippet: z.string().nullable(),
});

export const ExtractedOtherMaterial = z.object({
  materialType: z.enum(["VIDEO", "PODCAST", "ARTICLE", "CASE", "QUIZ", "OTHER"]),
  title: z.string().min(1),
  minutes: z.number().nullable(),
  relatedEventTitle: z.string().nullable(),
  requirementLevel: z.enum(["REQUIRED", "RECOMMENDED", "OPTIONAL"]),
  confidence,
  sourceSnippet: z.string().nullable(),
});

export const ExtractedMilestone = z.object({
  title: z.string().min(1),
  type: z.enum(["MANDATORY_ASSIGNMENT", "COURSE_APPROVAL", "PRESENTATION", "MIDTERM", "EXAM", "OTHER"]),
  description: z.string().nullable(),
  deadline: z.string().nullable().describe("ISO date, or null if no deadline was found — do not guess"),
  wordCount: z.number().nullable(),
  requirements: z.string().nullable(),
  confidence,
  sourceSnippet: z.string().nullable(),
});

export const ExtractionResult = z.object({
  events: z.array(ExtractedEvent),
  reading: z.array(ExtractedReading),
  exercises: z.array(ExtractedExercise),
  otherMaterial: z.array(ExtractedOtherMaterial),
  milestones: z.array(ExtractedMilestone),
});

export type ExtractionResult = z.infer<typeof ExtractionResult>;
export type ExtractedEvent = z.infer<typeof ExtractedEvent>;
export type ExtractedReading = z.infer<typeof ExtractedReading>;
export type ExtractedExercise = z.infer<typeof ExtractedExercise>;
export type ExtractedOtherMaterial = z.infer<typeof ExtractedOtherMaterial>;
export type ExtractedMilestone = z.infer<typeof ExtractedMilestone>;
