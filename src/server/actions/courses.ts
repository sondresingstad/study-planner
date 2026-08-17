"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

const CourseInput = z.object({
  name: z.string().trim().min(1, "Course name is required"),
  code: z.string().trim().min(1, "Course code is required"),
  semester: z.string().trim().min(1, "Semester is required"),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Color must be a hex value"),
});

export type CreateCourseState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof CourseInput>, string>>;
};

export async function createCourse(_prev: CreateCourseState, formData: FormData): Promise<CreateCourseState> {
  const parsed = CourseInput.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    semester: formData.get("semester"),
    color: formData.get("color"),
  });

  if (!parsed.success) {
    const fieldErrors: CreateCourseState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof z.infer<typeof CourseInput> | undefined;
      if (key) fieldErrors[key] = issue.message;
    }
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }

  const course = await db.course.create({ data: parsed.data });
  revalidatePath("/courses");
  revalidatePath("/");
  redirect(`/courses/${course.id}?created=1`);
}

export async function deleteCourse(courseId: string) {
  await db.course.delete({ where: { id: courseId } });
  revalidatePath("/courses");
  revalidatePath("/");
  redirect("/courses");
}

export async function updateCourse(
  courseId: string,
  data: Partial<{ name: string; code: string; semester: string; color: string }>
) {
  await db.course.update({ where: { id: courseId }, data });
  revalidatePath("/courses");
  revalidatePath(`/courses/${courseId}`);
  revalidatePath("/");
}
