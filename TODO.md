# Study Planner — Development Checklist

## Phase 1 — Architecture
- [x] Inspect environment (node v24.15.0, npm 12, git yes, gh no)
- [x] Propose architecture (Next.js App Router + Prisma/SQLite + Server Actions)
- [x] Data model drafted (see prisma/schema.prisma)

## Phase 2 — Foundation
- [x] Scaffold Next.js app (TS, Tailwind, App Router, src dir)
- [x] Install deps (prisma, zod, pdf-parse, exceljs, mammoth, date-fns, lucide-react, vitest, @anthropic-ai/sdk)
- [x] Prisma schema + migration (SQLite via better-sqlite3 driver adapter — required by Prisma 7)
- [x] Seed script with demo data (ECON101, BUS201, ORG110)
- [x] Core layout + sidebar/mobile nav
- [x] Verify `npm run dev` boots with empty DB

## Phase 3 — Core Study Plan logic
- [x] Time estimation engine (lib/estimation.ts) + tests
- [x] Recommended deadline logic (lib/deadlines.ts) + tests
- [x] Progress calculation (lib/progress.ts) + tests
- [x] Task/Event relationship helpers (TaskEventRelationship + prioritization.ts)
- [x] Settings CRUD (server actions)

## Phase 4 — Main UI (against seed data)
- [x] Dashboard (Today, Next Lectures, Upcoming Deadlines, Courses)
- [x] Timeline (week/day/course, current week highlighted)
- [x] Calendar (month view, event side panel w/ prep tasks)
- [x] Tasks (unified list, filters/sort via URL search params)
- [x] Course detail page
- [x] Progress page
- [x] Settings page

## Phase 5 — Document Import
- [x] File upload UI + local storage (data/uploads, gitignored)
- [x] Parsers: PDF, XLSX, DOCX, TXT -> normalized text/tables
- [x] AI provider abstraction (Anthropic default via structured outputs, OpenAI alternative) + Zod-validated structured extraction
- [x] Deterministic fallback (no API key) for XLSX/date tables
- [x] Duplicate/conflict detection
- [x] Review Import screen (edit/delete/approve)
- [x] Approve -> writes to Study Plan (Event/Task/Milestone.approved = true)

## Phase 6 — Polish
- [x] Loading/empty/error states (loading.tsx, error.tsx, not-found.tsx, EmptyState component)
- [x] Responsive pass (sidebar/mobile nav, grid breakpoints throughout)
- [x] Dark mode (prefers-color-scheme + data-theme override; no hardcoded palette colors)
- [x] Accessibility pass (aria-labels on icon-only controls and review-screen inputs)

## Phase 7 — Verification
- [x] tsc --noEmit
- [x] eslint
- [x] vitest (46 tests)
- [x] next build
- [x] Full manual journey test (empty DB -> add course -> upload -> review -> approve -> check dashboard/timeline/calendar/tasks/progress -> restart -> persists)
- [x] README.md written

## Known limitations (see README for the full list)
- AI extraction quality depends on the configured provider/model; deterministic fallback only handles spreadsheet rows with a recognizable date.
- No background job queue — document processing runs synchronously in the upload request, so very large batches will make the request take longer.
- No file size/type virus scanning; this is a local single-user tool, not a hosted multi-tenant service.
