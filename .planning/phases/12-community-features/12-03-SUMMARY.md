---
phase: 12-community-features
plan: "03"
subsystem: ui
tags: [react, dexie, zustand, future-schedule, player-link, cfb, bowl-eligibility]

# Dependency graph
requires:
  - phase: 10-infrastructure-foundation
    provides: Dexie v6 schema with futureGames and playerLinks tables; UndoStore/ToastStore patterns
  - phase: 12-02
    provides: Established Phase 12 service/store/page patterns
provides:
  - future-schedule-service: CRUD for futureGames table + projectBowlEligibility pure function
  - future-schedule-store: useFutureScheduleStore with undo-on-delete support
  - FutureSchedulePage: sport-agnostic multi-year schedule builder with CFB-only bowl eligibility projection
  - player-link-service: CRUD for playerLinks table using compound [dynastyId+playerId] index
  - player-link-store: usePlayerLinkStore with set/remove + toast notifications
  - PlayerProfilePage: CFB-gated NFL/Madden Career Link section at bottom
  - navigation-store: future-schedule page + goToFutureSchedule action
affects: [13-ai-intelligence-layer, any-future-phase-using-futureGames-or-playerLinks]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - FutureGame.isHome boolean maps to home/away/neutral UI via locationToIsHome helper
    - PlayerLink linkType enum used for cfb-to-nfl cross-dynasty tracking
    - CFB sport guard pattern: activeDynasty?.sport === 'cfb' wraps CFB-specific sections inline

key-files:
  created:
    - apps/desktop/src/lib/future-schedule-service.ts
    - apps/desktop/src/store/future-schedule-store.ts
    - apps/desktop/src/lib/player-link-service.ts
    - apps/desktop/src/store/player-link-store.ts
    - apps/desktop/src/pages/FutureSchedulePage.tsx
  modified:
    - apps/desktop/src/pages/PlayerProfilePage.tsx
    - apps/desktop/src/store/navigation-store.ts
    - apps/desktop/src/App.tsx
    - apps/desktop/src/components/CommandPalette.tsx

key-decisions:
  - "FutureGame.isHome boolean (not location string): UI maps home/away/neutral select to isHome via locationToIsHome() helper — actual type has no location field"
  - "PlayerLink uses linkedDynastyId + linkedPlayerId (not linkedPlayerName/linkedTeam): player link form captures dynasty ID and player ID from paired Madden dynasty"
  - "Future Schedule in Navigate group (not CFB group) in CommandPalette: sport-agnostic, both CFB and Madden can schedule future games"
  - "loadLink called unconditionally in PlayerProfilePage useEffect (not CFB-guarded): guard is in render; avoids conditional hook/effect antipattern"

patterns-established:
  - "locationToIsHome/isHomeToLocation helpers: map UI select values to boolean field in FutureGame type"

requirements-completed: [COMM-02, COMM-05]

# Metrics
duration: 4min
completed: 2026-02-24
---

# Phase 12 Plan 03: Future Schedule + Player Link Summary

**Multi-year schedule builder with CFB bowl eligibility projection (FutureSchedulePage) and CFB-gated NFL/Madden career link section in PlayerProfilePage, backed by Dexie CRUD services and Zustand stores**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-24T00:03:21Z
- **Completed:** 2026-02-24T00:07:01Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Future schedule service and store with createFutureGame, getFutureGamesByDynasty, deleteFutureGame, projectBowlEligibility, and undo-on-remove
- FutureSchedulePage renders multi-year schedule builder (sport-agnostic) with CFB-only bowl eligibility projection showing eligible/needs-N-wins status
- PlayerLink service and store using compound [dynastyId+playerId] index for O(1) single-player lookups
- CFB-gated NFL/Madden Career Link section added at bottom of PlayerProfilePage — hidden for Madden dynasties
- Navigation registered: future-schedule page in navigation-store, App.tsx route, CommandPalette Navigate group entry

## Task Commits

Each task was committed atomically:

1. **Task 1: Future schedule service + store + player link service + store** - `7f4ce84` (feat)
2. **Task 2: FutureSchedulePage + PlayerProfilePage player link section + navigation** - `0d6fca9` (feat)

## Files Created/Modified

- `apps/desktop/src/lib/future-schedule-service.ts` - Dexie CRUD + projectBowlEligibility pure function
- `apps/desktop/src/store/future-schedule-store.ts` - useFutureScheduleStore with undo-on-delete
- `apps/desktop/src/lib/player-link-service.ts` - Dexie CRUD for playerLinks with compound index
- `apps/desktop/src/store/player-link-store.ts` - usePlayerLinkStore with setLink/removeLink + toasts
- `apps/desktop/src/pages/FutureSchedulePage.tsx` - Sport-agnostic schedule builder + CFB bowl projection (new)
- `apps/desktop/src/pages/PlayerProfilePage.tsx` - Added CFB-gated player link section + usePlayerLinkStore
- `apps/desktop/src/store/navigation-store.ts` - Added future-schedule to Page union + goToFutureSchedule
- `apps/desktop/src/App.tsx` - Added FutureSchedulePage import + case 'future-schedule' route
- `apps/desktop/src/components/CommandPalette.tsx` - Added Future Schedule nav entry in Navigate group

## Decisions Made

- **FutureGame.isHome boolean vs location string:** The actual core-types FutureGame uses `isHome?: boolean`, not a `location` string field. Created `locationToIsHome()` / `isHomeToLocation()` helpers to map the UI home/away/neutral select to the boolean. Plan assumed a location field but the type has evolved differently.
- **PlayerLink field mismatch:** The actual PlayerLink type uses `linkedDynastyId + linkedPlayerId + linkType` — not `linkedPlayerName/linkedTeam` as the plan expected. Form adapted to capture dynasty ID and player ID with `linkType: 'cfb-to-nfl'` as default for CFB→NFL links.
- **Future Schedule in Navigate group (not CFB group):** Plan specifies sport-agnostic; CommandPalette entry placed in Navigate group alongside other general tools, not inside the CFB-guarded group.
- **loadLink called unconditionally:** Calling loadLink in the existing useEffect regardless of sport avoids a conditional effect antipattern; the CFB guard lives in the render JSX only.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Adapted to actual FutureGame type shape**
- **Found during:** Task 1 (future-schedule-service.ts)
- **Issue:** Plan specified `location: 'home' | 'away' | 'neutral'` field in FutureGame, but actual type uses `isHome?: boolean` with no location field
- **Fix:** Used actual `isHome?: boolean` field in service; added `locationToIsHome`/`isHomeToLocation` helpers in FutureSchedulePage for UI mapping
- **Files modified:** future-schedule-service.ts, FutureSchedulePage.tsx
- **Committed in:** 7f4ce84 + 0d6fca9

**2. [Rule 1 - Bug] Adapted to actual PlayerLink type shape**
- **Found during:** Task 1 (player-link-service.ts)
- **Issue:** Plan specified `linkedPlayerName/linkedTeam` fields, but actual type uses `linkedDynastyId`, `linkedPlayerId`, `linkType` enum
- **Fix:** Service and store implemented against actual type; form captures dynasty ID and player ID, sets `linkType: 'cfb-to-nfl'`
- **Files modified:** player-link-service.ts, player-link-store.ts, PlayerProfilePage.tsx
- **Committed in:** 7f4ce84 + 0d6fca9

---

**Total deviations:** 2 auto-fixed (both Rule 1 - type shape mismatch between plan assumptions and actual scaffolded types from Phase 10)
**Impact on plan:** All fixes necessary for type-correctness. Functional behavior unchanged from plan intent.

## Issues Encountered

None — TypeScript compiled clean on first build attempt for both tasks.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- COMM-02 (Player Link) and COMM-05 (Future Schedule) complete
- futureGames and playerLinks tables are now fully operational with service/store/page layers
- Ready for Phase 12 Plan 04 (next community feature)

---
*Phase: 12-community-features*
*Completed: 2026-02-24*
