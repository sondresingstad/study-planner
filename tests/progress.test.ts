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
  it("counts reading progress by task, not page count", () => {
    // Deterministic imports never fill in pageCount, so reading (and video)
    // progress is measured by how many tasks are done, not by quantity.
    const tasks = [
      task({ status: "DONE", pageCount: 10 }),
      task({ status: "TODO", pageCount: 90 }),
      task({ status: "TODO", pageCount: null }),
    ];
    const result = computeProgress(tasks, [], []);
    expect(result.reading.completed).toBe(1);
    expect(result.reading.total).toBe(3);
    expect(result.reading.percent).toBe(33);
  });

  it("counts video progress by task, not minutes", () => {
    const tasks = [
      task({ type: "VIDEO", status: "DONE", videoMinutes: null }),
      task({ type: "VIDEO", status: "DONE", videoMinutes: null }),
      task({ type: "VIDEO", status: "TODO", videoMinutes: null }),
    ];
    const result = computeProgress(tasks, [], []);
    expect(result.videos.completed).toBe(2);
    expect(result.videos.total).toBe(3);
  });

  it("keeps attendance separate from study workload", () => {
    const tasks = [task({ type: "EXERCISE", exerciseCount: 4, status: "DONE" })];
    const events = [
      { type: "LECTURE" as const, date: new Date("2026-08-10"), attended: true, approved: true },
      { type: "LECTURE" as const, date: new Date("2026-08-16"), attended: false, approved: true },
      // future event: should not count toward attendance yet
      { type: "LECTURE" as const, date: new Date("2026-09-01"), attended: false, approved: true },
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
    expect(result.reading.total).toBe(1);
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
