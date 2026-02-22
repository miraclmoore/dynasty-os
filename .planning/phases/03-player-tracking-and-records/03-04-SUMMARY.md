---
phase: 03-player-tracking-and-records
plan: "04"
subsystem: ui
tags: [dexie, react, zustand, typescript, leaderboards, records, head-to-head]

# Dependency graph
requires:
  - phase: 03-02
    provides: player-season-service and career-stats computation patterns
  - phase: 03-03
    provides: navigation-store with goToLegends, DashboardPage Actions panel

provides:
  - Records service with getSingleSeasonLeaders, getCareerLeaders, getHeadToHeadRecords
  - RecordsLeaderboard component with gold/silver/bronze top-3 styling
  - HeadToHeadRecords component with expandable rows and streak/win% display
  - RecordsPage with three tabs and stat/era filters
  - Dashboard "Records & Leaderboards" entry point

affects: [future leaderboard enhancements, phase-08-ingestion (auto-refresh records)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Records-service pattern: pure async query functions, fresh compute each call, no caching"
    - "Weighted-average reuse: AVERAGED_STATS set mirrors career-stats.ts for consistent decimal stat aggregation"
    - "Expandable table rows via React.Fragment + toggled Set state"

key-files:
  created:
    - apps/desktop/src/lib/records-service.ts
    - apps/desktop/src/components/RecordsLeaderboard.tsx
    - apps/desktop/src/components/HeadToHeadRecords.tsx
    - apps/desktop/src/pages/RecordsPage.tsx
  modified:
    - apps/desktop/src/store/navigation-store.ts
    - apps/desktop/src/App.tsx
    - apps/desktop/src/pages/DashboardPage.tsx

key-decisions:
  - "No caching in records-service: compute fresh each time (data set is small, freshness more important)"
  - "H2H era filter by year range not coaching era: coaching history not in V1 data model"
  - "Expandable rows for H2H game details: keeps table scannable while preserving full game history"
  - "Decade options derived from actual dynasty seasons: no hard-coded decade list"

patterns-established:
  - "Tab state + useEffect per tab: load data when tab activates or filters change"
  - "DB direct import in page: RecordsPage imports db directly for season list (no store needed)"

# Metrics
duration: 3min
completed: 2026-02-22
---

# Phase 3 Plan 04: Records and Leaderboards Summary

**Three-tab Records page with Dexie-backed leaderboards (single-season, career, H2H) and year-range era filter, wired to navigation store and dashboard**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-22T04:15:40Z
- **Completed:** 2026-02-22T04:18:29Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Records service with three exported functions: getSingleSeasonLeaders (filter by seasonId), getCareerLeaders (weighted avg for decimal stats matching career-stats.ts logic), getHeadToHeadRecords (W/L/T, streak, optional year range)
- RecordsLeaderboard component with top-3 gold/silver/bronze styling, player name links to profiles, decimal formatting for averaged stats
- HeadToHeadRecords component with expandable rows showing per-game detail, green/red streak color, dominant (>=75%) / losing (<25%) row tints
- RecordsPage with single-season tab (stat + season dropdowns), career tab (stat dropdown), H2H tab (from/to year filter with decade options derived from actual seasons)
- Dashboard Actions panel has both "Program Legends" (03-03) and "Records & Leaderboards" (new)

## Task Commits

Each task was committed atomically:

1. **Task 1: Records service** - `ea9ee33` (feat)
2. **Task 2: Records page with leaderboard and H2H components** - `56c26e1` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified

- `apps/desktop/src/lib/records-service.ts` — Three exported async functions: getSingleSeasonLeaders, getCareerLeaders, getHeadToHeadRecords with LeaderboardEntry and HeadToHeadRecord types
- `apps/desktop/src/components/RecordsLeaderboard.tsx` — Ranked table with gold/silver/bronze top-3, player profile links, decimal value formatting
- `apps/desktop/src/components/HeadToHeadRecords.tsx` — H2H table with expandable game rows, streak coloring, dominant/losing row tints
- `apps/desktop/src/pages/RecordsPage.tsx` — Three-tab page with stat and era filter controls, loads data on tab/filter change
- `apps/desktop/src/store/navigation-store.ts` — Added 'records' to Page union, added goToRecords() action
- `apps/desktop/src/App.tsx` — Added 'records' case importing and rendering RecordsPage
- `apps/desktop/src/pages/DashboardPage.tsx` — Added "Records & Leaderboards" button, preserved "Program Legends"

## Decisions Made

- No caching in records-service: dynasty data sets are small (hundreds of records); freshness on every load is more important than optimization
- H2H era filter by year range, not coaching era: coaching history is not tracked in the V1 data model (noted in plan as out of scope)
- Expandable rows for H2H game details: surfaces individual game results on demand without crowding the summary table
- Decade options derived from actual dynasty seasons: avoids hard-coded decade list, adapts to the actual year range of any dynasty

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 3 (Player Tracking and Records) is complete — all 4 plans executed. Ready to transition to Phase 4.

- Records service is purely query-based and will automatically reflect new data as games and player seasons are logged
- No blockers

---
*Phase: 03-player-tracking-and-records*
*Completed: 2026-02-22*
