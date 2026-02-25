---
phase: 11-qol-wins
plan: 05
subsystem: ui
tags: [react, localStorage, useRef, scrollIntoView, checklist, timeline, dashboard]

# Dependency graph
requires:
  - phase: 06-social-and-legacy
    provides: ProgramTimelinePage with timeline-service and getTimelineNodes
  - phase: 02-core-loop
    provides: DashboardPage with season/game stores and activeSeason
provides:
  - SeasonChecklist widget in DashboardPage right column with localStorage persistence per season
  - Horizontal TimelineScrubber in ProgramTimelinePage with scrollIntoView navigation
affects:
  - 11-qol-wins future plans (consistent QOL UI patterns)
  - 13-ai-intelligence-layer (dashboard widget area for future AI-generated checklists)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - localStorage keyed by seasonId for widget-level persistence (dynasty-os-checklist-{seasonId})
    - useRef<Record<number, HTMLElement | null>> for multi-element scroll targeting
    - cfbOnly filter pattern on static task arrays for sport-specific display
    - no-print className for scrubber exclusion from window.print() PDF export

key-files:
  created: []
  modified:
    - apps/desktop/src/pages/DashboardPage.tsx
    - apps/desktop/src/pages/ProgramTimelinePage.tsx

key-decisions:
  - "SeasonChecklist localStorage key dynasty-os-checklist-{seasonId}: matches existing naming pattern; keyed by season to reset correctly on dynasty/season switch"
  - "useRef<Record<number, HTMLElement | null>> keyed by year: allows O(1) lookup in scrubber onClick without array scan"
  - "Scrubber only shown when nodes.length > 1: single-season timelines don't need navigation"
  - "Nodes sorted ascending (oldest first) by timeline-service: scrubber renders left-to-right naturally without reversal"
  - "Checklist reset on activeSeason?.id change via useEffect: separate from init useState to handle mid-session season switches"

patterns-established:
  - "IIFE pattern for completion counter: (() => { ... })() inside JSX computes applicable/done without extracting to variable"
  - "cfbOnly property presence check (!('cfbOnly' in task)): type-safe filtering without TypeScript narrowing issues"

requirements-completed: [QOL-09, QOL-10]

# Metrics
duration: 3min
completed: 2026-02-25
---

# Phase 11 Plan 05: Season Checklist + Timeline Scrubber Summary

**Season checklist widget with localStorage persistence per season on Dashboard; horizontal year-pill scrubber with scrollIntoView navigation on ProgramTimeline**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-25T05:19:57Z
- **Completed:** 2026-02-25T05:23:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Dashboard right column shows 7-task checklist (4 universal + 3 CFB-only) with checkbox strikethrough, localStorage persistence keyed by seasonId, and completion counter
- ProgramTimelinePage shows sticky horizontal scrubber bar with one year pill per dynasty season; clicking scrolls to that season's node via scrollIntoView
- Both features use only existing data — no new services, stores, or DB changes needed
- Scrubber has no-print class consistent with existing print media query pattern in ProgramTimelinePage

## Task Commits

Each task was committed atomically:

1. **Task 1: Season checklist widget on DashboardPage (QOL-09)** - `0a57453` (feat)
2. **Task 2: Horizontal timeline scrubber in ProgramTimelinePage (QOL-10)** - `e36cafe` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `apps/desktop/src/pages/DashboardPage.tsx` - Added CHECKLIST_TASKS const, CHECKLIST_KEY helper, checklist state with localStorage init, season-change reset useEffect, toggleTask handler, and SeasonChecklist widget JSX in right column
- `apps/desktop/src/pages/ProgramTimelinePage.tsx` - Added useRef import, nodeRefs map, horizontal scrubber bar JSX with no-print class, and ref callbacks on each timeline node div

## Decisions Made

- localStorage key `dynasty-os-checklist-{seasonId}` matches existing project naming pattern; keyed by season to reset correctly when switching seasons
- `useRef<Record<number, HTMLElement | null>>` keyed by year provides O(1) scrollIntoView lookup without array scan
- Scrubber hidden at `nodes.length <= 1` — no need for navigation on single-season timelines
- Timeline nodes are sorted ascending (oldest first) by `timeline-service.ts`, so scrubber renders chronologically left-to-right without explicit reversal
- Checklist reset handled by a dedicated `useEffect` on `activeSeason?.id` (separate from the useState initializer) to handle mid-session season switches

## Deviations from Plan

None - plan executed exactly as written. The only adaptation was using `node.year` and `node.seasonId` (from the actual `TimelineNode` interface) instead of `node.season.year` and `node.season.id` as the plan text suggested, since `TimelineNode` exposes flattened fields.

## Issues Encountered

Pre-existing TypeScript errors in `game-store.ts` and `player-store.ts` (type cast errors unrelated to this plan's changes) prevented a clean `tsc && vite build`. These are out-of-scope pre-existing issues. TypeScript reported zero errors in the two files modified by this plan.

## Next Phase Readiness

- QOL-09 and QOL-10 complete; Dashboard checklist and Timeline scrubber fully functional
- Phase 11 continues with remaining QOL plans
- No blockers introduced

## Self-Check: PASSED

- FOUND: apps/desktop/src/pages/DashboardPage.tsx
- FOUND: apps/desktop/src/pages/ProgramTimelinePage.tsx
- FOUND: .planning/phases/11-qol-wins/11-05-SUMMARY.md
- FOUND: commit 0a57453 (Task 1: season checklist)
- FOUND: commit e36cafe (Task 2: timeline scrubber)

---
*Phase: 11-qol-wins*
*Completed: 2026-02-25*
