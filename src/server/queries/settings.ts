import { db } from "@/lib/db";
import type { EstimationSettings } from "@/lib/estimation";

export async function getSettings() {
  return db.settings.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });
}

export function toEstimationSettings(settings: {
  textbookPageMinutes: number;
  articlePageMinutes: number;
  exerciseMinutes: number;
  writingWordsPerHour: number;
}): EstimationSettings {
  return {
    textbookPageMinutes: settings.textbookPageMinutes,
    articlePageMinutes: settings.articlePageMinutes,
    exerciseMinutes: settings.exerciseMinutes,
    writingWordsPerHour: settings.writingWordsPerHour,
  };
}
