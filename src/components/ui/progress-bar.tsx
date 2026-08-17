import { cn } from "@/lib/cn";

export function ProgressBar({
  percent,
  className,
  trackClassName,
  fillClassName,
}: {
  percent: number | null;
  className?: string;
  trackClassName?: string;
  fillClassName?: string;
}) {
  const value = percent == null ? 0 : Math.max(0, Math.min(100, percent));
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-border", trackClassName, className)}
      role="progressbar"
      aria-valuenow={percent ?? undefined}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-full bg-accent transition-[width]", fillClassName)}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
