---
phase: 08-screenshot-ingestion
plan: 02
subsystem: ui
tags: [react, tauri, claude-vision, screenshot, amber, form, navigation]

# Dependency graph
requires:
  - phase: 08-01
    provides: parseScreenshot() Vision API service, ScreenType/ParsedScreenData types, SCREEN_TYPE_LABELS, Tauri dialog:allow-open and fs:allow-read-file capabilities
  - phase: 04-narrative-engine
    provides: getApiKey()/setApiKey() from legacy-card-service.ts for API key storage pattern
  - phase: 02-core-loop
    provides: createGame() from game-service.ts for schedule save
  - phase: 05-cfb-features
    provides: createRecruitingClass()/addRecruit() from recruiting-service.ts for recruiting save
provides:
  - ScreenshotIngestionPage at apps/desktop/src/pages/ScreenshotIngestionPage.tsx — full 933-line page with screen type picker, Tauri file dialog, image preview, Vision API spinner, amber-highlighted confirmation form, save/discard paths
  - 'screenshot-ingestion' Page type in navigation-store.ts with goToScreenshotIngestion() action
  - App.tsx routing case for 'screenshot-ingestion'
  - Amber 'Parse Screenshot' button in DashboardPage CFB Program section
affects: [09-madden-import, future-screenshot-features]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Amber field highlight pattern: AMBER_INPUT const 'bg-amber-900/20 border-amber-600/50' applied to all AI-parsed inputs
    - Editable row state pattern: separate EditableXxxRow interfaces with string values for form binding
    - Result derivation at save-time: W/L computed from teamScore vs opponentScore at save — not stored from API

key-files:
  created:
    - apps/desktop/src/pages/ScreenshotIngestionPage.tsx
  modified:
    - apps/desktop/src/store/navigation-store.ts
    - apps/desktop/src/App.tsx
    - apps/desktop/src/pages/DashboardPage.tsx

key-decisions:
  - "AMBER_INPUT const for amber field classes: single source of truth prevents class drift across 4 form types"
  - "Editable form state uses string values throughout: avoids number/null type friction with input binding"
  - "Result (W/L) derived at save-time from scores: avoids stale API value overriding user-edited scores"
  - "Player stats and depth chart are display-only in Phase 8: data model requires player to exist first (player stats), no DB schema for depth chart"
  - "null checks added to async handlers (handleParse, handleSaveSchedule, handleSaveRecruiting): TypeScript doesn't narrow activeDynasty across closure boundaries despite early return guard"

patterns-established:
  - "Screenshot ingestion pattern: screen type selection -> file open (Tauri dialog) -> image preview -> Vision API -> amber confirmation form -> save/discard"
  - "File read to base64: readFile() bytes -> Array.from -> String.fromCharCode -> btoa — avoids blob URL restrictions in WKWebView"

requirements-completed: [INGST-04, INGST-05, INGST-06]

# Metrics
duration: 8min
completed: 2026-02-24
---

# Phase 8 Plan 02: Screenshot Ingestion UI Summary

**Full screenshot ingestion UX: amber 'Parse Screenshot' button on Dashboard -> ScreenshotIngestionPage with Tauri file picker, Vision API spinner, and amber-highlighted per-screen-type confirmation forms saving schedule/recruiting data to DB**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-02-24T23:39:29Z
- **Completed:** 2026-02-24T23:47:XX Z (Tasks 1-2; Task 3 pending human verification)
- **Tasks:** 2/3 complete (Task 3 = human checkpoint)
- **Files modified:** 4

## Accomplishments
- Created 933-line ScreenshotIngestionPage.tsx with complete 4-screen-type UX (schedule, player-stats, recruiting, depth-chart)
- Wired navigation store (goToScreenshotIngestion), App.tsx routing, and Dashboard amber button in CFB Program section
- Schedule screen type: editable game table with W/L derivation, saves all valid rows via createGame()
- Recruiting screen type: editable recruits table + class-level fields, saves via createRecruitingClass()/addRecruit() with star count calculation
- Player stats + depth chart: display-only with clear instructions and Roster/Dashboard navigation
- Amber field highlight (bg-amber-900/20 border-amber-600/50) on all AI-parsed inputs for visual distinction
- Loading spinner ("Parsing screenshot..."), error state with Retry, API key missing state using existing getApiKey()/setApiKey() pattern
- TypeScript compiles with zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Navigation wiring** - `4b7c235` (feat)
2. **Task 2: Full ScreenshotIngestionPage implementation and Dashboard button** - `efa0d02` (feat)

**Plan metadata:** pending docs commit (after checkpoint approval)

## Files Created/Modified
- `apps/desktop/src/pages/ScreenshotIngestionPage.tsx` - 933-line full implementation: screen type picker, Tauri file dialog, image preview, Vision API parse, 4 per-type confirmation forms with amber fields, save/discard paths
- `apps/desktop/src/store/navigation-store.ts` - Added 'screenshot-ingestion' to Page union and goToScreenshotIngestion() action
- `apps/desktop/src/App.tsx` - Added ScreenshotIngestionPage import and 'screenshot-ingestion' routing case
- `apps/desktop/src/pages/DashboardPage.tsx` - Added 'Parse Screenshot' amber button in CFB Program section

## Decisions Made
- AMBER_INPUT const `'bg-amber-900/20 border-amber-600/50'` for all AI-parsed field classes — single constant prevents drift across 4 screen-type forms
- Editable row state uses string values (not numbers) for all form inputs — avoids type friction with React controlled inputs and number coercion edge cases
- W/L result derived at save-time from teamScore vs opponentScore — user may have edited scores, API value could be stale
- Player stats and depth chart are display-only in Phase 8 — player stats require the player record to exist first; no depth chart table in DB schema
- Added explicit null guards inside async handlers (handleParse, handleSaveSchedule, handleSaveRecruiting) because TypeScript cannot narrow activeDynasty across closure boundaries despite the component-level early return

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added null guards in async closures for activeDynasty**
- **Found during:** Task 2 (ScreenshotIngestionPage implementation)
- **Issue:** TypeScript errors TS18047 at lines 133, 208, 238, 251 — `activeDynasty` possibly null inside async functions despite early return guard at component level. TypeScript does not narrow across closure boundaries.
- **Fix:** Added `!activeDynasty` checks in `handleParse`, `handleSaveSchedule`, and `handleSaveRecruiting`
- **Files modified:** apps/desktop/src/pages/ScreenshotIngestionPage.tsx
- **Verification:** `tsc --noEmit` passes with zero errors
- **Committed in:** efa0d02 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - TypeScript null narrowing bug)
**Impact on plan:** Required for correctness and TypeScript compilation. No scope change.

## Issues Encountered
- TypeScript closure narrowing limitation: early `if (!activeDynasty) return null` does not narrow `activeDynasty` to non-null inside nested async functions. Fixed with explicit null guards inside each async handler.

## User Setup Required
None - Anthropic API key reuses existing getApiKey()/setApiKey() from legacy-card-service.ts. In-app key entry prompt shown when key is absent.

## Next Phase Readiness
- ScreenshotIngestionPage ready for human verification (Task 3 checkpoint)
- After approval: all INGST-04, INGST-05, INGST-06 requirements satisfied
- Phase 8 complete after checkpoint; Phase 9 (Madden Import) can begin

## Self-Check: PASSED

Files verified present:
- apps/desktop/src/pages/ScreenshotIngestionPage.tsx: EXISTS (933 lines)
- apps/desktop/src/store/navigation-store.ts: MODIFIED (contains 'screenshot-ingestion')
- apps/desktop/src/App.tsx: MODIFIED (contains ScreenshotIngestionPage)
- apps/desktop/src/pages/DashboardPage.tsx: MODIFIED (contains 'Parse Screenshot')

Commits verified:
- 4b7c235: navigation wiring
- efa0d02: full ScreenshotIngestionPage implementation

---
*Phase: 08-screenshot-ingestion*
*Completed: 2026-02-24 (pending Task 3 human verification)*
