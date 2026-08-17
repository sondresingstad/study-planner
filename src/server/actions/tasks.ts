"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import type { RequirementLevel, TaskStatus } from "@prisma/client";

export async function toggleTaskStatus(taskId: string) {
  const task = await db.task.findUniqueOrThrow({ where: { id: taskId } });
  const nextStatus: TaskStatus = task.status === "DONE" ? "TODO" : "DONE";

  await db.task.update({
    where: { id: taskId },
    data: {
      status: nextStatus,
      completedAt: nextStatus === "DONE" ? new Date() : null,
    },
  });

  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/timeline");
  revalidatePath("/calendar");
  revalidatePath("/progress");
  revalidatePath(`/courses/${task.courseId}`);
}

export async function updateTaskRequirementLevel(taskId: string, level: RequirementLevel) {
  const task = await db.task.update({ where: { id: taskId }, data: { requirementLevel: level } });
  revalidatePath("/tasks");
  revalidatePath(`/courses/${task.courseId}`);
}

export async function updateTaskEstimate(taskId: string, estimatedMinutes: number) {
  const task = await db.task.update({ where: { id: taskId }, data: { estimatedMinutes } });
  revalidatePath("/tasks");
  revalidatePath(`/courses/${task.courseId}`);
  revalidatePath("/");
}

export async function deleteTask(taskId: string) {
  const task = await db.task.delete({ where: { id: taskId } });
  revalidatePath("/tasks");
  revalidatePath(`/courses/${task.courseId}`);
}
