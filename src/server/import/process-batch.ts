import fs from "node:fs/promises";
import { db } from "@/lib/db";
import { parseDocument } from "@/lib/parsers";
import { deterministicExtract } from "@/lib/parsers/deterministic";
import { getExtractionProvider } from "@/lib/ai/provider";
import type { ExtractionResult } from "@/lib/ai/schema";
import { estimateTaskMinutes } from "@/lib/estimation";
import { computeRecommendedDate, type RelevantEvent } from "@/lib/deadlines";
import { findDuplicateEvent, findMatchingEvent, findConflictingMilestone } from "@/lib/import-matching";
import { parseIsoDateLocal } from "@/lib/dates";
import { getSettings, toEstimationSettings } from "@/server/queries/settings";
import type { RelationshipType, RequirementLevel } from "@prisma/client";

const LOW_CONFIDENCE_THRESHOLD = 0.6;

type TrackedEvent = RelevantEvent & { dbId: string };
type TrackedMilestone = { dbId: string; title: string; deadline: Date | null };

/**
 * Runs extraction for every document in an ImportBatch and writes draft
 * Event/Task/Milestone rows (approved=false) for the Review Import screen.
 * Never touches the live plan directly — see spec principle 2.
 */
export async function processImportBatch(batchId: string) {
  const batch = await db.importBatch.findUniqueOrThrow({
    where: { id: batchId },
    include: { documents: true, course: true },
  });

  const settingsRow = await getSettings();
  const settings = toEstimationSettings(settingsRow);

  const [existingEvents, existingMilestones] = await Promise.all([
    db.event.findMany({ where: { courseId: batch.courseId, approved: true } }),
    db.milestone.findMany({ where: { courseId: batch.courseId, approved: true } }),
  ]);

  const trackedEvents: TrackedEvent[] = existingEvents.map((e) => ({ dbId: e.id, id: e.id, title: e.title, type: e.type, date: e.date }));
  const trackedMilestones: TrackedMilestone[] = existingMilestones.map((m) => ({ dbId: m.id, title: m.title, deadline: m.deadline }));

  const provider = await getExtractionProvider();
  let anyProcessed = false;

  for (const doc of batch.documents) {
    try {
      const buffer = await fs.readFile(doc.storagePath);
      const parsed = await parseDocument(doc.fileType, buffer);

      let extraction: ExtractionResult;
      let method: string;
      if (provider) {
        extraction = await provider.extract({
          filename: doc.originalName,
          documentType: doc.fileType,
          courseName: batch.course.name,
          courseCode: batch.course.code,
          text: parsed.text,
        });
        method = provider.name;
      } else {
        extraction = deterministicExtract(parsed);
        method = "deterministic";
      }

      await writeExtractionResult({
        extraction,
        courseId: batch.courseId,
        batchId: batch.id,
        sourceDocumentId: doc.id,
        settings,
        trackedEvents,
        trackedMilestones,
      });

      await db.sourceDocument.update({
        where: { id: doc.id },
        data: {
          status: "PROCESSED",
          extractionMethod: method,
          rawTextExcerpt: parsed.text.slice(0, 2000),
          processedAt: new Date(),
        },
      });
      anyProcessed = true;
    } catch (err) {
      await db.sourceDocument.update({
        where: { id: doc.id },
        data: {
          status: "FAILED",
          errorMessage: err instanceof Error ? err.message : "Unknown error during extraction.",
          processedAt: new Date(),
        },
      });
    }
  }

  await db.importBatch.update({
    where: { id: batch.id },
    data: {
      status: anyProcessed ? "READY" : "FAILED",
      errorMessage: anyProcessed ? null : "All documents in this import failed to process.",
    },
  });
}

async function writeExtractionResult(args: {
  extraction: ExtractionResult;
  courseId: string;
  batchId: string;
  sourceDocumentId: string;
  settings: ReturnType<typeof toEstimationSettings>;
  trackedEvents: TrackedEvent[];
  trackedMilestones: TrackedMilestone[];
}) {
  const { extraction, courseId, batchId, sourceDocumentId, settings, trackedEvents, trackedMilestones } = args;

  // --- Events ------------------------------------------------------------
  for (const item of extraction.events) {
    const date = parseIsoDateLocal(item.date);
    if (Number.isNaN(date.getTime())) continue;

    const duplicate = findDuplicateEvent({ title: item.title, date }, trackedEvents);
    const lowConfidence = item.confidence < LOW_CONFIDENCE_THRESHOLD;
    const needsReview = Boolean(duplicate) || lowConfidence;
    const reviewNote = duplicate
      ? `Possible duplicate of "${duplicate.title}" on ${duplicate.date.toDateString()}.`
      : lowConfidence
        ? "Low-confidence extraction — please verify."
        : null;

    const created = await db.event.create({
      data: {
        courseId,
        importBatchId: batchId,
        sourceDocumentId,
        title: item.title,
        type: item.type,
        date,
        startTime: item.startTime,
        endTime: item.endTime,
        location: item.location,
        topic: item.topic,
        description: item.description,
        confidence: item.confidence,
        sourceSnippet: item.sourceSnippet,
        approved: false,
        needsReview,
        reviewNote,
      },
    });

    trackedEvents.push({ dbId: created.id, id: created.id, title: created.title, type: created.type, date: created.date });
  }

  // --- Reading tasks -------------------------------------------------------
  for (const item of extraction.reading) {
    const matchedEvent = findMatchingEvent(item.relatedEventTitle, trackedEvents);
    const recommended = matchedEvent && item.relation
      ? computeRecommendedDate([{ type: item.relation, event: matchedEvent }], trackedEvents)
      : null;
    const minutes = estimateTaskMinutes(
      { type: "READING", pageCount: item.pageCount, articlePages: item.isArticle, exerciseCount: null, wordCount: null, videoMinutes: null },
      settings
    );
    const lowConfidence = item.confidence < LOW_CONFIDENCE_THRESHOLD;

    const task = await db.task.create({
      data: {
        courseId,
        importBatchId: batchId,
        sourceDocumentId,
        type: "READING",
        title: item.title,
        pageCount: item.pageCount,
        articlePages: item.isArticle,
        requirementLevel: item.requirementLevel as RequirementLevel,
        estimatedMinutes: minutes,
        recommendedDate: recommended?.date,
        recommendedDateReason: recommended?.reason,
        confidence: item.confidence,
        sourceSnippet: item.sourceSnippet,
        approved: false,
        needsReview: lowConfidence || (Boolean(item.relatedEventTitle) && !matchedEvent),
        reviewNote: lowConfidence
          ? "Low-confidence extraction — please verify."
          : item.relatedEventTitle && !matchedEvent
            ? `Mentioned relative to "${item.relatedEventTitle}", but no matching lecture was found — please link it manually.`
            : null,
      },
    });

    if (matchedEvent && item.relation) {
      await db.taskEventRelationship.create({
        data: { taskId: task.id, eventId: matchedEvent.dbId, type: item.relation as RelationshipType },
      });
    }
  }

  // --- Exercise tasks ------------------------------------------------------
  for (const item of extraction.exercises) {
    const matchedEvent = findMatchingEvent(item.relatedEventTitle, trackedEvents);
    const recommended = matchedEvent && item.relation
      ? computeRecommendedDate([{ type: item.relation, event: matchedEvent }], trackedEvents)
      : null;
    const minutes = estimateTaskMinutes(
      { type: "EXERCISE", pageCount: null, articlePages: false, exerciseCount: item.exerciseCount, wordCount: null, videoMinutes: null },
      settings
    );
    const lowConfidence = item.confidence < LOW_CONFIDENCE_THRESHOLD;

    const task = await db.task.create({
      data: {
        courseId,
        importBatchId: batchId,
        sourceDocumentId,
        type: "EXERCISE",
        title: item.title,
        exerciseCount: item.exerciseCount,
        requirementLevel: item.requirementLevel as RequirementLevel,
        estimatedMinutes: minutes,
        recommendedDate: recommended?.date,
        recommendedDateReason: recommended?.reason,
        confidence: item.confidence,
        sourceSnippet: item.sourceSnippet,
        approved: false,
        needsReview: lowConfidence || (Boolean(item.relatedEventTitle) && !matchedEvent),
        reviewNote: lowConfidence
          ? "Low-confidence extraction — please verify."
          : item.relatedEventTitle && !matchedEvent
            ? `Mentioned relative to "${item.relatedEventTitle}", but no matching lecture was found — please link it manually.`
            : null,
      },
    });

    if (matchedEvent && item.relation) {
      await db.taskEventRelationship.create({
        data: { taskId: task.id, eventId: matchedEvent.dbId, type: item.relation as RelationshipType },
      });
    }
  }

  // --- Other material (videos, quizzes, cases, ...) -----------------------
  for (const item of extraction.otherMaterial) {
    const matchedEvent = findMatchingEvent(item.relatedEventTitle, trackedEvents);
    const taskType = item.materialType === "VIDEO" ? "VIDEO" : item.materialType === "QUIZ" ? "QUIZ" : "OTHER";
    const minutes =
      taskType === "VIDEO"
        ? estimateTaskMinutes(
            { type: "VIDEO", pageCount: null, articlePages: false, exerciseCount: null, wordCount: null, videoMinutes: item.minutes },
            settings
          )
        : null;
    const lowConfidence = item.confidence < LOW_CONFIDENCE_THRESHOLD;

    const task = await db.task.create({
      data: {
        courseId,
        importBatchId: batchId,
        sourceDocumentId,
        type: taskType,
        title: item.title,
        videoMinutes: taskType === "VIDEO" ? item.minutes : null,
        requirementLevel: item.requirementLevel as RequirementLevel,
        estimatedMinutes: minutes,
        recommendedDate: matchedEvent?.date,
        recommendedDateReason: matchedEvent ? `Related to "${matchedEvent.title}".` : null,
        confidence: item.confidence,
        sourceSnippet: item.sourceSnippet,
        approved: false,
        needsReview: lowConfidence,
        reviewNote: lowConfidence ? "Low-confidence extraction — please verify." : null,
      },
    });

    if (matchedEvent) {
      await db.taskEventRelationship.create({ data: { taskId: task.id, eventId: matchedEvent.dbId, type: "RELATED_TO" } });
    }
  }

  // --- Milestones ----------------------------------------------------------
  for (const item of extraction.milestones) {
    const deadline = item.deadline ? parseIsoDateLocal(item.deadline) : null;
    const validDeadline = deadline && !Number.isNaN(deadline.getTime()) ? deadline : null;
    const conflict = findConflictingMilestone({ title: item.title, deadline: validDeadline }, trackedMilestones);
    const lowConfidence = item.confidence < LOW_CONFIDENCE_THRESHOLD;
    const missingDeadline = !validDeadline;
    const needsReview = Boolean(conflict) || lowConfidence || missingDeadline;
    const reviewNote = conflict
      ? `Conflicting date: another source says "${conflict.title}" is due ${conflict.deadline?.toDateString()}, this one says ${validDeadline?.toDateString()}.`
      : missingDeadline
        ? "No deadline was found in the source document — add one manually."
        : lowConfidence
          ? "Low-confidence extraction — please verify."
          : null;

    const created = await db.milestone.create({
      data: {
        courseId,
        importBatchId: batchId,
        sourceDocumentId,
        title: item.title,
        type: item.type,
        description: item.description,
        deadline: validDeadline,
        isOfficialDeadline: true,
        wordCount: item.wordCount,
        requirements: item.requirements,
        confidence: item.confidence,
        sourceSnippet: item.sourceSnippet,
        approved: false,
        needsReview,
        reviewNote,
      },
    });

    if (conflict) {
      await db.milestone.update({
        where: { id: conflict.dbId },
        data: {
          needsReview: true,
          reviewNote: `Conflicting date: another source says "${item.title}" is due ${validDeadline?.toDateString() ?? "an unspecified date"}, this one says ${conflict.deadline?.toDateString()}.`,
        },
      });
    }

    trackedMilestones.push({ dbId: created.id, title: created.title, deadline: created.deadline });
  }
}
