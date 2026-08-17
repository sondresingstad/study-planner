import type { RelationshipType } from "@prisma/client";

export type RelevantEvent = {
  id: string;
  title: string;
  type: string;
  date: Date;
};

export type RelevantRelationship = {
  type: RelationshipType;
  event: RelevantEvent;
};

export type RecommendedDate = {
  date: Date;
  reason: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Deterministic recommended-deadline logic (spec section 14).
 *
 * Recommended dates are calculated, never authoritative — they are always
 * kept separate from `dueDate`/`isOfficialDeadline` on the Task itself.
 * Relationship priority when a task has more than one: preparation work is
 * the hardest constraint (must happen before its lecture), follow-up work is
 * softest (any time up to the next relevant lecture).
 */
export function computeRecommendedDate(
  relationships: RelevantRelationship[],
  courseEvents: RelevantEvent[]
): RecommendedDate | null {
  const byType = (type: RelationshipType) =>
    relationships
      .filter((r) => r.type === type)
      .sort((a, b) => a.event.date.getTime() - b.event.date.getTime());

  const prep = byType("PREPARATION_FOR")[0];
  if (prep) {
    return {
      date: prep.event.date,
      reason: `Preparation for "${prep.event.title}" on ${formatDate(prep.event.date)}.`,
    };
  }

  const followUp = byType("FOLLOW_UP_TO")[0];
  if (followUp) {
    const nextEvent = courseEvents
      .filter((e) => e.date.getTime() > followUp.event.date.getTime())
      .sort((a, b) => a.date.getTime() - b.date.getTime())[0];

    if (nextEvent) {
      return {
        date: nextEvent.date,
        reason: `Follow-up to "${followUp.event.title}"; recommended before "${nextEvent.title}" on ${formatDate(
          nextEvent.date
        )}.`,
      };
    }

    const fallback = new Date(followUp.event.date.getTime() + 7 * DAY_MS);
    return {
      date: fallback,
      reason: `Follow-up to "${followUp.event.title}"; no later lecture is scheduled, so recommended within a week.`,
    };
  }

  const required = byType("REQUIRED_FOR")[0];
  if (required) {
    return {
      date: required.event.date,
      reason: `Required for "${required.event.title}" on ${formatDate(required.event.date)}.`,
    };
  }

  const related = byType("RELATED_TO")[0];
  if (related) {
    return {
      date: related.event.date,
      reason: `Related to "${related.event.title}" on ${formatDate(related.event.date)}.`,
    };
  }

  return null;
}
