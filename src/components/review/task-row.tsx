"use client";

import { useTransition } from "react";
import { Trash2, Calendar } from "lucide-react";
import { deleteDraftTask, updateDraftTask } from "@/server/actions/import";
import { NeedsReviewNote, SourceSnippet } from "./needs-review-note";
import { formatMinutes } from "@/lib/estimation";
import { formatRelativeDay } from "@/lib/dates";
import type { RequirementLevel, Task } from "@prisma/client";

const REQUIREMENT_LEVELS: RequirementLevel[] = ["REQUIRED", "RECOMMENDED", "OPTIONAL"];

export function TaskRow({ task }: { task: Task }) {
  const [isPending, startTransition] = useTransition();
  const inputClass =
    "rounded-md border border-border bg-surface px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40";

  return (
    <li className="px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
          <input
            aria-label="Task title"
            defaultValue={task.title}
            onBlur={(e) => e.target.value !== task.title && startTransition(() => updateDraftTask(task.id, { title: e.target.value }))}
            className={inputClass}
          />
          {task.type === "READING" && (
            <input
              aria-label="Page count"
              type="number"
              min={0}
              defaultValue={task.pageCount ?? ""}
              placeholder="pages"
              onBlur={(e) => startTransition(() => updateDraftTask(task.id, { pageCount: e.target.value ? Number(e.target.value) : null }))}
              className={`${inputClass} w-24`}
            />
          )}
          {task.type === "EXERCISE" && (
            <input
              aria-label="Exercise count"
              type="number"
              min={0}
              defaultValue={task.exerciseCount ?? ""}
              placeholder="exercises"
              onBlur={(e) => startTransition(() => updateDraftTask(task.id, { exerciseCount: e.target.value ? Number(e.target.value) : null }))}
              className={`${inputClass} w-28`}
            />
          )}
          {task.type === "VIDEO" && (
            <input
              aria-label="Video minutes"
              type="number"
              min={0}
              defaultValue={task.videoMinutes ?? ""}
              placeholder="minutes"
              onBlur={(e) => startTransition(() => updateDraftTask(task.id, { videoMinutes: e.target.value ? Number(e.target.value) : null }))}
              className={`${inputClass} w-24`}
            />
          )}
          <select
            aria-label="Requirement level"
            defaultValue={task.requirementLevel}
            onChange={(e) => startTransition(() => updateDraftTask(task.id, { requirementLevel: e.target.value as RequirementLevel }))}
            className={inputClass}
          >
            {REQUIREMENT_LEVELS.map((r) => (
              <option key={r} value={r}>
                {r.toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => deleteDraftTask(task.id))}
          className="text-muted hover:text-danger disabled:opacity-40 shrink-0 mt-1.5"
          aria-label={`Delete ${task.title}`}
        >
          <Trash2 size={15} />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5">
        {task.description && <p className="text-xs text-muted">{task.description}</p>}
        {task.estimatedMinutes != null && <p className="text-xs text-muted">~{formatMinutes(task.estimatedMinutes)}</p>}
        {task.recommendedDate && !task.dueDate && (
          <p className="flex items-center gap-1 text-xs text-accent">
            <Calendar size={11} />
            Recommended by {formatRelativeDay(task.recommendedDate)}
          </p>
        )}
        {task.dueDate && (
          <p className="flex items-center gap-1 text-xs text-danger font-medium">
            <Calendar size={11} />
            Due {formatRelativeDay(task.dueDate)}
          </p>
        )}
      </div>
      {task.recommendedDateReason && <p className="text-xs text-muted mt-0.5">{task.recommendedDateReason}</p>}
      <NeedsReviewNote note={task.reviewNote} />
      <SourceSnippet snippet={task.sourceSnippet} />
    </li>
  );
}
