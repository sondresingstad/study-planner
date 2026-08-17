import { db } from "@/lib/db";
import { addDays, startOfDay } from "@/lib/dates";
import { estimateTaskMinutes, sumMinutes } from "@/lib/estimation";
import { compareTaskPriority, getEffectiveDate } from "@/lib/prioritization";
import { getSettings, toEstimationSettings } from "./settings";

export async function getDashboardData(now: Date = new Date()) {
  const settingsRow = await getSettings();
  const settings = toEstimationSettings(settingsRow);

  const [courses, tasks, events, milestones, prepRelationships] = await Promise.all([
    db.course.findMany({ orderBy: { code: "asc" } }),
    db.task.findMany({ where: { approved: true }, include: { course: true } }),
    db.event.findMany({ where: { approved: true }, include: { course: true }, orderBy: { date: "asc" } }),
    db.milestone.findMany({ where: { approved: true }, include: { course: true }, orderBy: { deadline: "asc" } }),
    db.taskEventRelationship.findMany({
      where: { type: "PREPARATION_FOR", task: { approved: true } },
      include: { task: true },
    }),
  ]);

  const tasksWithMinutes = tasks.map((t) => ({
    ...t,
    minutes: t.estimatedMinutes ?? estimateTaskMinutes(t, settings),
  }));

  // --- Today ------------------------------------------------------------
  const windowEnd = addDays(startOfDay(now), 1);
  windowEnd.setHours(23, 59, 59, 999);
  const todayTasks = tasksWithMinutes
    .filter((t) => t.status !== "DONE")
    .filter((t) => {
      const effective = getEffectiveDate(t);
      return effective != null && effective.getTime() <= windowEnd.getTime();
    })
    .sort(compareTaskPriority)
    .slice(0, 8);
  const remainingMinutesToday = sumMinutes(todayTasks.map((t) => t.minutes));

  // --- Next lectures ------------------------------------------------------
  const nextLectures = courses
    .map((course) => {
      const nextEvent = events.find((e) => e.courseId === course.id && e.date.getTime() >= startOfDay(now).getTime());
      if (!nextEvent) return null;

      const prepTasks = prepRelationships
        .filter((r) => r.eventId === nextEvent.id)
        .map((r) => {
          const t = r.task;
          return { ...t, minutes: t.estimatedMinutes ?? estimateTaskMinutes(t, settings) };
        });
      const withMinutes = prepTasks.filter((t) => t.minutes != null);
      const totalMinutes = sumMinutes(withMinutes.map((t) => t.minutes));
      const doneMinutes = sumMinutes(withMinutes.filter((t) => t.status === "DONE").map((t) => t.minutes));
      const preparationPercent =
        totalMinutes > 0
          ? Math.round((doneMinutes / totalMinutes) * 100)
          : prepTasks.length > 0
            ? Math.round((prepTasks.filter((t) => t.status === "DONE").length / prepTasks.length) * 100)
            : null;

      return { course, event: nextEvent, preparationPercent };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.event.date.getTime() - b.event.date.getTime());

  // --- Upcoming deadlines ---------------------------------------------
  const upcomingMilestones = milestones
    .filter((m) => m.deadline && m.deadline.getTime() >= startOfDay(now).getTime() && m.status !== "DONE")
    .slice(0, 5);

  // --- Courses summary ---------------------------------------------------
  const courseSummaries = courses.map((course) => {
    const courseTasks = tasksWithMinutes.filter((t) => t.courseId === course.id);
    const courseEvents = events.filter((e) => e.courseId === course.id);
    const courseMilestones = milestones.filter((m) => m.courseId === course.id);

    const nextEvent = courseEvents.find((e) => e.date.getTime() >= startOfDay(now).getTime()) ?? null;
    const nextMilestone =
      courseMilestones
        .filter((m) => m.deadline && m.deadline.getTime() >= startOfDay(now).getTime() && m.status !== "DONE")
        .sort((a, b) => (a.deadline!.getTime() - b.deadline!.getTime()))[0] ?? null;

    const incomplete = courseTasks.filter((t) => t.status !== "DONE");
    const remainingWorkloadMinutes = sumMinutes(incomplete.map((t) => t.minutes));

    const withMinutes = courseTasks.filter((t) => t.minutes != null);
    const totalMinutes = sumMinutes(withMinutes.map((t) => t.minutes));
    const doneMinutes = sumMinutes(withMinutes.filter((t) => t.status === "DONE").map((t) => t.minutes));
    const progressPercent = totalMinutes > 0 ? Math.round((doneMinutes / totalMinutes) * 100) : null;

    return {
      course,
      nextEvent,
      nextMilestone,
      remainingWorkloadMinutes,
      progressPercent,
    };
  });

  return {
    todayTasks,
    remainingMinutesToday,
    nextLectures,
    upcomingMilestones,
    courseSummaries,
  };
}
