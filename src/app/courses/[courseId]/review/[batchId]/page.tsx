import { notFound } from "next/navigation";
import Link from "next/link";
import { getReviewBatch } from "@/server/queries/review";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { EventRow } from "@/components/review/event-row";
import { TaskRow } from "@/components/review/task-row";
import { MilestoneRow } from "@/components/review/milestone-row";
import { ApproveButton } from "@/components/review/approve-button";

export const dynamic = "force-dynamic";

export default async function ReviewImportPage({
  params,
  searchParams,
}: PageProps<"/courses/[courseId]/review/[batchId]">) {
  const { courseId, batchId } = await params;
  const sp = await searchParams;
  const skippedParam = sp.skipped;
  const skipped = (Array.isArray(skippedParam) ? skippedParam[0] : skippedParam)?.split(",").filter(Boolean) ?? [];
  const data = await getReviewBatch(batchId);
  if (!data || data.course.id !== courseId) notFound();

  const { batch, course, documents, events, reading, exercises, otherMaterial, milestones } = data;

  if (batch.status === "APPROVED") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8 text-center">
        <h1 className="text-lg font-semibold">This import was already approved</h1>
        <Link href={`/courses/${course.id}`} className="text-accent hover:underline text-sm mt-2 inline-block">
          Go to {course.code}
        </Link>
      </div>
    );
  }

  const failedDocs = documents.filter((d) => d.status === "FAILED");
  const totalItems = events.length + reading.length + exercises.length + otherMaterial.length + milestones.length;
  const needsReviewCount = [...events, ...reading, ...exercises, ...otherMaterial, ...milestones].filter(
    (i) => i.needsReview
  ).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 space-y-6 pb-24">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Review Import — {course.code} {course.name}
        </h1>
        <p className="text-sm text-muted mt-1">
          {totalItems} item{totalItems === 1 ? "" : "s"} found across {documents.length} document
          {documents.length === 1 ? "" : "s"}.
          {needsReviewCount > 0 && ` ${needsReviewCount} need${needsReviewCount === 1 ? "s" : ""} your attention.`}
        </p>
      </div>

      {batch.status === "FAILED" && (
        <Card className="border-danger/40 bg-danger/5">
          <CardBody>
            <p className="text-sm text-danger">
              {batch.errorMessage ?? "We couldn't fully analyze these documents."} The original files have been
              preserved and nothing has been added to your Study Plan.
            </p>
          </CardBody>
        </Card>
      )}

      {failedDocs.length > 0 && (
        <Card className="border-warning/40 bg-warning/5">
          <CardBody>
            <p className="text-sm text-warning">
              {failedDocs.length} document{failedDocs.length === 1 ? "" : "s"} couldn&apos;t be analyzed:{" "}
              {failedDocs.map((d) => d.originalName).join(", ")}. The files are preserved on the course page — try
              re-uploading them, or add their contents manually.
            </p>
          </CardBody>
        </Card>
      )}

      {skipped.length > 0 && (
        <Card className="border-warning/40 bg-warning/5">
          <CardBody>
            <p className="text-sm text-warning">
              This file type is not currently supported: {skipped.join(", ")}. Everything else was analyzed below.
            </p>
          </CardBody>
        </Card>
      )}

      {events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Lectures &amp; events ({events.length})</CardTitle>
          </CardHeader>
          <ul className="divide-y divide-border">
            {events.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </ul>
        </Card>
      )}

      {reading.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Reading ({reading.length})</CardTitle>
          </CardHeader>
          <ul className="divide-y divide-border">
            {reading.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </ul>
        </Card>
      )}

      {exercises.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Exercises ({exercises.length})</CardTitle>
          </CardHeader>
          <ul className="divide-y divide-border">
            {exercises.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </ul>
        </Card>
      )}

      {otherMaterial.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Other material ({otherMaterial.length})</CardTitle>
          </CardHeader>
          <ul className="divide-y divide-border">
            {otherMaterial.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </ul>
        </Card>
      )}

      {milestones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Deadlines &amp; milestones ({milestones.length})</CardTitle>
          </CardHeader>
          <ul className="divide-y divide-border">
            {milestones.map((m) => (
              <MilestoneRow key={m.id} milestone={m} />
            ))}
          </ul>
        </Card>
      )}

      {totalItems === 0 && batch.status !== "FAILED" && (
        <Card>
          <CardBody>
            <p className="text-sm text-muted">
              Nothing was automatically extracted from these documents. You can still add events, tasks, and
              milestones manually on the course page.
            </p>
          </CardBody>
        </Card>
      )}

      <div className="fixed bottom-0 left-0 right-0 md:left-60 border-t border-border bg-surface px-4 py-3 flex items-center justify-between">
        <Link href={`/courses/${course.id}`} className="text-sm text-muted hover:text-foreground">
          Cancel
        </Link>
        <ApproveButton batchId={batch.id} itemCount={totalItems} />
      </div>
    </div>
  );
}
