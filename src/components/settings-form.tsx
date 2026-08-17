"use client";

import { useActionState } from "react";
import { updateSettings, type UpdateSettingsState } from "@/server/actions/settings";

const initialState: UpdateSettingsState = {};

export function SettingsForm({
  settings,
}: {
  settings: { textbookPageMinutes: number; articlePageMinutes: number; exerciseMinutes: number; writingWordsPerHour: number };
}) {
  const [state, formAction, isPending] = useActionState(updateSettings, initialState);

  const fieldClass =
    "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40";

  return (
    <form action={formAction} className="space-y-5">
      <Field
        label="Textbook reading speed"
        name="textbookPageMinutes"
        suffix="min / page"
        defaultValue={settings.textbookPageMinutes}
        className={fieldClass}
      />
      <Field
        label="Academic article reading speed"
        name="articlePageMinutes"
        suffix="min / page"
        defaultValue={settings.articlePageMinutes}
        className={fieldClass}
      />
      <Field
        label="Exercise time"
        name="exerciseMinutes"
        suffix="min / exercise"
        defaultValue={settings.exerciseMinutes}
        className={fieldClass}
      />
      <Field
        label="Writing speed"
        name="writingWordsPerHour"
        suffix="words / hour"
        defaultValue={settings.writingWordsPerHour}
        className={fieldClass}
      />

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.success && <p className="text-sm text-success">Saved. Estimates across the app have been recalculated.</p>}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  suffix,
  defaultValue,
  className,
}: {
  label: string;
  name: string;
  suffix: string;
  defaultValue: number;
  className: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium mb-1.5">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={name}
          name={name}
          type="number"
          step="0.1"
          min="0.1"
          defaultValue={defaultValue}
          className={className}
        />
        <span className="text-xs text-muted whitespace-nowrap">{suffix}</span>
      </div>
    </div>
  );
}
