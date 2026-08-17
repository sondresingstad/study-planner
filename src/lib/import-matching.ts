/**
 * Pure matching/dedup logic for the document-import pipeline — kept
 * separate from process-batch.ts (which pulls in Prisma) so it can be
 * unit-tested without touching a database.
 */

export type TrackedEvent = { dbId: string; title: string; date: Date };
export type TrackedMilestone = { dbId: string; title: string; deadline: Date | null };

export function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

function titlesOverlap(a: string, b: string): boolean {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

/**
 * Generic over T so callers can pass richer event/milestone shapes (e.g.
 * process-batch.ts's TrackedEvent, which also carries `type`/`id` for
 * computeRecommendedDate) and get that same richer type back out.
 */

/** An extracted event is treated as a duplicate of an existing one when it falls on the same calendar day and the titles overlap. */
export function findDuplicateEvent<T extends TrackedEvent>(candidate: { title: string; date: Date }, existing: T[]): T | null {
  return existing.find((e) => isSameDay(e.date, candidate.date) && titlesOverlap(e.title, candidate.title)) ?? null;
}

/** Fuzzy-matches a task's "related to" text against known event titles (for building TaskEventRelationship links). */
export function findMatchingEvent<T extends TrackedEvent>(relatedTitle: string | null, existing: T[]): T | null {
  if (!relatedTitle) return null;
  return existing.find((e) => titlesOverlap(e.title, relatedTitle)) ?? null;
}

/** A milestone conflicts with an existing one when the titles overlap but the deadlines disagree (spec section 24: "Conflict detected"). */
export function findConflictingMilestone<T extends TrackedMilestone>(
  candidate: { title: string; deadline: Date | null },
  existing: T[]
): T | null {
  if (!candidate.deadline) return null;
  return (
    existing.find((m) => m.deadline && titlesOverlap(m.title, candidate.title) && !isSameDay(m.deadline, candidate.deadline!)) ?? null
  );
}
