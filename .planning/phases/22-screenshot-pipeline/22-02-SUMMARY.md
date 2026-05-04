---
phase: 22
plan: "02"
subsystem: screenshot-pipeline
tags: [player-stats, fuzzy-match, player-season, save, combobox]
dependency_graph:
  requires: [22-01]
  provides: [player-stats-save]
  affects: [ScreenshotIngestionPage, player-season-service]
tech_stack:
  added: []
  patterns:
    - normalizeStatKey with STAT_KEY_MAP for raw-to-canonical stat key conversion
    - Combobox dropdown with onMouseDown/onBlur 150ms race guard
    - upsert pattern: filter().first() then update/create for PlayerSeason merge
key_files:
  modified:
    - apps/desktop/src/pages/ScreenshotIngestionPage.tsx
decisions:
  - normalizeStatKey falls back to lowercase+underscore for unmapped keys — future stat labels work without STAT_KEY_MAP updates
  - Skip NaN and 0 values from save — sparse stats Record pattern (existing decision)
  - upsert merges incoming stats into existing.stats (existing keys preserved) — prevents duplicate PlayerSeason per player+season
  - 150ms onBlur delay before closing dropdown — ensures onMouseDown on list item fires before blur dismisses the list
  - goToRoster removed from destructure — no longer needed after replacing "Go to Roster" dead end
metrics:
  duration: "~2 min"
  completed: "2026-05-04"
  tasks_completed: 2
  files_modified: 1
---

# Phase 22 Plan 02: PIPE-01 — Player Stats Save Summary

**One-liner:** Fuzzy-match combobox + `normalizeStatKey` + upsert `PlayerSeason` from parsed screenshot stats, replacing the "Go to Roster" dead end.

## What Was Built

The `ScreenshotIngestionPage` player-stats confirmation form now:

1. Loads the active dynasty's roster via `usePlayerStore` on mount
2. Auto-matches each parsed player name against the roster using `findBestPlayerMatch` (threshold 0.4) and pre-fills a combobox per row
3. Shows a controlled combobox per player card — typing filters the dropdown list; selecting locks the row (green border + "Matched" badge)
4. Normalizes raw screenshot stat labels (e.g. `"YDS"` → `"passingYards"`) via `STAT_KEY_MAP` / `normalizeStatKey()` before write
5. Saves via `handleSaveStats`: for each matched row, upserts a `PlayerSeason` (merging into existing if one exists for that player+season), then navigates to the dashboard
6. "Save Stats" button is disabled until at least one row has a matched player

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | normalizeStatKey, imports, state, handleSaveStats | 4f6731c |
| 2 | Replace renderPlayerStatsForm() with combobox UI | 4f6731c |

(Tasks 1 and 2 applied to the same file in one atomic commit.)

## Deviations from Plan

**1. [Rule 1 - Bug] Removed unused `goToRoster` from destructure**
- **Found during:** Task 2 — after replacing the "Go to Roster" button, `goToRoster` became an unused variable that would cause a TypeScript lint warning
- **Fix:** Removed `goToRoster` from the `useNavigationStore()` destructure
- **Files modified:** `apps/desktop/src/pages/ScreenshotIngestionPage.tsx`
- **Commit:** 4f6731c

## Known Stubs

None — all data paths are wired to live IndexedDB writes.

## Threat Flags

None — no new network endpoints, auth paths, or trust boundary changes introduced.

## Self-Check: PASSED

- [x] `apps/desktop/src/pages/ScreenshotIngestionPage.tsx` exists and modified
- [x] Commit `4f6731c` exists in git log
- [x] `pnpm --filter @dynasty-os/desktop exec tsc --noEmit` exits 0
