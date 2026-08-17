"use client";

import { useRouter, useSearchParams } from "next/navigation";

const TYPES = ["READING", "EXERCISE", "VIDEO", "WRITING", "QUIZ", "ASSIGNMENT", "OTHER"] as const;
const REQUIREMENTS = ["REQUIRED", "RECOMMENDED", "OPTIONAL"] as const;

export function TaskFilters({ courses }: { courses: { id: string; code: string }[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/tasks?${params.toString()}`);
  }

  const selectClass =
    "rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent/40";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className={selectClass}
        value={searchParams.get("status") ?? "open"}
        onChange={(e) => update("status", e.target.value)}
      >
        <option value="open">Open</option>
        <option value="done">Done</option>
        <option value="all">All</option>
      </select>

      <select className={selectClass} value={searchParams.get("courseId") ?? ""} onChange={(e) => update("courseId", e.target.value)}>
        <option value="">All courses</option>
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.code}
          </option>
        ))}
      </select>

      <select className={selectClass} value={searchParams.get("type") ?? ""} onChange={(e) => update("type", e.target.value)}>
        <option value="">All types</option>
        {TYPES.map((t) => (
          <option key={t} value={t}>
            {t.charAt(0) + t.slice(1).toLowerCase()}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        value={searchParams.get("requirementLevel") ?? ""}
        onChange={(e) => update("requirementLevel", e.target.value)}
      >
        <option value="">All requirement levels</option>
        {REQUIREMENTS.map((r) => (
          <option key={r} value={r}>
            {r.charAt(0) + r.slice(1).toLowerCase()}
          </option>
        ))}
      </select>

      <select className={selectClass} value={searchParams.get("sort") ?? "priority"} onChange={(e) => update("sort", e.target.value)}>
        <option value="priority">Sort: Priority</option>
        <option value="date">Sort: Date</option>
        <option value="course">Sort: Course</option>
        <option value="type">Sort: Type</option>
      </select>
    </div>
  );
}
