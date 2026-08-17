"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export function DocumentUploadForm({ courseId }: { courseId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
    setError(null);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleUpload() {
    if (files.length === 0) return;
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      for (const file of files) formData.append("files", file);

      const res = await fetch(`/api/courses/${courseId}/documents`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Upload failed.");
        setIsUploading(false);
        return;
      }

      router.push(`/courses/${courseId}/review/${data.batchId}`);
    } catch {
      setError("We couldn't reach the server. Please try again.");
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-12 text-center cursor-pointer transition-colors",
          isDragging ? "border-accent bg-accent/5" : "border-border hover:border-accent/40"
        )}
      >
        <Upload size={22} className="text-muted mb-2" />
        <p className="text-sm font-medium">Drag files here, or click to browse</p>
        <p className="text-xs text-muted mt-1">PDF, XLSX, DOCX, or TXT — upload as many as you have</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.xlsx,.xls,.docx,.txt"
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {files.map((file, i) => (
            <li key={`${file.name}-${i}`} className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={15} className="text-muted shrink-0" />
                <span className="text-sm truncate">{file.name}</span>
              </div>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="text-muted hover:text-danger shrink-0"
                aria-label={`Remove ${file.name}`}
              >
                <X size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        type="button"
        disabled={files.length === 0 || isUploading}
        onClick={handleUpload}
        className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
      >
        {isUploading ? (
          <>
            <Loader2 size={15} className="animate-spin" />
            Analyzing documents…
          </>
        ) : (
          `Analyze ${files.length || ""} document${files.length === 1 ? "" : "s"}`.trim()
        )}
      </button>
    </div>
  );
}
