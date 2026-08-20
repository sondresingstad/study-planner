import type { ParsedDocument } from "./types";
import type { ExtractionResult } from "@/lib/ai/schema";
import { formatIsoDateLocal } from "@/lib/dates";

const MONTH_NAMES =
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";

// Patterns that include an explicit year — safe to trust on their own.
const DATED_PATTERNS = [
  /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/, // 2026-08-19
  /\b(\d{1,2})[./](\d{1,2})[./](\d{4})\b/, // 19.08.2026 or 19/08/2026
  new RegExp(`\\b(${MONTH_NAMES})\\s+(\\d{1,2}),?\\s+(\\d{4})\\b`, "i"), // September 3, 2026
  new RegExp(`\\b(\\d{1,2})\\s+(${MONTH_NAMES})\\s+(\\d{4})\\b`, "i"), // 3 September 2026
];

// Patterns with no year — only usable with a year inferred from the document.
// Deliberately no bare numeric "D.M" pattern here: it's indistinguishable
// from exercise/section numbering like "3.1", which appears constantly in
// course documents and would otherwise cause false date matches.
const UNDATED_PATTERNS = [
  new RegExp(`\\b(${MONTH_NAMES})\\s+(\\d{1,2})\\b`, "i"), // September 3
  new RegExp(`\\b(\\d{1,2})\\s+(${MONTH_NAMES})\\b`, "i"), // 3 September
];

function buildDate(y: number, m: number, d: number): Date | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

const MONTH_ABBREVIATIONS = "jan feb mar apr may jun jul aug sep oct nov dec".split(" ");

/** Returns 1-12 for a month name/abbreviation, or 0 if it isn't one. */
function monthIndex(name: string): number {
  return MONTH_ABBREVIATIONS.findIndex((m) => name.toLowerCase().startsWith(m)) + 1;
}

/** Parses a single cell's full content as a date (used for table cells, which are already isolated). */
function tryParseDate(cell: string): Date | null {
  const trimmed = cell.trim();
  if (!trimmed) return null;
  const match = findDateInLine(trimmed, null);
  return match?.date ?? null;
}

/**
 * Finds the first date in a line of free text, returning its position so
 * the surrounding text (the actual calendar-row content) can be recovered.
 * `fallbackYear` is used for patterns with no year of their own — see
 * inferDocumentYear.
 */
function findDateInLine(line: string, fallbackYear: number | null): { date: Date; start: number; end: number } | null {
  for (const pattern of DATED_PATTERNS) {
    const match = line.match(pattern);
    if (!match || match.index == null) continue;
    const date = parseDatedMatch(match);
    if (date) return { date, start: match.index, end: match.index + match[0].length };
  }

  if (fallbackYear != null) {
    for (const pattern of UNDATED_PATTERNS) {
      const match = line.match(pattern);
      if (!match || match.index == null) continue;
      const date = parseUndatedMatch(match, fallbackYear);
      if (date) return { date, start: match.index, end: match.index + match[0].length };
    }
  }

  return null;
}

function parseDatedMatch(match: RegExpMatchArray): Date | null {
  const [, a, b, c] = match;
  if (/^\d+$/.test(a) && /^\d+$/.test(b) && /^\d+$/.test(c)) {
    // Either "YYYY-M-D" or "D.M.YYYY" / "D/M/YYYY".
    const isIso = a.length === 4;
    return buildDate(Number(isIso ? a : c), Number(b), Number(isIso ? c : a));
  }
  // "Month D, YYYY" or "D Month YYYY" — whichever of a/b is the month name.
  const monthName = /[a-z]/i.test(a) ? a : b;
  const day = Number(/[a-z]/i.test(a) ? b : a);
  return buildDate(Number(c), monthIndex(monthName), day);
}

function parseUndatedMatch(match: RegExpMatchArray, year: number): Date | null {
  const [, a, b] = match;
  if (/^\d+$/.test(a) && /^\d+$/.test(b)) {
    // "D.M" (European day.month, no year).
    return buildDate(year, Number(b), Number(a));
  }
  const monthName = /[a-z]/i.test(a) ? a : b;
  const day = Number(/[a-z]/i.test(a) ? b : a);
  return buildDate(year, monthIndex(monthName), day);
}

/** Looks for a "Fall 2026" / "2026-2027" style year near the top of the document, for dates that omit one. */
function inferDocumentYear(text: string): number | null {
  const header = text.slice(0, 1000);
  const match = header.match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : null;
}

const READING_KEYWORDS = /\b(chapter|chapters|ch\.|reading|readings)\b/i;
const PAGE_RANGE = /\b(?:pp\.?|pages?)\s*(\d+)\s*[-–]\s*(\d+)/i;
const EXERCISE_KEYWORDS = /\b(exercises?|problems?)\b/i;
const EXERCISE_LIST = /\b(?:exercises?|problems?)\s+((?:\d+(?:\.\d+)?[,\s]*)+)/i;

/**
 * Counts exercises from whatever range shorthand follows an
 * "exercises"/"problems" keyword: "3.1-3.6" (sub-numbers 1..6 within
 * section 3), "3.1-6" (same, second side omits the section prefix), or a
 * plain "1-8".
 */
function parseExerciseRangeCount(text: string): number | null {
  const subRange = text.match(/(\d+)\.(\d+)\s*[-–]\s*\1\.(\d+)/);
  if (subRange) {
    const start = Number(subRange[2]);
    const end = Number(subRange[3]);
    if (end >= start) return end - start + 1;
  }
  const shorthand = text.match(/\d+\.(\d+)\s*[-–]\s*(\d+)\b(?!\.)/);
  if (shorthand) {
    const start = Number(shorthand[1]);
    const end = Number(shorthand[2]);
    if (end >= start && end - start < 100) return end - start + 1;
  }
  const plain = text.match(/\b(\d+)\s*[-–]\s*(\d+)\b/);
  if (plain) {
    const start = Number(plain[1]);
    const end = Number(plain[2]);
    if (end >= start && end - start < 100) return end - start + 1;
  }
  return null;
}

function extractReadingAndExercises(
  contentText: string,
  eventTitle: string
): { reading: ExtractionResult["reading"]; exercises: ExtractionResult["exercises"] } {
  const reading: ExtractionResult["reading"] = [];
  const exercises: ExtractionResult["exercises"] = [];

  if (READING_KEYWORDS.test(contentText)) {
    const pageMatch = contentText.match(PAGE_RANGE);
    const pageCount = pageMatch ? Number(pageMatch[2]) - Number(pageMatch[1]) + 1 : null;
    const chapterMatch = contentText.match(/\bchapters?\s+(\d+(?:\s*[-–,]\s*\d+)*)/i);
    reading.push({
      title: chapterMatch ? `Chapter ${chapterMatch[1]}` : `Reading — ${eventTitle}`.slice(0, 120),
      chapterOrSection: chapterMatch ? chapterMatch[1] : null,
      pageCount: pageCount != null && pageCount > 0 && pageCount < 500 ? pageCount : null,
      isArticle: false,
      relatedEventTitle: eventTitle,
      relation: "PREPARATION_FOR",
      requirementLevel: "RECOMMENDED",
      confidence: 0.35,
      sourceSnippet: contentText.slice(0, 200),
    });
  }

  const exerciseKeywordMatch = contentText.match(EXERCISE_KEYWORDS);
  if (exerciseKeywordMatch && exerciseKeywordMatch.index != null) {
    const window = contentText.slice(exerciseKeywordMatch.index, exerciseKeywordMatch.index + 60);
    let exerciseCount = parseExerciseRangeCount(window);
    if (exerciseCount == null) {
      const listMatch = contentText.match(EXERCISE_LIST);
      if (listMatch) exerciseCount = listMatch[1].split(/[,\s]+/).filter(Boolean).length || null;
    }
    exercises.push({
      title: `Exercises — ${eventTitle}`.slice(0, 120),
      exerciseCount,
      relatedEventTitle: eventTitle,
      relation: "FOLLOW_UP_TO",
      requirementLevel: "RECOMMENDED",
      confidence: 0.35,
      sourceSnippet: contentText.slice(0, 200),
    });
  }

  return { reading, exercises };
}

function extractFromTables(tables: ParsedDocument["tables"]): ExtractionResult["events"] {
  const events: ExtractionResult["events"] = [];

  for (const table of tables) {
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

  return events;
}

/** Removes a leftover separator (":", "-", "–", "—", ",") left behind after a date is stripped out of a line, e.g. "Sept 3: Topic" -> "Topic". */
function stripLeadingPunctuation(text: string): string {
  return text.replace(/^[\s:\-–—,]+/, "");
}

const MAX_CONTENT_LINES = 5;

/**
 * Scans free-text (PDF/DOCX/TXT) for calendar-style rows: a line carrying a
 * date, optionally followed by a few lines of topic/reading/exercise detail
 * before the next dated line. This is intentionally a rough heuristic —
 * every item it produces is low-confidence and flagged for review, the same
 * as the table scanner above.
 */
function extractFromText(text: string): {
  events: ExtractionResult["events"];
  reading: ExtractionResult["reading"];
  exercises: ExtractionResult["exercises"];
} {
  const events: ExtractionResult["events"] = [];
  const reading: ExtractionResult["reading"] = [];
  const exercises: ExtractionResult["exercises"] = [];

  const lines = text.split(/\r?\n/);
  const fallbackYear = inferDocumentYear(text);

  type Anchor = { lineIndex: number; date: Date; trailingText: string };
  const anchors: Anchor[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().length === 0 || line.length > 200) continue; // skip blanks and long prose paragraphs
    const match = findDateInLine(line, fallbackYear);
    if (!match) continue;
    // Only trust dates that anchor the row (near the start of the line) —
    // a date buried mid-sentence is more likely a narrative mention than a
    // calendar entry.
    if (match.start > 25) continue;

    const trailingText = stripLeadingPunctuation((line.slice(0, match.start) + " " + line.slice(match.end)).trim());
    anchors.push({ lineIndex: i, date: match.date, trailingText });
  }

  for (let a = 0; a < anchors.length; a++) {
    const anchor = anchors[a];
    const nextAnchorLine = a + 1 < anchors.length ? anchors[a + 1].lineIndex : lines.length;
    const windowEnd = Math.min(nextAnchorLine, anchor.lineIndex + 1 + MAX_CONTENT_LINES);

    const contentLines = [anchor.trailingText];
    for (let i = anchor.lineIndex + 1; i < windowEnd; i++) {
      const trimmed = lines[i].trim();
      if (trimmed.length === 0) break; // blank line ends this row's content block
      contentLines.push(trimmed);
    }

    const content = contentLines.filter(Boolean);
    if (content.length === 0) continue; // date with nothing else — not enough to act on

    const title = content[0].slice(0, 120);
    const detail = content.slice(1).join(" ").slice(0, 200);
    const contentText = content.join(" ");

    events.push({
      title,
      type: "OTHER",
      date: formatIsoDateLocal(anchor.date),
      startTime: null,
      endTime: null,
      location: null,
      topic: detail || null,
      description: null,
      confidence: 0.35,
      sourceSnippet: contentText.slice(0, 200),
    });

    const derived = extractReadingAndExercises(contentText, title);
    reading.push(...derived.reading);
    exercises.push(...derived.exercises);
  }

  return { events, reading, exercises };
}

const EMPTY_RESULT: ExtractionResult = {
  events: [],
  reading: [],
  exercises: [],
  otherMaterial: [],
  milestones: [],
};

/**
 * Deterministic, non-AI fallback (spec section 4): scans spreadsheet tables
 * and free-text "calendar" layouts for date-anchored rows, and turns them
 * into low-confidence draft events (plus reading/exercise tasks when a
 * chapter/page/exercise reference is nearby). Everything it produces is
 * flagged for review — this is meant to save typing, not to be trusted
 * blindly.
 */
export function deterministicExtract(doc: ParsedDocument): ExtractionResult {
  const tableEvents = extractFromTables(doc.tables);
  const fromText = extractFromText(doc.text);

  return {
    ...EMPTY_RESULT,
    events: [...tableEvents, ...fromText.events],
    reading: fromText.reading,
    exercises: fromText.exercises,
  };
}
