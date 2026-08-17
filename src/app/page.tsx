import Link from "next/link";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { getDashboardData } from "@/server/queries/dashboard";
import { formatMinutes } from "@/lib/estimation";
import { getEffectiveDate } from "@/lib/prioritization";
import { formatRelativeDay } from "@/lib/dates";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Badge, requirementVariant } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { TaskCheckbox } from "@/components/ui/task-checkbox";
import { EmptyState } from "@/components/ui/empty-state";

// This reads live DB state directly (not via `fetch`), so Next can't infer
// dynamism on its own — without this it would be prerendered once at build
// time and served stale under `next start` until a mutation revalidates it.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();
  const { todayTasks, remainingMinutesToday, nextLectures, upcomingMilestones, courseSummaries } =
    await getDashboardData(now);

  const hasAnyCourse = courseSummaries.length > 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Today</h1>
        <p className="text-sm text-muted mt-0.5">What to focus on right now, across every course.</p>
      </div>

      {!hasAnyCourse ? (
        <EmptyState
          title="No courses yet"
          description="Add a course and upload your syllabus, reading list, or lecture plan to build your semester study plan automatically."
          action={{ href: "/courses/new", label: "Add your first course" }}
        />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Today</CardTitle>
              <span className="text-xs text-muted flex items-center gap-1">
                <Clock size={13} />
                {formatMinutes(remainingMinutesToday)} remaining
              </span>
            </CardHeader>
            <CardBody className="p-0">
              {todayTasks.length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted">Nothing due today or tomorrow. Enjoy the breathing room.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {todayTasks.map((task) => {
                    const effective = getEffectiveDate(task);
                    return (
                      <li key={task.id} className="flex items-start gap-3 px-4 py-3">
                        <TaskCheckbox taskId={task.id} completed={task.status === "DONE"} className="mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-xs text-muted mb-0.5">
                            <span
                              className="inline-block size-2 rounded-full shrink-0"
                              style={{ backgroundColor: task.course.color }}
                            />
                            <span className="font-medium">{task.course.code}</span>
                            <Badge variant={requirementVariant(task.requirementLevel)}>
                              {task.requirementLevel.toLowerCase()}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium truncate">{task.title}</p>
                          <p className="text-xs text-muted mt-0.5">
                            {quantityLabel(task)}
                            {task.minutes != null && quantityLabel(task) ? " · " : ""}
                            {task.minutes != null ? `~${formatMinutes(task.minutes)}` : null}
                          </p>
                          {(task.isOfficialDeadline || task.recommendedDateReason) && (
                            <p className="text-xs text-muted mt-0.5">
                              {task.isOfficialDeadline ? (
                                <span className="text-danger font-medium">
                                  Official deadline{effective ? ` · ${formatRelativeDay(effective, now)}` : ""}
                                </span>
                              ) : (
                                task.recommendedDateReason
                              )}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>

          <section>
            <h2 className="text-sm font-semibold mb-3">Next Lectures</h2>
            {nextLectures.length === 0 ? (
              <p className="text-sm text-muted">No upcoming lectures scheduled.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {nextLectures.map(({ course, event, preparationPercent }) => (
                  <Card key={event.id}>
                    <CardBody>
                      <div className="flex items-center gap-2 text-xs text-muted mb-1">
                        <span className="inline-block size-2 rounded-full shrink-0" style={{ backgroundColor: course.color }} />
                        <span className="font-medium">{course.code}</span>
                      </div>
                      <p className="text-sm font-medium">
                        {formatRelativeDay(event.date, now)}
                        {event.startTime ? ` · ${event.startTime}` : ""}
                      </p>
                      <p className="text-sm text-muted truncate">{event.topic ?? event.title}</p>
                      {preparationPercent != null && (
                        <div className="mt-2.5">
                          <div className="flex items-center justify-between text-xs text-muted mb-1">
                            <span>Preparation</span>
                            <span>{preparationPercent}%</span>
                          </div>
                          <ProgressBar percent={preparationPercent} />
                        </div>
                      )}
                    </CardBody>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold mb-3">Upcoming Deadlines</h2>
            {upcomingMilestones.length === 0 ? (
              <p className="text-sm text-muted">No deadlines coming up.</p>
            ) : (
              <Card>
                <ul className="divide-y divide-border">
                  {upcomingMilestones.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs text-muted mb-0.5">
                          <span className="inline-block size-2 rounded-full shrink-0" style={{ backgroundColor: m.course.color }} />
                          <span className="font-medium">{m.course.code}</span>
                        </div>
                        <p className="text-sm font-medium truncate">{m.title}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {m.isOfficialDeadline && <Badge variant="official">Official</Badge>}
                        <span className="text-sm text-muted flex items-center gap-1">
                          <CalendarIcon size={13} />
                          {m.deadline ? formatRelativeDay(m.deadline, now) : "No date"}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold mb-3">Courses</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {courseSummaries.map(({ course, nextEvent, nextMilestone, remainingWorkloadMinutes, progressPercent }) => (
                <Link key={course.id} href={`/courses/${course.id}`}>
                  <Card className="h-full transition-colors hover:border-accent/50">
                    <CardBody>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-block size-2.5 rounded-full shrink-0" style={{ backgroundColor: course.color }} />
                        <p className="text-sm font-semibold truncate">{course.code}</p>
                      </div>
                      <p className="text-xs text-muted mb-3 truncate">{course.name}</p>
                      <dl className="space-y-1 text-xs text-muted mb-3">
                        <div className="flex justify-between gap-2">
                          <dt>Next lecture</dt>
                          <dd className="text-foreground">{nextEvent ? formatRelativeDay(nextEvent.date, now) : "—"}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt>Next deadline</dt>
                          <dd className="text-foreground">
                            {nextMilestone?.deadline ? formatRelativeDay(nextMilestone.deadline, now) : "—"}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt>Remaining</dt>
                          <dd className="text-foreground">{formatMinutes(remainingWorkloadMinutes)}</dd>
                        </div>
                      </dl>
                      <div className="flex items-center justify-between text-xs text-muted mb-1">
                        <span>Progress</span>
                        <span>{progressPercent != null ? `${progressPercent}%` : "—"}</span>
                      </div>
                      <ProgressBar percent={progressPercent} />
                    </CardBody>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function quantityLabel(task: { type: string; pageCount: number | null; exerciseCount: number | null; videoMinutes: number | null; wordCount: number | null }) {
  if (task.type === "READING" && task.pageCount != null) return `${task.pageCount} pages`;
  if (task.type === "EXERCISE" && task.exerciseCount != null) return `${task.exerciseCount} exercises`;
  if (task.type === "VIDEO" && task.videoMinutes != null) return `${task.videoMinutes} min video`;
  if (task.type === "WRITING" && task.wordCount != null) return `${task.wordCount} words`;
  return null;
}
