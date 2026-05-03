---
phase: 05-cfb-features
plan: 02
subsystem: ui
tags: [zustand, dexie, react, transfer-portal, cfb, typescript]

# Dependency graph
requires:
  - phase: 05-01
    provides: DB schema v3 with transferPortalEntries table, TransferPortalEntry core type, navigation-store with transfer-portal page

provides:
  - Transfer portal CRUD service (create/query by season/query by dynasty/delete)
  - calculateNetImpact pure function: arrivalStars - (departureCount * 2.5) with label
  - useTransferPortalStore Zustand store with loadEntries/addEntry/removeEntry
  - TransferPortalPage War Room UI with season selector, net impact banner, side-by-side arrivals/departures
  - App.tsx routing for transfer-portal page
  - CFB-only sport guard on TransferPortalPage

affects:
  - 05-03 (draft tracker — follows same CFB-guard + service + store + page pattern)
  - 05-04 (prestige tracker — same pattern)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Transfer portal service follows player-service pattern (db.table.where().equals().toArray(), generateId)
    - calculateNetImpact pure function (no side effects, no db calls) for testable business logic
    - Zustand store: loadEntries after every mutation (same as recruiting-store pattern)
    - CFB-only guard: activeDynasty.sport !== 'cfb' at top of CFB-specific pages
    - Season selector in header: useSeasonStore.seasons dropdown, selectedSeason local state drives loadEntries

key-files:
  created:
    - apps/desktop/src/lib/transfer-portal-service.ts
    - apps/desktop/src/store/transfer-portal-store.ts
    - apps/desktop/src/pages/TransferPortalPage.tsx
  modified:
    - apps/desktop/src/store/index.ts
    - apps/desktop/src/App.tsx

key-decisions:
  - "calculateNetImpact exported from service not store — pure function decoupled from Zustand"
  - "NetImpactResult interface exported for type-safe consumption in TransferPortalPage"
  - "Season selector in header: local selectedSeason state drives loadEntries, defaulting to activeSeason"
  - "Arrivals form: position is select (bounded POSITIONS list), stars is 1-5 select, originSchool is free text"
  - "Net impact score displayed as +/- prefix with green/red/gray color coding"

patterns-established:
  - "calculateNetImpact pattern: pure fn over entries array, no async, returns structured result"
  - "War Room two-column layout: lg:grid-cols-2 with stacked mobile fallback"
  - "Portal entry rows: name + detail line (position · from/to school) + star display + X delete"

# Metrics
duration: 2min
completed: 2026-02-22
---

# Phase 5 Plan 02: Transfer Portal War Room Summary

**Dexie-backed transfer portal CRUD service with calculateNetImpact (arrivalStars - departureCount*2.5), Zustand store, and War Room page showing arrivals/departures side-by-side with net impact banner and season selector**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-22T05:29:10Z
- **Completed:** 2026-02-22T05:31:44Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Full transfer portal service with CRUD using Dexie (same pattern as player-service) and `calculateNetImpact` pure function
- Zustand store wrapping service with `loadEntries/addEntry/removeEntry` — reloads after every mutation
- TransferPortalPage War Room: season selector, large net impact score (color-coded green/red), arrivals column with add form, departures column with add form, per-entry delete
- CFB-only guard (`sport !== 'cfb'`) prevents Madden dynasties from accessing the feature
- App.tsx `case 'transfer-portal'` routes to TransferPortalPage

## Task Commits

Each task was committed atomically:

1. **Task 1: Transfer portal service and store** - `2f0fd59` (feat)
2. **Task 2: Transfer Portal War Room page and App.tsx routing** - `a89cff9` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `apps/desktop/src/lib/transfer-portal-service.ts` - CRUD functions + calculateNetImpact pure function
- `apps/desktop/src/store/transfer-portal-store.ts` - Zustand store with load/add/remove actions
- `apps/desktop/src/store/index.ts` - Added useTransferPortalStore export to barrel
- `apps/desktop/src/pages/TransferPortalPage.tsx` - War Room page with CFB guard, season selector, net impact banner, arrival/departure forms and tables
- `apps/desktop/src/App.tsx` - Added transfer-portal case and TransferPortalPage import

## Decisions Made

- `calculateNetImpact` exported from service (not store) — pure function keeps business logic decoupled from Zustand; easier to test in isolation
- `NetImpactResult` interface exported alongside function for type safety in consumers
- `selectedSeason` managed as local state in TransferPortalPage rather than store state — portal entries are inherently season-scoped and the season picker is UI concern only
- Arrivals form uses POSITIONS select (bounded list, matches RecruitingPage pattern) and 1-5 stars select
- Net impact score color: green for positive, red for negative, gray for zero — uses `netImpactColor` helper

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Transfer portal War Room fully operational; CFB guard in place
- Pattern for CFB-only page (service + store + page + App.tsx case) is now established for 05-03 (draft tracker) and 05-04 (prestige tracker)
- No blockers; 05-03 can begin immediately

---
*Phase: 05-cfb-features*
*Completed: 2026-02-22*
