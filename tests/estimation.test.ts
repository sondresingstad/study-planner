import { describe, expect, it } from "vitest";
import {
  DEFAULT_ESTIMATION_SETTINGS,
  estimateTaskMinutes,
  formatMinutes,
  sumMinutes,
} from "@/lib/estimation";

const base = {
  pageCount: null,
  articlePages: false,
  exerciseCount: null,
  wordCount: null,
  videoMinutes: null,
};

describe("estimateTaskMinutes", () => {
  it("estimates textbook reading at 2 min/page by default", () => {
    expect(
      estimateTaskMinutes({ ...base, type: "READING", pageCount: 43 })
    ).toBe(86);
  });

  it("uses the article reading speed when articlePages is set", () => {
    expect(
      estimateTaskMinutes({ ...base, type: "READING", pageCount: 18, articlePages: true })
    ).toBe(54);
  });

  it("estimates exercises at 12 min each by default", () => {
    expect(estimateTaskMinutes({ ...base, type: "EXERCISE", exerciseCount: 6 })).toBe(72);
  });

  it("estimates writing from words-per-hour", () => {
    expect(estimateTaskMinutes({ ...base, type: "WRITING", wordCount: 1500 })).toBe(360);
  });

  it("uses actual video duration verbatim", () => {
    expect(estimateTaskMinutes({ ...base, type: "VIDEO", videoMinutes: 24 })).toBe(24);
  });

  it("returns null when the task type has no recorded quantity", () => {
    expect(estimateTaskMinutes({ ...base, type: "READING", pageCount: null })).toBeNull();
    expect(estimateTaskMinutes({ ...base, type: "QUIZ" })).toBeNull();
    expect(estimateTaskMinutes({ ...base, type: "ASSIGNMENT" })).toBeNull();
  });

  it("respects custom settings", () => {
    const settings = { ...DEFAULT_ESTIMATION_SETTINGS, exerciseMinutes: 20 };
    expect(estimateTaskMinutes({ ...base, type: "EXERCISE", exerciseCount: 3 }, settings)).toBe(60);
  });
});

describe("formatMinutes", () => {
  it("formats hours and minutes", () => {
    expect(formatMinutes(86)).toBe("1h 26m");
    expect(formatMinutes(72)).toBe("1h 12m");
    expect(formatMinutes(45)).toBe("45m");
    expect(formatMinutes(120)).toBe("2h");
    expect(formatMinutes(0)).toBe("0m");
  });

  it("clamps negative input to 0", () => {
    expect(formatMinutes(-5)).toBe("0m");
  });
});

describe("sumMinutes", () => {
  it("sums, treating null/undefined as 0", () => {
    expect(sumMinutes([10, null, 20, undefined, 5])).toBe(35);
  });
});
