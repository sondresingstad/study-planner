import { db } from "@/lib/db";
import { addDays, isSameDay, isSameMonth, startOfDay } from "@/lib/dates";

export type CalendarItem = {
  kind: "event" | "milestone";
  id: string;
  courseId: string;
  courseCode: string;
  courseColor: string;
  title: string;
  startTime: string | null;
  isOfficial: boolean;
};

export async function getCalendarMonth(monthAnchor: Date, now: Date = new Date()) {
  const monthStart = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
  const gridStart = startOfDay(monthStart);
  gridStart.setDate(gridStart.getDate() - ((gridStart.getDay() + 6) % 7)); // back to Monday

  const days: { date: Date; inMonth: boolean; isToday: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const date = addDays(gridStart, i);
    days.push({ date, inMonth: isSameMonth(date, monthStart), isToday: isSameDay(date, now) });
  }
  const gridEnd = days[days.length - 1].date;

  const [events, milestones] = await Promise.all([
    db.event.findMany({
      where: { approved: true, date: { gte: gridStart, lte: addDays(gridEnd, 1) } },
      include: { course: true },
      orderBy: { startTime: "asc" },
    }),
    db.milestone.findMany({
      where: { approved: true, deadline: { gte: gridStart, lte: addDays(gridEnd, 1) }, status: { not: "DONE" } },
      include: { course: true },
    }),
  ]);

  const itemsByDate = new Map<string, CalendarItem[]>();
  const push = (date: Date, item: CalendarItem) => {
    const key = date.toDateString();
    const list = itemsByDate.get(key) ?? [];
    list.push(item);
    itemsByDate.set(key, list);
  };

  for (const e of events) {
    push(e.date, {
      kind: "event",
      id: e.id,
      courseId: e.courseId,
      courseCode: e.course.code,
      courseColor: e.course.color,
      title: e.title,
      startTime: e.startTime,
      isOfficial: true,
    });
  }
  for (const m of milestones) {
    if (!m.deadline) continue;
    push(m.deadline, {
      kind: "milestone",
      id: m.id,
      courseId: m.courseId,
      courseCode: m.course.code,
      courseColor: m.course.color,
      title: m.title,
      startTime: null,
      isOfficial: m.isOfficialDeadline,
    });
  }

  return { monthStart, days, itemsByDate };
}

export async function getEventDetail(eventId: string) {
  const event = await db.event.findUnique({ where: { id: eventId }, include: { course: true } });
  if (!event) return null;

  const relationships = await db.taskEventRelationship.findMany({
    where: { eventId },
    include: { task: true },
  });

  return { event, relationships };
}
