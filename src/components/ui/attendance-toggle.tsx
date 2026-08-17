"use client";

import { useTransition } from "react";
import { cn } from "@/lib/cn";
import { toggleEventAttendance } from "@/server/actions/events";

export function AttendanceToggle({ eventId, attended }: { eventId: string; attended: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => toggleEventAttendance(eventId))}
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50",
        attended ? "bg-success/10 text-success" : "bg-muted/15 text-muted hover:bg-muted/25"
      )}
    >
      {attended ? "Attended" : "Mark attended"}
    </button>
  );
}
