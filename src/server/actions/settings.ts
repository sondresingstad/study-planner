"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { generateDemoCourses } from "@/server/seed/demo-data";

const SettingsInput = z.object({
  textbookPageMinutes: z.coerce.number().positive(),
  articlePageMinutes: z.coerce.number().positive(),
  exerciseMinutes: z.coerce.number().positive(),
  writingWordsPerHour: z.coerce.number().positive(),
});

export type UpdateSettingsState = { error?: string; success?: boolean };

export async function updateSettings(_prev: UpdateSettingsState, formData: FormData): Promise<UpdateSettingsState> {
  const parsed = SettingsInput.safeParse({
    textbookPageMinutes: formData.get("textbookPageMinutes"),
    articlePageMinutes: formData.get("articlePageMinutes"),
    exerciseMinutes: formData.get("exerciseMinutes"),
    writingWordsPerHour: formData.get("writingWordsPerHour"),
  });

  if (!parsed.success) {
    return { error: "All values must be positive numbers." };
  }

  await db.settings.upsert({
    where: { id: 1 },
    create: { id: 1, ...parsed.data },
    update: parsed.data,
  });

  // Time estimates derived from these settings appear on nearly every page.
  revalidatePath("/", "layout");
  return { success: true };
}

export async function resetDemoData() {
  await db.course.deleteMany({ where: { isDemo: true } });
  revalidatePath("/", "layout");
}

export async function addDemoData() {
  const existing = await db.course.count({ where: { isDemo: true } });
  if (existing > 0) return;
  await generateDemoCourses(db);
  revalidatePath("/", "layout");
}
