---
phase: 02-core-loop
plan: "05"
subsystem: ui, database
tags: [dexie, react, typescript, game-tracking, ranking]

# Dependency graph
requires:
  - phase: 02-core-loop
    provides: Game type, logGame store action, WeeklySnapshot component, LogGameModal
provides:
  - teamRanking optional field on Game interface
  - DB migration from v1 to v2 (schema unchanged, version bump only)
  - Your Ranking (optional) select dropdown in LogGameModal (1-25, no uniqueness filter)
  - WeeklySnapshot per-game ranking derivation with week-over-week delta display
affects: [03-history, phase-3, game-log, weekly-snapshot, ranking-movement]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-game optional field pattern: optional fields added to Game type are purely additive; old records simply lack the field"
    - "Dexie multi-version migration: version(1).stores(SCHEMA) + version(N).stores(SCHEMA) registers upgrade path without store changes"
    - "Ranking delta derivation: sort games by week desc, take first two with field set, compute delta as prev - current (positive = improved)"

key-files:
  created: []
  modified:
    - packages/core-types/src/game.ts
    - packages/db/src/schema.ts
    - packages/db/src/dynasty-db.ts
    - apps/desktop/src/components/LogGameModal.tsx
    - apps/desktop/src/components/WeeklySnapshot.tsx

key-decisions:
  - "teamRanking not filtered for uniqueness — a team's own ranking can repeat across weeks (unlike opponentRanking)"
  - "WeeklySnapshot falls back to season.finalRanking when no per-game teamRanking values exist"
  - "DB_VERSION bumped to 2 with identical SCHEMA to signal Dexie migration without altering indexes"

patterns-established:
  - "Ranking delta display: green (+N) for improvement, red (-N) for decline, nothing shown for zero delta"
  - "displayRanking precedence: per-game data beats season.finalRanking (more granular wins)"

# Metrics
duration: 2min
completed: 2026-02-22
---

# Phase 2 Plan 05: teamRanking Gap Closure Summary

**Per-game teamRanking field with week-over-week delta display in WeeklySnapshot, closing SEAS-05 ranking movement gap**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-22T03:23:15Z
- **Completed:** 2026-02-22T03:25:41Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added `teamRanking?: number` to Game interface and wired it through LogGameModal with a 1-25 select dropdown
- Bumped DB_VERSION to 2 with Dexie migration registration (version 1 + version 2 both registered)
- WeeklySnapshot now derives current ranking from per-game data, computes week-over-week delta, and shows colored movement indicators

## Task Commits

Each task was committed atomically:

1. **Task 1: Add teamRanking to Game type, bump DB version, add select to LogGameModal** - `f0e9045` (feat)
2. **Task 2: Display ranking and movement delta in WeeklySnapshot** - `0ce040c` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `packages/core-types/src/game.ts` - Added `teamRanking?: number` field after `opponentRanking`
- `packages/db/src/schema.ts` - Bumped `DB_VERSION` from 1 to 2
- `packages/db/src/dynasty-db.ts` - Registered `version(1).stores(SCHEMA)` + `version(DB_VERSION).stores(SCHEMA)` migration
- `apps/desktop/src/components/LogGameModal.tsx` - Added `teamRanking` state, "Your Ranking (optional)" select row (below Opp. Ranking, above Notes), pass to `logGame` on submit
- `apps/desktop/src/components/WeeklySnapshot.tsx` - Derive `currentRanking`/`previousRanking`/`rankingDelta` from games; display ranking with colored delta; fallback to `season.finalRanking`

## Decisions Made

- teamRanking is not filtered for uniqueness in the dropdown — a team can be ranked #12 multiple weeks in a row, unlike opponentRanking which enforces uniqueness per season
- displayRanking uses per-game data first, falls back to `season.finalRanking` to preserve backward compatibility
- DB_VERSION bumped to 2 with identical SCHEMA content; Dexie needs both version registrations so existing v1 databases upgrade cleanly without store changes

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 3 (History) can now read `teamRanking` from games to build ranking trend charts or history tables
- Weekly snapshot fully satisfies SEAS-05: coaches see current ranking and how many spots they moved week to week
- All existing dynasties with no `teamRanking` data continue to work — field is optional and fallback is preserved

---
*Phase: 02-core-loop*
*Completed: 2026-02-22*
