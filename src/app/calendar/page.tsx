import Link from "next/link";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { getCalendarMonth, getEventDetail } from "@/server/queries/calendar";
import { estimateTaskMinutes, formatMinutes } from "@/lib/estimation";
import { getSettings, toEstimationSettings } from "@/server/queries/settings";
import { cn } from "@/lib/cn";
import { TaskCheckbox } from "@/components/ui/task-checkbox";
import { AttendanceToggle } from "@/components/ui/attendance-toggle";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const RELATION_LABEL: Record<string, string> = {
  PREPARATION_FOR: "Before",
  FOLLOW_UP_TO: "After",
  RELATED_TO: "Related",
  REQUIRED_FOR: "Required for",
};

function monthParam(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonthParam(value: string | undefined, now: Date) {
  if (!value) return new Date(now.getFullYear(), now.getMonth(), 1);
  const [y, m] = value.split("-").map(Number);
  if (!y || !m) return new Date(now.getFullYear(), now.getMonth(), 1);
  return new Date(y, m - 1, 1);
}

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const sp = await searchParams;
  const now = new Date();
  const monthAnchor = parseMonthParam(firstParam(sp.month), now);
  const eventId = firstParam(sp.event);

  const { days, itemsByDate } = await getCalendarMonth(monthAnchor, now);
  const prevMonth = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() - 1, 1);
  const nextMonth = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1);
  const monthLabel = monthAnchor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const currentMonthQuery = monthParam(monthAnchor);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted mt-0.5">Lectures, exams, and major deadlines.</p>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/calendar?month=${monthParam(prevMonth)}`}
            className="flex size-8 items-center justify-center rounded-md border border-border hover:bg-surface-hover"
          >
            <ChevronLeft size={16} />
          </Link>
          <span className="w-36 text-center text-sm font-medium">{monthLabel}</span>
          <Link
            href={`/calendar?month=${monthParam(nextMonth)}`}
            className="flex size-8 items-center justify-center rounded-md border border-border hover:bg-surface-hover"
          >
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      <div className={cn("grid gap-6", eventId ? "lg:grid-cols-[1fr_320px]" : "grid-cols-1")}>
        <div className="rounded-lg border border-border bg-surface overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border">
            {WEEKDAY_LABELS.map((d) => (
              <div key={d} className="px-2 py-2 text-center text-xs font-medium text-muted">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map(({ date, inMonth, isToday }) => {
              const items = itemsByDate.get(date.toDateString()) ?? [];
              const visible = items.slice(0, 3);
              const overflow = items.length - visible.length;
              return (
                <div
                  key={date.toISOString()}
                  className={cn(
                    "min-h-24 border-b border-r border-border p-1.5 last:border-r-0",
                    !inMonth && "bg-background/40"
                  )}
                >
                  <span className={cn("text-xs", inMonth ? "text-foreground" : "text-muted/60", isToday && "font-semibold text-accent")}>
                    {date.getDate()}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {visible.map((item) => (
                      <Link
                        key={item.id}
                        href={
                          item.kind === "event"
                            ? `/calendar?month=${currentMonthQuery}&event=${item.id}`
                            : `/courses/${item.courseId}`
                        }
                        className="flex items-center gap-1 rounded px-1 py-0.5 text-[11px] hover:bg-surface-hover truncate"
                      >
                        <span className="inline-block size-1.5 rounded-full shrink-0" style={{ backgroundColor: item.courseColor }} />
                        <span className="truncate">{item.title}</span>
                      </Link>
                    ))}
                    {overflow > 0 && <p className="px-1 text-[11px] text-muted">+{overflow} more</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {eventId && <EventPanel eventId={eventId} monthQuery={currentMonthQuery} />}
      </div>
    </div>
  );
}

async function EventPanel({ eventId, monthQuery }: { eventId: string; monthQuery: string }) {
  const detail = await getEventDetail(eventId);
  if (!detail) return null;
  const { event, relationships } = detail;

  const settingsRow = await getSettings();
  const settings = toEstimationSettings(settingsRow);

  const groups = Object.keys(RELATION_LABEL).map((relation) => {
    const tasks = relationships
      .filter((r) => r.type === relation)
      .map((r) => ({
        ...r.task,
        minutes: r.task.estimatedMinutes ?? estimateTaskMinutes(r.task, settings),
      }));
    return { relation, label: RELATION_LABEL[relation], tasks };
  });

  return (
    <aside className="rounded-lg border border-border bg-surface p-4 h-fit lg:sticky lg:top-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted mb-1">
            <span className="inline-block size-2 rounded-full shrink-0" style={{ backgroundColor: event.course.color }} />
            <span className="font-medium">{event.course.code}</span>
          </div>
          <h2 className="text-sm font-semibold">{event.title}</h2>
        </div>
        <Link href={`/calendar?month=${monthQuery}`} className="text-muted hover:text-foreground">
          <X size={16} />
        </Link>
      </div>

      <p className="text-xs text-muted mt-2">
        {event.date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
        {event.startTime ? ` · ${event.startTime}${event.endTime ? `–${event.endTime}` : ""}` : ""}
      </p>
      {event.location && <p className="text-xs text-muted">{event.location}</p>}
      {event.topic && <p className="text-sm mt-2">{event.topic}</p>}

      {event.type === "LECTURE" || event.type === "SEMINAR" ? (
        <div className="mt-3">
          <AttendanceToggle eventId={event.id} attended={event.attended} />
        </div>
      ) : null}

      <div className="mt-4 space-y-4">
        {groups
          .filter((g) => g.tasks.length > 0)
          .map((g) => {
            const done = g.tasks.filter((t) => t.status === "DONE").length;
            return (
              <div key={g.relation}>
                <p className="text-xs font-medium text-muted mb-1.5">
                  {g.label} · {done}/{g.tasks.length}
                </p>
                <ul className="space-y-1.5">
                  {g.tasks.map((task) => (
                    <li key={task.id} className="flex items-center gap-2">
                      <TaskCheckbox taskId={task.id} completed={task.status === "DONE"} />
                      <span className={cn("text-sm truncate", task.status === "DONE" && "line-through text-muted")}>
                        {task.title}
                      </span>
                      {task.minutes != null && (
                        <span className="text-xs text-muted shrink-0 ml-auto">{formatMinutes(task.minutes)}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        {relationships.length === 0 && <p className="text-xs text-muted">No linked tasks.</p>}
      </div>
    </aside>
  );
}

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value || undefined;
}
