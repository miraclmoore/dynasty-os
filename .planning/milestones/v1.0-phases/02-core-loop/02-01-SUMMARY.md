---
phase: 02-core-loop
plan: "01"
subsystem: database
tags: [dexie, zustand, typescript, season, game, crud]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Dexie db instance, core-types (Season, Game, GameType, GameResult), dynasty-store pattern, generateId util
provides:
  - Season CRUD service with getCurrentSeason helper (season-service.ts)
  - Game CRUD service with auto-recalculate season record on every mutation (game-service.ts)
  - useSeasonStore Zustand store with activeSeason and reload-after-mutation pattern
  - useGameStore Zustand store with games sorted by week and reload-after-mutation pattern
  - store/index.ts barrel export for all three stores
affects:
  - 02-02 (game log UI needs useGameStore and useSeasonStore)
  - 02-03 (dashboard widgets need season W/L data via useSeasonStore)
  - 02-04 (season management UI needs useSeasonStore)
  - All future phases that display game or season data

# Tech tracking
tech-stack:
  added: []
  patterns:
    - recalculateSeasonRecord: called after every game mutation (create/update/delete) to keep Season wins/losses/confWins/confLosses in sync
    - conference record isolation: confWins/confLosses count only gameType === 'conference' games
    - Zustand reload-after-mutation: every store action reloads full list from Dexie after write

key-files:
  created:
    - apps/desktop/src/lib/season-service.ts
    - apps/desktop/src/lib/game-service.ts
    - apps/desktop/src/store/season-store.ts
    - apps/desktop/src/store/game-store.ts
  modified:
    - apps/desktop/src/store/index.ts

key-decisions:
  - "recalculateSeasonRecord is called synchronously after every game write — season record always reflects actual game data"
  - "Conference record tracks only gameType === 'conference' (not 'regular' or others)"
  - "useSeasonStore.activeSeason is the season with the highest year (getSeasonsByDynasty returns descending)"
  - "useGameStore.logGame auto-recalculates season record via service; caller must also trigger useSeasonStore.loadSeasons to reflect updated W/L in UI"

patterns-established:
  - "recalculateSeasonRecord pattern: fetch all games for season, count by result and gameType, call updateSeason"
  - "Service layer handles DB mutations and recalculation; store layer handles state and reload"

# Metrics
duration: 2min
completed: 2026-02-22
---

# Phase 02 Plan 01: Season & Game Data Layer Summary

**Season and game CRUD services with auto-recalculating W/L records, plus Zustand stores following the established dynasty-store reload-after-mutation pattern**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-22T02:35:14Z
- **Completed:** 2026-02-22T02:36:44Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Created season-service.ts with 5 exports: createSeason, getSeasonsByDynasty, getSeason, getCurrentSeason, updateSeason
- Created game-service.ts with 6 exports including recalculateSeasonRecord that auto-updates Season wins/losses/confWins/confLosses after every game mutation
- Created useSeasonStore (seasons array, activeSeason = highest year season, reload-after-mutation)
- Created useGameStore (games sorted by week, reload-after-mutation, logGame triggers season recalculation via service)
- Updated store/index.ts to export all three stores: useDynastyStore, useSeasonStore, useGameStore

## Task Commits

Each task was committed atomically:

1. **Task 1: Create season-service.ts and game-service.ts** - `11b5b43` (feat)
2. **Task 2: Create season-store.ts and game-store.ts Zustand stores** - `f095f08` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `apps/desktop/src/lib/season-service.ts` - Season CRUD: createSeason, getSeasonsByDynasty, getSeason, getCurrentSeason, updateSeason
- `apps/desktop/src/lib/game-service.ts` - Game CRUD + recalculateSeasonRecord that counts W/L and conference record from actual games
- `apps/desktop/src/store/season-store.ts` - Zustand store: seasons[], activeSeason (highest year), loading/error, full reload after mutations
- `apps/desktop/src/store/game-store.ts` - Zustand store: games[] sorted by week, loading/error, reload after mutations
- `apps/desktop/src/store/index.ts` - Barrel export for useDynastyStore, useSeasonStore, useGameStore

## Decisions Made

- `recalculateSeasonRecord` is called synchronously after every game write. Season record always reflects actual game data, no manual sync needed.
- Conference record (`confWins`/`confLosses`) counts only `gameType === 'conference'` games. Bowl, playoff, and regular games don't affect conference record.
- `useSeasonStore.activeSeason` is set to the season with the highest year. `getSeasonsByDynasty` returns descending by year, so `seasons[0]` is always the current season.
- `useGameStore.logGame` auto-recalculates season record via the service layer. The UI caller must also trigger `useSeasonStore.loadSeasons` to reflect the updated W/L in React state.
- `useSeasonStore.updateSeason` looks up the existing season's `dynastyId` from the current `seasons` array to reload after mutation — avoids requiring caller to pass dynastyId.

## Deviations from Plan

None — plan executed exactly as written. All types aligned with `@dynasty-os/core-types` on first pass (GameResult 'W'|'L'|'T', gameType 'conference', Season wins/losses/confWins/confLosses fields, Game teamScore/opponentScore/overtime).

## Issues Encountered

- `pnpm exec tsc` failed from repo root (tsc not in root node_modules). Used `apps/desktop/node_modules/.bin/tsc` directly. Full `pnpm run build` via Turbo succeeded without issue.

## Next Phase Readiness

- All dashboard widgets, game entry forms, and season displays can now read and write season/game data
- useSeasonStore and useGameStore are exported from store/index.ts alongside useDynastyStore
- Pattern: UI must call both `useGameStore.logGame` and `useSeasonStore.loadSeasons` after game creation to keep React state current

---
*Phase: 02-core-loop*
*Completed: 2026-02-22*
