---
phase: 05-cfb-features
plan: 01
subsystem: database, ui, api
tags: [dexie, zustand, react, typescript, claude-haiku, recruiting, cfb]

# Dependency graph
requires:
  - phase: 04-narrative-engine
    provides: getApiKey/setApiKey pattern from legacy-card-service.ts reused for recruiting AI grade
  - phase: 02-core-loop
    provides: season/dynasty data model that recruitingClass links to via seasonId/dynastyId
  - phase: 03-player-tracking-and-records
    provides: player-service.ts CRUD pattern replicated for recruiting-service.ts
provides:
  - DB schema v3 with 5 new tables for all Phase 5 CFB features
  - RecruitingClass and Recruit type definitions
  - TransferPortalEntry, DraftPick, PrestigeRating type definitions
  - Full recruiting CRUD service with Claude Haiku AI grade generation
  - Zustand recruiting store (classes, recruitsForClass, activeClass, loading)
  - RecruitingPage with class entry, recruit log, AI grade display, history browser
  - Navigation store extended with 4 new CFB page types
  - Dashboard CFB Program section with 4 amber buttons (sport guard)
affects:
  - 05-02 (transfer portal — uses TransferPortalEntry type and transferPortalEntries table)
  - 05-03 (draft tracker — uses DraftPick type and draftPicks table)
  - 05-04 (prestige tracker — uses PrestigeRating type and prestigeRatings table)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CFB sport guard: activeDynasty.sport !== 'cfb' check at page top shows message + back button"
    - "Claude Haiku grade generation: GRADE:/ANALYSIS: regex parsing from structured API response"
    - "Cascade-delete in recruiting-service: deleteRecruitingClass deletes recruits first then class record"
    - "Auto-calculate totalCommits: sum of fiveStars+fourStars+threeStars if totalCommits field left blank"
    - "Grade color coding: A=green, B=blue, C=yellow, D/F=red — visual at-a-glance class quality"

key-files:
  created:
    - packages/core-types/src/recruiting.ts
    - packages/core-types/src/transfer-portal.ts
    - packages/core-types/src/draft.ts
    - packages/core-types/src/prestige.ts
    - apps/desktop/src/lib/recruiting-service.ts
    - apps/desktop/src/store/recruiting-store.ts
    - apps/desktop/src/pages/RecruitingPage.tsx
  modified:
    - packages/core-types/src/index.ts
    - packages/db/src/schema.ts
    - packages/db/src/dynasty-db.ts
    - apps/desktop/src/store/index.ts
    - apps/desktop/src/store/navigation-store.ts
    - apps/desktop/src/pages/DashboardPage.tsx
    - apps/desktop/src/App.tsx

key-decisions:
  - "claude-haiku-4-5-20251001 for recruiting grade: consistent with legacy card blurb model choice — cheap/fast for structured grading task"
  - "Single DB_VERSION bump (2→3) with all 5 Phase 5 tables: avoids migration conflicts across 05-02/05-03/05-04 plans"
  - "RecruitingPage dual-view toggle (Current Class / Class History): keeps UI simple without additional routes"
  - "generateGrade never throws: returns null on failure, matching legacy-card-service pattern for optional AI features"
  - "activeClass state in recruiting-store: allows history view to select any class and view its recruits"

patterns-established:
  - "CFB sport guard pattern: check activeDynasty.sport !== 'cfb' at top of CFB-only pages — reuse in 05-02/03/04"
  - "Grade color utility function: gradeColor(grade) returns Tailwind classes by letter — reusable for prestige/other CFB features"
  - "Structured AI response parsing: FIELD: [value] regex pattern from generate-class-grade — reuse for any structured AI output"

# Metrics
duration: 4min
completed: 2026-02-22
---

# Phase 5 Plan 1: DB Schema Migration and Recruiting Module Summary

**DB schema v3 with all 5 Phase 5 tables in one Dexie version bump, plus full recruiting module: CRUD service with Claude Haiku AI class grading, Zustand store, and RecruitingPage with entry/history views behind CFB sport guard**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-22T05:21:31Z
- **Completed:** 2026-02-22T05:25:43Z
- **Tasks:** 2
- **Files modified:** 14 (7 created, 7 modified)

## Accomplishments
- DB schema bumped from v2 to v3 with all 5 new tables (recruitingClasses, recruits, transferPortalEntries, draftPicks, prestigeRatings) in one migration — prevents conflicts for plans 05-02 through 05-04
- Created complete recruiting module: service layer with CRUD + AI grade generation via Claude Haiku, Zustand store, RecruitingPage with class creation form, recruit log, AI grade badge, and class history browser
- Wired navigation: 4 new page types added to navigation store, Dashboard now shows CFB Program section with 4 amber buttons guarded by `sport === 'cfb'`

## Task Commits

Each task was committed atomically:

1. **Task 1: DB schema migration and core types for all Phase 5 entities** - `c20fa1a` (feat)
2. **Task 2: Recruiting service, store, page UI, and navigation wiring** - `f58e66f` (feat)

**Plan metadata:** (see docs commit below)

## Files Created/Modified
- `packages/core-types/src/recruiting.ts` - RecruitingClass and Recruit interfaces
- `packages/core-types/src/transfer-portal.ts` - TransferPortalEntry interface
- `packages/core-types/src/draft.ts` - DraftPick interface
- `packages/core-types/src/prestige.ts` - PrestigeRating interface
- `packages/core-types/src/index.ts` - Added 4 new type module exports
- `packages/db/src/schema.ts` - DB_VERSION bumped to 3, 5 new table definitions added
- `packages/db/src/dynasty-db.ts` - 5 new Table<T, string> declarations added
- `apps/desktop/src/lib/recruiting-service.ts` - Full CRUD + generateClassGrade via Claude Haiku
- `apps/desktop/src/store/recruiting-store.ts` - Zustand store with classes/recruitsForClass/activeClass
- `apps/desktop/src/store/index.ts` - Export useRecruitingStore
- `apps/desktop/src/store/navigation-store.ts` - 4 new page types + navigation helpers
- `apps/desktop/src/pages/RecruitingPage.tsx` - Entry view + history view, CFB guard, AI grade
- `apps/desktop/src/pages/DashboardPage.tsx` - CFB Program section with 4 amber buttons
- `apps/desktop/src/App.tsx` - case 'recruiting' routing

## Decisions Made
- Single DB version bump (v2→v3) with all 5 Phase 5 tables — ensures 05-02/05-03/05-04 can use their tables without any additional migration
- Used `claude-haiku-4-5-20251001` for recruiting class grade generation — consistent with existing AI feature model choice, structured response is well-suited to Haiku's capabilities
- RecruitingPage uses toggle between "Current Class" and "Class History" views rather than separate routes — keeps navigation model simple
- `generateGrade` never throws; returns null on any failure — matches the "AI features are optional enhancement" pattern from legacy-card-service

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. AI grade generation reuses the existing API key stored via `setApiKey()` from legacy-card-service.ts.

## Next Phase Readiness
- `transferPortalEntries` table and `TransferPortalEntry` type ready for 05-02
- `draftPicks` table and `DraftPick` type ready for 05-03
- `prestigeRatings` table and `PrestigeRating` type ready for 05-04
- Navigation store has `goToTransferPortal`, `goToDraftTracker`, `goToPrestigeTracker` helpers ready
- Dashboard already shows all 4 CFB Program buttons — 05-02/03/04 just need to implement the pages and add App.tsx cases
- CFB sport guard pattern established — replicate in each subsequent CFB page

---
*Phase: 05-cfb-features*
*Completed: 2026-02-22*
