import { db } from "@/lib/db";

export async function getReviewBatch(batchId: string) {
  const batch = await db.importBatch.findUnique({
    where: { id: batchId },
    include: { course: true, documents: true },
  });
  if (!batch) return null;

  const [events, tasks, milestones] = await Promise.all([
    db.event.findMany({ where: { importBatchId: batchId }, orderBy: { date: "asc" } }),
    db.task.findMany({ where: { importBatchId: batchId }, orderBy: { title: "asc" } }),
    db.milestone.findMany({ where: { importBatchId: batchId }, orderBy: { deadline: "asc" } }),
  ]);

  return {
    batch,
    course: batch.course,
    documents: batch.documents,
    events,
    reading: tasks.filter((t) => t.type === "READING"),
    exercises: tasks.filter((t) => t.type === "EXERCISE"),
    otherMaterial: tasks.filter((t) => t.type === "VIDEO" || t.type === "QUIZ" || t.type === "OTHER" || t.type === "WRITING" || t.type === "ASSIGNMENT"),
    milestones,
  };
}
