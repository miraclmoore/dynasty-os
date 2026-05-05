---
phase: 24-recruiting-tools
plan: "03"
subsystem: ui
tags: [react, zustand, filter-store, roster, deal-breaker, at-risk]

# Dependency graph
requires:
  - phase: 11-qol-wins
    provides: "FilterStore pattern (setFilter/getFilters) and setter wrapper convention for persistent page filters"
  - phase: 21-data-model
    provides: "Player.dealBreaker field on core-types Player interface"
provides:
  - "At-risk filter toggle on RosterPage persisted via FilterStore"
  - "Row tint (bg-orange-900/10) for deal-breaker players when toggle is ON"
affects: [24-recruiting-tools]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "showAtRisk boolean state mirrors established statusFilter/positionFilter setter-wrapper pattern"
    - "matchesAtRisk filter clause ANDed into existing filteredPlayers chain"

key-files:
  created: []
  modified:
    - apps/desktop/src/pages/RosterPage.tsx

key-decisions:
  - "Toggle button placed as a flex sibling inside the same filter bar flex wrapper (with its own items-end wrapper div), not inside the status filter rounded-lg container"
  - "Row variable in sortedPlayers.map callback is 'player' (not 'p'), confirmed by reading the file before editing"
  - "Row tint injects an additional template-literal segment alongside the existing border-b-0 last-row class, preserving all original classes verbatim"

patterns-established:
  - "At-risk toggle pattern: boolean FilterStore key + matchesAtRisk filter clause + conditional row class"

requirements-completed: [TOOL-02]

# Metrics
duration: 2min
completed: 2026-05-05
---

# Phase 24 Plan 03: At-Risk Filter Toggle Summary

**`showAtRisk` boolean toggle added to RosterPage filter bar — persisted via FilterStore, filters to deal-breaker players, and tints qualifying rows bg-orange-900/10**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-05T23:19:28Z
- **Completed:** 2026-05-05T23:21:41Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added `showAtRisk` state (lines 92-98) using the established setter-wrapper pattern matching `statusFilter` and `positionFilter`
- Added `matchesAtRisk` filter clause (line 121) to `filteredPlayers` using `Boolean(p.dealBreaker)` — ANDed into the existing filter chain
- Added "Show At-Risk" / "At-Risk Only" toggle button (lines 246-260) in the filter bar as a flex sibling of the status filter group
- Added `bg-orange-900/10` row tint (line 355) when both `showAtRisk` is ON and `player.dealBreaker` is truthy
- Existing DB badge (`bg-orange-900/40 text-orange-300 border-orange-700`) remains untouched

## Task Commits

1. **Task 1: Add showAtRisk filter state, toggle button, list filter, and row tint to RosterPage** - `20db960` (feat)

## Files Created/Modified
- `apps/desktop/src/pages/RosterPage.tsx` - Added showAtRisk state (~line 92), matchesAtRisk filter clause (~line 121), toggle button (~line 246), and row tint (~line 355)

## Decisions Made
- Toggle button is placed as a sibling div with `flex items-end` wrapper inside the main filter bar flex container, not inside the status filter's `rounded-lg overflow-hidden` border container — this keeps it visually independent while picking up the gap spacing from the parent `flex flex-wrap gap-3` wrapper
- The row mapping callback variable is `player` (not `p`) — confirmed by reading the file, so the row tint uses `player.dealBreaker` not `p.dealBreaker`
- The `showAtRisk` label in the toggle button omits a separate `<label>` element (unlike position/status which have label elements) since the button text itself is self-describing; a `title` attribute provides additional tooltip context

## Deviations from Plan

None - plan executed exactly as written. The only confirmation made was that the row variable name is `player` (not `p`), which the plan explicitly asked to verify.

## Issues Encountered

The TypeScript build check (`pnpm exec tsc --noEmit`) could not run directly from the worktree because node_modules are not installed in the worktree environment. Running tsc from the main project's binary against the worktree's tsconfig showed ~6157 pre-existing environment-level errors (`Cannot find module 'react'`, `JSX element implicitly has type 'any'`) affecting ALL .tsx files, not just RosterPage.tsx. Zero logic errors were introduced in RosterPage.tsx — confirmed by filtering out the environment error codes (TS2307, TS7026, TS2875, TS7006, TS7053) and checking no RosterPage-specific errors remained.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- At-risk toggle is live in RosterPage; coaches can surface deal-breaker players in one click
- FilterStore persistence means the toggle state survives navigation (Phase 11 pattern)
- Plans 24-01 and 24-02 (Hard Sell calculator, transfer risk tags) are independent and can run in parallel — this plan does not block them

---
*Phase: 24-recruiting-tools*
*Completed: 2026-05-05*

## Self-Check: PASSED

- FOUND: apps/desktop/src/pages/RosterPage.tsx
- FOUND: .planning/phases/24-recruiting-tools/24-03-SUMMARY.md
- FOUND: commit 20db960 (feat(24-03): add at-risk filter toggle and row tint to RosterPage)
- showAtRisk occurrences: 8 (>= 5 required)
- setShowAtRiskState occurrences: 2 (exactly 2 required)
- matchesAtRisk occurrences: 2 (>= 2 required)
- bg-orange-900/10 occurrences: 1 (>= 1 required)
- DB badge untouched (bg-orange-900/40): 1 (>= 1 required)
