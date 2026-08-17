"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { toggleTaskStatus } from "@/server/actions/tasks";

export function TaskCheckbox({
  taskId,
  completed,
  className,
}: {
  taskId: string;
  completed: boolean;
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-pressed={completed}
      aria-label={completed ? "Mark task incomplete" : "Mark task complete"}
      disabled={isPending}
      onClick={() => startTransition(() => toggleTaskStatus(taskId))}
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors disabled:opacity-50",
        completed ? "border-accent bg-accent text-accent-foreground" : "border-border bg-surface hover:border-accent/50",
        className
      )}
    >
      {completed && <Check size={13} strokeWidth={3} />}
    </button>
  );
}
