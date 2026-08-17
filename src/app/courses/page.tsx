import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { getDashboardData } from "@/server/queries/dashboard";
import { formatMinutes } from "@/lib/estimation";
import { formatRelativeDay } from "@/lib/dates";
import { Card, CardBody } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const now = new Date();
  const [courses, { courseSummaries }] = await Promise.all([
    db.course.findMany({ orderBy: { code: "asc" } }),
    getDashboardData(now),
  ]);

  const summaryByCourse = new Map(courseSummaries.map((s) => [s.course.id, s]));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Courses</h1>
          <p className="text-sm text-muted mt-0.5">{courses.length} course{courses.length === 1 ? "" : "s"}</p>
        </div>
        <Link
          href="/courses/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
        >
          <Plus size={16} strokeWidth={2.5} />
          Add Course
        </Link>
      </div>

      {courses.length === 0 ? (
        <EmptyState
          title="No courses yet"
          description="Add your first course to start building your semester study plan."
          action={{ href: "/courses/new", label: "Add your first course" }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {courses.map((course) => {
            const summary = summaryByCourse.get(course.id);
            return (
              <Link key={course.id} href={`/courses/${course.id}`}>
                <Card className="h-full transition-colors hover:border-accent/50">
                  <CardBody>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block size-2.5 rounded-full shrink-0" style={{ backgroundColor: course.color }} />
                      <p className="text-sm font-semibold truncate">{course.code}</p>
                    </div>
                    <p className="text-xs text-muted mb-1 truncate">{course.name}</p>
                    <p className="text-xs text-muted mb-3">{course.semester}</p>
                    {summary && (
                      <>
                        <dl className="space-y-1 text-xs text-muted mb-3">
                          <div className="flex justify-between gap-2">
                            <dt>Next lecture</dt>
                            <dd className="text-foreground">
                              {summary.nextEvent ? formatRelativeDay(summary.nextEvent.date, now) : "—"}
                            </dd>
                          </div>
                          <div className="flex justify-between gap-2">
                            <dt>Remaining</dt>
                            <dd className="text-foreground">{formatMinutes(summary.remainingWorkloadMinutes)}</dd>
                          </div>
                        </dl>
                        <div className="flex items-center justify-between text-xs text-muted mb-1">
                          <span>Progress</span>
                          <span>{summary.progressPercent != null ? `${summary.progressPercent}%` : "—"}</span>
                        </div>
                        <ProgressBar percent={summary.progressPercent} />
                      </>
                    )}
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
