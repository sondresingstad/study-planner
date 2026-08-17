import type { ParsedDocument } from "./types";
import type { ExtractionResult } from "@/lib/ai/schema";
import { formatIsoDateLocal } from "@/lib/dates";

const DATE_PATTERNS = [
  /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/, // 2026-08-19
  /\b(\d{1,2})[./](\d{1,2})[./](\d{4})\b/, // 19.08.2026 or 19/08/2026
];

const MONTH_NAMES =
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const MONTH_DAY_YEAR = new RegExp(`\\b(${MONTH_NAMES})\\s+(\\d{1,2}),?\\s+(\\d{4})\\b`, "i");

function tryParseDate(cell: string): Date | null {
  const trimmed = cell.trim();
  if (!trimmed) return null;

  for (const pattern of DATE_PATTERNS) {
    const match = trimmed.match(pattern);
    if (!match) continue;
    const [, a, b, c] = match;
    // ISO form: a=year, b=month, c=day. Day/month form: a=day, b=month, c=year.
    const isIso = a.length === 4;
    const year = Number(isIso ? a : c);
    const month = Number(b);
    const day = Number(isIso ? c : a);
    const date = new Date(year, month - 1, day);
    if (!Number.isNaN(date.getTime())) return date;
  }

  const monthMatch = trimmed.match(MONTH_DAY_YEAR);
  if (monthMatch) {
    const date = new Date(`${monthMatch[1]} ${monthMatch[2]}, ${monthMatch[3]}`);
    if (!Number.isNaN(date.getTime())) return date;
  }

  return null;
}

const EMPTY_RESULT: ExtractionResult = {
  events: [],
  reading: [],
  exercises: [],
  otherMaterial: [],
  milestones: [],
};

/**
 * Deterministic, non-AI fallback: scans spreadsheet tables for rows that
 * contain a recognizable date and turns them into low-confidence draft
 * events. Everything it produces is flagged for review — this is meant to
 * save typing, not to be trusted blindly. Free-text documents (PDF/DOCX/TXT)
 * aren't handled here; without an AI provider they're stored but produce no
 * automatic items.
 */
export function deterministicExtract(doc: ParsedDocument): ExtractionResult {
  if (doc.tables.length === 0) return EMPTY_RESULT;

  const events: ExtractionResult["events"] = [];

  for (const table of doc.tables) {
    for (const row of table.rows) {
      let date: Date | null = null;
      let dateCellIndex = -1;
      for (let i = 0; i < row.length; i++) {
        const parsed = tryParseDate(row[i]);
        if (parsed) {
          date = parsed;
          dateCellIndex = i;
          break;
        }
      }
      if (!date) continue;

      const otherCells = row.filter((_, i) => i !== dateCellIndex).map((c) => c.trim()).filter(Boolean);
      const title = otherCells[0] || `Event on ${date.toDateString()}`;

      events.push({
        title: title.slice(0, 120),
        type: "OTHER",
        date: formatIsoDateLocal(date),
        startTime: null,
        endTime: null,
        location: null,
        topic: otherCells.slice(1).join(" · ").slice(0, 200) || null,
        description: null,
        confidence: 0.4,
        sourceSnippet: row.join(" | ").slice(0, 200),
      });
    }
  }

  return { ...EMPTY_RESULT, events };
}
