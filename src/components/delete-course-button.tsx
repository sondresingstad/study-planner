"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteCourse } from "@/server/actions/courses";

export function DeleteCourseButton({ courseId, courseCode }: { courseId: string; courseCode: string }) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted">Delete {courseCode} and everything in it?</span>
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => deleteCourse(courseId))}
          className="inline-flex items-center gap-1.5 rounded-md bg-danger px-3.5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Deleting…" : "Confirm delete"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-sm text-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3.5 py-2 text-sm font-medium text-danger hover:bg-danger/5"
    >
      <Trash2 size={15} />
      Delete course
    </button>
  );
}
