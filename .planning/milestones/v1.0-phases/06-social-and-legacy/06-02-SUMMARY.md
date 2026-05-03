---
phase: 06-social-and-legacy
plan: 02
subsystem: ui
tags: [timeline, pdf-export, window.print, dexie, zustand, localStorage, react]

# Dependency graph
requires:
  - phase: 06-social-and-legacy/06-01
    provides: navigation-store with rivalry-tracker page type; rivals table in DB v4
  - phase: 04-narrative-engine
    provides: localStorage narrative cache key dynasty-os-narrative-{seasonId} with tagline field
  - phase: 02-core-loop
    provides: seasons table; Season type with wins/losses/confWins/confLosses/finalRanking/bowlGame/bowlResult
provides:
  - timeline-service.ts exporting TimelineNode interface and getTimelineNodes(dynastyId)
  - ProgramTimelinePage with scrollable per-season nodes and CSS @media print export
  - window.print() PDF export with no-print class for UI chrome
  - Program Timeline accessible from Dashboard CFB Program section
affects: [06-03-scouting-notes, future-export-features]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CSS @media print with inline style element for print-safe export — no extra library"
    - "timeline-service as pure read function (no Zustand store) — aggregates DB data with localStorage taglines"
    - "no-print className pattern for hiding UI chrome during window.print()"

key-files:
  created:
    - apps/desktop/src/lib/timeline-service.ts
    - apps/desktop/src/pages/ProgramTimelinePage.tsx
  modified:
    - apps/desktop/src/store/navigation-store.ts
    - apps/desktop/src/pages/DashboardPage.tsx
    - apps/desktop/src/App.tsx

key-decisions:
  - "window.print() for PDF export — consistent with project constraint (blob URLs blocked in Tauri WKWebView/WebView2)"
  - "timeline-service as standalone async function, no Zustand store — pure read, no state to manage"
  - "No sport guard on ProgramTimelinePage — timeline is sport-agnostic (seasons exist for all sports)"
  - "tagline extracted from dynasty-os-narrative-{seasonId} localStorage key — reuses narrative cache established in 04-narrative-engine"
  - "bowlOpponent and keyEvents accessed via (season as any) — not in Season interface, forward-compatible cast"

patterns-established:
  - "CSS print export pattern: inline <style> with @media print + no-print classNames — reuse for other print-export features"
  - "Pure service aggregation: timeline-service reads DB + localStorage without Zustand dependency"

# Metrics
duration: 8min
completed: 2026-02-22
---

# Phase 6 Plan 02: Program Timeline Summary

**Scrollable dynasty history timeline with per-season nodes (record, ranking, bowl, tagline, key events) and window.print() PDF export via CSS @media print — no extra dependencies**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-22T06:28:47Z
- **Completed:** 2026-02-22T06:36:47Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- timeline-service.ts aggregates all seasons for a dynasty into TimelineNode objects, reads taglines from localStorage narrative cache, and returns them sorted oldest-first
- ProgramTimelinePage renders scrollable season nodes with record, conf record, final ranking, bowl result, tagline, and key events; amber left-border cards
- CSS @media print via inline style element hides UI chrome (no-print class) and adds page-break-inside: avoid per node; window.print() is the export trigger

## Task Commits

Each task was committed atomically:

1. **Task 1: Timeline service — season node aggregation with tagline extraction** - `0099853` (feat)
2. **Task 2: Program Timeline page with CSS print export, navigation, and Dashboard button** - `f9906a5` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `apps/desktop/src/lib/timeline-service.ts` - TimelineNode interface + getTimelineNodes(dynastyId) reading DB and localStorage taglines
- `apps/desktop/src/pages/ProgramTimelinePage.tsx` - Scrollable timeline UI with CSS print export and window.print() button
- `apps/desktop/src/store/navigation-store.ts` - Added 'program-timeline' Page type and goToProgramTimeline() action
- `apps/desktop/src/pages/DashboardPage.tsx` - Added "Program Timeline" amber button after "Rivalry Tracker" in CFB Program section
- `apps/desktop/src/App.tsx` - Added ProgramTimelinePage import and case 'program-timeline' routing

## Decisions Made
- window.print() for PDF export — consistent with project constraint that blob URLs are blocked in Tauri WKWebView/WebView2 (established in earlier phases)
- No Zustand store for timeline-service — it's a pure async read aggregation function; no state lifecycle needed
- No sport guard on ProgramTimelinePage — seasons exist for all sports, timeline is sport-agnostic
- bowlOpponent/keyEvents via `(season as any)` — these fields are not in the Season interface but may be present on stored records; future schema work can formalize

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Program Timeline page is complete and accessible from Dashboard
- Phase 6 Plan 3 (Scouting Notes) can proceed — scoutingNotes table already exists in DB v4 (added in 06-01)
- All three Phase 6 modules (Rivalry Tracker, Program Timeline, Scouting Notes) follow the same navigation-store pattern

---
*Phase: 06-social-and-legacy*
*Completed: 2026-02-22*
