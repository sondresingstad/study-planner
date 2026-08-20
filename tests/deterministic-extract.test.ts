import { describe, expect, it } from "vitest";
import { deterministicExtract } from "@/lib/parsers/deterministic";

describe("deterministicExtract", () => {
  it("returns nothing for a document with no tables", () => {
    const result = deterministicExtract({ text: "some free-text PDF content", tables: [] });
    expect(result.events).toHaveLength(0);
  });

  it("turns date-bearing rows into draft events with low confidence", () => {
    const result = deterministicExtract({
      text: "",
      tables: [
        {
          sheetName: "Lectures",
          rows: [
            ["Date", "Topic", "Location"],
            ["2026-09-01", "Introduction", "Room 3.14"],
            ["2026-09-08", "Advanced topics", "Room 3.14"],
          ],
        },
      ],
    });

    expect(result.events).toHaveLength(2);
    expect(result.events[0].date).toBe("2026-09-01");
    expect(result.events[0].title).toBe("Introduction");
    expect(result.events[0].confidence).toBeLessThan(0.6);
  });

  it("parses DD.MM.YYYY and DD/MM/YYYY dates", () => {
    const result = deterministicExtract({
      text: "",
      tables: [{ sheetName: "S", rows: [["19.08.2026", "Kickoff"], ["20/08/2026", "Follow-up"]] }],
    });
    expect(result.events.map((e) => e.date)).toEqual(["2026-08-19", "2026-08-20"]);
  });

  it("skips rows without a recognizable date", () => {
    const result = deterministicExtract({
      text: "",
      tables: [{ sheetName: "S", rows: [["Chapter 3", "Some notes with no date"]] }],
    });
    expect(result.events).toHaveLength(0);
  });

  it("tables alone never produce reading/exercises/milestones — those need AI or a text calendar", () => {
    const result = deterministicExtract({
      text: "",
      tables: [{ sheetName: "S", rows: [["2026-09-01", "Topic"]] }],
    });
    expect(result.reading).toHaveLength(0);
    expect(result.exercises).toHaveLength(0);
    expect(result.milestones).toHaveLength(0);
  });
});

describe("deterministicExtract — free-text calendar scanning", () => {
  it("extracts an event from a date + topic on the same line", () => {
    const result = deterministicExtract({
      text: "Course Syllabus\n\nSeptember 3, 2026: Introduction to Finance\nSeptember 10, 2026: Time Value of Money",
      tables: [],
    });
    expect(result.events).toHaveLength(2);
    expect(result.events[0].date).toBe("2026-09-03");
    expect(result.events[0].title).toContain("Introduction to Finance");
    expect(result.events[1].date).toBe("2026-09-10");
  });

  it("gathers trailing lines into the same row until the next date or a blank line", () => {
    const result = deterministicExtract({
      text: [
        "Fall 2026",
        "",
        "September 3, 2026",
        "Introduction to Finance",
        "Reading: Chapter 1, pp. 12-34",
        "",
        "September 10, 2026",
        "Time Value of Money",
      ].join("\n"),
      tables: [],
    });

    expect(result.events).toHaveLength(2);
    expect(result.events[0].title).toBe("Introduction to Finance");
    expect(result.events[0].topic).toContain("Chapter 1");
  });

  it("infers a missing year from a 'Fall 2026' style header", () => {
    const result = deterministicExtract({
      text: "BED3E Finance — Fall 2026\n\nSept 3: Introduction to Finance\nSept 10: Time Value of Money",
      tables: [],
    });
    expect(result.events.map((e) => e.date)).toEqual(["2026-09-03", "2026-09-10"]);
  });

  it("derives a reading task with a page count from a chapter/page reference", () => {
    const result = deterministicExtract({
      text: "September 3, 2026: Introduction to Finance\nReading: Chapter 1, pp. 12-34",
      tables: [],
    });
    expect(result.reading).toHaveLength(1);
    expect(result.reading[0].pageCount).toBe(23);
    expect(result.reading[0].relatedEventTitle).toBe("Introduction to Finance");
    expect(result.reading[0].relation).toBe("PREPARATION_FOR");
  });

  it("derives an exercise task with a count from an exercise range", () => {
    const result = deterministicExtract({
      text: "September 3, 2026: Introduction to Finance\nExercises 3.1-3.6",
      tables: [],
    });
    expect(result.exercises).toHaveLength(1);
    expect(result.exercises[0].exerciseCount).toBe(6);
    expect(result.exercises[0].relation).toBe("FOLLOW_UP_TO");
  });

  it("does not treat a date mentioned mid-sentence in a long paragraph as a calendar row", () => {
    const result = deterministicExtract({
      text: "This course was previously offered in the fall term, and as discussed during the September 3, 2026 orientation session, attendance is expected at every lecture throughout the semester.",
      tables: [],
    });
    expect(result.events).toHaveLength(0);
  });
});
