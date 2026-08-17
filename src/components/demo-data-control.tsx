"use client";

import { useState, useTransition } from "react";
import { addDemoData, resetDemoData } from "@/server/actions/settings";

export function DemoDataControl({ hasDemoData }: { hasDemoData: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (!hasDemoData) {
    return (
      <div>
        <p className="text-sm text-muted mb-3">
          Load three fictional courses (ECON101, BUS201, ORG110) with a full semester of lectures, readings, exercises
          and deadlines, so you can try the app before uploading your own material.
        </p>
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => addDemoData())}
          className="inline-flex items-center rounded-md border border-border bg-surface px-3.5 py-2 text-sm font-medium hover:bg-surface-hover disabled:opacity-50"
        >
          {isPending ? "Adding…" : "Add demo data"}
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-muted mb-3">
        Demo data is currently loaded. Removing it deletes the three demo courses and everything under them — your own
        courses are never affected.
      </p>
      {confirming ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => resetDemoData().then(() => setConfirming(false)))}
            className="inline-flex items-center rounded-md bg-danger px-3.5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "Removing…" : "Confirm remove"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="text-sm text-muted hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="inline-flex items-center rounded-md border border-border bg-surface px-3.5 py-2 text-sm font-medium hover:bg-surface-hover"
        >
          Remove demo data
        </button>
      )}
    </div>
  );
}
