import { db } from "@/lib/db";
import { getWeekStart } from "@/lib/dates";
import { computeProgress } from "@/lib/progress";
import { getSettings, toEstimationSettings } from "./settings";

export async function getProgressOverview(now: Date = new Date()) {
  const settingsRow = await getSettings();
  const settings = toEstimationSettings(settingsRow);

  const [courses, tasks, events, milestones] = await Promise.all([
    db.course.findMany({ orderBy: { code: "asc" } }),
    db.task.findMany({ where: { approved: true } }),
    db.event.findMany({ where: { approved: true } }),
    db.milestone.findMany({ where: { approved: true } }),
  ]);

  const overall = computeProgress(tasks, events, milestones, now, settings);

  const perCourse = courses.map((course) => {
    const courseTasks = tasks.filter((t) => t.courseId === course.id);
    const courseEvents = events.filter((e) => e.courseId === course.id);
    const courseMilestones = milestones.filter((m) => m.courseId === course.id);
    return { course, progress: computeProgress(courseTasks, courseEvents, courseMilestones, now, settings) };
  });

  // Weekly workload: minutes-weighted completion for tasks whose effective
  // date falls in each of the last 6 weeks through the current one.
  const weeks: { weekStart: Date; percent: number | null }[] = [];
  for (let i = 5; i >= 0; i--) {
    const weekStart = getWeekStart(new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000));
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const weekTasks = tasks.filter((t) => {
      const effective = t.dueDate ?? t.recommendedDate;
      return effective != null && effective.getTime() >= weekStart.getTime() && effective.getTime() < weekEnd.getTime();
    });
    const p = computeProgress(weekTasks, [], [], now, settings);
    weeks.push({ weekStart, percent: p.studyWorkload.percent });
  }

  return { overall, perCourse, weeks };
}
