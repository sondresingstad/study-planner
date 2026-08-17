import type { RequirementLevel, TaskStatus } from "@prisma/client";

export type PrioritizableTask = {
  dueDate: Date | null;
  isOfficialDeadline: boolean;
  recommendedDate: Date | null;
  requirementLevel: RequirementLevel;
  status: TaskStatus;
};

/** The date that actually governs a task's urgency: an official deadline if set, otherwise the calculated recommendation. */
export function getEffectiveDate(task: Pick<PrioritizableTask, "dueDate" | "recommendedDate">): Date | null {
  return task.dueDate ?? task.recommendedDate ?? null;
}

const REQUIREMENT_WEIGHT: Record<RequirementLevel, number> = {
  REQUIRED: 0,
  RECOMMENDED: 1,
  OPTIONAL: 2,
};

/**
 * Default task ordering (spec section 10): hard deadlines first, then by
 * requirement level (required > recommended > optional), then by the
 * effective date. This intentionally never treats an official deadline and
 * a calculated recommendation as equally binding.
 */
export function compareTaskPriority(a: PrioritizableTask, b: PrioritizableTask): number {
  if (a.isOfficialDeadline !== b.isOfficialDeadline) {
    return a.isOfficialDeadline ? -1 : 1;
  }

  const reqDiff = REQUIREMENT_WEIGHT[a.requirementLevel] - REQUIREMENT_WEIGHT[b.requirementLevel];
  if (reqDiff !== 0) return reqDiff;

  const aDate = getEffectiveDate(a);
  const bDate = getEffectiveDate(b);
  if (aDate && bDate) return aDate.getTime() - bDate.getTime();
  if (aDate) return -1;
  if (bDate) return 1;
  return 0;
}
