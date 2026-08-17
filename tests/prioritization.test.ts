import { describe, expect, it } from "vitest";
import { compareTaskPriority, getEffectiveDate, type PrioritizableTask } from "@/lib/prioritization";

function t(overrides: Partial<PrioritizableTask>): PrioritizableTask {
  return {
    dueDate: null,
    isOfficialDeadline: false,
    recommendedDate: null,
    requirementLevel: "RECOMMENDED",
    status: "TODO",
    ...overrides,
  };
}

describe("getEffectiveDate", () => {
  it("prefers the official due date over the recommended one", () => {
    const date = getEffectiveDate({ dueDate: new Date("2026-09-01"), recommendedDate: new Date("2026-08-01") });
    expect(date).toEqual(new Date("2026-09-01"));
  });

  it("falls back to recommendedDate when there is no due date", () => {
    const date = getEffectiveDate({ dueDate: null, recommendedDate: new Date("2026-08-01") });
    expect(date).toEqual(new Date("2026-08-01"));
  });
});

describe("compareTaskPriority", () => {
  it("puts hard deadlines before everything else, even a more urgent recommendation", () => {
    const hardDeadline = t({ isOfficialDeadline: true, dueDate: new Date("2026-12-01") });
    const urgentRecommendation = t({ isOfficialDeadline: false, recommendedDate: new Date("2026-08-18") });
    const sorted = [urgentRecommendation, hardDeadline].sort(compareTaskPriority);
    expect(sorted[0]).toBe(hardDeadline);
  });

  it("orders by requirement level within the same deadline tier", () => {
    const required = t({ requirementLevel: "REQUIRED", recommendedDate: new Date("2026-08-20") });
    const optional = t({ requirementLevel: "OPTIONAL", recommendedDate: new Date("2026-08-18") });
    const sorted = [optional, required].sort(compareTaskPriority);
    expect(sorted[0]).toBe(required);
  });

  it("orders by date within the same requirement level", () => {
    const earlier = t({ recommendedDate: new Date("2026-08-18") });
    const later = t({ recommendedDate: new Date("2026-08-25") });
    const sorted = [later, earlier].sort(compareTaskPriority);
    expect(sorted[0]).toBe(earlier);
  });
});
