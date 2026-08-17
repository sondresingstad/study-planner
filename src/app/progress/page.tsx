import Link from "next/link";
import { getProgressOverview } from "@/server/queries/progress";
import { getIsoWeekNumber } from "@/lib/dates";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { CategoryProgressRow } from "@/components/ui/category-progress-row";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const { overall, perCourse, weeks } = await getProgressOverview();
  const hasCourses = perCourse.length > 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Progress</h1>
        <p className="text-sm text-muted mt-0.5">Are you keeping up?</p>
      </div>

      {!hasCourses ? (
        <EmptyState title="Nothing to track yet" description="Add a course to start seeing progress here." />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Overall</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <CategoryProgressRow category={overall.studyWorkload} />
              <CategoryProgressRow category={overall.attendance} />
              <CategoryProgressRow category={overall.reading} />
              <CategoryProgressRow category={overall.exercises} />
              <CategoryProgressRow category={overall.videos} />
              <CategoryProgressRow category={overall.assignments} />
              <CategoryProgressRow category={overall.other} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Weekly study workload</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="flex items-end gap-3 h-32">
                {weeks.map((w) => (
                  <div key={w.weekStart.toISOString()} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="text-[11px] text-muted">{w.percent != null ? `${w.percent}%` : "—"}</span>
                    <div className="flex-1 w-full flex items-end">
                      <div
                        className={cn("w-full rounded-t bg-accent transition-[height]", w.percent == null && "bg-border")}
                        style={{ height: `${Math.max(4, w.percent ?? 4)}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-muted">W{getIsoWeekNumber(w.weekStart)}</span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <section>
            <h2 className="text-sm font-semibold mb-3">By course</h2>
            <div className="space-y-3">
              {perCourse.map(({ course, progress }) => (
                <Link key={course.id} href={`/courses/${course.id}`}>
                  <Card className="hover:border-accent/50 transition-colors">
                    <CardBody className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-block size-2.5 rounded-full shrink-0" style={{ backgroundColor: course.color }} />
                        <p className="text-sm font-semibold">{course.code}</p>
                        <p className="text-xs text-muted truncate">{course.name}</p>
                      </div>
                      <CategoryProgressRow category={progress.studyWorkload} />
                      <CategoryProgressRow category={progress.attendance} />
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
