import type { CategoryProgress } from "@/lib/progress";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatMinutes } from "@/lib/estimation";

function formatQuantity(cat: CategoryProgress) {
  if (cat.unit === "min") return `${formatMinutes(cat.completed)} / ${formatMinutes(cat.total)}`;
  return `${cat.completed} / ${cat.total} ${cat.unit}`;
}

export function CategoryProgressRow({ category }: { category: CategoryProgress }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="font-medium">{category.label}</span>
        <span className="text-muted text-xs">
          {category.total > 0 ? formatQuantity(category) : "No data yet"}
          {category.percent != null ? ` · ${category.percent}%` : ""}
        </span>
      </div>
      <ProgressBar percent={category.percent} />
    </div>
  );
}
