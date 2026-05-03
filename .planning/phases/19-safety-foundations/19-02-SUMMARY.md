---
phase: 19-safety-foundations
plan: "02"
subsystem: desktop-app
tags: [dependency-hygiene, performance, dexie, leaderboard, n+1-fix]
dependency_graph:
  requires: []
  provides:
    - "apps/desktop/package.json without zundo dependency"
    - "records-service.ts with bulk-query leaderboard (no per-iteration DB calls)"
  affects:
    - "apps/desktop/src/lib/records-service.ts (leaderboard functions)"
tech_stack:
  added: []
  patterns:
    - "bulkGet + Map<string, Player> pattern for player lookups in leaderboard loops"
    - "Set deduplication of playerIds before bulkGet"
key_files:
  created: []
  modified:
    - apps/desktop/package.json
    - pnpm-lock.yaml
    - apps/desktop/src/lib/records-service.ts
decisions:
  - "Reformatted [...new Set( dedupe expression to single line to match plan acceptance criteria grep pattern"
  - "Built workspace packages (core-types, db, sport-configs, ui-components) in worktree before tsc --noEmit — worktree had no pre-built dist/ directories"
metrics:
  duration: "8m 38s"
  completed: "2026-05-03"
  tasks_completed: 2
  files_modified: 3
---

# Phase 19 Plan 02: Remove zundo + Fix N+1 Leaderboard Queries Summary

**One-liner:** Removed unused zundo 2.3.0 dep and replaced per-player `db.players.get()` loops in leaderboard functions with single `db.players.bulkGet()` + `Map<string, Player>` lookups.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Remove zundo dependency (SAFE-03) | 94da0be | apps/desktop/package.json, pnpm-lock.yaml |
| 2 | Replace N+1 db.players.get with bulkGet+Map (SAFE-04) | ad7e898 | apps/desktop/src/lib/records-service.ts |

## Verification Results

### Task 1: SAFE-03 (zundo removal)

| Check | Expected | Actual | Pass |
|-------|----------|--------|------|
| `grep -c "zundo" apps/desktop/package.json` | 0 | 0 | Yes |
| `grep -c "^  zundo:" pnpm-lock.yaml` | 0 | 0 | Yes |
| `grep -rn "zundo" apps/desktop/src/` | (empty) | (empty) | Yes |
| `pnpm --filter @dynasty-os/desktop exec tsc --noEmit` | exit 0 | exit 0 | Yes |
| `pnpm --filter @dynasty-os/desktop run build` | exit 0 | exit 0 | Yes |

### Task 2: SAFE-04 (N+1 fix)

| Check | Expected | Actual | Pass |
|-------|----------|--------|------|
| `grep -c "db.players.bulkGet" records-service.ts` | 2 | 2 | Yes |
| `grep -c "db.players.get(" records-service.ts` | 0 | 0 | Yes |
| `grep -c "import type { Player, Season }"` | 1 | 1 | Yes |
| `grep -c "new Map<string, Player>"` | 2 | 2 | Yes |
| `grep -c "playerMap.get("` | 2 | 2 | Yes |
| `grep -c "Array.from(byPlayer.keys())"` | 1 | 1 | Yes |
| `grep -c "[...new Set("` | 1 | 1 | Yes |
| `pnpm --filter @dynasty-os/desktop exec tsc --noEmit` | exit 0 | exit 0 | Yes |
| `pnpm --filter @dynasty-os/desktop run build` | exit 0 | exit 0 | Yes |

## Implementation Details

### SAFE-03: zundo Removal

- Command used: `pnpm --filter @dynasty-os/desktop remove zundo` from workspace root
- Required `pnpm install --prefer-offline` first to populate node_modules from cache (worktree had no node_modules; network was unavailable for turbo download)
- pnpm-lock.yaml updated atomically by the remove command

### SAFE-04: Leaderboard N+1 Fix

**getSingleSeasonLeaders:** Before iterating playerSeasons to build entries, the function now:
1. Filters playerSeasons to those with non-zero stat values
2. Deduplicates playerIds via `[...new Set(...)]`
3. Issues a single `db.players.bulkGet(candidatePlayerIds)`
4. Builds `Map<string, Player>` for O(1) lookup
5. Iterates playerSeasons using `playerMap.get(ps.playerId)` — zero additional DB calls

**getCareerLeaders:** After grouping playerSeasons into `byPlayer: Map<string, ...>`:
1. Collects `Array.from(byPlayer.keys())` in one pass
2. Issues a single `db.players.bulkGet(allPlayerIds)`
3. Builds `Map<string, Player>` for O(1) lookup
4. Replaces `await db.players.get(playerId)` in the loop with `playerMap.get(playerId)`

**getHeadToHeadRecords:** Unchanged — already used bulk-fetch + Map pattern.

## Public Surface Verification

```
grep -A1 "^export async function" apps/desktop/src/lib/records-service.ts
export async function getSingleSeasonLeaders(
  dynastyId: string,
export async function getCareerLeaders(
  dynastyId: string,
export async function getHeadToHeadRecords(
  dynastyId: string,
```

Function signatures are byte-identical to pre-edit. LeaderboardEntry and HeadToHeadRecord interfaces are unchanged.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Built workspace packages before tsc --noEmit**
- **Found during:** Task 1 verification
- **Issue:** Workspace packages (core-types, db, sport-configs, ui-components) had no `dist/` directories in the worktree — pnpm install only links symlinks, doesn't build. tsc --noEmit reported 200+ "Cannot find module '@dynasty-os/core-types'" errors.
- **Fix:** Built each workspace package with `pnpm build` in order: core-types → sport-configs → db → ui-components
- **Files modified:** packages/core-types/dist/, packages/db/dist/, packages/sport-configs/dist/, packages/ui-components/dist/ (build artifacts, not committed)
- **Commit:** n/a (build artifacts are in .gitignore)

**2. [Rule 1 - Minor] Reformatted candidatePlayerIds dedupe expression**
- **Found during:** Task 2 verification
- **Issue:** Initial implementation spread the `[...new Set(` across two lines, so the plan's grep check `grep -c "[...new Set(" file` returned 0 instead of 1
- **Fix:** Reformatted to `const candidatePlayerIds = [...new Set(` on a single line
- **Files modified:** apps/desktop/src/lib/records-service.ts
- **Commit:** ad7e898

## Known Stubs

None. Both edits are mechanical refactors with no stub patterns introduced.

## Threat Flags

None. No new network endpoints, auth paths, or trust boundary changes introduced.

## Self-Check: PASSED

- apps/desktop/package.json: exists, zundo removed
- pnpm-lock.yaml: exists, no zundo entry
- apps/desktop/src/lib/records-service.ts: exists, bulkGet x2, no db.players.get()
- Commit 94da0be: verified in git log
- Commit ad7e898: verified in git log
