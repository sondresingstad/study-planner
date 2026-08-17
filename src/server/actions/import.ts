"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import type { EventType, RequirementLevel } from "@prisma/client";

export async function deleteDraftEvent(id: string) {
  const event = await db.event.delete({ where: { id } });
  revalidatePath(`/courses/${event.courseId}/review`);
}

export async function deleteDraftTask(id: string) {
  const task = await db.task.delete({ where: { id } });
  revalidatePath(`/courses/${task.courseId}/review`);
}

export async function deleteDraftMilestone(id: string) {
  const milestone = await db.milestone.delete({ where: { id } });
  revalidatePath(`/courses/${milestone.courseId}/review`);
}

export async function updateDraftEvent(
  id: string,
  data: Partial<{ title: string; type: EventType; date: Date; startTime: string | null; location: string | null; topic: string | null }>
) {
  const event = await db.event.update({ where: { id }, data });
  revalidatePath(`/courses/${event.courseId}/review`);
}

export async function updateDraftTask(
  id: string,
  data: Partial<{
    title: string;
    requirementLevel: RequirementLevel;
    pageCount: number | null;
    exerciseCount: number | null;
    videoMinutes: number | null;
  }>
) {
  const task = await db.task.update({ where: { id }, data });
  revalidatePath(`/courses/${task.courseId}/review`);
}

export async function updateDraftMilestone(
  id: string,
  data: Partial<{ title: string; deadline: Date | null; description: string | null }>
) {
  const milestone = await db.milestone.update({ where: { id }, data });
  revalidatePath(`/courses/${milestone.courseId}/review`);
}

export async function approveImportBatch(batchId: string) {
  const batch = await db.importBatch.findUniqueOrThrow({ where: { id: batchId } });

  await db.$transaction([
    db.event.updateMany({ where: { importBatchId: batchId }, data: { approved: true } }),
    db.task.updateMany({ where: { importBatchId: batchId }, data: { approved: true } }),
    db.milestone.updateMany({ where: { importBatchId: batchId }, data: { approved: true } }),
    db.importBatch.update({ where: { id: batchId }, data: { status: "APPROVED", approvedAt: new Date() } }),
  ]);

  revalidatePath("/", "layout");
  redirect(`/courses/${batch.courseId}?imported=1`);
}
