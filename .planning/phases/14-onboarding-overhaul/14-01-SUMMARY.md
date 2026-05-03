---
phase: 14-onboarding-overhaul
plan: 01
subsystem: ui
tags: [onboarding, tour, react, localStorage, data-tour-id]

# Dependency graph
requires: []
provides:
  - 12-step onboarding tour covering all ONBD-01 required dashboard sections
  - data-tour-id attributes on all 10 dashboard section elements
  - Auto-launch wiring via dynasty-os-onboarding-pending localStorage flag
  - LauncherPage decoupled from TourOverlay management
affects: [15-navigation, 16-tooltips-and-quick-entry]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "pending-flag auto-launch: LauncherPage sets localStorage pending flag on dynasty create; App.tsx detects activeDynasty change and opens tour"
    - "data-tour-id targeting: TourOverlay uses document.querySelector([data-tour-id=...]) polled via rAF to spotlight elements"

key-files:
  created: []
  modified:
    - apps/desktop/src/components/TourOverlay.tsx
    - apps/desktop/src/App.tsx
    - apps/desktop/src/pages/LauncherPage.tsx
    - apps/desktop/src/components/SeasonAtGlance.tsx
    - apps/desktop/src/components/RecentActivity.tsx
    - apps/desktop/src/components/WeeklySnapshot.tsx
    - apps/desktop/src/components/StatHighlights.tsx
    - apps/desktop/src/components/QuickEntryHub.tsx
    - apps/desktop/src/components/GameLog.tsx
    - apps/desktop/src/pages/DashboardPage.tsx

key-decisions:
  - "pending-flag pattern over ONBOARDING_STORAGE_KEY check for auto-launch: simpler, more reliable, fires for every new dynasty creation regardless of tour completion history"
  - "App.tsx owns tour auto-launch: activeDynasty useEffect fires after component mounts on dashboard, ensuring DOM elements exist when TourOverlay polls for them"
  - "LauncherPage fully decoupled from TourOverlay: no more TourOverlay unmounting before user reaches dashboard"
  - "roster step removed from STEPS: all 12 steps are dashboard-scoped, tour no longer navigates away from dashboard"
  - "StatHighlights both return paths get data-tour-id: empty and non-empty render paths both have tour-stat-highlights to ensure spotlight works regardless of game data"

patterns-established:
  - "dynasty-os-onboarding-pending localStorage key: set by LauncherPage onCreated, cleared by App.tsx useEffect on activeDynasty change"

requirements-completed: [ONBD-01, ONBD-02]

# Metrics
duration: 2min
completed: 2026-02-26
---

# Phase 14 Plan 01: Onboarding Overhaul — Tour Expansion Summary

**12-step onboarding tour spotlighting all ONBD-01 dashboard sections, auto-launching via pending-flag pattern after dynasty creation lands on the dashboard**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-26T01:58:52Z
- **Completed:** 2026-02-26T02:01:00Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Added data-tour-id attributes to all 7 missing dashboard sections (tour-season-at-glance, tour-recent-activity, tour-weekly-snapshot, tour-stat-highlights, tour-quick-entry, tour-checklist, tour-gamelog)
- Expanded TourOverlay STEPS from 6 to 12 entries covering all ONBD-01 sections — welcome, sidebar, log-game, end-season, quick-entry, season-at-glance, recent-activity, weekly-snapshot, stat-highlights, checklist, gamelog, closing
- Fixed auto-launch: moved from LauncherPage (fires before navigation) to App.tsx useEffect watching activeDynasty, using dynasty-os-onboarding-pending localStorage flag
- Removed TourOverlay from LauncherPage entirely — LauncherPage no longer manages tour state

## Task Commits

Each task was committed atomically:

1. **Task 1: Add data-tour-id to all 7 missing dashboard sections** - `f130541` (feat)
2. **Task 2: Expand TourOverlay STEPS and fix auto-launch wiring** - `053b9c9` (feat)

## Files Created/Modified
- `apps/desktop/src/components/TourOverlay.tsx` - STEPS expanded to 12; roster nav branch removed from useEffect
- `apps/desktop/src/App.tsx` - Added useEffect watching activeDynasty.id for pending flag auto-launch
- `apps/desktop/src/pages/LauncherPage.tsx` - Removed TourOverlay import/state/JSX; onCreated now sets pending flag
- `apps/desktop/src/components/SeasonAtGlance.tsx` - Added data-tour-id="tour-season-at-glance"
- `apps/desktop/src/components/RecentActivity.tsx` - Added data-tour-id="tour-recent-activity"
- `apps/desktop/src/components/WeeklySnapshot.tsx` - Added data-tour-id="tour-weekly-snapshot"
- `apps/desktop/src/components/StatHighlights.tsx` - Added data-tour-id="tour-stat-highlights" to both return paths
- `apps/desktop/src/components/QuickEntryHub.tsx` - Added data-tour-id="tour-quick-entry"
- `apps/desktop/src/components/GameLog.tsx` - Added data-tour-id="tour-gamelog"
- `apps/desktop/src/pages/DashboardPage.tsx` - Added data-tour-id="tour-checklist" to Season Checklist wrapper

## Decisions Made
- Used pending-flag pattern (dynasty-os-onboarding-pending) instead of checking ONBOARDING_STORAGE_KEY at create time — cleaner separation: LauncherPage signals intent, App.tsx acts on it after navigation completes
- All tour steps use page: 'dashboard' — eliminated the roster step from STEPS to keep the tour focused on the first-use dashboard experience; removed the roster navigation branch from TourOverlay entirely
- Both return paths of StatHighlights.tsx received data-tour-id to ensure the spotlight attribute is present regardless of whether games have been logged yet

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Tour foundation complete and wired for all ONBD-01 sections
- TourOverlay pattern reusable if additional sections need spotlighting in future phases
- LauncherPage clean — no tour state to maintain

---
*Phase: 14-onboarding-overhaul*
*Completed: 2026-02-26*
