"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteDraftEvent, updateDraftEvent } from "@/server/actions/import";
import { NeedsReviewNote, SourceSnippet } from "./needs-review-note";
import { parseIsoDateLocal, formatIsoDateLocal } from "@/lib/dates";
import type { Event } from "@prisma/client";

const EVENT_TYPES = ["LECTURE", "SEMINAR", "EXERCISE_CLASS", "WORKSHOP", "EXAM", "PRESENTATION", "OTHER"] as const;

export function EventRow({ event }: { event: Event }) {
  const [isPending, startTransition] = useTransition();
  const inputClass =
    "rounded-md border border-border bg-surface px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40";

  return (
    <li className="px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
          <input
            aria-label="Event title"
            defaultValue={event.title}
            onBlur={(e) => e.target.value !== event.title && startTransition(() => updateDraftEvent(event.id, { title: e.target.value }))}
            className={inputClass}
          />
          <select
            aria-label="Event type"
            defaultValue={event.type}
            onChange={(e) => startTransition(() => updateDraftEvent(event.id, { type: e.target.value as Event["type"] }))}
            className={inputClass}
          >
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace("_", " ").toLowerCase()}
              </option>
            ))}
          </select>
          <input
            aria-label="Event date"
            type="date"
            defaultValue={formatIsoDateLocal(event.date)}
            onChange={(e) => e.target.value && startTransition(() => updateDraftEvent(event.id, { date: parseIsoDateLocal(e.target.value) }))}
            className={inputClass}
          />
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => deleteDraftEvent(event.id))}
          className="text-muted hover:text-danger disabled:opacity-40 shrink-0 mt-1.5"
          aria-label={`Delete ${event.title}`}
        >
          <Trash2 size={15} />
        </button>
      </div>
      {event.topic && <p className="text-xs text-muted mt-1.5">{event.topic}</p>}
      <NeedsReviewNote note={event.reviewNote} />
      <SourceSnippet snippet={event.sourceSnippet} />
    </li>
  );
}
