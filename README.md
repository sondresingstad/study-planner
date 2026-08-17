# Study Planner

A personal, local-first study planner. Upload your course documents — syllabi, lecture plans, reading lists,
exercise sheets, assignment briefs — and it turns them into one structured semester plan: a dashboard, a
calendar, a week-by-week timeline, a unified task list, and per-category progress tracking.

This is built for one person running it locally on their own machine. There's no login, no multi-tenant
concerns, no cloud sync — the whole app is a Next.js server talking to a SQLite file on disk.

## What it does

1. **Add a course** — name, code, semester, color.
2. **Upload whatever documents you have** for it (PDF, XLSX, DOCX, TXT) — no need to sort or label them first.
3. The app extracts lectures, readings, exercises, other material, and deadlines/milestones from each document,
   using an LLM when one is configured, or a deterministic spreadsheet-date scanner when it isn't.
4. **Review Import**: everything extracted shows up as editable drafts, grouped by type, with confidence and a
   source snippet where available. Duplicates against your existing plan and conflicting dates across documents
   are flagged automatically. Nothing touches your real plan until you approve it.
5. Once approved, it's live everywhere: Dashboard, Timeline, Calendar, Tasks, and Progress are all views over the
   same underlying data — the Study Plan is the single source of truth.
6. Check things off as you go; progress recalculates from actual quantities (pages, exercises, minutes), not
   just "tasks checked."

Official deadlines and the app's own recommended dates (e.g. "read this before Wednesday's lecture") are always
kept as distinct fields — the UI never blurs a suggestion into a hard deadline.

## Technology stack

- **Next.js 16** (App Router, Server Components, Server Actions) + **TypeScript**
- **Tailwind CSS 4** for styling, with a small CSS-variable design-token system (light/dark, no hardcoded colors)
- **SQLite** via **Prisma 7**, using the `@prisma/adapter-better-sqlite3` driver adapter (Prisma 7 no longer
  reads a connection URL from `schema.prisma`; the CLI gets it from `prisma.config.ts`, the app from
  `src/lib/db.ts`)
- **Zod 4** for schema validation, including AI structured-output schemas
- Document parsing: `pdf-parse`, `mammoth` (DOCX), `exceljs` (XLSX)
- AI extraction: `@anthropic-ai/sdk` (default provider, via `client.messages.parse()` + a Zod output schema) or
  a raw-HTTP OpenAI provider, behind a small provider abstraction — see below
- **Vitest** for unit tests

## Requirements

- Node.js 20+ (developed and tested on Node 24)
- npm

## Installation

```bash
git clone <your-repo-url>
cd study-planner
npm install
```

## Environment configuration

Copy the example env file:

```bash
cp .env.example .env
```

`DATABASE_URL` is not a secret and lives in `.env` (used by the Prisma CLI). For AI extraction, copy the AI
section into a separate `.env.local` (gitignored, for secrets):

```bash
# .env.local
AI_PROVIDER="anthropic"        # "anthropic" | "openai" | unset
ANTHROPIC_API_KEY=sk-ant-...
```

**The app works fully without an AI key.** If `AI_PROVIDER`/the matching API key isn't set, the Review Import
screen tells you so, and document import falls back to a deterministic scanner that picks up date-bearing rows
from spreadsheets. Everything else — courses, manual tasks/events, the dashboard, timeline, calendar, progress —
works identically either way.

Never commit real API keys. `.env` and `.env.local` are both gitignored; only `.env.example` is tracked.

## Database setup

```bash
npx prisma migrate dev   # creates data/study-planner.db and applies the schema
npm run db:seed          # optional: loads 3 demo courses (ECON101, BUS201, ORG110) with a full semester of data
```

Demo data can also be added/removed from the Settings page in the app. `npm run db:reset-demo` removes it from
the CLI. Demo courses are flagged `isDemo: true` and are never mixed with courses you create yourself.

## Running locally

```bash
npm run dev
```

Open <http://localhost:3000>.

## Testing

```bash
npm test          # run once
npm run test:watch
```

Covers: time estimation, recommended-deadline calculation, progress calculation, task prioritization,
deterministic-extraction parsing, and import duplicate/conflict detection.

Before considering a change complete, also run:

```bash
npx tsc --noEmit   # typecheck
npm run lint       # eslint
npm run build      # production build
```

## Project structure

```
prisma/
  schema.prisma        # data model
  seed.ts               # CLI seed script (thin wrapper around src/server/seed)
  reset-demo.ts
src/
  app/                  # routes (App Router) — one folder per page/section
    api/courses/[courseId]/documents/route.ts   # file upload endpoint
  components/           # UI components (ui/ = generic primitives, review/ = Review Import rows)
  lib/                  # pure logic: estimation, deadlines, progress, prioritization, dates,
                         # parsers/ (PDF/DOCX/XLSX/TXT + deterministic fallback), ai/ (provider abstraction)
  server/
    actions/            # Server Actions (mutations)
    queries/            # Prisma read queries, shaped for each page
    import/             # process-batch.ts — the extraction pipeline orchestrator
    seed/                # demo-data generator, shared by the CLI script and the in-app "Add demo data" button
tests/                  # Vitest unit tests
data/                   # gitignored — SQLite DB file + uploaded course documents
```

## Document extraction architecture

```
Upload  ─▶  parseDocument()  ─▶  AI provider (if configured) or deterministic fallback
                                        │
                                        ▼
                              Zod-validated ExtractionResult
                                        │
                                        ▼
                     draft Event/Task/Milestone rows (approved = false)
                     duplicate + conflict detection against existing/other-drafts
                                        │
                                        ▼
                            Review Import screen (edit / delete)
                                        │
                                        ▼
                         Approve  ─▶  approved = true (live in the plan)
```

- **The AI never writes to the live plan.** `POST /api/courses/[courseId]/documents` saves the uploaded files,
  creates an `ImportBatch`, and calls `processImportBatch()`, which parses each file and extracts a structured
  `ExtractionResult` (Zod schema in `src/lib/ai/schema.ts`) — either via the configured AI provider or the
  deterministic fallback. Every resulting `Event`/`Task`/`Milestone` row is created with `approved: false`.
- **Duplicate/conflict detection** (`src/lib/import-matching.ts`, pure and unit-tested) compares new events
  against same-day/similar-title existing events, and flags milestones whose title matches an existing one but
  whose deadline disagrees — `needsReview` + a human-readable `reviewNote` are set on the row.
- **Review Import** shows drafts grouped by type with inline edit/delete. Approving a batch is a single
  transaction that flips `approved: true` on everything left in it.
- **Provider abstraction** (`src/lib/ai/provider.ts`) selects Anthropic or OpenAI by env var and returns `null`
  if neither is configured/keyed, so callers always have a fallback path instead of a hard failure.

## Data model

See `prisma/schema.prisma` for the authoritative definitions. Key entities:

- **Course** — name/code/semester/color.
- **SourceDocument** / **ImportBatch** — uploaded files and the review session they belong to.
- **Event** — lectures, seminars, exercise classes, exams, etc. (`date`, `startTime`/`endTime`, `location`).
- **Task** — reading/exercise/video/writing/quiz/assignment/other, with underlying quantities (`pageCount`,
  `exerciseCount`, `videoMinutes`, `wordCount`) stored separately from the derived `estimatedMinutes`, so
  changing time-estimation settings recalculates existing tasks rather than requiring re-import.
- **Milestone** — mandatory assignments, exams, course approvals, with a `deadline`.
- **TaskEventRelationship** — `PREPARATION_FOR` / `FOLLOW_UP_TO` / `RELATED_TO` / `REQUIRED_FOR` links between
  tasks and events; this is what lets "read Chapter 6 before Lecture 7" survive as a real relationship instead
  of two disconnected rows, and what recommended-deadline calculation (`src/lib/deadlines.ts`) is built on.
- **Settings** — singleton row holding the time-estimation configuration (editable from the Settings page).

Every `Task`/`Event`/`Milestone` also carries `approved`, `needsReview`, `reviewNote`, `confidence`, and
`sourceSnippet` — the review/traceability metadata described above — plus `isOfficialDeadline` (Task/Milestone)
so a stated deadline and a calculated recommendation are never the same field.

## Known MVP limitations

- AI extraction quality depends on the source document's clarity and the configured model. Low-confidence or
  ambiguous items are flagged in Review Import rather than guessed silently, but they still need a human look.
- The deterministic (no-AI-key) fallback only recognizes date-bearing rows in spreadsheets; it doesn't attempt
  to parse readings/exercises/deadlines out of free-text PDFs or DOCX files. With no AI key, those documents are
  stored and traceable but produce no automatic items.
- Document processing runs synchronously inside the upload request (no background job queue) — fine at the
  scale of a few dozen files per course, but a very large batch will make that request take longer to return.
- Single user, no auth — this is intentional for the MVP scope, not an oversight. See the spec this app was
  built from for the list of deliberately-excluded future features (AI chat, Canvas integration, multi-user,
  etc.).
