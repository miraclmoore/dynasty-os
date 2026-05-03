---
phase: 05-cfb-features
plan: 03
subsystem: ui
tags: [zustand, dexie, indexeddb, react, typescript, draft-tracker, nfl-draft]

# Dependency graph
requires:
  - phase: 05-01
    provides: DB schema v3 with draftPicks table, navigation-store with draft-tracker page and goToPlayerProfile
  - phase: 03-player-tracking
    provides: Player records and goToPlayerProfile navigation action used for linked player profiles

provides:
  - CRUD service for draft picks (createDraftPick, getDraftPicksByDynasty, getDraftPicksBySeason, deleteDraftPick)
  - getPositionBreakdown pure function grouping picks into standard position groups
  - useDraftStore Zustand store with picks state, loadPicks/addPick/removePick
  - DraftTrackerPage: add-pick form with player linking, historical view grouped by year, position breakdown badges
  - App.tsx routing for 'draft-tracker' page

affects:
  - 05-04 (prestige tracker - follows same CFB-only page pattern)
  - Dashboard (may link to draft-tracker for quick access in future)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - CFB-only guard pattern reused (activeDynasty.sport !== 'cfb' check at top of page)
    - Position group mapping with case-insensitive matching, only returns groups with count > 0
    - Zustand store: load after every mutation (addPick/removePick both call loadPicks after write)
    - Player auto-fill: selecting playerId from dropdown populates playerName and position from player record
    - useMemo for year grouping: picks grouped and sorted once per picks array change

key-files:
  created:
    - apps/desktop/src/lib/draft-service.ts
    - apps/desktop/src/store/draft-store.ts
    - apps/desktop/src/pages/DraftTrackerPage.tsx
  modified:
    - apps/desktop/src/store/index.ts
    - apps/desktop/src/App.tsx

key-decisions:
  - "getPositionBreakdown: case-insensitive position matching (toUpperCase), only returns groups with count > 0"
  - "Player auto-fill on playerId select: fills playerName and position from player record in store"
  - "Season pre-selection: default to seasons[0] (latest/most recent) when seasons load"
  - "useMemo for year grouping: avoids recomputing year groups on every render"

patterns-established:
  - "Draft pick player linking: optional playerId field enables profile navigation; playerName always stored as string for display without player lookup"
  - "Position breakdown badges: bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs — reusable pattern for grouped counts"

# Metrics
duration: 3min
completed: 2026-02-22
---

# Phase 5 Plan 03: NFL Draft Tracker Summary

**Dexie-backed draft pick CRUD service, Zustand store, and DraftTrackerPage with year-grouped history, position breakdown badges, and linked player profile navigation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-22T05:30:17Z
- **Completed:** 2026-02-22T05:32:56Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Draft service layer with full CRUD (create/read-by-dynasty/read-by-season/delete) and pure getPositionBreakdown function that groups positions into 8 standard groups
- useDraftStore Zustand store with loadPicks/addPick/removePick actions, each following the load-after-mutation pattern
- DraftTrackerPage with add-pick form (player linking auto-fills name/position), year-grouped historical view sorted descending, per-year position breakdown badges, and clickable player names that navigate to PlayerProfilePage via goToPlayerProfile
- CFB-only guard prevents Madden dynasties from accessing the feature

## Task Commits

Each task was committed atomically:

1. **Task 1: Draft service and store** - `5999503` (feat)
2. **Task 2: Draft Tracker page and App.tsx routing** - `9f5249b` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `apps/desktop/src/lib/draft-service.ts` - CRUD functions + getPositionBreakdown with position group mapping
- `apps/desktop/src/store/draft-store.ts` - Zustand store for picks state with load/add/remove actions
- `apps/desktop/src/pages/DraftTrackerPage.tsx` - Add-pick form, year-grouped history, position breakdown, player links
- `apps/desktop/src/store/index.ts` - Added useDraftStore barrel export
- `apps/desktop/src/App.tsx` - Added DraftTrackerPage import and case 'draft-tracker' route

## Decisions Made

- Player auto-fill: when a playerId is selected from the player dropdown, playerName and position are auto-populated from the player record in the store — reduces manual re-entry for linked picks
- Season pre-selection: defaults to seasons[0] (the most recent season, since seasons are sorted descending) when seasons load — reduces friction for the common case
- useMemo for year grouping: picksByYear computed once per picks array update to avoid expensive regrouping on unrelated renders

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Draft tracker complete; 05-04 (prestige tracker) is next
- Pattern established: CFB-only guard, Zustand store with load-after-mutation, year-grouped history — reuse directly in 05-04
- All 5 Phase 5 tables are in use (recruitingClasses, recruits, transferPortalEntries, draftPicks — prestige ratings come in 05-04)

---
*Phase: 05-cfb-features*
*Completed: 2026-02-22*
