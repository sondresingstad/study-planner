import { describe, expect, it } from "vitest";
import { docxHtmlToText } from "@/lib/parsers/docx";
import { deterministicExtract } from "@/lib/parsers/deterministic";

// Shape of mammoth's HTML for a syllabus with a lecture-plan table
// (modelled on the BED3E Finance syllabus).
const SYLLABUS_HTML =
  "<h1>BED3E Finance Fall 2026</h1><p>Welcome to BED3E &amp; Finance!</p>" +
  "<table>" +
  "<tr><td><p>Date</p></td><td><p>Class</p></td><td><p>Topic</p></td><td><p>Readings</p></td><td><p>Activities</p></td></tr>" +
  "<tr><td><p>Introduction</p></td><td></td><td></td><td></td><td></td></tr>" +
  "<tr><td><p>F., Aug 21</p></td><td><p>1</p></td><td><p>Introduction. Firms, Financial Markets</p></td><td><p>BDH 1</p></td><td></td></tr>" +
  "<tr><td><p>W., Aug 26</p></td><td><p>2</p></td><td><p>Time Value of Money</p></td><td><p>BDH 3,4</p></td><td></td></tr>" +
  "<tr><td><p>F., Sep 4</p></td><td><p>5</p></td><td><p>Problem-solving session 1</p></td><td><p>BDH 1,3-6</p></td><td><p>Group work with TA</p></td></tr>" +
  "<tr><td><p>W., Sep 23</p></td><td></td><td><p>No lecture!</p></td><td></td><td><p>Deadline Assignment I</p></td></tr>" +
  "</table>";

describe("docxHtmlToText", () => {
  it("puts each table row on a single line", () => {
    const text = docxHtmlToText(SYLLABUS_HTML);
    expect(text).toContain("F., Aug 21 1 Introduction. Firms, Financial Markets BDH 1\n");
    expect(text).toContain("W., Sep 23 No lecture! Deadline Assignment I");
  });

  it("keeps paragraphs on separate lines and decodes entities", () => {
    const text = docxHtmlToText(SYLLABUS_HTML);
    expect(text.startsWith("BED3E Finance Fall 2026\n\nWelcome to BED3E & Finance!")).toBe(true);
  });

  it("lets the deterministic scanner find lectures and readings in a DOCX table", () => {
    const result = deterministicExtract({ text: docxHtmlToText(SYLLABUS_HTML), tables: [] });

    expect(result.events.map((e) => [e.date, e.type])).toEqual([
      ["2026-08-21", "LECTURE"],
      ["2026-08-26", "LECTURE"],
      ["2026-09-04", "EXERCISE_CLASS"],
    ]);
    expect(result.reading.map((r) => r.chapterOrSection)).toEqual(["BDH 1", "BDH 3,4", "BDH 1,3-6"]);
    expect(result.milestones.map((m) => [m.title, m.deadline])).toEqual([["Assignment I", "2026-09-23"]]);
  });
});
