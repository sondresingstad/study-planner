import { db } from "@/lib/db";
import { startOfDay } from "@/lib/dates";
import { computeProgress } from "@/lib/progress";
import { estimateTaskMinutes, sumMinutes } from "@/lib/estimation";
import { getSettings, toEstimationSettings } from "./settings";

export async function getCourseDetail(courseId: string, now: Date = new Date()) {
  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course) return null;

  const settingsRow = await getSettings();
  const settings = toEstimationSettings(settingsRow);

  const [events, tasks, milestones, sourceDocuments, pendingBatches] = await Promise.all([
    db.event.findMany({ where: { courseId, approved: true }, orderBy: { date: "asc" } }),
    db.task.findMany({ where: { courseId, approved: true }, include: { relationships: { include: { event: true } } } }),
    db.milestone.findMany({ where: { courseId, approved: true }, orderBy: { deadline: "asc" } }),
    db.sourceDocument.findMany({ where: { courseId }, orderBy: { uploadedAt: "desc" } }),
    db.importBatch.findMany({ where: { courseId, status: "READY" }, orderBy: { createdAt: "desc" } }),
  ]);

  const tasksWithMinutes = tasks
    .map((t) => ({ ...t, minutes: t.estimatedMinutes ?? estimateTaskMinutes(t, settings) }))
    .sort((a, b) => {
      const dateA = a.dueDate ?? a.recommendedDate;
      const dateB = b.dueDate ?? b.recommendedDate;
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateA.getTime() - dateB.getTime();
    });

  const progress = computeProgress(tasks, events, milestones, now, settings);

  const nextEvent = events.find((e) => e.date.getTime() >= startOfDay(now).getTime()) ?? null;
  const nextMilestone =
    milestones
      .filter((m) => m.deadline && m.deadline.getTime() >= startOfDay(now).getTime() && m.status !== "DONE")
      .sort((a, b) => a.deadline!.getTime() - b.deadline!.getTime())[0] ?? null;

  const incomplete = tasksWithMinutes.filter((t) => t.status !== "DONE");
  const remainingWorkloadMinutes = sumMinutes(incomplete.map((t) => t.minutes));

  return {
    course,
    events,
    tasks: tasksWithMinutes,
    milestones,
    sourceDocuments,
    pendingBatches,
    progress,
    nextEvent,
    nextMilestone,
    remainingWorkloadMinutes,
  };
}
