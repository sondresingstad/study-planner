import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { detectDocumentType } from "@/lib/parsers";
import { processImportBatch } from "@/server/import/process-batch";

const UPLOAD_ROOT = path.join(process.cwd(), "data", "uploads");

export async function POST(request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;

  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  const formData = await request.formData();
  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "No files were uploaded." }, { status: 400 });
  }

  const courseDir = path.join(UPLOAD_ROOT, courseId);
  await fs.mkdir(courseDir, { recursive: true });

  const batch = await db.importBatch.create({ data: { courseId, status: "PROCESSING" } });

  const skipped: string[] = [];
  const documentIds: string[] = [];

  for (const file of files) {
    const fileType = detectDocumentType(file.name, file.type);
    if (fileType === "UNKNOWN") {
      skipped.push(file.name);
      continue;
    }

    const storedName = `${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const storagePath = path.join(courseDir, storedName);
    const bytes = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(storagePath, bytes);

    const doc = await db.sourceDocument.create({
      data: {
        courseId,
        importBatchId: batch.id,
        filename: storedName,
        originalName: file.name,
        fileType,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: bytes.byteLength,
        storagePath,
        status: "PENDING",
      },
    });
    documentIds.push(doc.id);
  }

  if (documentIds.length === 0) {
    await db.importBatch.update({
      where: { id: batch.id },
      data: { status: "FAILED", errorMessage: "None of the uploaded files are a supported type (PDF, XLSX, DOCX, TXT)." },
    });
    return NextResponse.json(
      { error: "This file type is not currently supported.", skipped },
      { status: 400 }
    );
  }

  await processImportBatch(batch.id);

  return NextResponse.json({ batchId: batch.id, skipped });
}
