import { db } from "@/lib/db";
import { estimateTaskMinutes } from "@/lib/estimation";
import { compareTaskPriority, getEffectiveDate } from "@/lib/prioritization";
import { getSettings, toEstimationSettings } from "./settings";
import type { RequirementLevel, TaskStatus, TaskType } from "@prisma/client";

export type TaskListSort = "priority" | "date" | "course" | "type" | "requirement";

export type TaskListFilters = {
  courseId?: string;
  type?: TaskType;
  requirementLevel?: RequirementLevel;
  status?: "open" | "done" | "all";
  sort?: TaskListSort;
};

export async function getTaskList(filters: TaskListFilters, now: Date = new Date()) {
  const settingsRow = await getSettings();
  const settings = toEstimationSettings(settingsRow);

  const where: {
    approved: boolean;
    courseId?: string;
    type?: TaskType;
    requirementLevel?: RequirementLevel;
    status?: TaskStatus | { not: TaskStatus };
  } = { approved: true };
  if (filters.courseId) where.courseId = filters.courseId;
  if (filters.type) where.type = filters.type;
  if (filters.requirementLevel) where.requirementLevel = filters.requirementLevel;
  if (filters.status === "open") where.status = { not: "DONE" };
  if (filters.status === "done") where.status = "DONE";

  const tasks = await db.task.findMany({
    where,
    include: {
      course: true,
      relationships: { include: { event: true } },
    },
  });

  const withMinutes = tasks.map((t) => ({ ...t, minutes: t.estimatedMinutes ?? estimateTaskMinutes(t, settings) }));

  const sort = filters.sort ?? "priority";
  const sorted = [...withMinutes].sort((a, b) => {
    switch (sort) {
      case "date": {
        const aDate = getEffectiveDate(a);
        const bDate = getEffectiveDate(b);
        if (aDate && bDate) return aDate.getTime() - bDate.getTime();
        if (aDate) return -1;
        if (bDate) return 1;
        return 0;
      }
      case "course":
        return a.course.code.localeCompare(b.course.code);
      case "type":
        return a.type.localeCompare(b.type);
      case "requirement":
        return compareTaskPriority(a, b); // requirement is the dominant factor already
      case "priority":
      default:
        return compareTaskPriority(a, b);
    }
  });

  return { tasks: sorted, now };
}

export async function getCoursesForFilter() {
  return db.course.findMany({ orderBy: { code: "asc" }, select: { id: true, code: true, name: true, color: true } });
}
