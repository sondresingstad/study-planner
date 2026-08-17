import { describe, expect, it } from "vitest";
import { computeProgress } from "@/lib/progress";

const now = new Date("2026-08-17T12:00:00");

function task(overrides: Partial<Parameters<typeof computeProgress>[0][number]>) {
  return {
    type: "READING" as const,
    status: "TODO" as const,
    pageCount: null,
    articlePages: false,
    exerciseCount: null,
    wordCount: null,
    videoMinutes: null,
    approved: true,
    ...overrides,
  };
}

describe("computeProgress", () => {
  it("weighs reading progress by pages, not task count", () => {
    const tasks = [
      task({ status: "DONE", pageCount: 10 }),
      task({ status: "TODO", pageCount: 90 }),
    ];
    const result = computeProgress(tasks, [], []);
    expect(result.reading.completed).toBe(10);
    expect(result.reading.total).toBe(100);
    expect(result.reading.percent).toBe(10);
  });

  it("keeps attendance separate from study workload", () => {
    const tasks = [task({ type: "EXERCISE", exerciseCount: 4, status: "DONE" })];
    const events = [
      { type: "LECTURE", date: new Date("2026-08-10"), attended: true, approved: true },
      { type: "LECTURE", date: new Date("2026-08-16"), attended: false, approved: true },
      // future event: should not count toward attendance yet
      { type: "LECTURE", date: new Date("2026-09-01"), attended: false, approved: true },
    ];
    const result = computeProgress(tasks, events, [], now);
    expect(result.attendance.completed).toBe(1);
    expect(result.attendance.total).toBe(2);
    expect(result.studyWorkload.percent).toBe(100);
  });

  it("only counts approved (post-review) items", () => {
    const tasks = [
      task({ status: "DONE", pageCount: 20, approved: true }),
      task({ status: "TODO", pageCount: 500, approved: false }),
    ];
    const result = computeProgress(tasks, [], []);
    expect(result.reading.total).toBe(20);
  });

  it("returns null percent instead of 0 when there is nothing to measure", () => {
    const result = computeProgress([], [], []);
    expect(result.reading.percent).toBeNull();
    expect(result.exercises.percent).toBeNull();
  });

  it("tracks milestones as the Assignments category", () => {
    const milestones = [
      { status: "DONE" as const, approved: true },
      { status: "UPCOMING" as const, approved: true },
    ];
    const result = computeProgress([], [], milestones);
    expect(result.assignments.completed).toBe(1);
    expect(result.assignments.total).toBe(2);
  });
});
