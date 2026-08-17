import type { Event, Milestone, MilestoneStatus, Task, TaskStatus } from "@prisma/client";
import { estimateTaskMinutes, sumMinutes, type EstimationSettings } from "./estimation";

export type CategoryProgress = {
  label: string;
  unit: string;
  completed: number;
  total: number;
  /** 0-100, rounded. `null` when there's nothing to measure yet (avoids showing a misleading 0%). */
  percent: number | null;
};

export type ProgressSummary = {
  studyWorkload: CategoryProgress; // minutes-weighted, across all non-milestone tasks
  attendance: CategoryProgress; // events that have already happened
  reading: CategoryProgress; // pages
  exercises: CategoryProgress; // exercise count
  videos: CategoryProgress; // minutes
  assignments: CategoryProgress; // milestones
  other: CategoryProgress; // writing/quiz/other tasks, count-based
};

function pct(completed: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((completed / total) * 100);
}

function category(label: string, unit: string, completed: number, total: number): CategoryProgress {
  return { label, unit, completed, total, percent: pct(completed, total) };
}

const DONE: TaskStatus = "DONE";
const MILESTONE_DONE: MilestoneStatus = "DONE";

/**
 * Progress is measured by underlying quantity (pages/exercises/minutes) where
 * available, not just "checked tasks / total tasks" — a 3-page reading and a
 * 40-page reading should not count the same. Attendance is tracked
 * separately from study workload; the two should never be blended into one
 * number (spec section 13).
 */
export function computeProgress(
  tasks: Pick<
    Task,
    "type" | "status" | "pageCount" | "articlePages" | "exerciseCount" | "wordCount" | "videoMinutes" | "approved"
  >[],
  events: Pick<Event, "type" | "date" | "attended" | "approved">[],
  milestones: Pick<Milestone, "status" | "approved">[],
  now: Date = new Date(),
  settings?: EstimationSettings
): ProgressSummary {
  const approvedTasks = tasks.filter((t) => t.approved);
  const approvedEvents = events.filter((e) => e.approved);
  const approvedMilestones = milestones.filter((m) => m.approved);

  // Study workload: minutes-weighted completion across every task with a
  // known quantity. Tasks without a computable estimate (e.g. an ASSIGNMENT
  // with no quantity recorded) don't contribute — they're tracked via the
  // Assignments/Other buckets instead so they aren't silently ignored.
  const withEstimate = approvedTasks
    .map((t) => ({ t, minutes: estimateTaskMinutes(t, settings ?? undefined) }))
    .filter((x): x is { t: (typeof approvedTasks)[number]; minutes: number } => x.minutes != null);
  const totalMinutes = sumMinutes(withEstimate.map((x) => x.minutes));
  const doneMinutes = sumMinutes(withEstimate.filter((x) => x.t.status === DONE).map((x) => x.minutes));

  const pastEvents = approvedEvents.filter((e) => e.date.getTime() <= now.getTime());
  const attendedCount = pastEvents.filter((e) => e.attended).length;

  const readingTasks = approvedTasks.filter((t) => t.type === "READING" && t.pageCount != null);
  const totalPages = sumMinutes(readingTasks.map((t) => t.pageCount));
  const donePages = sumMinutes(readingTasks.filter((t) => t.status === DONE).map((t) => t.pageCount));

  const exerciseTasks = approvedTasks.filter((t) => t.type === "EXERCISE" && t.exerciseCount != null);
  const totalExercises = sumMinutes(exerciseTasks.map((t) => t.exerciseCount));
  const doneExercises = sumMinutes(exerciseTasks.filter((t) => t.status === DONE).map((t) => t.exerciseCount));

  const videoTasks = approvedTasks.filter((t) => t.type === "VIDEO" && t.videoMinutes != null);
  const totalVideoMinutes = sumMinutes(videoTasks.map((t) => t.videoMinutes));
  const doneVideoMinutes = sumMinutes(videoTasks.filter((t) => t.status === DONE).map((t) => t.videoMinutes));

  const otherTasks = approvedTasks.filter((t) => t.type === "WRITING" || t.type === "QUIZ" || t.type === "OTHER");
  const doneOther = otherTasks.filter((t) => t.status === DONE).length;

  const doneMilestones = approvedMilestones.filter((m) => m.status === MILESTONE_DONE).length;

  return {
    studyWorkload: category("Study workload", "min", doneMinutes, totalMinutes),
    attendance: category("Attendance", "lectures", attendedCount, pastEvents.length),
    reading: category("Reading", "pages", donePages, totalPages),
    exercises: category("Exercises", "exercises", doneExercises, totalExercises),
    videos: category("Videos", "min", doneVideoMinutes, totalVideoMinutes),
    assignments: category("Assignments", "milestones", doneMilestones, approvedMilestones.length),
    other: category("Other", "tasks", doneOther, otherTasks.length),
  };
}
