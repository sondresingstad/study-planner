"use client";

import { useActionState, useState } from "react";
import { createCourse, type CreateCourseState } from "@/server/actions/courses";
import { cn } from "@/lib/cn";

const COLOR_PRESETS = [
  "#6366f1", // indigo
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ec4899", // pink
  "#0ea5e9", // sky
  "#8b5cf6", // violet
  "#14b8a6", // teal
  "#ef4444", // red
];

const initialState: CreateCourseState = {};

export function CourseForm() {
  const [state, formAction, isPending] = useActionState(createCourse, initialState);
  const [color, setColor] = useState(COLOR_PRESETS[0]);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1.5">
          Course name
        </label>
        <input
          id="name"
          name="name"
          placeholder="Business Economics"
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
        {state.fieldErrors?.name && <p className="mt-1 text-xs text-danger">{state.fieldErrors.name}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="code" className="block text-sm font-medium mb-1.5">
            Course code
          </label>
          <input
            id="code"
            name="code"
            placeholder="BED1"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          {state.fieldErrors?.code && <p className="mt-1 text-xs text-danger">{state.fieldErrors.code}</p>}
        </div>
        <div>
          <label htmlFor="semester" className="block text-sm font-medium mb-1.5">
            Semester
          </label>
          <input
            id="semester"
            name="semester"
            placeholder="Fall 2026"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          {state.fieldErrors?.semester && <p className="mt-1 text-xs text-danger">{state.fieldErrors.semester}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Color</label>
        <input type="hidden" name="color" value={color} />
        <div className="flex items-center gap-2">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setColor(preset)}
              aria-label={`Use color ${preset}`}
              aria-pressed={color === preset}
              className={cn(
                "size-7 rounded-full ring-offset-2 ring-offset-surface transition-shadow",
                color === preset ? "ring-2 ring-foreground" : "hover:ring-2 hover:ring-border"
              )}
              style={{ backgroundColor: preset }}
            />
          ))}
        </div>
      </div>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Creating…" : "Create course"}
      </button>
    </form>
  );
}
