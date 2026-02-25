---
phase: 11-qol-wins
plan: 02
subsystem: filter-persistence
tags: [qol, filter-store, navigation, zustand]
dependency_graph:
  requires: [10-04]
  provides: [filter-persistence-roster, filter-persistence-legends, filter-persistence-records, filter-persistence-transfer-portal]
  affects: [RosterPage, LegendsPage, RecordsPage, TransferPortalPage, dynasty-store]
tech_stack:
  added: []
  patterns: [filter-store-aware-state, setter-wrapper-pattern, synchronous-getState-init]
key_files:
  created: []
  modified:
    - apps/desktop/src/store/dynasty-store.ts
    - apps/desktop/src/pages/RosterPage.tsx
    - apps/desktop/src/pages/LegendsPage.tsx
    - apps/desktop/src/pages/RecordsPage.tsx
    - apps/desktop/src/pages/TransferPortalPage.tsx
decisions:
  - Filter persistence uses synchronous getState().getFilters() at component declaration time — safe for in-memory Zustand store
  - Setter wrapper pattern keeps JSX call sites unchanged while adding store sync as side-effect
  - DraftTrackerPage skipped — no display-level filter state (only data-entry form state)
  - TransferPortalPage persists seasonId string; restores Season object by lookup in seasons array on mount
  - LegendsPage uses functional updater wrapper to handle both direct Filter and (prev: Filter) => Filter call signatures
  - clearAll() added to both setActiveDynasty and switchDynasty to prevent stale cross-dynasty filters
metrics:
  duration: 8 min
  completed: 2026-02-25
  tasks: 2
  files: 5
---

# Phase 11 Plan 02: Filter Persistence Across Pages Summary

Wired useFilterStore into all pages with user-visible filter controls so filter selections survive navigation within a session; added clearAll() to dynasty switch to prevent stale cross-dynasty filters.

## What Was Built

### Task 1 — clearAll() in dynasty-store + RosterPage filter persistence
(Completed in prior session commit `48782cd` — dynasty-store.ts and RosterPage.tsx already had changes)

- `dynasty-store.ts`: imported useFilterStore and called `clearAll()` in both `setActiveDynasty` and `switchDynasty`
- `RosterPage.tsx`: replaced plain `useState` with filter-store-aware initialization reading `position` and `status` from `'roster'` page key; setter wrappers write to filter store on every change

### Task 2 — Wire remaining pages (commit `504b04f`)

**LegendsPage.tsx** — PAGE_KEY: `'legends'`
- Single `filter: Filter` object with `position`, `era`, `award` keys
- Init from `useFilterStore.getState().getFilters('legends')` at component declaration
- `setFilter` wrapper uses `setFilterState((prev) => ...)` functional updater pattern to sync all three keys atomically

**RecordsPage.tsx** — PAGE_KEY: `'records'`
- Six filter state variables: `activeTab`, `selectedStatKey`, `selectedSeasonId`, `careerStatKey`, `h2hStartYear`, `h2hEndYear`
- Each gets an Internal state variable + public setter wrapper that syncs to filter store
- Public setters have same names as original — no JSX changes needed

**TransferPortalPage.tsx** — PAGE_KEY: `'transfer-portal'`
- `selectedSeason` (Season | null) persisted as `seasonId` string
- On mount: try restoring from saved seasonId first, then fall back to activeSeason
- `setSelectedSeason` wrapper saves season?.id to filter store

**DraftTrackerPage.tsx** — SKIPPED (no display-level filter state; only data-entry form)

## Architecture Patterns Used

**Filter-store-aware initialization** (synchronous):
```typescript
const PAGE_KEY = 'roster';
const _savedFilters = useFilterStore.getState().getFilters(PAGE_KEY);
const [positionFilter, setPositionFilterState] = useState<string>(
  (_savedFilters['position'] as string) ?? 'All'
);
```

**Setter wrapper pattern**:
```typescript
const setPositionFilter = (val: string) => {
  setPositionFilterState(val);
  useFilterStore.getState().setFilter(PAGE_KEY, 'position', val);
};
```

**Dynasty switch clears all filters**:
```typescript
setActiveDynasty: (dynasty: Dynasty | null) => {
  useFilterStore.getState().clearAll();
  set({ activeDynasty: dynasty });
},
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed pre-existing player-store.ts TS2352 cast errors**
- **Found during:** Task 1 build verification
- **Issue:** `snapshot: existing as Record<string, unknown>` — TypeScript strict mode requires `as unknown as Record<string, unknown>` double cast
- **Fix:** Added `as unknown` intermediate cast on lines 77 and 111 of player-store.ts
- **Files modified:** `apps/desktop/src/store/player-store.ts`
- **Note:** game-store.ts was auto-reverted by linter before needing fix

**2. [Rule 3 - Blocking] Removed `overallRating` from RosterPage CSV export**
- **Found during:** Task 1 build verification
- **Issue:** Pre-existing working tree had `p.overallRating` in CSV export row; `overallRating` exists on PlayerSeason but not on Player
- **Fix:** Removed `overallRating` field from the CSV export row mapping
- **Files modified:** `apps/desktop/src/pages/RosterPage.tsx`

## Self-Check: PASSED

All modified files exist on disk:
- FOUND: apps/desktop/src/pages/LegendsPage.tsx
- FOUND: apps/desktop/src/pages/RecordsPage.tsx
- FOUND: apps/desktop/src/pages/TransferPortalPage.tsx
- FOUND: apps/desktop/src/store/dynasty-store.ts
- FOUND: apps/desktop/src/pages/RosterPage.tsx

Commits verified in git history:
- FOUND: 504b04f feat(11-02): wire filter persistence into LegendsPage, RecordsPage, TransferPortalPage
- FOUND: 48782cd feat(11-04): add CSV export utility and Export CSV buttons on RosterPage and RecordsPage (contains Task 1 dynasty-store + RosterPage changes)
