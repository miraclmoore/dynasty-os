---
phase: 12-community-features
plan: "01"
subsystem: ui
tags: [react, zustand, dexie, coaching-staff, navigation]

# Dependency graph
requires:
  - phase: 10-infrastructure-foundation
    provides: Dexie v6 schema with coachingStaff table, ToastStore, UndoStore
  - phase: 11-qol-wins
    provides: CommandPalette navigation pattern, undo/toast integration patterns
provides:
  - Coaching staff lifecycle: hire, fire, promote, delete with full undo support
  - coaching-staff-service.ts: Dexie CRUD for coachingStaff table
  - coaching-staff-store.ts: Zustand store with 5 actions
  - CoachingStaffPage.tsx: hire/fire/promote UI with active + history sections
  - Navigation registration: Page union, action, App.tsx switch, CommandPalette entry
affects: [13-ai-intelligence-layer]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Coaching staff service follows rivalry-service.ts Dexie CRUD pattern
    - Store uses as unknown as double-cast for undo snapshot (Phase 11-01 decision)
    - Fire/delete actions use sonner direct API for Undo action button in toast
    - Inline fire/promote UI pattern (no modal): toggle state per-row, autoFocus on open

key-files:
  created:
    - apps/desktop/src/lib/coaching-staff-service.ts
    - apps/desktop/src/store/coaching-staff-store.ts
    - apps/desktop/src/pages/CoachingStaffPage.tsx
  modified:
    - apps/desktop/src/store/navigation-store.ts
    - apps/desktop/src/App.tsx
    - apps/desktop/src/components/CommandPalette.tsx

key-decisions:
  - "CoachingStaffPage uses inline fire/promote UI (toggle state per-row) instead of modal — minimal state, no additional dependencies"
  - "CoachingRole values use API keys ('head-coach', 'offensive-coordinator') mapped to display labels in ROLE_OPTIONS — consistent with core-types definition"
  - "Staff History section is collapsible (default open) — avoids long page scroll when many coaches have been fired over a long dynasty"

patterns-established:
  - "Inline action panel pattern: fire/promote open inline below the card row; only one can be open at a time (firingId/promotingId exclusive)"

requirements-completed: [COMM-01]

# Metrics
duration: 3min
completed: 2026-02-25
---

# Phase 12 Plan 01: Coaching Staff Lifecycle Summary

**Coaching staff hire/fire/promote feature with Dexie service, Zustand store, full-page UI, and 4-point navigation registration — sport-agnostic, undo-enabled**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-25T06:12:18Z
- **Completed:** 2026-02-25T06:14:33Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Dexie CRUD service (coaching-staff-service.ts) with sorted query: active staff first, fired sorted by fireYear desc
- Zustand store (coaching-staff-store.ts) with load/add/fire/remove/promote; fire and delete push undo snapshots with sonner Undo action button in toast
- CoachingStaffPage.tsx: two-panel lg:grid-cols-2 layout, inline fire/promote UI per row, collapsible Staff History section with fired coaches table
- Full navigation registration: 'coaching-staff' in Page union, goToCoachingStaff action, App.tsx switch case, CommandPalette Navigate group entry (sport-agnostic)

## Task Commits

1. **Task 1: Coaching Staff service + store** - `f19604e` (feat)
2. **Task 2: CoachingStaffPage + navigation registration** - `64040da` (feat)

## Files Created/Modified

- `apps/desktop/src/lib/coaching-staff-service.ts` - Dexie CRUD: createCoach, getCoachingStaffByDynasty, fireCoach, updateCoach, deleteCoach
- `apps/desktop/src/store/coaching-staff-store.ts` - useCoachingStaffStore with load/add/remove/fire/promote actions
- `apps/desktop/src/pages/CoachingStaffPage.tsx` - Hire/fire/promote UI with active staff + history sections
- `apps/desktop/src/store/navigation-store.ts` - Added 'coaching-staff' to Page union + goToCoachingStaff action
- `apps/desktop/src/App.tsx` - Import + case 'coaching-staff' routing
- `apps/desktop/src/components/CommandPalette.tsx` - Sport-agnostic coaching staff Navigate entry

## Decisions Made

- Inline fire/promote UI (toggle state per-row) chosen over modal — minimal state, no additional dependencies needed
- CoachingRole values use API keys ('head-coach', 'offensive-coordinator') mapped to display labels via ROLE_OPTIONS array — consistent with core-types CoachingRole type definition
- Staff History section is collapsible (default open) — avoids long page scroll when many coaches have been fired across a long dynasty

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- coaching-staff-service.ts and useCoachingStaffStore are available for any Phase 12 or 13 plan that needs coaching staff data
- CoachingStaffPage accessible via Cmd+K → "Coaching Staff" in all dynasty sports
- Ready for Plan 12-02 (NIL Ledger)

---
*Phase: 12-community-features*
*Completed: 2026-02-25*

## Self-Check: PASSED

- FOUND: apps/desktop/src/lib/coaching-staff-service.ts
- FOUND: apps/desktop/src/store/coaching-staff-store.ts
- FOUND: apps/desktop/src/pages/CoachingStaffPage.tsx
- FOUND: .planning/phases/12-community-features/12-01-SUMMARY.md
- FOUND commit: f19604e (feat: coaching staff service and store)
- FOUND commit: 64040da (feat: CoachingStaffPage and navigation registration)
