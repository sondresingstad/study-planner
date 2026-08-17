import { getTaskList, getCoursesForFilter, type TaskListFilters } from "@/server/queries/tasks";
import { formatMinutes } from "@/lib/estimation";
import { formatRelativeDay } from "@/lib/dates";
import { getEffectiveDate } from "@/lib/prioritization";
import { Card } from "@/components/ui/card";
import { Badge, requirementVariant } from "@/components/ui/badge";
import { TaskCheckbox } from "@/components/ui/task-checkbox";
import { TaskFilters } from "@/components/task-filters";
import { EmptyState } from "@/components/ui/empty-state";
import type { RequirementLevel, TaskType } from "@prisma/client";

export default async function TasksPage({ searchParams }: PageProps<"/tasks">) {
  const sp = await searchParams;
  const filters: TaskListFilters = {
    courseId: firstParam(sp.courseId),
    type: firstParam(sp.type) as TaskType | undefined,
    requirementLevel: firstParam(sp.requirementLevel) as RequirementLevel | undefined,
    status: (firstParam(sp.status) as TaskListFilters["status"]) ?? "open",
    sort: (firstParam(sp.sort) as TaskListFilters["sort"]) ?? "priority",
  };

  const [{ tasks, now }, courses] = await Promise.all([getTaskList(filters), getCoursesForFilter()]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Tasks</h1>
        <p className="text-sm text-muted mt-0.5">Everything across every course, in one list.</p>
      </div>

      <TaskFilters courses={courses} />

      {tasks.length === 0 ? (
        <EmptyState title="Nothing here" description="No tasks match the current filters." />
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {tasks.map((task) => {
              const effective = getEffectiveDate(task);
              return (
                <li key={task.id} className="flex items-start gap-3 px-4 py-3">
                  <TaskCheckbox taskId={task.id} completed={task.status === "DONE"} className="mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs text-muted mb-0.5">
                      <span className="inline-block size-2 rounded-full shrink-0" style={{ backgroundColor: task.course.color }} />
                      <span className="font-medium">{task.course.code}</span>
                      <span>·</span>
                      <span>{task.type.charAt(0) + task.type.slice(1).toLowerCase()}</span>
                    </div>
                    <p className="text-sm font-medium truncate">{task.title}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 text-xs">
                    <Badge variant={requirementVariant(task.requirementLevel)}>{task.requirementLevel.toLowerCase()}</Badge>
                    {task.minutes != null && <span className="text-muted">~{formatMinutes(task.minutes)}</span>}
                    {effective && (
                      <span className={task.isOfficialDeadline ? "text-danger font-medium" : "text-muted"}>
                        {formatRelativeDay(effective, now)}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value || undefined;
}
