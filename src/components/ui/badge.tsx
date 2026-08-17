import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

type Variant = "required" | "recommended" | "optional" | "official" | "muted" | "success" | "warning";

const VARIANT_CLASSES: Record<Variant, string> = {
  required: "bg-danger/10 text-danger",
  recommended: "bg-accent/10 text-accent",
  optional: "bg-muted/15 text-muted",
  official: "bg-danger/10 text-danger",
  muted: "bg-muted/15 text-muted",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
};

export function Badge({
  variant = "muted",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        VARIANT_CLASSES[variant],
        className
      )}
      {...props}
    />
  );
}

export function requirementVariant(level: "REQUIRED" | "RECOMMENDED" | "OPTIONAL"): Variant {
  if (level === "REQUIRED") return "required";
  if (level === "RECOMMENDED") return "recommended";
  return "optional";
}
