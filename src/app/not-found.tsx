import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-lg font-semibold">Page not found</h1>
      <p className="text-sm text-muted mt-1.5 max-w-sm">
        This page doesn&apos;t exist, or whatever it pointed to may have been deleted.
      </p>
      <Link
        href="/"
        className="mt-4 inline-flex items-center rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
