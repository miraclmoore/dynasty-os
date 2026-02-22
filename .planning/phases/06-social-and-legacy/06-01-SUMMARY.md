---
phase: 06-social-and-legacy
plan: 01
subsystem: database, ui
tags: [dexie, zustand, rivalry, head-to-head, intensity-score, migration]

# Dependency graph
requires:
  - phase: 05-cfb-features
    provides: records-service with getHeadToHeadRecords and H2H data computation
  - phase: 02-core-loop
    provides: game log and dynasty infrastructure used for H2H record calculation
provides:
  - DB v4 migration with rivals and scoutingNotes tables
  - Rival core type in @dynasty-os/core-types
  - rivalry-service.ts with CRUD and calculateRivalryIntensity pure function
  - rivalry-store.ts Zustand store
  - RivalryTrackerPage with rival designation, H2H record, streak, intensity pips, recent games
  - Navigation wiring and Dashboard CFB Program button
affects:
  - 06-02-scouting-notes (uses scoutingNotes table introduced here)
  - 06-03 (scoutingNotes Table<> typed in dynasty-db.ts placeholder)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Rivalry intensity as pure function in service layer (calculateRivalryIntensity)"
    - "H2H data sourced from existing getHeadToHeadRecords — no re-implementation"
    - "Rival form duplicate guard via toLowerCase() comparison"

key-files:
  created:
    - packages/core-types/src/rival.ts
    - apps/desktop/src/lib/rivalry-service.ts
    - apps/desktop/src/store/rivalry-store.ts
    - apps/desktop/src/pages/RivalryTrackerPage.tsx
  modified:
    - packages/core-types/src/index.ts
    - packages/db/src/schema.ts
    - packages/db/src/dynasty-db.ts
    - apps/desktop/src/store/index.ts
    - apps/desktop/src/store/navigation-store.ts
    - apps/desktop/src/pages/DashboardPage.tsx
    - apps/desktop/src/App.tsx

key-decisions:
  - "scoutingNotes Table typed as Record<string,unknown> — proper type deferred to 06-03"
  - "Rival form uses case-insensitive duplicate check (toLowerCase) to prevent accidental duplicates"
  - "Intensity pips (10 amber bars) render intensity/10 at a glance alongside numeric score"
  - "No CFB-only guard on RivalryTrackerPage — rivalries are sport-agnostic"

patterns-established:
  - "calculateRivalryIntensity(totalGames): pure function, Math.min(10, Math.ceil(totalGames / 2))"
  - "Inline edit pattern: editingId state + editLabel, Save/Cancel buttons replace the label display"

# Metrics
duration: 3min
completed: 2026-02-22
---

# Phase 6 Plan 1: Rivalry Tracker Summary

**Dexie v4 migration (rivals + scoutingNotes tables), Rival type, CRUD service with calculateRivalryIntensity(1-10), Zustand store, and RivalryTrackerPage wired to getHeadToHeadRecords for live H2H records, streaks, and intensity pip display**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-22T06:23:35Z
- **Completed:** 2026-02-22T06:26:06Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- DB schema v4 migration with rivals and scoutingNotes tables; version(1) + version(4) migration path per Dexie multi-version pattern
- Rival core type exported from @dynasty-os/core-types; rivalry-service.ts with full CRUD + calculateRivalryIntensity pure function (intensity = min(10, ceil(totalGames/2)))
- RivalryTrackerPage renders rival cards with W-L record (green/red), current streak, amber intensity pips (N/10), and last 3 games — all sourced from existing getHeadToHeadRecords with no re-implementation
- Dashboard CFB Program section now includes Rivalry Tracker amber button; App.tsx routes 'rivalry-tracker' to the new page

## Task Commits

Each task was committed atomically:

1. **Task 1: DB schema v4 migration, Rival type, rivalry service and store** - `ada4a51` (feat)
2. **Task 2: Rivalry Tracker page, navigation wiring, Dashboard button** - `8b82f0a` (feat)

**Plan metadata:** (docs commit pending)

## Files Created/Modified

- `packages/core-types/src/rival.ts` - Rival interface (id, dynastyId, opponent, label, createdAt, updatedAt)
- `packages/core-types/src/index.ts` - Added `export * from './rival'`
- `packages/db/src/schema.ts` - Added rivals + scoutingNotes to SCHEMA; DB_VERSION bumped to 4
- `packages/db/src/dynasty-db.ts` - Added rivals and scoutingNotes Table declarations; version(4) migration
- `apps/desktop/src/lib/rivalry-service.ts` - createRival, getRivalsByDynasty, updateRival, deleteRival, calculateRivalryIntensity
- `apps/desktop/src/store/rivalry-store.ts` - useRivalryStore with loadRivals, addRival, editRival, removeRival
- `apps/desktop/src/store/index.ts` - Added `export { useRivalryStore }`
- `apps/desktop/src/store/navigation-store.ts` - Added 'rivalry-tracker' to Page union + goToRivalryTracker action
- `apps/desktop/src/pages/RivalryTrackerPage.tsx` - Full rivalry tracker UI
- `apps/desktop/src/pages/DashboardPage.tsx` - Added Rivalry Tracker button in CFB Program section
- `apps/desktop/src/App.tsx` - Added RivalryTrackerPage import + 'rivalry-tracker' case

## Decisions Made

- `scoutingNotes` table in dynasty-db.ts typed as `Table<Record<string, unknown>, string>` — the proper ScoutingNote type will be defined in 06-03; this avoids a blocking type error now
- No CFB-only guard on RivalryTrackerPage — rivalries are sport-agnostic per plan spec
- Inline label edit uses `editingId` + `editLabel` local state; no separate edit page needed
- Duplicate rival guard uses case-insensitive comparison to prevent near-duplicate entries

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All must_haves satisfied: Rival type, rivalry-service.ts exports, rivalry-store.ts, RivalryTrackerPage with H2H + streak + intensity
- scoutingNotes table is in the DB schema ready for 06-03 to type and use
- Full build passes (5/5 packages, 116 modules transformed)
- Ready for 06-02-PLAN.md

---
*Phase: 06-social-and-legacy*
*Completed: 2026-02-22*
