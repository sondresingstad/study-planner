import { describe, expect, it } from "vitest";
import { computeRecommendedDate, type RelevantEvent } from "@/lib/deadlines";

const lecture7: RelevantEvent = { id: "e7", title: "Lecture 7", type: "LECTURE", date: new Date("2026-10-13") };
const lecture8: RelevantEvent = { id: "e8", title: "Lecture 8", type: "LECTURE", date: new Date("2026-10-20") };
const lectureLast: RelevantEvent = {
  id: "e-last",
  title: "Lecture 12 (final)",
  type: "LECTURE",
  date: new Date("2026-11-24"),
};

describe("computeRecommendedDate", () => {
  it("recommends before the lecture for PREPARATION_FOR", () => {
    const result = computeRecommendedDate([{ type: "PREPARATION_FOR", event: lecture7 }], [lecture7, lecture8]);
    expect(result?.date).toEqual(lecture7.date);
    expect(result?.reason).toContain("Lecture 7");
  });

  it("recommends before the next lecture for FOLLOW_UP_TO", () => {
    const result = computeRecommendedDate(
      [{ type: "FOLLOW_UP_TO", event: lecture7 }],
      [lecture7, lecture8]
    );
    expect(result?.date).toEqual(lecture8.date);
    expect(result?.reason).toContain("Lecture 8");
  });

  it("falls back to +7 days when there is no later lecture", () => {
    const result = computeRecommendedDate([{ type: "FOLLOW_UP_TO", event: lectureLast }], [lectureLast]);
    expect(result?.date.getTime()).toBe(lectureLast.date.getTime() + 7 * 24 * 60 * 60 * 1000);
    expect(result?.reason).toContain("no later lecture");
  });

  it("prioritizes PREPARATION_FOR over FOLLOW_UP_TO when both exist", () => {
    const result = computeRecommendedDate(
      [
        { type: "FOLLOW_UP_TO", event: lecture7 },
        { type: "PREPARATION_FOR", event: lecture8 },
      ],
      [lecture7, lecture8]
    );
    expect(result?.date).toEqual(lecture8.date);
  });

  it("returns null when there are no relationships", () => {
    expect(computeRecommendedDate([], [lecture7, lecture8])).toBeNull();
  });

  it("uses REQUIRED_FOR and RELATED_TO as lower-priority fallbacks", () => {
    const required = computeRecommendedDate([{ type: "REQUIRED_FOR", event: lecture7 }], [lecture7]);
    expect(required?.date).toEqual(lecture7.date);

    const related = computeRecommendedDate([{ type: "RELATED_TO", event: lecture7 }], [lecture7]);
    expect(related?.date).toEqual(lecture7.date);
  });
});
