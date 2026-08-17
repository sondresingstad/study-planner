"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteDraftMilestone, updateDraftMilestone } from "@/server/actions/import";
import { NeedsReviewNote, SourceSnippet } from "./needs-review-note";
import { Badge } from "@/components/ui/badge";
import { parseIsoDateLocal, formatIsoDateLocal } from "@/lib/dates";
import type { Milestone } from "@prisma/client";

export function MilestoneRow({ milestone }: { milestone: Milestone }) {
  const [isPending, startTransition] = useTransition();
  const inputClass =
    "rounded-md border border-border bg-surface px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40";

  return (
    <li className="px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
          <input
            aria-label="Milestone title"
            defaultValue={milestone.title}
            onBlur={(e) =>
              e.target.value !== milestone.title && startTransition(() => updateDraftMilestone(milestone.id, { title: e.target.value }))
            }
            className={inputClass}
          />
          <input
            aria-label="Deadline"
            type="date"
            defaultValue={milestone.deadline ? formatIsoDateLocal(milestone.deadline) : ""}
            onChange={(e) =>
              startTransition(() =>
                updateDraftMilestone(milestone.id, { deadline: e.target.value ? parseIsoDateLocal(e.target.value) : null })
              )
            }
            className={inputClass}
          />
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => deleteDraftMilestone(milestone.id))}
          className="text-muted hover:text-danger disabled:opacity-40 shrink-0 mt-1.5"
          aria-label={`Delete ${milestone.title}`}
        >
          <Trash2 size={15} />
        </button>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <Badge variant="official">Official deadline</Badge>
        {!milestone.deadline && <span className="text-xs text-warning">No date found</span>}
      </div>
      <NeedsReviewNote note={milestone.reviewNote} />
      <SourceSnippet snippet={milestone.sourceSnippet} />
    </li>
  );
}
