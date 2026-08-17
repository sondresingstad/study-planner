import { db } from "@/lib/db";
import { getWeekStart, isSameDay, isSameWeek, getIsoWeekNumber, addDays } from "@/lib/dates";
import { estimateTaskMinutes } from "@/lib/estimation";
import { getSettings, toEstimationSettings } from "./settings";

export type TimelineTask = {
  id: string;
  title: string;
  type: string;
  status: string;
  minutes: number | null;
  relation: "PREPARATION_FOR" | "FOLLOW_UP_TO" | "RELATED_TO" | "REQUIRED_FOR";
};

export type TimelineDayItem = {
  kind: "event" | "milestone";
  id: string;
  courseId: string;
  courseCode: string;
  courseColor: string;
  title: string;
  topic: string | null;
  startTime: string | null;
  isOfficial: boolean;
  status?: string;
  tasks: TimelineTask[];
};

export type TimelineWeek = {
  weekStart: Date;
  weekNumber: number;
  isCurrent: boolean;
  days: { date: Date; isToday: boolean; items: TimelineDayItem[] }[];
};

export async function getTimeline(now: Date = new Date()) {
  const settingsRow = await getSettings();
  const settings = toEstimationSettings(settingsRow);

  const [events, milestones, relationships] = await Promise.all([
    db.event.findMany({ where: { approved: true }, include: { course: true }, orderBy: { date: "asc" } }),
    db.milestone.findMany({
      where: { approved: true, deadline: { not: null } },
      include: { course: true },
      orderBy: { deadline: "asc" },
    }),
    db.taskEventRelationship.findMany({ include: { task: true } }),
  ]);

  if (events.length === 0 && milestones.length === 0) {
    return { weeks: [] as TimelineWeek[] };
  }

  const relationshipsByEvent = new Map<string, typeof relationships>();
  for (const rel of relationships) {
    const list = relationshipsByEvent.get(rel.eventId) ?? [];
    list.push(rel);
    relationshipsByEvent.set(rel.eventId, list);
  }

  const toTimelineTask = (rel: (typeof relationships)[number]): TimelineTask => ({
    id: rel.task.id,
    title: rel.task.title,
    type: rel.task.type,
    status: rel.task.status,
    minutes: rel.task.estimatedMinutes ?? estimateTaskMinutes(rel.task, settings),
    relation: rel.type,
  });

  const dayItemsByDate = new Map<string, TimelineDayItem[]>();
  const pushItem = (date: Date, item: TimelineDayItem) => {
    const key = date.toDateString();
    const list = dayItemsByDate.get(key) ?? [];
    list.push(item);
    dayItemsByDate.set(key, list);
  };

  for (const event of events) {
    const rels = relationshipsByEvent.get(event.id) ?? [];
    pushItem(event.date, {
      kind: "event",
      id: event.id,
      courseId: event.courseId,
      courseCode: event.course.code,
      courseColor: event.course.color,
      title: event.title,
      topic: event.topic,
      startTime: event.startTime,
      isOfficial: true,
      tasks: rels.map(toTimelineTask),
    });
  }

  for (const m of milestones) {
    if (!m.deadline) continue;
    pushItem(m.deadline, {
      kind: "milestone",
      id: m.id,
      courseId: m.courseId,
      courseCode: m.course.code,
      courseColor: m.course.color,
      title: m.title,
      topic: m.type.replace("_", " ").toLowerCase(),
      startTime: null,
      isOfficial: m.isOfficialDeadline,
      status: m.status,
      tasks: [],
    });
  }

  const allDates = [...events.map((e) => e.date), ...milestones.map((m) => m.deadline!)];
  const earliest = getWeekStart(new Date(Math.min(...allDates.map((d) => d.getTime()))));
  const latest = getWeekStart(new Date(Math.max(...allDates.map((d) => d.getTime()))));

  const weeks: TimelineWeek[] = [];
  for (let ws = new Date(earliest); ws.getTime() <= latest.getTime(); ws = addDays(ws, 7)) {
    const days: TimelineWeek["days"] = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(ws, i);
      const items = dayItemsByDate.get(date.toDateString());
      if (!items || items.length === 0) continue;
      days.push({ date, isToday: isSameDay(date, now), items });
    }
    if (days.length === 0) continue;
    weeks.push({
      weekStart: ws,
      weekNumber: getIsoWeekNumber(ws),
      isCurrent: isSameWeek(ws, now),
      days,
    });
  }

  return { weeks };
}
