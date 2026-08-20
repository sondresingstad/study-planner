import { describe, expect, it } from "vitest";
import { extractNorwegianTimetable, looksLikeNorwegianTimetable } from "@/lib/parsers/norwegian-timetable";

// A trimmed-down version of a real "Forelesningsplan" (lecture plan) PDF's
// extracted text — tab-delimited table with wrapping cells, matching the
// structure this parser is built for.
const SAMPLE = [
  "Forelesningsplan – BED2-H26 Finansregnskap",
  "Pensumreferanser er til 4. utgave av pensumboken",
  "UKE \tDAG \tDATO \tKL \tSTED \tPENSUM/OPPGAVE",
  "34 \tTor \t20. aug \t8:15 - 10 \tAud Max \tIntroduksjon. Høsten undervisningsopplegg og studietips.",
  "Videoer:",
  "1 Innledning",
  "2 Innholdet i et regnskap",
  "Pensumbok (4. utg): s. 30-34, 139-170",
  "Oppgaver",
  "Se gjennom årsrapporten til Fløibanen AS for 2022.",
  "Fre \t21. aug \t10:15 - 12 \tAud Max \tVideoer:",
  "3 Resultat innledning",
  "Pensumbok (4.utg): s. 35-44",
  "Oppgaver (4. utg):",
  "Oppgave 16 a, e og f",
  "35 \tTor \t27.aug \t8:15 - 10 eller",
  "10:15 - 12",
  "Aud B og C \tVideoer:",
  "6 Balanse",
  "7 Egenkapital i AS",
  "8 Regnskapsloven",
  "Pensumbok (4.utg): s. 53-66, 69-70",
  "Oppgaver (4. utg):",
  "Oppgave 31",
  "Oppgave 39",
  "Eksamensoppgaver:",
  "Vår 2022 a",
  "Høst 2022 d",
  "36 \tMan-fre \t31.aug.-4.sep \tDiverse \tGrupper \tOppgave 12 og 13 i pensumboken (4. utg)",
  "Tor \t3. sep \t8:15 - 10 \tAud B \tRepetisjonsforelesning og Q&A",
  "38 \tMan-fre \t14.-18. sep \tDiverse \tGrupper \tOppgave 32 i pensumboken (4. utg)",
  "Ingen repetisjonsforelesning eller Q&A denne uken",
  "40 \tIngen forelesning eller grupper denne uken",
  "42 \tFre \t16. okt \t23:59 \tCanvas \tFrist innleveringsoppgave",
  "51 \tTor \t17. des \t9-12 \tEksamen",
  "3 \tFre \t22. jan \t9-12 \tGjentakseksamen",
].join("\n");

describe("looksLikeNorwegianTimetable", () => {
  it("detects the tab-delimited UKE/DAG/DATO/.../PENSUM header", () => {
    expect(looksLikeNorwegianTimetable(SAMPLE)).toBe(true);
  });

  it("does not misfire on an unrelated document", () => {
    expect(looksLikeNorwegianTimetable("September 3, 2026: Introduction to Finance\nReading: Chapter 1")).toBe(false);
  });
});

describe("extractNorwegianTimetable", () => {
  const result = extractNorwegianTimetable(SAMPLE);

  it("infers the year from the H26 term shorthand in the header, not from unrelated years in the body", () => {
    // Body text mentions "2022" (Fløibanen AS for 2022) well before any
    // course-term context — the parser must not pick that up. Only the
    // January retake exam (correctly rolled over to 2027) is not 2026.
    expect(result.events.every((e) => e.date.startsWith("2026") || e.title === "Gjentakseksamen")).toBe(true);
  });

  it("joins wrapped video titles into the lecture title exactly as specified", () => {
    const week35 = result.events.find((e) => e.date === "2026-08-27");
    expect(week35?.title).toBe("Balanse, Egenkapital i AS og Regnskapsloven");
    expect(week35?.type).toBe("LECTURE");
  });

  it("reassembles a row whose time cell wraps across two lines", () => {
    const week35 = result.events.find((e) => e.date === "2026-08-27");
    expect(week35?.startTime).toBe("08:15");
    expect(week35?.location).toBe("Aud B og C");
  });

  it("marks a 'Grupper' row as EXERCISE_CLASS with the oppgave reference as its title", () => {
    const grupper = result.events.find((e) => e.date === "2026-08-31");
    expect(grupper?.type).toBe("EXERCISE_CLASS");
    expect(grupper?.title).toBe("Oppgave 12 og 13 i pensumboken (4. utg)");
  });

  it("does not let a standalone 'Ingen ...' aside bleed into the preceding Grupper row's content", () => {
    const grupper = result.events.find((e) => e.date === "2026-09-14");
    expect(grupper?.title).toBe("Oppgave 32 i pensumboken (4. utg)");
  });

  it("creates one video task per video, each tied to the lecture with the joined title", () => {
    const week35Videos = result.otherMaterial.filter((v) => v.relatedEventTitle === "Balanse, Egenkapital i AS og Regnskapsloven");
    expect(week35Videos.map((v) => v.title)).toEqual(["Balanse", "Egenkapital i AS", "Regnskapsloven"]);
  });

  it("combines all reading for one lecture into a single FOLLOW_UP_TO task (read after the lecture)", () => {
    const reading = result.reading.find((r) => r.relatedEventTitle === "Balanse, Egenkapital i AS og Regnskapsloven");
    expect(reading?.title).toBe('Read s. 53-66, 69-70, "Balanse, Egenkapital i AS og Regnskapsloven"');
    expect(reading?.relation).toBe("FOLLOW_UP_TO");
  });

  it("combines book exercises and eksamensoppgaver into a single PREPARATION_FOR task (done before the lecture)", () => {
    const exercise = result.exercises.find((x) => x.relatedEventTitle === "Balanse, Egenkapital i AS og Regnskapsloven");
    expect(exercise?.relation).toBe("PREPARATION_FOR");
    expect(exercise?.description).toContain("Oppgave 31");
    expect(exercise?.description).toContain("Vår 2022 a");
  });

  it("skips a week-number-only 'no lecture' note without creating an event", () => {
    expect(result.events.some((e) => e.date === "2026-10-01" || e.date === "2026-09-28")).toBe(false);
  });

  it("turns a 'Frist innleveringsoppgave' row into a milestone rather than an event", () => {
    expect(result.milestones).toHaveLength(1);
    expect(result.milestones[0].title).toBe("Frist innleveringsoppgave");
    expect(result.milestones[0].deadline).toBe("2026-10-16");
    expect(result.events.some((e) => e.date === "2026-10-16")).toBe(false);
  });

  it("types a row whose location is 'Eksamen' as an EXAM event", () => {
    const exam = result.events.find((e) => e.date === "2026-12-17");
    expect(exam?.type).toBe("EXAM");
    expect(exam?.title).toBe("Eksamen");
  });

  it("rolls a January retake exam over to the following calendar year, since the term only labels one year", () => {
    // "51 Eksamen" (Dec) precedes this row in the same document.
    const retake = result.events.find((e) => e.title === "Gjentakseksamen");
    expect(retake?.date).toBe("2027-01-22");
  });
});
