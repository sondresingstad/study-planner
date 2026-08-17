import { describe, expect, it } from "vitest";
import { findConflictingMilestone, findDuplicateEvent, findMatchingEvent } from "@/lib/import-matching";

describe("findDuplicateEvent", () => {
  it("flags a same-day, same-title event as a duplicate", () => {
    const existing = [{ dbId: "1", title: "Lecture 7", date: new Date("2026-10-13") }];
    const result = findDuplicateEvent({ title: "Lecture 7", date: new Date("2026-10-13") }, existing);
    expect(result?.dbId).toBe("1");
  });

  it("matches case-insensitively and when one title contains the other", () => {
    const existing = [{ dbId: "1", title: "Lecture 7 — Labour Market II", date: new Date("2026-10-13") }];
    const result = findDuplicateEvent({ title: "lecture 7", date: new Date("2026-10-13") }, existing);
    expect(result?.dbId).toBe("1");
  });

  it("does not flag events on different days, even with the same title", () => {
    const existing = [{ dbId: "1", title: "Lecture 7", date: new Date("2026-10-13") }];
    const result = findDuplicateEvent({ title: "Lecture 7", date: new Date("2026-10-14") }, existing);
    expect(result).toBeNull();
  });

  it("does not flag unrelated titles on the same day", () => {
    const existing = [{ dbId: "1", title: "Lecture 7", date: new Date("2026-10-13") }];
    const result = findDuplicateEvent({ title: "Exam review session", date: new Date("2026-10-13") }, existing);
    expect(result).toBeNull();
  });
});

describe("findMatchingEvent", () => {
  it("returns null when no related title is given", () => {
    expect(findMatchingEvent(null, [{ dbId: "1", title: "Lecture 7", date: new Date() }])).toBeNull();
  });

  it("fuzzy-matches a related event by title overlap", () => {
    const existing = [{ dbId: "1", title: "Lecture 7 — Labour Market II", date: new Date() }];
    expect(findMatchingEvent("Lecture 7", existing)?.dbId).toBe("1");
  });
});

describe("findConflictingMilestone", () => {
  it("flags a same-subject milestone with a different deadline (spec section 24 example)", () => {
    const existing = [{ dbId: "1", title: "Mandatory Assignment 1", deadline: new Date("2026-09-14") }];
    const result = findConflictingMilestone(
      { title: "Mandatory Assignment 1", deadline: new Date("2026-09-16") },
      existing
    );
    expect(result?.dbId).toBe("1");
  });

  it("does not flag matching deadlines as a conflict", () => {
    const existing = [{ dbId: "1", title: "Mandatory Assignment 1", deadline: new Date("2026-09-14") }];
    const result = findConflictingMilestone(
      { title: "Mandatory Assignment 1", deadline: new Date("2026-09-14") },
      existing
    );
    expect(result).toBeNull();
  });

  it("does not flag a candidate with no deadline", () => {
    const existing = [{ dbId: "1", title: "Mandatory Assignment 1", deadline: new Date("2026-09-14") }];
    expect(findConflictingMilestone({ title: "Mandatory Assignment 1", deadline: null }, existing)).toBeNull();
  });
});
