import { addDays, addWeeks, isBefore } from "date-fns";
import type { PrismaClient, EventType, RequirementLevel } from "@prisma/client";
import { estimateTaskMinutes, DEFAULT_ESTIMATION_SETTINGS } from "@/lib/estimation";
import { computeRecommendedDate, type RelevantEvent } from "@/lib/deadlines";

type CourseSpec = {
  name: string;
  code: string;
  color: string;
  weeks: number;
  lectureDays: number[]; // 0=Mon..6=Sun, relative offsets within each week
  lectureTime: { start: string; end: string };
  location: string;
  topics: string[];
  readingPages: number[]; // per lecture
  exerciseCounts: number[]; // per lecture
  assignment1: { weekOffset: number; title: string; wordCount: number };
  assignment2: { weekOffset: number; title: string; wordCount: number };
  examWeekOffset: number;
};

const COURSES: CourseSpec[] = [
  {
    name: "Macroeconomics",
    code: "ECON101",
    color: "#6366f1",
    weeks: 12,
    lectureDays: [1, 3], // Tue, Thu
    lectureTime: { start: "10:15", end: "12:00" },
    location: "Aud 4",
    topics: [
      "Introduction to macroeconomics",
      "GDP and national accounts",
      "Unemployment and the labour market",
      "Inflation and price indices",
      "Aggregate demand and supply",
      "Fiscal policy",
      "Monetary policy and central banks",
      "The IS-LM model",
      "Open economy macroeconomics",
      "Exchange rates",
      "Economic growth theory",
      "Business cycles",
      "Financial crises",
      "Course review",
      "Course review II",
      "Guest lecture: policy in practice",
      "Labour market II",
      "Wrap-up",
      "Revision",
      "Revision II",
      "Extra topic",
      "Extra topic II",
      "Extra topic III",
      "Extra topic IV",
    ],
    readingPages: [32, 28, 41, 24, 36, 19, 44, 27, 33, 22, 38, 30],
    exerciseCounts: [6, 5, 8, 4, 7, 3, 9, 5, 6, 4, 7, 5],
    assignment1: { weekOffset: 3, title: "Problem Set 1", wordCount: 0 },
    assignment2: { weekOffset: 8, title: "Policy Essay", wordCount: 1500 },
    examWeekOffset: 11,
  },
  {
    name: "Managerial Accounting",
    code: "BUS201",
    color: "#10b981",
    weeks: 12,
    lectureDays: [0, 2], // Mon, Wed
    lectureTime: { start: "08:15", end: "10:00" },
    location: "Room 2.14",
    topics: [
      "Cost concepts and behaviour",
      "Job order costing",
      "Activity-based costing (ABC)",
      "Cost-volume-profit analysis",
      "Budgeting fundamentals",
      "Flexible budgets and variances",
      "Standard costing",
      "Relevant costs for decisions",
      "Capital budgeting",
      "Pricing decisions",
      "Performance measurement",
      "Balanced scorecard",
      "Transfer pricing",
      "Course review",
      "Course review II",
      "Guest lecture: costing in practice",
      "ABC in services",
      "Wrap-up",
      "Revision",
      "Revision II",
      "Extra topic",
      "Extra topic II",
      "Extra topic III",
      "Extra topic IV",
    ],
    readingPages: [32, 41, 27, 35, 22, 29, 33, 26, 38, 24, 31, 20],
    exerciseCounts: [8, 6, 7, 5, 6, 4, 8, 5, 6, 4, 7, 5],
    assignment1: { weekOffset: 3, title: "Mandatory Assignment 1", wordCount: 0 },
    assignment2: { weekOffset: 8, title: "Mandatory Assignment 2", wordCount: 0 },
    examWeekOffset: 11,
  },
  {
    name: "Organizational Behaviour",
    code: "ORG110",
    color: "#f59e0b",
    weeks: 10,
    lectureDays: [2], // Wed
    lectureTime: { start: "13:15", end: "15:00" },
    location: "Room 1.08",
    topics: [
      "Foundations of OB",
      "Individual differences and personality",
      "Motivation theories",
      "Team dynamics",
      "Leadership styles",
      "Organizational culture",
      "Power and politics",
      "Conflict and negotiation",
      "Organizational change",
      "Decision making",
      "Communication in organizations",
      "Course review",
    ],
    readingPages: [24, 30, 22, 27, 33, 19, 26, 21, 29, 18],
    exerciseCounts: [3, 4, 3, 5, 4, 2, 4, 3, 5, 3],
    assignment1: { weekOffset: 4, title: "Group Case Analysis", wordCount: 0 },
    assignment2: { weekOffset: 9, title: "Reflection Paper", wordCount: 1200 },
    examWeekOffset: -1, // no written exam; course approval instead
  },
];

function computeSemesterStart(now: Date): Date {
  // Semester starts a couple of weeks before "now" so the demo data shows a
  // mix of already-happened and upcoming weeks, matching how someone would
  // actually be using this mid-semester.
  const start = addWeeks(now, -2);
  start.setHours(0, 0, 0, 0);
  // Snap to the most recent Monday so weekly patterns look natural.
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

async function seedCourse(db: PrismaClient, spec: CourseSpec, now: Date, semesterStart: Date) {
  const toTime = (week: number, dayOffset: number) => addDays(semesterStart, week * 7 + dayOffset);

  const course = await db.course.create({
    data: {
      name: spec.name,
      code: spec.code,
      semester: "Fall 2026",
      color: spec.color,
      isDemo: true,
    },
  });

  // --- Lectures -------------------------------------------------------
  const lectureDates: Date[] = [];
  for (let week = 0; week < spec.weeks; week++) {
    for (const day of spec.lectureDays) lectureDates.push(toTime(week, day));
  }
  lectureDates.sort((a, b) => a.getTime() - b.getTime());

  const lectures = [];
  for (let i = 0; i < lectureDates.length; i++) {
    const date = lectureDates[i];
    const topic = spec.topics[i % spec.topics.length];
    const isPast = isBefore(date, now);
    const lecture = await db.event.create({
      data: {
        courseId: course.id,
        title: `Lecture ${i + 1}`,
        type: "LECTURE" as EventType,
        date,
        startTime: spec.lectureTime.start,
        endTime: spec.lectureTime.end,
        location: spec.location,
        topic,
        // Skip attendance on ~1 in 6 past lectures, for realism.
        attended: isPast ? i % 6 !== 5 : false,
      },
    });
    lectures.push(lecture);
  }

  const relevantEvents: RelevantEvent[] = lectures.map((l) => ({
    id: l.id,
    title: l.title,
    type: l.type,
    date: l.date,
  }));

  // --- Reading + exercise tasks tied to each lecture -------------------
  for (let i = 0; i < lectures.length; i++) {
    const lecture = lectures[i];
    const pages = spec.readingPages[i % spec.readingPages.length];
    const exercises = spec.exerciseCounts[i % spec.exerciseCounts.length];

    const readingRec = computeRecommendedDate(
      [{ type: "PREPARATION_FOR", event: relevantEvents[i] }],
      relevantEvents
    );
    const readingMinutes = estimateTaskMinutes(
      { type: "READING", pageCount: pages, articlePages: false, exerciseCount: null, wordCount: null, videoMinutes: null },
      DEFAULT_ESTIMATION_SETTINGS
    );
    const readingDone = readingRec ? isBefore(readingRec.date, now) && i % 5 !== 4 : false;
    const readingTask = await db.task.create({
      data: {
        courseId: course.id,
        type: "READING",
        title: `${spec.topics[i % spec.topics.length]} — reading`,
        requirementLevel: "RECOMMENDED" as RequirementLevel,
        pageCount: pages,
        estimatedMinutes: readingMinutes,
        recommendedDate: readingRec?.date,
        recommendedDateReason: readingRec?.reason,
        status: readingDone ? "DONE" : "TODO",
        completedAt: readingDone ? readingRec!.date : null,
      },
    });
    await db.taskEventRelationship.create({
      data: { taskId: readingTask.id, eventId: lecture.id, type: "PREPARATION_FOR" },
    });

    const exerciseRec = computeRecommendedDate(
      [{ type: "FOLLOW_UP_TO", event: relevantEvents[i] }],
      relevantEvents
    );
    const exerciseMinutes = estimateTaskMinutes(
      { type: "EXERCISE", pageCount: null, articlePages: false, exerciseCount: exercises, wordCount: null, videoMinutes: null },
      DEFAULT_ESTIMATION_SETTINGS
    );
    const exerciseDone = exerciseRec ? isBefore(exerciseRec.date, now) && i % 4 !== 3 : false;
    const exerciseTask = await db.task.create({
      data: {
        courseId: course.id,
        type: "EXERCISE",
        title: `Exercises ${i + 1}.1–${i + 1}.${exercises}`,
        requirementLevel: "RECOMMENDED" as RequirementLevel,
        exerciseCount: exercises,
        estimatedMinutes: exerciseMinutes,
        recommendedDate: exerciseRec?.date,
        recommendedDateReason: exerciseRec?.reason,
        status: exerciseDone ? "DONE" : "TODO",
        completedAt: exerciseDone ? exerciseRec!.date : null,
      },
    });
    await db.taskEventRelationship.create({
      data: { taskId: exerciseTask.id, eventId: lecture.id, type: "FOLLOW_UP_TO" },
    });

    // A handful of optional videos, sprinkled in.
    if (i % 3 === 0) {
      const videoMinutes = 8 + (i % 5) * 3;
      const videoDone = isBefore(lecture.date, now) && i % 6 !== 0;
      const videoTask = await db.task.create({
        data: {
          courseId: course.id,
          type: "VIDEO",
          title: `Video: ${spec.topics[i % spec.topics.length]}`,
          requirementLevel: "OPTIONAL" as RequirementLevel,
          videoMinutes,
          estimatedMinutes: videoMinutes,
          recommendedDate: relevantEvents[i].date,
          recommendedDateReason: `Related to "${lecture.title}" on ${lecture.date.toDateString()}.`,
          status: videoDone ? "DONE" : "TODO",
          completedAt: videoDone ? lecture.date : null,
        },
      });
      await db.taskEventRelationship.create({
        data: { taskId: videoTask.id, eventId: lecture.id, type: "RELATED_TO" },
      });
    }
  }

  // --- Milestones -------------------------------------------------------
  const a1Date = addDays(semesterStart, spec.assignment1.weekOffset * 7 + 4); // Friday of that week
  const a1Done = isBefore(a1Date, now);
  await db.milestone.create({
    data: {
      courseId: course.id,
      title: spec.assignment1.title,
      type: "MANDATORY_ASSIGNMENT",
      description: `Submit ${spec.assignment1.title.toLowerCase()} covering material through week ${spec.assignment1.weekOffset}.`,
      deadline: a1Date,
      isOfficialDeadline: true,
      status: a1Done ? "DONE" : "UPCOMING",
      wordCount: spec.assignment1.wordCount || null,
    },
  });

  const a2Date = addDays(semesterStart, spec.assignment2.weekOffset * 7 + 4);
  await db.milestone.create({
    data: {
      courseId: course.id,
      title: spec.assignment2.title,
      type: "MANDATORY_ASSIGNMENT",
      description: `Submit ${spec.assignment2.title.toLowerCase()}.`,
      deadline: a2Date,
      isOfficialDeadline: true,
      status: isBefore(a2Date, now) ? "DONE" : "UPCOMING",
      wordCount: spec.assignment2.wordCount || null,
    },
  });

  if (spec.examWeekOffset >= 0) {
    const examDate = addDays(semesterStart, spec.examWeekOffset * 7 + 4);
    examDate.setHours(9, 0, 0, 0);
    await db.event.create({
      data: {
        courseId: course.id,
        title: "Final Exam",
        type: "EXAM",
        date: examDate,
        startTime: "09:00",
        endTime: "12:00",
        location: "Exam Hall B",
        topic: "Cumulative",
      },
    });
    await db.milestone.create({
      data: {
        courseId: course.id,
        title: "Final Exam",
        type: "EXAM",
        description: "Written exam covering the full curriculum.",
        deadline: examDate,
        isOfficialDeadline: true,
        status: "UPCOMING",
      },
    });
  } else {
    await db.milestone.create({
      data: {
        courseId: course.id,
        title: "Course Approval",
        type: "COURSE_APPROVAL",
        description: "Attendance and assignment requirements for course approval.",
        deadline: addDays(semesterStart, spec.weeks * 7),
        isOfficialDeadline: true,
        status: "UPCOMING",
      },
    });
  }

  return course;
}

/**
 * Generates the three demo courses (ECON101/BUS201/ORG110). Shared between
 * the `db:seed` CLI script and the in-app "Add demo data" action in
 * Settings, so both stay in sync.
 */
export async function generateDemoCourses(db: PrismaClient, now: Date = new Date()) {
  const semesterStart = computeSemesterStart(now);
  const created = [];
  for (const spec of COURSES) {
    created.push(await seedCourse(db, spec, now, semesterStart));
  }
  return created;
}
