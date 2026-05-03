---
phase: 06-social-and-legacy
plan: 03
subsystem: ui
tags: [zustand, dexie, react, typescript, scouting, head-to-head, records]

# Dependency graph
requires:
  - phase: 06-01
    provides: rivals and scoutingNotes tables in Dexie DB schema (v4), navigation patterns
  - phase: 05-04
    provides: records-service with getHeadToHeadRecords for opponent H2H data
provides:
  - ScoutingNote type in core-types
  - scouting-service with upsert CRUD
  - useScoutingStore Zustand store
  - ScoutingCardPage with opponent search, H2H display, and editable tendency notes
affects: [future-plans, phase-07, phase-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Upsert pattern: check-then-update-or-create for one-note-per-opponent-per-dynasty constraint"
    - "Two-panel layout: opponent list (1/3) + scouting card detail (2/3) with stacked mobile fallback"
    - "Sport-agnostic page: no CFB guard, accessible for all dynasty types"

key-files:
  created:
    - packages/core-types/src/scouting-note.ts
    - apps/desktop/src/lib/scouting-service.ts
    - apps/desktop/src/store/scouting-store.ts
    - apps/desktop/src/pages/ScoutingCardPage.tsx
  modified:
    - packages/core-types/src/index.ts
    - packages/db/src/dynasty-db.ts
    - apps/desktop/src/store/index.ts
    - apps/desktop/src/store/navigation-store.ts
    - apps/desktop/src/pages/DashboardPage.tsx
    - apps/desktop/src/App.tsx

key-decisions:
  - "ScoutingNote typed properly in dynasty-db.ts — replaced Record<string,unknown> placeholder from 06-01"
  - "getHeadToHeadRecords reused from records-service as opponent list source — no separate query needed"
  - "upsertScoutingNote: check-then-update-or-create pattern, one note per opponent per dynasty"
  - "Scouting Cards button placed outside CFB sport guard — sport-agnostic feature"

patterns-established:
  - "Upsert pattern: getScoutingNoteForOpponent([dynastyId+opponent]) check before create"
  - "Edit mode toggle: local isEditing state with pre-fill from existing note on start"

# Metrics
duration: 8min
completed: 2026-02-21
---

# Phase 6 Plan 03: Scouting Cards Summary

**ScoutingNote core type with upsert CRUD service, Zustand store, and two-panel ScoutingCardPage showing H2H record, streak, recent games, and editable freeform tendency notes**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-21T00:00:00Z
- **Completed:** 2026-02-21T00:08:00Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- ScoutingNote TypeScript interface in core-types; exported alongside all other domain types
- dynasty-db.ts properly typed: `scoutingNotes!: Table<ScoutingNote, string>` replacing the 06-01 placeholder
- scouting-service.ts with `getScoutingNotesByDynasty`, `getScoutingNoteForOpponent`, `upsertScoutingNote`, `deleteScoutingNote`
- useScoutingStore Zustand store with `loadNotes`, `saveNote`, `removeNote` actions
- ScoutingCardPage: opponent search/filter, H2H record (wins-losses, streak, win%), recent games table, edit/save/cancel tendency notes with amber CTA
- "Scouting Cards" button in DashboardPage general section (sport-agnostic, outside CFB guard)
- Full build passes: 5/5 packages, 121 modules, no TypeScript errors

## Task Commits

Each task was committed atomically:

1. **Task 1: ScoutingNote type, updated DB declaration, scouting service and store** - `9acff91` (feat)
2. **Task 2: Scouting Card page, navigation wiring, Dashboard button** - `02222ef` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `packages/core-types/src/scouting-note.ts` - ScoutingNote interface (id, dynastyId, opponent, tendencies, createdAt, updatedAt)
- `packages/core-types/src/index.ts` - Added `export * from './scouting-note'`
- `packages/db/src/dynasty-db.ts` - Typed scoutingNotes as `Table<ScoutingNote, string>`, imported ScoutingNote
- `apps/desktop/src/lib/scouting-service.ts` - CRUD service with upsert pattern using `[dynastyId+opponent]` compound index
- `apps/desktop/src/store/scouting-store.ts` - Zustand store with loadNotes/saveNote/removeNote
- `apps/desktop/src/store/index.ts` - Exported useScoutingStore
- `apps/desktop/src/store/navigation-store.ts` - Added 'scouting-card' Page type + goToScoutingCard action
- `apps/desktop/src/pages/ScoutingCardPage.tsx` - Full two-panel page with opponent search, H2H stats, recent games, tendency notes
- `apps/desktop/src/pages/DashboardPage.tsx` - Added "Scouting Cards" amber button in general actions section
- `apps/desktop/src/App.tsx` - Imported ScoutingCardPage, added case 'scouting-card'

## Decisions Made

- **ScoutingNote typed in DB**: Replaced `Record<string, unknown>` placeholder (left by 06-01 to avoid type-blocking) with the real `Table<ScoutingNote, string>` type. No version bump needed — table already in schema v4.
- **Opponent list from getHeadToHeadRecords**: Reuses the existing records-service function to get all opponents with game history; no extra query needed. Only opponents with game history appear (per must-haves spec).
- **Upsert via compound index**: `[dynastyId+opponent]` compound index already exists in schema from 06-01; service queries `.where('[dynastyId+opponent]').equals([dynastyId, opponent]).first()` for efficient lookup.
- **Sport-agnostic placement**: "Scouting Cards" button placed in the general actions area (below Records & Leaderboards), not inside the `{activeDynasty.sport === 'cfb'}` guard.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 6 (Social and Legacy) is now complete — all 3 plans done
- Ready for Phase 7 planning
- ScoutingNote type, service, and store are fully wired; future plans can import useScoutingStore from '../store'

---
*Phase: 06-social-and-legacy*
*Completed: 2026-02-21*
