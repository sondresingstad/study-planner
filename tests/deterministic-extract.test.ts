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

  it("only ever produces events — reading/exercises/milestones need AI to interpret", () => {
    const result = deterministicExtract({
      text: "",
      tables: [{ sheetName: "S", rows: [["2026-09-01", "Topic"]] }],
    });
    expect(result.reading).toHaveLength(0);
    expect(result.exercises).toHaveLength(0);
    expect(result.milestones).toHaveLength(0);
  });
});
