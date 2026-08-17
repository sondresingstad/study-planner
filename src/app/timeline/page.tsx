import { getTimeline, type TimelineDayItem, type TimelineTask } from "@/server/queries/timeline";
import { formatMinutes } from "@/lib/estimation";
import { cn } from "@/lib/cn";
import { TaskCheckbox } from "@/components/ui/task-checkbox";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

const RELATION_LABEL: Record<TimelineTask["relation"], string> = {
  PREPARATION_FOR: "Before",
  FOLLOW_UP_TO: "After",
  RELATED_TO: "Related",
  REQUIRED_FOR: "Required for",
};

export const dynamic = "force-dynamic";

export default async function TimelinePage() {
  const { weeks } = await getTimeline();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Timeline</h1>
          <p className="text-sm text-muted mt-0.5">Where you are in the semester, week by week.</p>
        </div>
        {weeks.some((w) => w.isCurrent) && (
          <a href="#current-week" className="text-sm font-medium text-accent hover:underline">
            Jump to this week
          </a>
        )}
      </div>

      {weeks.length === 0 ? (
        <EmptyState title="Nothing to show yet" description="Add a course and upload documents to populate the timeline." />
      ) : (
        <div className="space-y-8">
          {weeks.map((week) => (
            <section key={week.weekStart.toISOString()} id={week.isCurrent ? "current-week" : undefined}>
              <div
                className={cn(
                  "sticky top-0 z-[1] -mx-4 px-4 py-1.5 mb-3 text-xs font-semibold uppercase tracking-wide backdrop-blur",
                  week.isCurrent ? "text-accent bg-accent/10" : "text-muted bg-background/80"
                )}
              >
                Week {week.weekNumber}
                {week.isCurrent && " · Current"}
              </div>

              <div className="space-y-5">
                {week.days.map((day) => (
                  <div key={day.date.toISOString()}>
                    <p className={cn("text-sm font-medium mb-2", day.isToday && "text-accent")}>
                      {day.date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                      {day.isToday && " · Today"}
                    </p>
                    <div className="space-y-2">
                      {day.items.map((item) => (
                        <TimelineItem key={item.id} item={item} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function TimelineItem({ item }: { item: TimelineDayItem }) {
  const groups = (Object.keys(RELATION_LABEL) as TimelineTask["relation"][])
    .map((relation) => ({ relation, tasks: item.tasks.filter((t) => t.relation === relation) }))
    .filter((g) => g.tasks.length > 0);

  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-muted mb-1">
        <span className="inline-block size-2 rounded-full shrink-0" style={{ backgroundColor: item.courseColor }} />
        <span className="font-medium">{item.courseCode}</span>
        {item.startTime && <span>· {item.startTime}</span>}
        {item.kind === "milestone" && item.isOfficial && <Badge variant="official">Official</Badge>}
      </div>
      <p className="text-sm font-medium">{item.title}</p>
      {item.topic && <p className="text-xs text-muted">{item.topic}</p>}

      {groups.length > 0 && (
        <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {groups.map((g) => (
            <TaskGroup key={g.relation} label={RELATION_LABEL[g.relation]} tasks={g.tasks} />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskGroup({ label, tasks }: { label: string; tasks: TimelineTask[] }) {
  const done = tasks.filter((t) => t.status === "DONE").length;
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted mb-1">
        {label} · {done}/{tasks.length}
      </p>
      <ul className="space-y-1">
        {tasks.map((task) => (
          <li key={task.id} className="flex items-center gap-2">
            <TaskCheckbox taskId={task.id} completed={task.status === "DONE"} />
            <span className={cn("text-xs truncate", task.status === "DONE" && "line-through text-muted")}>
              {task.title}
            </span>
            {task.minutes != null && <span className="text-[11px] text-muted shrink-0">{formatMinutes(task.minutes)}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
