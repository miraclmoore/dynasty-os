---
phase: 03-player-tracking-and-records
plan: "02"
subsystem: ui
tags: [dexie, zustand, react, career-stats, player-profile, sport-config]

# Dependency graph
requires:
  - phase: 03-01
    provides: player CRUD service, player store, navigation store with goToPlayerProfile, roster page
provides:
  - PlayerSeason CRUD service (createPlayerSeason, getPlayerSeasonsByPlayer, getPlayerSeasonsByDynasty, getPlayerSeasonsBySeason, updatePlayerSeason, deletePlayerSeason)
  - Career stats engine (computeCareerStats, computeCareerAwards, computeSeasonCount)
  - Zustand player-season store with reload-after-mutation pattern
  - LogPlayerSeasonModal for sport-config-driven stat entry
  - PlayerProfilePage with full career arc (bio, career totals, season history, departure flow)
  - RosterPage with profile navigation and quick Log Season action
affects: [04-legacy-cards, 05-leaderboards, 06-snapshot-engine]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sparse stats Record: only store non-zero stat values in PlayerSeason.stats (keeps Record lean)"
    - "Position-driven stat columns: season table shows position-relevant columns from getPositionStatKeys()"
    - "Weighted average for decimal stats: passerRating/puntAverage/sacks averaged by gamesPlayed when available"

key-files:
  created:
    - apps/desktop/src/lib/player-season-service.ts
    - apps/desktop/src/lib/career-stats.ts
    - apps/desktop/src/store/player-season-store.ts
    - apps/desktop/src/components/LogPlayerSeasonModal.tsx
    - apps/desktop/src/pages/PlayerProfilePage.tsx
  modified:
    - apps/desktop/src/store/index.ts
    - apps/desktop/src/pages/RosterPage.tsx
    - apps/desktop/src/App.tsx

key-decisions:
  - "Sparse stats storage: only include non-zero stat entries in the PlayerSeason.stats Record — modal only writes keys where user entered a non-zero value"
  - "Position-driven season table columns: PlayerProfilePage uses getPositionStatKeys() to show only relevant columns for the player's position"
  - "Weighted average by gamesPlayed for decimal stats (passerRating, puntAverage, sacks) — falls back to simple average when gamesPlayed=0"
  - "Departure inline form on PlayerProfilePage: no separate modal, just inline expand on same page"
  - "Roster row click navigates to profile; edit and Log Season remain as inline row actions (no UX regression)"

patterns-established:
  - "Sparse stats Record: store only keys with non-zero values — computeCareerStats handles missing keys as 0"
  - "Position stat display map: POSITION_STAT_KEYS and DEFENSIVE_POSITIONS constants drive which columns appear in season history table"

# Metrics
duration: 4min
completed: 2026-02-22
---

# Phase 3 Plan 02: Season Stat Logging and Player Profile Summary

**PlayerSeason CRUD + career stat aggregation engine + LogPlayerSeasonModal + full PlayerProfilePage with departure recording — roster becomes a living career record**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-22T03:59:58Z
- **Completed:** 2026-02-22T04:04:10Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- PlayerSeason CRUD service following game-service.ts pattern with 6 exported functions
- Career stats engine: sums integer stats, weighted-averages decimal stats (passerRating, puntAverage, sacks) by gamesPlayed, deduplicates awards
- Zustand player-season store with reload-after-mutation pattern matching all other stores
- LogPlayerSeasonModal with sport-config-driven stat groups, sparse storage (no zero values stored), awards parsing, overall rating, notes
- PlayerProfilePage: bio card, career totals grouped by stat category, season-by-season table with position-relevant columns, departure recording form, Edit Player and Log Season actions
- RosterPage: row click now navigates to player profile; per-row Edit and Log Season quick actions remain accessible
- App.tsx: wired real PlayerProfilePage replacing placeholder

## Task Commits

Each task was committed atomically:

1. **Task 1: PlayerSeason service, career stats engine, and player-season store** - `4267f1f` (feat)
2. **Task 2: LogPlayerSeasonModal, PlayerProfilePage, departure recording, and roster nav** - `ba8625a` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `apps/desktop/src/lib/player-season-service.ts` — 6-function CRUD service for PlayerSeason (follows game-service.ts pattern)
- `apps/desktop/src/lib/career-stats.ts` — computeCareerStats, computeCareerAwards, computeSeasonCount (pure computation, no DB)
- `apps/desktop/src/store/player-season-store.ts` — Zustand store with reload-after-mutation
- `apps/desktop/src/store/index.ts` — added usePlayerSeasonStore export
- `apps/desktop/src/components/LogPlayerSeasonModal.tsx` — sport-config-driven stat entry modal, sparse storage
- `apps/desktop/src/pages/PlayerProfilePage.tsx` — full player profile with career arc and departure flow
- `apps/desktop/src/pages/RosterPage.tsx` — updated for profile navigation + Log Season quick action
- `apps/desktop/src/App.tsx` — wired PlayerProfilePage case

## Decisions Made

- **Sparse stats storage:** Only non-zero stat keys written to PlayerSeason.stats. The computeCareerStats function treats missing keys as 0, so there's no information loss while keeping records lean.
- **Weighted average for decimal stats:** passerRating, puntAverage, and sacks are averaged (weighted by gamesPlayed when available) rather than summed, since summing these makes no semantic sense across seasons.
- **Position-driven season table:** Rather than showing all stat categories in the season history table, getPositionStatKeys() maps each position to the most relevant stats — QBs see passing/rushing stats, LBs see defensive stats, etc.
- **Departure inline form:** Record Departure expands inline on the PlayerProfilePage rather than spawning a separate modal, keeping the UX minimal.
- **Roster quick actions:** Row click navigates to profile; Edit and Log Season remain as separate inline buttons so those actions are accessible without entering the full profile flow.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- PlayerSeason data layer complete; career stats engine ready for Legacy Cards (Phase 4) and Leaderboards (Phase 5)
- Navigation from Roster to Profile and back is working
- Departure flow writes status/departureYear/departureReason to player record — Roster "departed" filter already works
- Season table and career totals adapt by position — stat display patterns established for Phase 4/5 to reuse
- Next: 03-03 (Season Awards and Team Records) or 03-04 depending on phase plan order

---
*Phase: 03-player-tracking-and-records*
*Completed: 2026-02-22*
