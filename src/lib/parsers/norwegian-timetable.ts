import type { ExtractionResult } from "@/lib/ai/schema";
import { formatIsoDateLocal } from "@/lib/dates";

/**
 * Deterministic parser for a specific but common Norwegian university
 * timetable layout: a tab-delimited "UKE | DAG | DATO | KL | STED |
 * PENSUM/OPPGAVE" table (as extracted from a PDF — cells can wrap across
 * several physical lines), where the last column packs in a "Videoer:" /
 * "Pensumbok:" / "Oppgaver:" / "Eksamensoppgaver:" sub-structure per
 * lecture. Rows whose STED (location) is "Grupper" are TA-led group
 * sessions rather than lectures.
 *
 * This is deliberately a separate, self-contained module rather than more
 * branches in deterministic.ts — it's a different enough shape (tab-column
 * assembly vs. line-anchored scanning) that sharing code would obscure
 * both. See deterministicExtract() for how the two are selected between.
 */

const MONTH_LOOKUP: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  mai: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  okt: 10,
  nov: 11,
  dec: 12,
  des: 12,
};
const MONTH_PATTERN = Object.keys(MONTH_LOOKUP).join("|");

function monthIndex(name: string): number {
  const lower = name.toLowerCase();
  for (const [abbr, idx] of Object.entries(MONTH_LOOKUP)) {
    if (lower.startsWith(abbr)) return idx;
  }
  return 0;
}

/** First month name in a date cell, or 0 if none — used to detect the calendar-year rollover (see extractNorwegianTimetable). */
function parseCellMonth(cell: string | null): number {
  if (!cell) return 0;
  const monthMatch = cell.match(new RegExp(MONTH_PATTERN, "i"));
  return monthMatch ? monthIndex(monthMatch[0]) : 0;
}

/** "20. aug", "27.aug", "31.aug.-4.sep" (range), "14.-18. sep" (day range) — takes the first day number and first month name as the anchor date. */
function parseCellDate(cell: string | null, year: number): Date | null {
  if (!cell) return null;
  const dayMatch = cell.match(/\d{1,2}/);
  const month = parseCellMonth(cell);
  if (!dayMatch || !month) return null;
  const day = Number(dayMatch[0]);
  if (day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function inferYear(text: string): number {
  // Scoped to the header only — the body is full of unrelated 4-digit
  // numbers (exam-year references like "Vår 2022 a", years mentioned in
  // example company reports, etc.) that would otherwise be picked up
  // ahead of the actual course term.
  const header = text.slice(0, 200);
  const explicit = header.match(/\b(20\d{2})\b/);
  if (explicit) return Number(explicit[1]);
  // Norwegian term shorthand in a course code/title, e.g. "BED2-H26" (Høst/autumn 2026).
  const shorthand = header.match(/\b[HVS](\d{2})\b/);
  if (shorthand) return 2000 + Number(shorthand[1]);
  return new Date().getFullYear();
}

function parseTimeRange(cell: string | null): { start: string | null; end: string | null } {
  if (!cell) return { start: null, end: null };
  const match = cell.match(/(\d{1,2})[:.]?(\d{2})?\s*-\s*(\d{1,2})[:.]?(\d{2})?/);
  if (!match) return { start: null, end: null };
  return {
    start: `${match[1].padStart(2, "0")}:${match[2] ?? "00"}`,
    end: `${match[3].padStart(2, "0")}:${match[4] ?? "00"}`,
  };
}

function joinNorwegian(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} og ${items[items.length - 1]}`;
}

const DAY_NAME = /^(man-fre|tirs-fre|mandag|tirsdag|onsdag|torsdag|fredag|lørdag|søndag|man|tirs|ons|tor|fre|lør|søn)\b/i;

type RawRow = {
  week: string | null;
  time: string | null;
  location: string | null;
  dateCell: string | null;
  pensumLines: string[];
};

/**
 * Reassembles the tab-delimited table into logical rows. A row can open
 * with 6 columns (week, day, date, time, location, pensum-start), 5 (same
 * but inheriting the week from the previous row), or fewer when a cell
 * (usually the time slot, e.g. "8:15 - 10 eller" / "10:15 - 12") wraps
 * across lines — in which case the next non-tab line continues that same
 * field, and a later short tab-line ("Aud B og C \t Videoer:") resumes
 * filling location/pensum for the still-open row.
 */
function assembleRows(text: string): RawRow[] {
  const rows: RawRow[] = [];
  let current: RawRow | null = null;
  let lastWeek: string | null = null;
  // Index into [week, day, date, time, location, pensum] for the next value to fill.
  let pointer = 0;

  const flush = () => {
    if (current && (current.dateCell || current.pensumLines.length > 0)) rows.push(current);
    current = null;
  };

  for (const raw of text.split(/\r?\n/)) {
    if (/^--\s*\d+ of \d+\s*--$/.test(raw.trim())) continue; // pdf-parse page-break marker
    if (raw.trim().length === 0) continue;

    if (raw.includes("\t")) {
      const parts = raw
        .split("\t")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
      if (parts.length === 0) continue;

      const first = parts[0];

      if (/^\d+$/.test(first)) {
        if (parts.length < 2 || !DAY_NAME.test(parts[1])) {
          // A week number with no day after it is a "nothing happens this
          // week" note (e.g. "40  Ingen forelesning eller grupper denne
          // uken") — not a dated row.
          flush();
          continue;
        }
        flush();
        lastWeek = first;
        current = { week: first, time: null, location: null, dateCell: null, pensumLines: [] };
        pointer = 0; // parts[0] is the week number itself
      } else if (DAY_NAME.test(first)) {
        flush();
        current = { week: lastWeek, time: null, location: null, dateCell: null, pensumLines: [] };
        pointer = 1; // parts[0] is the day name; date/time/location/pensum follow
      } else if (!current) {
        continue; // stray tab-line with nothing open to continue
      }
      // else: continuation of the current row — pointer stays where it was

      if (!current) continue;
      // Column order is [week, day, date, time, location, pensum]. week/day
      // (indices 0-1) are tracked via `current.week` and simply not stored
      // elsewhere — assignField no-ops for them, so it's safe to run every
      // part (including week/day) through the same loop uniformly.
      for (const value of parts) {
        assignField(current, pointer, value);
        if (pointer < 5) pointer++;
      }
    } else {
      if (!current) continue;
      if (pointer >= 5) {
        const trimmed = raw.trim();
        // Standalone editorial asides ("Ingen repetisjonsforelesning ...",
        // a trailing "Hentet fra ..." source citation) that happen to sit
        // right after a self-contained row with no blank line between —
        // real pensum content never starts this way, so skip rather than
        // let it bleed into the row above.
        if (!/^(ingen\b|hentet fra\b)/i.test(trimmed)) current.pensumLines.push(trimmed);
      } else {
        // Continuation of whichever field was most recently filled (in
        // practice, always the wrapped time slot).
        const prevField = pointer - 1;
        appendField(current, prevField, raw.trim());
      }
    }
  }
  flush();
  return rows;
}

function assignField(row: RawRow, index: number, value: string) {
  switch (index) {
    case 2:
      row.dateCell = value;
      return;
    case 3:
      row.time = value;
      return;
    case 4:
      row.location = value;
      return;
    default:
      // index 0/1 (week/day) are tracked outside RawRow; index >=5 is pensum.
      if (index >= 5) row.pensumLines.push(value);
  }
}

function appendField(row: RawRow, index: number, value: string) {
  if (index === 3) row.time = row.time ? `${row.time} ${value}` : value;
  else if (index === 2) row.dateCell = row.dateCell ? `${row.dateCell} ${value}` : value;
  else if (index === 4) row.location = row.location ? `${row.location} ${value}` : value;
}

// --- Pensum/oppgave cell sectioning -----------------------------------

const VIDEO_HEADER = /^videoer\b/i;
const BOOK_HEADER = /^(pensumbok|penumbok)\b\s*(?:\([^)]*\))?:?\s*(.*)$/i;
const TASKS_HEADER = /^oppgaver\b\s*(?:\([^)]*\))?:?\s*(.*)$/i;
const EXAM_TASKS_HEADER = /^eksamensoppgaver\b:?\s*(.*)$/i;
const VIDEO_LINE = /^(\d+)\s+(.+)$/;

type Section = "intro" | "videos" | "book" | "tasks" | "examTasks";

function sectionPensum(lines: string[]): Record<Section, string[]> {
  const buckets: Record<Section, string[]> = { intro: [], videos: [], book: [], tasks: [], examTasks: [] };
  let section: Section = "intro";

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (VIDEO_HEADER.test(line)) {
      section = "videos";
      continue;
    }
    const bookMatch = line.match(BOOK_HEADER);
    if (bookMatch) {
      section = "book";
      if (bookMatch[2]) buckets.book.push(bookMatch[2].trim());
      continue;
    }
    const tasksMatch = line.match(TASKS_HEADER);
    if (tasksMatch) {
      section = "tasks";
      if (tasksMatch[1]) buckets.tasks.push(tasksMatch[1].trim());
      continue;
    }
    const examMatch = line.match(EXAM_TASKS_HEADER);
    if (examMatch) {
      section = "examTasks";
      if (examMatch[1]) buckets.examTasks.push(examMatch[1].trim());
      continue;
    }
    buckets[section].push(line);
  }
  return buckets;
}

/** True when the document looks like this specific tab-delimited timetable format. */
export function looksLikeNorwegianTimetable(text: string): boolean {
  const header = text.slice(0, 500);
  return text.includes("\t") && /\buke\b/i.test(header) && /\bdato\b/i.test(header) && /pensum/i.test(header);
}

const EMPTY_RESULT: ExtractionResult = { events: [], reading: [], exercises: [], otherMaterial: [], milestones: [] };

export function extractNorwegianTimetable(text: string): ExtractionResult {
  const startYear = inferYear(text);
  const rawRows = assembleRows(text);

  const events: ExtractionResult["events"] = [];
  const reading: ExtractionResult["reading"] = [];
  const exercises: ExtractionResult["exercises"] = [];
  const otherMaterial: ExtractionResult["otherMaterial"] = [];
  const milestones: ExtractionResult["milestones"] = [];

  let previousRowKey: string | null = null;
  // The table is chronological but only ever labeled with a single course
  // term (e.g. "H26"); a retake exam or January session near the end
  // crosses into the next calendar year. Any month that goes backwards
  // relative to the last dated row (e.g. des -> jan) means the year rolled
  // over — bump it, and it stays bumped for the rest of the document.
  let currentYear = startYear;
  let lastMonth = 0;

  for (const row of rawRows) {
    const month = parseCellMonth(row.dateCell);
    if (month && lastMonth && month < lastMonth) currentYear += 1;
    if (month) lastMonth = month;

    const date = parseCellDate(row.dateCell, currentYear);
    if (!date) continue; // no parseable date -> not enough to act on (e.g. a Q&A week note)

    // PDF table extraction sometimes repeats the final row across a page
    // boundary (last row of one page re-printed atop the next) — drop an
    // exact repeat of the immediately preceding row.
    const rowKey = `${row.dateCell}|${row.location}|${row.pensumLines.join(" ")}`;
    if (rowKey === previousRowKey) continue;
    previousRowKey = rowKey;

    const rowPensumText = row.pensumLines.join(" ").trim();

    // "Frist innleveringsoppgave" (deadline for a mandatory assignment) is
    // a milestone, not a lecture — no separate event for it.
    if (/^frist\b/i.test(rowPensumText)) {
      milestones.push({
        title: rowPensumText.slice(0, 120),
        type: "MANDATORY_ASSIGNMENT",
        description: null,
        deadline: formatIsoDateLocal(date),
        wordCount: null,
        requirements: null,
        confidence: 0.4,
        sourceSnippet: rowPensumText.slice(0, 200),
      });
      continue;
    }

    const { start, end } = parseTimeRange(row.time);
    const isGroupSession = Boolean(row.location && /grupper/i.test(row.location));
    const isExam = Boolean(row.location && /eksamen/i.test(row.location));

    if (isGroupSession || isExam) {
      const fallbackTitle = isExam ? row.location! : "Group session";
      events.push({
        title: (rowPensumText || fallbackTitle).slice(0, 120),
        type: isExam ? "EXAM" : "EXERCISE_CLASS",
        date: formatIsoDateLocal(date),
        startTime: start,
        endTime: end,
        location: row.location,
        topic: null,
        description: null,
        confidence: 0.4,
        sourceSnippet: rowPensumText.slice(0, 200),
      });
      continue;
    }

    const sections = sectionPensum(row.pensumLines);
    const videoTitles: string[] = [];
    for (const line of sections.videos) {
      const m = line.match(VIDEO_LINE);
      if (m) videoTitles.push(m[2].trim());
    }

    const lectureTitle = (
      videoTitles.length > 0 ? joinNorwegian(videoTitles) : sections.intro.join(" ").trim() || `Lecture on ${date.toDateString()}`
    ).slice(0, 120);

    events.push({
      title: lectureTitle,
      type: "LECTURE",
      date: formatIsoDateLocal(date),
      startTime: start,
      endTime: end,
      location: row.location,
      topic: null,
      description: null,
      confidence: 0.4,
      sourceSnippet: row.pensumLines.join(" ").slice(0, 200),
    });

    for (const line of sections.videos) {
      const m = line.match(VIDEO_LINE);
      if (!m) continue;
      otherMaterial.push({
        materialType: "VIDEO",
        title: m[2].trim().slice(0, 120),
        minutes: null,
        relatedEventTitle: lectureTitle,
        requirementLevel: "RECOMMENDED",
        confidence: 0.4,
        sourceSnippet: line.slice(0, 200),
      });
    }

    const bookRefs = sections.book.join(", ").trim();
    if (bookRefs) {
      reading.push({
        title: `Read ${bookRefs}, "${lectureTitle}"`.slice(0, 120),
        chapterOrSection: bookRefs,
        pageCount: null,
        isArticle: false,
        relatedEventTitle: lectureTitle,
        relation: "FOLLOW_UP_TO", // reading happens after this lecture, per course convention
        requirementLevel: "RECOMMENDED",
        confidence: 0.4,
        sourceSnippet: bookRefs.slice(0, 200),
      });
    }

    const taskRefs = [...sections.tasks, ...sections.examTasks].join("; ").trim();
    if (taskRefs) {
      exercises.push({
        title: `Do ${taskRefs}, "${lectureTitle}"`.slice(0, 120),
        description: taskRefs,
        exerciseCount: null,
        relatedEventTitle: lectureTitle,
        relation: "PREPARATION_FOR", // book exercises are done before this lecture
        requirementLevel: "RECOMMENDED",
        confidence: 0.4,
        sourceSnippet: taskRefs.slice(0, 200),
      });
    }
  }

  return { ...EMPTY_RESULT, events, reading, exercises, otherMaterial, milestones };
}
