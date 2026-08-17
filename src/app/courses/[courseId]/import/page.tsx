import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getProviderStatus } from "@/lib/ai/provider";
import { DocumentUploadForm } from "@/components/document-upload-form";

export default async function ImportPage({ params }: PageProps<"/courses/[courseId]/import">) {
  const { courseId } = await params;
  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course) notFound();

  const aiStatus = getProviderStatus();

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-xl font-semibold tracking-tight">
        Upload documents — {course.code}
      </h1>
      <p className="text-sm text-muted mt-1 mb-6">
        Course descriptions, lecture plans, reading lists, exercise sheets, assignment briefs — upload whatever you
        have. You&apos;ll review everything before it&apos;s added to your plan.
      </p>

      {!aiStatus.available && (
        <div className="mb-5 rounded-md border border-warning/30 bg-warning/5 px-3.5 py-2.5 text-sm text-warning">
          Intelligent extraction is unavailable ({aiStatus.reason}). Spreadsheet dates and lecture rows will still be
          picked up automatically; everything else will need to be added manually after upload.
        </div>
      )}

      <DocumentUploadForm courseId={course.id} />
    </div>
  );
}
