import Link from "next/link";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 px-6 text-center">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="text-sm text-muted mt-1.5 max-w-sm">{description}</p>
      {action && (
        <Link
          href={action.href}
          className="mt-4 inline-flex items-center rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
