"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export async function toggleEventAttendance(eventId: string) {
  const event = await db.event.findUniqueOrThrow({ where: { id: eventId } });
  await db.event.update({ where: { id: eventId }, data: { attended: !event.attended } });

  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/timeline");
  revalidatePath("/progress");
  revalidatePath(`/courses/${event.courseId}`);
}

export async function updateEvent(
  eventId: string,
  data: Partial<{ date: Date; startTime: string | null; endTime: string | null; location: string | null; topic: string | null }>
) {
  const event = await db.event.update({ where: { id: eventId }, data });
  revalidatePath("/calendar");
  revalidatePath("/timeline");
  revalidatePath(`/courses/${event.courseId}`);
}

export async function deleteEvent(eventId: string) {
  const event = await db.event.delete({ where: { id: eventId } });
  revalidatePath("/calendar");
  revalidatePath("/timeline");
  revalidatePath(`/courses/${event.courseId}`);
}
