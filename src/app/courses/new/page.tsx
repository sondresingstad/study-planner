import { CourseForm } from "@/components/course-form";

export default function NewCoursePage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-xl font-semibold tracking-tight">Add Course</h1>
      <p className="text-sm text-muted mt-1 mb-6">
        Start with the basics. You&apos;ll upload course files — syllabus, lecture plan, reading list — on the next
        screen.
      </p>
      <CourseForm />
    </div>
  );
}
