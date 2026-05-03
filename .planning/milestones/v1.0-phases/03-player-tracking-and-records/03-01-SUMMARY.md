---
phase: 03-player-tracking-and-records
plan: "01"
subsystem: ui
tags: [zustand, dexie, react, tailwind, player-crud, sport-configs, navigation]

# Dependency graph
requires:
  - phase: 02-core-loop
    provides: Zustand store patterns, Dexie db setup, DashboardPage layout patterns, modal patterns
  - phase: 01-foundation
    provides: core-types (Player, PlayerSeason), db schema with players/playerSeasons tables, sport-configs package
provides:
  - Player CRUD service (player-service.ts) with cascade-delete of playerSeasons
  - Zustand player store (player-store.ts) with reload-after-mutation pattern
  - Navigation store (navigation-store.ts) for page switching without a router library
  - Roster page with position/status filtering, add/edit/delete player flows
  - AddPlayerModal and EditPlayerModal with sport-config-driven position and class year dropdowns
  - App.tsx navigation routing (dashboard/roster/player-profile/legends)
affects:
  - 03-02-player-stats: needs usePlayerStore to associate stats with players
  - 03-03-career-totals: needs players list for career aggregation display
  - 03-04-legacy-cards: needs player data for card generation

# Tech tracking
tech-stack:
  added: []
  patterns:
    - reload-after-mutation: player store reloads full list after every create/update/delete
    - navigation-store pattern: simple Zustand page state replaces router library for desktop app
    - cascade-delete pattern: deletePlayer removes playerSeasons before deleting player record
    - sport-config-driven dropdowns: positions and classYears come from getSportConfig(), not hardcoded
    - Dashboard single-subscriber pattern: RosterPage subscribes to stores, passes props to children

key-files:
  created:
    - apps/desktop/src/lib/player-service.ts
    - apps/desktop/src/store/player-store.ts
    - apps/desktop/src/store/navigation-store.ts
    - apps/desktop/src/pages/RosterPage.tsx
    - apps/desktop/src/components/AddPlayerModal.tsx
    - apps/desktop/src/components/EditPlayerModal.tsx
  modified:
    - apps/desktop/src/store/index.ts
    - apps/desktop/src/App.tsx
    - apps/desktop/src/pages/DashboardPage.tsx

key-decisions:
  - "Navigation store over router library: desktop app doesn't need URL-based routing; simple page state in Zustand is sufficient and avoids dependency bloat"
  - "cascade-delete in service layer: deletePlayer deletes playerSeasons first so referential integrity is maintained at the service level, not in UI"
  - "Bounded dropdown for jersey number (0-99): consistent with bounded-dropdown pattern from Phase 2"

patterns-established:
  - "navigation-store pattern: useNavigationStore with currentPage and pageParams for client-side routing"
  - "PlaceholderPage component: future pages render 'Coming soon' with back-to-dashboard button"

# Metrics
duration: 3min
completed: 2026-02-22
---

# Phase 3 Plan 01: Player Roster Foundation Summary

**Player CRUD foundation with Dexie service, Zustand store, navigation store, and full Roster page featuring position/status filtering, add/edit/delete via sport-config-driven modal forms**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-22T03:52:39Z
- **Completed:** 2026-02-22T03:56:09Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Player CRUD service with cascade-delete (playerSeasons deleted first) following game-service.ts pattern
- Zustand player store with reload-after-mutation pattern identical to game-store.ts
- Navigation store enabling page switching (dashboard/roster/player-profile/legends) without a router library
- Roster page with filterable player table (position dropdown + active/departed/all toggle), empty state, delete confirmation
- AddPlayerModal with all fields: name, position, jersey #, class year, recruiting stars, home state/city, height, weight — positions and classYears from getSportConfig()
- EditPlayerModal pre-filled with existing player data, includes status selector (active/graduated/transferred/drafted/injured/other)
- App.tsx routing via useNavigationStore.currentPage switch; placeholder pages for player-profile and legends
- Dashboard "Manage Roster" button added to Actions panel

## Task Commits

Each task was committed atomically:

1. **Task 1: Player service, player store, and navigation store** - `1e41ba2` (feat)
2. **Task 2: Roster page with Add/Edit player modals and navigation wiring** - `90fc4a6` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `apps/desktop/src/lib/player-service.ts` - Player CRUD: createPlayer, getPlayersByDynasty, getPlayer, updatePlayer, deletePlayer (cascade)
- `apps/desktop/src/store/player-store.ts` - Zustand store with reload-after-mutation, exports usePlayerStore
- `apps/desktop/src/store/navigation-store.ts` - Page state store, exports useNavigationStore; navigate/goToDashboard/goToRoster/goToPlayerProfile/goToLegends
- `apps/desktop/src/pages/RosterPage.tsx` - Full roster management page (325 lines) with filters, table, modals
- `apps/desktop/src/components/AddPlayerModal.tsx` - Add player modal (295 lines) with sport-config-driven dropdowns
- `apps/desktop/src/components/EditPlayerModal.tsx` - Edit player modal pre-filled with existing data + status selector
- `apps/desktop/src/store/index.ts` - Added exports for usePlayerStore and useNavigationStore
- `apps/desktop/src/App.tsx` - Replaced ternary with switch on currentPage; placeholder pages for future routes
- `apps/desktop/src/pages/DashboardPage.tsx` - Added Manage Roster button in Actions panel

## Decisions Made

- Navigation store over router library: desktop Tauri app doesn't need URL-based routing; Zustand page state is lightweight and sufficient
- Cascade-delete in service layer: deletePlayer deletes all playerSeasons before deleting the player record to maintain referential integrity
- Bounded dropdown for jersey number (0-99): consistent with bounded-dropdown pattern established in Phase 2

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Player CRUD fully operational; usePlayerStore available for Phase 3 Plans 02-04
- Navigation store ready for player-profile routing when Plan 02 adds PlayerProfilePage
- cascade-delete ensures stats attached to deleted players are cleaned up automatically
- Build compiles clean (75 modules, zero TypeScript errors)

---
*Phase: 03-player-tracking-and-records*
*Completed: 2026-02-22*
