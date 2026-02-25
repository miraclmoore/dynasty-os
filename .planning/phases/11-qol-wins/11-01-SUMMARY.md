---
phase: 11-qol-wins
plan: 01
subsystem: ui
tags: [zustand, sonner, toast, undo, react]

# Dependency graph
requires:
  - phase: 10-infrastructure-foundation
    provides: "useToastStore and useUndoStore scaffolded in Phase 10-04"
provides:
  - "game-store logGame/updateGame/deleteGame emit toasts and push undo snapshots"
  - "player-store addPlayer/updatePlayer/deletePlayer emit toasts and push undo snapshots"
  - "player-season-store add/update/deletePlayerSeason emit toasts"
  - "season-store createSeason/updateSeason emit toasts"
  - "RosterPage delete no longer blocks on window.confirm() — uses toast-with-undo"
affects:
  - "11-02 through 11-06 — undo/toast infrastructure now live for all further QOL plans"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useToastStore.getState() pattern for store-level toast emission (outside React render cycle)"
    - "useUndoStore.getState().pushUndo() before any destructive mutation"
    - "sonner toast.success() with action button for delete + undo flow"
    - "as unknown as Record<string, unknown> double-cast for typed objects to snapshot interface"

key-files:
  created: []
  modified:
    - "apps/desktop/src/store/game-store.ts"
    - "apps/desktop/src/store/player-store.ts"
    - "apps/desktop/src/store/player-season-store.ts"
    - "apps/desktop/src/store/season-store.ts"
    - "apps/desktop/src/pages/RosterPage.tsx"

key-decisions:
  - "sonner toast() imported directly in game-store and player-store for action button pattern — useToastStore.success() has no action param; direct sonner needed for Undo onClick callback"
  - "as unknown as Record<string, unknown> double-cast required — TypeScript strict mode rejects direct cast from typed domain objects without index signatures"

patterns-established:
  - "Store toast pattern: useToastStore.getState().success/error() called after set() in try/catch — success in try after state update, error in catch before throw"
  - "Store undo pattern: snapshot before mutation (games.find/players.find), pushUndo before svcDelete/svcUpdate, toast action button calls undo() then reloads store"

requirements-completed: [QOL-01, QOL-02]

# Metrics
duration: 5min
completed: 2026-02-25
---

# Phase 11 Plan 01: Toast + Undo Wiring Summary

**Toast and undo wired into all 4 Zustand write stores; RosterPage blocking confirm() replaced with non-blocking sonner toast-with-undo button**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-25T05:19:46Z
- **Completed:** 2026-02-25T05:24:16Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- All write operations in game/player/player-season/season stores now emit success/error toasts
- deleteGame and deletePlayer push UndoableOperation snapshots and show sonner action-button toast
- Clicking Undo restores the deleted record via DB-level undo and reloads the Zustand store
- updateGame and updatePlayer push undo snapshots before mutation (recoverable edits)
- RosterPage.handleDelete reduced to one line — window.confirm() eliminated entirely

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire toast notifications into all Zustand store write operations** - `52e840c` (feat)
2. **Task 2: Replace window.confirm() in RosterPage with toast-undo delete pattern** - `b230327` (feat)

**Plan metadata:** see final docs commit

## Files Created/Modified
- `apps/desktop/src/store/game-store.ts` - Added toast + undo to logGame/updateGame/deleteGame
- `apps/desktop/src/store/player-store.ts` - Added toast + undo to addPlayer/updatePlayer/deletePlayer
- `apps/desktop/src/store/player-season-store.ts` - Added toasts to add/update/deletePlayerSeason
- `apps/desktop/src/store/season-store.ts` - Added toasts to createSeason/updateSeason
- `apps/desktop/src/pages/RosterPage.tsx` - Replaced window.confirm() with direct deletePlayer call

## Decisions Made
- Imported `toast` from 'sonner' directly in game-store.ts and player-store.ts for the Undo action button pattern — useToastStore.success() signature doesn't support an `action` option; direct sonner API needed for the onClick callback
- Used `as unknown as Record<string, unknown>` double-cast for Game/Player typed objects to match UndoableOperation.snapshot interface — TypeScript strict mode rejects single `as Record<string, unknown>` when the source type has no index signature

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Double-cast required for UndoableOperation.snapshot**
- **Found during:** Task 1 (build verification)
- **Issue:** Plan specified `existing as Record<string, unknown>` but TypeScript strict mode rejects direct cast from typed objects (Game, Player) without index signatures
- **Fix:** Changed all snapshot casts to `existing as unknown as Record<string, unknown>` in game-store.ts and player-store.ts
- **Files modified:** `apps/desktop/src/store/game-store.ts`, `apps/desktop/src/store/player-store.ts`
- **Verification:** Build passes cleanly after fix
- **Committed in:** `52e840c` (part of Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - type cast bug)
**Impact on plan:** Necessary TypeScript correction. No scope creep.

## Issues Encountered
- Pre-existing build errors existed in the repo from prior uncommitted phase work (App.tsx, RecordsPage.tsx from phases 11-03/11-05). These were out-of-scope and logged to deferred-items.md. After rebuilding core-types package, our specific store files built clean with zero errors.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Toast and undo infrastructure now live end-to-end — QOL-01 and QOL-02 requirements satisfied
- Plan 02 (filter persistence) can now use useFilterStore which was scaffolded in 10-04
- Undo history persists in memory (up to 20 ops) for full session

## Self-Check: PASSED

- FOUND: .planning/phases/11-qol-wins/11-01-SUMMARY.md
- FOUND: apps/desktop/src/store/game-store.ts (with toast + undo calls)
- FOUND: apps/desktop/src/store/player-store.ts (with toast + undo calls)
- FOUND: apps/desktop/src/store/player-season-store.ts (with toast calls)
- FOUND: apps/desktop/src/store/season-store.ts (with toast calls)
- FOUND: apps/desktop/src/pages/RosterPage.tsx (window.confirm removed)
- FOUND: commit 52e840c (Task 1)
- FOUND: commit b230327 (Task 2)

---
*Phase: 11-qol-wins*
*Completed: 2026-02-25*
