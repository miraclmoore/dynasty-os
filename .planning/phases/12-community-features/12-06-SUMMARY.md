---
phase: 12-community-features
plan: "06"
subsystem: ui
tags: [tauri, auto-export, rivalry, momentum, localStorage, export-import]

# Dependency graph
requires:
  - phase: 12-community-features
    provides: rivalry-service.ts, RivalryTrackerPage, export-import.ts baseline, dynasty-store
  - phase: 10-infrastructure-foundation
    provides: Dexie v6 schema with coachingStaff/nilEntries/futureGames/playerLinks tables
provides:
  - auto-export-service.ts with fire-and-forget background JSON export to appDataDir
  - export-import.ts v2 including all 4 Phase 12 entity tables in export/import
  - rivalry-service calculateSeriesMomentum pure function and key moments localStorage helpers
  - RivalryTrackerPage expanded with momentum bar and key moments log per rival
  - DashboardPage auto-export toggle persisted in localStorage per dynasty
affects: [13-ai-intelligence-layer, export workflows, rivalry features]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "fire-and-forget auto-export via IIFE inside async function — silent failure, never blocks UI"
    - "version-branched DynastyExport interface: version 1 | 2 union; v1 imports still valid"
    - "localStorage keyed moments pattern: dynasty-os-moments-{rivalId} — no Dexie version bump"
    - "result string cast to 'W'|'L'|'T' union at call site when source type lacks literal narrowing"

key-files:
  created:
    - apps/desktop/src/lib/auto-export-service.ts
  modified:
    - apps/desktop/src/lib/export-import.ts
    - apps/desktop/src/lib/rivalry-service.ts
    - apps/desktop/src/pages/RivalryTrackerPage.tsx
    - apps/desktop/src/store/dynasty-store.ts
    - apps/desktop/src-tauri/capabilities/default.json
    - apps/desktop/src/pages/DashboardPage.tsx

key-decisions:
  - "auto-export toggle in DashboardPage sidebar (above DynastySwitcher) — lightweight, always visible without navigation"
  - "fs:scope-app-data added alongside fs:allow-mkdir — both needed for appDataDir write access in Tauri"
  - "DynastyExport version field accepts 1|2 union — backward compatibility for v1 imports preserved in validateExport"
  - "calculateSeriesMomentum cast guard: HeadToHeadRecord.games.result typed as string; cast to union at call site instead of changing records-service type"
  - "Key moments form uses inline state per rival via momentForms Record — no modal needed, same pattern as inline edit"

patterns-established:
  - "auto-export-service.ts fire-and-forget pattern: outer async fn returns void immediately; IIFE does real work, catches silently"
  - "localStorage key moment pattern: dynasty-os-moments-{rivalId} sorted descending by year on insert"

requirements-completed: [COMM-08, COMM-10]

# Metrics
duration: 9min
completed: 2026-02-25
---

# Phase 12 Plan 06: Auto-Export + Rivalry Dashboard Expansion Summary

**Silent background JSON export to appDataDir on every dynasty save, plus rivalry momentum scoring (-1 to +1) and persistent key moments log per rival**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-02-25T06:40:15Z
- **Completed:** 2026-02-25T06:49:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Created `auto-export-service.ts` with `isAutoExportEnabled`, `setAutoExportEnabled`, and `autoExportIfEnabled` (fire-and-forget IIFE; never blocks UI)
- Updated `export-import.ts` to version 2, exporting all 4 Phase 12 tables (coachingStaff, nilEntries, futureGames, playerLinks) with backward-compatible import for v1 files
- Wired `autoExportIfEnabled` into `dynasty-store` after `createDynasty` and `importDynastyFromFile`; added `fs:allow-mkdir` + `fs:scope-app-data` to Tauri capabilities
- Added auto-export toggle to DashboardPage sidebar; state initialized from localStorage and synced on dynasty switch
- Added `calculateSeriesMomentum` pure function and `getKeyMoments`/`addKeyMoment`/`deleteKeyMoment` localStorage helpers to `rivalry-service.ts`
- Expanded `RivalryTrackerPage` with a momentum progress bar (green/red/gray, -1..+1 score + label) and inline key moments log with add/delete form per rival

## Task Commits

Each task was committed atomically:

1. **Task 1: Auto-export service + export-import v2 + Tauri capability** - `ac81be9` (feat)
2. **Task 2: Rivalry Dashboard expansion — momentum + key moments** - `0ce6a6e` (feat)

## Files Created/Modified
- `apps/desktop/src/lib/auto-export-service.ts` - New: isAutoExportEnabled, setAutoExportEnabled, autoExportIfEnabled (fire-and-forget)
- `apps/desktop/src/lib/export-import.ts` - Version bumped to 2; includes coachingStaff/nilEntries/futureGames/playerLinks in export and import (both direct and remap paths)
- `apps/desktop/src/lib/rivalry-service.ts` - Added calculateSeriesMomentum, KeyMoment interface, getKeyMoments, addKeyMoment, deleteKeyMoment
- `apps/desktop/src/pages/RivalryTrackerPage.tsx` - Expanded with momentum bar, key moments log, and add/delete form per rival
- `apps/desktop/src/store/dynasty-store.ts` - Import autoExportIfEnabled; fire-and-forget call after createDynasty and importDynastyFromFile
- `apps/desktop/src-tauri/capabilities/default.json` - Added fs:allow-mkdir and fs:scope-app-data permissions
- `apps/desktop/src/pages/DashboardPage.tsx` - Added auto-export toggle in sidebar; state synced from localStorage on dynasty switch

## Decisions Made
- `fs:scope-app-data` added alongside `fs:allow-mkdir` — Tauri requires both the command permission and a scope permission to write to appDataDir
- `DynastyExport.version` typed as `1 | 2` union and `validateExport` accepts both — preserves backward compatibility for existing v1 export files
- `HeadToHeadRecord.games.result` typed as `string` (not union) in records-service; cast to `'W' | 'L' | 'T'` at the `calculateSeriesMomentum` call site rather than modifying the source type
- Auto-export toggle placed in sidebar above DynastySwitcher — visible without navigation, minimal real estate impact

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript type error: HeadToHeadRecord.games.result is string, not 'W'|'L'|'T'**
- **Found during:** Task 2 (RivalryTrackerPage expansion — build verification)
- **Issue:** `calculateSeriesMomentum` expects `result: 'W' | 'L' | 'T'` but `record?.games` from records-service has `result: string`, causing TS2345 error
- **Fix:** Cast the `allGames` array to `Array<{ result: 'W' | 'L' | 'T'; week?: number }>` at the call site; records-service only ever stores those three values
- **Files modified:** apps/desktop/src/pages/RivalryTrackerPage.tsx
- **Verification:** Build exits 0 after fix
- **Committed in:** `0ce6a6e` (Task 2 commit)

**2. [Rule 2 - Missing Critical] Added fs:scope-app-data permission**
- **Found during:** Task 1 (Tauri capability update)
- **Issue:** Plan specified only `fs:allow-mkdir` but Tauri also requires a scope permission (`fs:scope-app-data`) to write to the app data directory
- **Fix:** Added `"fs:scope-app-data"` to default.json alongside `"fs:allow-mkdir"`
- **Files modified:** apps/desktop/src-tauri/capabilities/default.json
- **Verification:** Build exits 0
- **Committed in:** `ac81be9` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 bug fix, 1 missing critical permission)
**Impact on plan:** Both required for correct runtime behavior. No scope creep.

## Issues Encountered
None — both deviations resolved inline during task execution.

## Next Phase Readiness
- Auto-export service is wired; COMM-08 complete
- Rivalry dashboard expanded with momentum + key moments; COMM-10 complete
- Phase 12 Plan 07 (final plan) is ready to execute

---
## Self-Check: PASSED

- auto-export-service.ts: FOUND
- export-import.ts: FOUND
- rivalry-service.ts: FOUND
- RivalryTrackerPage.tsx: FOUND
- 12-06-SUMMARY.md: FOUND
- Commit ac81be9: FOUND
- Commit 0ce6a6e: FOUND

*Phase: 12-community-features*
*Completed: 2026-02-25*
