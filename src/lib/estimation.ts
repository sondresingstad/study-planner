import type { Task, TaskType } from "@prisma/client";

export type EstimationSettings = {
  textbookPageMinutes: number;
  articlePageMinutes: number;
  exerciseMinutes: number;
  writingWordsPerHour: number;
};

export const DEFAULT_ESTIMATION_SETTINGS: EstimationSettings = {
  textbookPageMinutes: 2,
  articlePageMinutes: 3,
  exerciseMinutes: 12,
  writingWordsPerHour: 250,
};

export type EstimationQuantities = Pick<
  Task,
  "type" | "pageCount" | "articlePages" | "exerciseCount" | "wordCount" | "videoMinutes"
>;

/**
 * Estimates study time from underlying quantities (pages, exercises, words,
 * video length) rather than a flat per-task guess, so estimates can be
 * recalculated whenever the user changes Settings.
 *
 * Returns null when the task type has no quantity to estimate from (e.g. a
 * QUIZ or generic ASSIGNMENT with nothing recorded) — callers should treat
 * that as "needs a manual estimate", not zero.
 */
export function estimateTaskMinutes(
  task: EstimationQuantities,
  settings: EstimationSettings = DEFAULT_ESTIMATION_SETTINGS
): number | null {
  switch (task.type as TaskType) {
    case "READING": {
      if (task.pageCount == null) return null;
      const perPage = task.articlePages ? settings.articlePageMinutes : settings.textbookPageMinutes;
      return Math.round(task.pageCount * perPage);
    }
    case "EXERCISE": {
      if (task.exerciseCount == null) return null;
      return Math.round(task.exerciseCount * settings.exerciseMinutes);
    }
    case "VIDEO": {
      if (task.videoMinutes == null) return null;
      return Math.round(task.videoMinutes);
    }
    case "WRITING": {
      if (task.wordCount == null) return null;
      return Math.round((task.wordCount / settings.writingWordsPerHour) * 60);
    }
    case "QUIZ":
    case "ASSIGNMENT":
    case "OTHER":
    default:
      return null;
  }
}

/** Formats minutes as "1h 26m" / "45m" / "0m". */
export function formatMinutes(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function sumMinutes(values: Array<number | null | undefined>): number {
  return values.reduce<number>((total, v) => total + (v ?? 0), 0);
}
