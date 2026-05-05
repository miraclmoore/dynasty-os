---
phase: 23-madden-sync-upgrade
plan: 01
subsystem: madden-sync
tags: [madden, sidecar, player-stats, dexie-upsert, tauri, typescript]

# Dependency graph
requires:
  - phase: 09-madden-sync
    provides: madden-reader.cjs sidecar, madden-sync-service.ts, commitSyncDiff
  - phase: 21-data-model
    provides: PlayerSeason schema with [playerId+year] compound index
provides:
  - RawPlayerStat interface exported from madden-sync-service.ts
  - PlayerStats extraction in madden-reader.cjs with 4-name fallback chain
  - ExtractResult and SyncDiff carry playerStats: RawPlayerStat[]
  - commitSyncDiff writes canonical stat keys to PlayerSeason.stats for new and existing players
  - [playerId+year] upsert guard prevents duplicate PlayerSeason rows on re-sync
affects:
  - 23-02-PLAN (auto-discover build on same service layer)
  - Records leaderboard (PlayerSeason.stats now has real stat lines)
  - PlayerProfilePage (season history table now shows real stats)
  - Dashboard widgets (Phase 30) that depend on populated PlayerSeason.stats

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Sidecar fallback-chain with 4 table name candidates (PlayerStats, Player Stats, Stats, CareerStats)
    - Index-position match: playerNamesByIndex Map pairs Player rows to PlayerStats rows by row index
    - Sparse Record stat storage: mapRawStatsToRecord only writes non-null, non-zero values
    - [playerId+year] compound-index upsert guard in commitSyncDiff (create if absent, merge if exists)
    - Two-pass stat write: newly-added players in primary loop, already-existing players in second pass

key-files:
  created: []
  modified:
    - apps/desktop/src-tauri/sidecar/madden-reader.cjs
    - apps/desktop/src/lib/madden-sync-service.ts

key-decisions:
  - "playerStats: [] graceful degradation — if no PlayerStats table found in .frs, sync still completes; players saved with overall-only stats; no error surfaced"
  - "Index-position match + name tag: sidecar captures playerNamesByIndex from Player table, tags each stat record with playerName before emitting JSON so service layer can match by name (not fragile index)"
  - "Two-pass stat write in commitSyncDiff: newly-added players handled in primary loop; already-existing players covered in second pass scanning diff.playerStats"
  - "Merge-on-upsert: existing PlayerSeason.stats is spread-merged with new stats so OVR and any prior manually-entered stats are preserved"

patterns-established:
  - "PlayerStats fallback chain: ['PlayerStats', 'Player Stats', 'Stats', 'CareerStats'] — extend if new Madden version uses a different table name"
  - "mapRawStatsToRecord helper for canonical key mapping: pass_yards, rush_yards, rec_yards, pass_td, rush_td, rec_td, sacks, tackles, interceptions, receptions, overall"
  - "findStatsForPlayer: case-insensitive name match for service-layer stat lookup"

requirements-completed: [MSYN-01]

# Metrics
duration: 15min
completed: 2026-05-04
---

# Phase 23 Plan 01: Madden Sync Upgrade — Stats Extraction Summary

**PlayerStats extraction added to sidecar with 4-name fallback chain; RawPlayerStat wired through service layer with [playerId+year] upsert guard in commitSyncDiff writing pass_yards/rush_yards/rec_yards/sacks/tackles and 6 more canonical stat keys to PlayerSeason.stats**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-04T00:00:00Z
- **Completed:** 2026-05-04T00:15:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Sidecar `extract` subcommand now returns `playerStats: RawPlayerStat[]` alongside existing games/players/draftPicks; when no stats table is found in the .frs binary, returns `playerStats: []` and never errors
- `madden-sync-service.ts` exports `RawPlayerStat` interface; `ExtractResult` and `SyncDiff` carry `playerStats`; fallback return includes `playerStats: []`
- `commitSyncDiff` writes 10 canonical stat keys (pass_yards, rush_yards, rec_yards, pass_td, rush_td, rec_td, sacks, tackles, interceptions, receptions) + overall into `PlayerSeason.stats` using `[playerId+year]` compound-index upsert — prevents duplicate PlayerSeason rows on re-sync
- Both newly-added players and already-existing roster players receive stat updates; `pnpm --filter @dynasty-os/desktop build` passes with zero TypeScript errors

## Task Commits

1. **Task 1: Add PlayerStats extraction to sidecar** - `0cbc292` (feat)
2. **Task 2: Wire RawPlayerStat through service layer + upsert PlayerSeason** - `f66eb5f` (feat)

## Files Created/Modified
- `apps/desktop/src-tauri/sidecar/madden-reader.cjs` - Added `playerStats: []` to result object; built `playerNamesByIndex` Map during Player table extraction; added PlayerStats extraction block with 4-name fallback chain and index-position matching
- `apps/desktop/src/lib/madden-sync-service.ts` - Added `db` import, `updatePlayerSeason` import, `RawPlayerStat` interface, extended `ExtractResult`/`SyncDiff`, added `mapRawStatsToRecord` + `findStatsForPlayer` helpers, updated `computeSyncDiff` return, rewrote `commitSyncDiff` player loop with upsert guard and second pass for existing players

## Decisions Made
- Graceful degradation: `playerStats: []` is the result when no stats table matches — sync continues without error and players are saved with overall-only stats
- Index-position matching in sidecar with name tagging: Player row `i` → PlayerStats row `i` via `playerNamesByIndex` Map; name is embedded in each stat record so service layer can match by name after player creation
- Merge-on-upsert: `{ ...(existing.stats ?? {}), ...stats }` preserves any prior OVR or manually-entered stat values when updating an existing PlayerSeason

## Deviations from Plan

None - plan executed exactly as written. All threat model mitigations (T-23-01-01 through T-23-01-05) are implemented as specified: per-record try/catch, `?? null` coalescing, `Number(val)` cast in mapRawStatsToRecord, and `[playerId+year]` upsert guard.

## Issues Encountered
- Workspace packages (core-types, db, sport-configs) needed to be built before the desktop build would succeed — this is standard worktree initialization behavior, not a code issue. Built packages in dependency order and desktop build passed.

## User Setup Required

None - no external service configuration required. Manual verification against a live Madden .frs file is needed to confirm PlayerStats table name candidates match (LOW confidence — see MSYN-01 research). The sidecar logs to stderr which table name succeeded, enabling diagnosis on first test.

## Next Phase Readiness
- Plan 23-02 (auto-discover save file paths) is unblocked; it works on `MaddenSyncPage.tsx` and Tauri capabilities, not the service layer modified here
- Records leaderboard and PlayerProfilePage season history table will show real stat lines after a Madden sync with a .frs file containing a recognized PlayerStats table
- Re-sync idempotency is guaranteed: second sync against the same year merges stats into the existing PlayerSeason row via `[playerId+year]` upsert

## Self-Check: PASSED

- `apps/desktop/src-tauri/sidecar/madden-reader.cjs` — FOUND
- `apps/desktop/src/lib/madden-sync-service.ts` — FOUND
- `.planning/phases/23-madden-sync-upgrade/23-01-SUMMARY.md` — FOUND
- commit `0cbc292` (Task 1) — FOUND
- commit `f66eb5f` (Task 2) — FOUND

---
*Phase: 23-madden-sync-upgrade*
*Completed: 2026-05-04*
