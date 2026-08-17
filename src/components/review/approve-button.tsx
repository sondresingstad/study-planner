"use client";

import { useTransition } from "react";
import { approveImportBatch } from "@/server/actions/import";

export function ApproveButton({ batchId, itemCount }: { batchId: string; itemCount: number }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending || itemCount === 0}
      onClick={() => startTransition(() => approveImportBatch(batchId))}
      className="inline-flex items-center rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
    >
      {isPending ? "Adding to your plan…" : `Approve Course — add ${itemCount} item${itemCount === 1 ? "" : "s"} to plan`}
    </button>
  );
}
