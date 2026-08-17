# Study Planner — Development Checklist

## Phase 1 — Architecture
- [x] Inspect environment (node v24.15.0, npm 12, git yes, gh no)
- [x] Propose architecture (Next.js App Router + Prisma/SQLite + Server Actions)
- [x] Data model drafted (see prisma/schema.prisma)

## Phase 2 — Foundation
- [x] Scaffold Next.js app (TS, Tailwind, App Router, src dir)
- [x] Install deps (prisma, zod, pdf-parse, exceljs, mammoth, date-fns, lucide-react, vitest)
- [ ] Prisma schema + migration
- [ ] Seed script with demo data (ECON101, BUS201, ORG110)
- [ ] Core layout + sidebar nav
- [ ] Verify `npm run dev` boots with empty DB

## Phase 3 — Core Study Plan logic
- [ ] Time estimation engine (lib/estimation.ts) + tests
- [ ] Recommended deadline logic (lib/deadlines.ts) + tests
- [ ] Progress calculation (lib/progress.ts) + tests
- [ ] Task/Event relationship helpers
- [ ] Settings CRUD (server actions)

## Phase 4 — Main UI (against seed data)
- [ ] Dashboard (Today, Next Lectures, Upcoming Deadlines, Courses)
- [ ] Timeline (week/day/course, current week highlighted)
- [ ] Calendar (month view, event modal w/ prep tasks)
- [ ] Tasks (unified list, filters/sort)
- [ ] Course detail page
- [ ] Progress page
- [ ] Settings page

## Phase 5 — Document Import
- [ ] File upload UI + local storage (data/uploads, gitignored)
- [ ] Parsers: PDF, XLSX, DOCX, TXT -> normalized text/tables
- [ ] AI provider abstraction (Anthropic default) + Zod-validated structured extraction
- [ ] Deterministic fallback (no API key) for XLSX/date tables
- [ ] Duplicate/conflict detection
- [ ] Review Import screen (edit/delete/reassign/approve)
- [ ] Approve -> writes to Study Plan (Event/Task/Milestone.approved = true)

## Phase 6 — Polish
- [ ] Loading/empty/error states
- [ ] Responsive pass
- [ ] Dark mode
- [ ] Accessibility pass

## Phase 7 — Verification
- [ ] tsc --noEmit
- [ ] eslint
- [ ] vitest
- [ ] next build
- [ ] Full manual journey test (empty DB -> add course -> upload -> review -> approve -> check dashboard/timeline/calendar/tasks/progress -> restart -> persists)

## Notes / known limitations (fill in as discovered)
