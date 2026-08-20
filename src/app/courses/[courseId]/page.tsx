import Link from "next/link";
import { notFound } from "next/navigation";
import { Upload, FileText } from "lucide-react";
import { getCourseDetail } from "@/server/queries/course-detail";
import { formatMinutes } from "@/lib/estimation";
import { formatRelativeDay } from "@/lib/dates";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Badge, requirementVariant } from "@/components/ui/badge";
import { CategoryProgressRow } from "@/components/ui/category-progress-row";
import { TaskCheckbox } from "@/components/ui/task-checkbox";
import { AttendanceToggle } from "@/components/ui/attendance-toggle";
import { DeleteCourseButton } from "@/components/delete-course-button";

export default async function CourseDetailPage({ params }: PageProps<"/courses/[courseId]">) {
  const { courseId } = await params;
  const detail = await getCourseDetail(courseId);
  if (!detail) notFound();

  const { course, events, tasks, milestones, sourceDocuments, pendingBatches, progress, nextEvent, nextMilestone, remainingWorkloadMinutes } =
    detail;
  const now = new Date();

  const upcomingEvents = events.filter((e) => e.date.getTime() >= now.getTime()).slice(0, 6);
  const pastEvents = events
    .filter((e) => e.date.getTime() < now.getTime())
    .slice(-4)
    .reverse();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="inline-block size-3 rounded-full shrink-0" style={{ backgroundColor: course.color }} />
            <h1 className="text-xl font-semibold tracking-tight">
              {course.code} — {course.name}
            </h1>
          </div>
          <p className="text-sm text-muted mt-1">{course.semester}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/courses/${course.id}/import`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3.5 py-2 text-sm font-medium hover:bg-surface-hover"
          >
            <Upload size={15} />
            Upload documents
          </Link>
          <DeleteCourseButton courseId={course.id} courseCode={course.code} />
        </div>
      </div>

      {pendingBatches.length > 0 && (
        <Card className="border-accent/40 bg-accent/5">
          <CardBody className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm">
              {pendingBatches.length} import{pendingBatches.length === 1 ? "" : "s"} ready for review.
            </p>
            <Link
              href={`/courses/${course.id}/review/${pendingBatches[0].id}`}
              className="text-sm font-medium text-accent hover:underline"
            >
              Review import →
            </Link>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardBody>
            <p className="text-xs text-muted">Next lecture</p>
            <p className="text-sm font-medium mt-1">{nextEvent ? formatRelativeDay(nextEvent.date, now) : "—"}</p>
            <p className="text-xs text-muted mt-0.5 truncate">{nextEvent?.topic ?? nextEvent?.title ?? "None scheduled"}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs text-muted">Next deadline</p>
            <p className="text-sm font-medium mt-1">
              {nextMilestone?.deadline ? formatRelativeDay(nextMilestone.deadline, now) : "—"}
            </p>
            <p className="text-xs text-muted mt-0.5 truncate">{nextMilestone?.title ?? "None upcoming"}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs text-muted">Remaining workload</p>
            <p className="text-sm font-medium mt-1">{formatMinutes(remainingWorkloadMinutes)}</p>
            <p className="text-xs text-muted mt-0.5">across {tasks.filter((t) => t.status !== "DONE").length} open tasks</p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Progress</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <CategoryProgressRow category={progress.studyWorkload} />
          <CategoryProgressRow category={progress.attendance} />
          <CategoryProgressRow category={progress.reading} />
          <CategoryProgressRow category={progress.exercises} />
          <CategoryProgressRow category={progress.assignments} />
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            {upcomingEvents.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted">No upcoming events.</p>
            ) : (
              <ul className="divide-y divide-border">
                {upcomingEvents.map((event) => (
                  <li key={event.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{event.title}</p>
                      <p className="text-xs text-muted truncate">{event.topic}</p>
                    </div>
                    <span className="text-xs text-muted shrink-0">
                      {formatRelativeDay(event.date, now)}
                      {event.startTime ? ` · ${event.startTime}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tasks</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            {tasks.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted">No tasks yet — upload course documents to generate them.</p>
            ) : (
              <ul className="divide-y divide-border max-h-96 overflow-y-auto">
                {tasks.map((task) => (
                  <li key={task.id} className="flex items-start gap-3 px-4 py-3">
                    <TaskCheckbox taskId={task.id} completed={task.status === "DONE"} className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant={requirementVariant(task.requirementLevel)}>{task.requirementLevel.toLowerCase()}</Badge>
                        {task.dueDate ? (
                          <Badge variant="official">Due {formatRelativeDay(task.dueDate, now)}</Badge>
                        ) : (
                          task.recommendedDate && (
                            <Badge variant="recommended">{formatRelativeDay(task.recommendedDate, now)}</Badge>
                          )
                        )}
                        {task.minutes != null && <span className="text-xs text-muted">~{formatMinutes(task.minutes)}</span>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assignments &amp; milestones</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {milestones.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted">No milestones recorded.</p>
          ) : (
            <ul className="divide-y divide-border">
              {milestones.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{m.title}</p>
                    <p className="text-xs text-muted truncate">{m.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={m.status === "DONE" ? "success" : "muted"}>{m.status.replace("_", " ").toLowerCase()}</Badge>
                    {m.isOfficialDeadline && <Badge variant="official">Official</Badge>}
                    <span className="text-xs text-muted">{m.deadline ? formatRelativeDay(m.deadline, now) : "No date"}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {pastEvents.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted">No past events yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {pastEvents.map((event) => (
                <li key={event.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{event.title}</p>
                    <p className="text-xs text-muted truncate">{event.topic}</p>
                  </div>
                  <AttendanceToggle eventId={event.id} attended={event.attended} />
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Source documents</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {sourceDocuments.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted">No documents uploaded yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {sourceDocuments.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText size={16} className="text-muted shrink-0" />
                    <span className="text-sm truncate">{doc.originalName}</span>
                  </div>
                  <span className="text-xs text-muted shrink-0">{doc.status.toLowerCase()}</span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
