"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted mt-1.5 max-w-sm">
        This page hit an unexpected error. Your data hasn&apos;t been affected — try again, or head back to the
        dashboard.
      </p>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
        >
          Try again
        </button>
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
