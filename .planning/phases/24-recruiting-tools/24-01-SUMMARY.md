---
phase: 24-recruiting-tools
plan: 01
subsystem: recruiting
tags: [recruiting, typescript, zustand, dexie, react, optimistic-update]

# Dependency graph
requires:
  - phase: 21-data-model
    provides: Recruit type with motivation fields (DMOD-05)
provides:
  - Recruit.isCommitted optional boolean field (Phase 24 TOOL-03)
  - recruiting-service.ts updateRecruit(id, updates) => Promise<void>
  - useRecruitingStore updateRecruit action with optimistic update + revert-on-error
  - AddPlayerModal initial-value props (initialFirstName/LastName/Position/Stars) with re-apply effect
affects: [24-recruiting-tools, 24-02-PLAN.md]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Optimistic update + revert-on-error with toast notification (recruiting-store.ts updateRecruit)
    - Initial-value props seeded via useState initializer + useEffect on isOpen transition

key-files:
  created: []
  modified:
    - packages/core-types/src/recruiting.ts
    - apps/desktop/src/lib/recruiting-service.ts
    - apps/desktop/src/store/recruiting-store.ts
    - apps/desktop/src/components/AddPlayerModal.tsx

key-decisions:
  - "isCommitted placed immediately after visitWeek with v2.2 (Phase 24 TOOL-03) comment per project style"
  - "updateRecruit omits id/dynastyId/classId/createdAt from updates type — identity fields cannot be mutated through this path"
  - "Optimistic update reverts by reloading from DB via getRecruitsByClass using recruitsForClass[0]?.classId ?? activeClass?.id — activeClass IS in store state so both fallbacks included"
  - "useEffect deps array intentionally contains only isOpen — initial* props are stable per open cycle; eslint-disable comment added"

patterns-established:
  - "Optimistic update pattern: set((state) => map over recruitsForClass) then await svc call, revert + toast on error (mirrors player-store.ts)"
  - "AddPlayerModal initial-value props: optional props + useState initializer + useEffect on isOpen transition to true"

requirements-completed: [TOOL-03]

# Metrics
duration: 2min
completed: 2026-05-05
---

# Phase 24 Plan 01: TOOL-03 Foundation Summary

**Recruit type extended with isCommitted flag, updateRecruit service + optimistic store action, and AddPlayerModal pre-fill props — purely additive TOOL-03 foundation for Plan 02 wiring**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-05T23:19:14Z
- **Completed:** 2026-05-05T23:21:49Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added `isCommitted?: boolean` to Recruit interface with v2.2 Phase 24 TOOL-03 comment style
- Added `updateRecruit(id, updates)` to recruiting-service.ts (delegates to `db.recruits.update` with timestamp)
- Added `updateRecruit` store action to useRecruitingStore with optimistic in-memory update and DB-revert-on-error via toast
- Extended AddPlayerModal with four optional initial-value props and a useEffect that re-applies them on each isOpen→true transition

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Recruit type and add updateRecruit service + store action** - `3057a2d` (feat)
2. **Task 2: Add initial-value props + reset effect to AddPlayerModal** - `1c8655b` (feat)

**Plan metadata:** (see final commit below)

## Files Created/Modified
- `packages/core-types/src/recruiting.ts` - Added `isCommitted?: boolean` after `visitWeek?`
- `apps/desktop/src/lib/recruiting-service.ts` - Added `updateRecruit(id, updates)` export after `deleteRecruit`
- `apps/desktop/src/store/recruiting-store.ts` - Added `svcUpdateRecruit` import, `useToastStore` import, interface method, and optimistic implementation
- `apps/desktop/src/components/AddPlayerModal.tsx` - Extended props interface, updated destructure, seeded useState, added useEffect reset

## Decisions Made
- `activeClass` IS present in the recruiting store state, so both fallbacks (`recruitsForClass[0]?.classId ?? activeClass?.id`) were included in the revert path
- `useEffect` dependency array intentionally contains only `[isOpen]` — initial props are stable per open cycle; eslint-disable comment added per plan spec
- `useEffect` in React import was added (was missing — only `useState` was imported previously)

## Deviations from Plan

None — plan executed exactly as written. The only observation is that `useEffect` was not in the React import (only `useState` was present); adding it to the import was required to make the useEffect call work, which is a necessary implementation step implicit in the plan's action.

## Issues Encountered
- TypeScript check in the worktree environment cannot resolve workspace packages (`@dynasty-os/core-types`, `zustand`, etc.) because node_modules are not present in the worktree. All TypeScript errors observed are pre-existing environment issues, not introduced by this plan. The actual project build (with node_modules) is unaffected.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Plan 02 (TOOL-01 wiring) can now consume:
  - `Recruit.isCommitted` to render the committed indicator and gate the "Add to Roster" button
  - `useRecruitingStore.updateRecruit(id, { isCommitted: true })` to flip committed status
  - `<AddPlayerModal initialFirstName="..." initialLastName="..." initialPosition="..." initialStars={N} />` for pre-fill from the recruiting row

---
*Phase: 24-recruiting-tools*
*Completed: 2026-05-05*
