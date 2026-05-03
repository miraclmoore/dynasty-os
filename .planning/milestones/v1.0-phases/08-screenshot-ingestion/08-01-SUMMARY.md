---
phase: 08-screenshot-ingestion
plan: 01
subsystem: api
tags: [claude-vision, tauri, anthropic, screenshot, typescript]

# Dependency graph
requires:
  - phase: 04-narrative-engine
    provides: getApiKey() / setApiKey() from legacy-card-service.ts — reused for Anthropic key storage
provides:
  - parseScreenshot(screenType, imageBase64, dynastyContext) — Claude Vision API integration returning typed ParsedScreenData
  - ScreenType union type (schedule | player-stats | recruiting | depth-chart)
  - ParsedScreenData discriminated union with per-screen-type shapes
  - SCREEN_TYPE_LABELS display map
  - dialog:allow-open Tauri capability for file picker
affects: [08-02-screenshot-ui, future-ingestion-features]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Claude Vision API via fetch with base64 image in user content array (image + text blocks)
    - System prompt carries screen-type instructions with {teamName}/{season} template var substitution
    - null-return error handling pattern (never throws — callers get recoverable signal)
    - data URL prefix stripping before passing base64 to API

key-files:
  created:
    - apps/desktop/src/lib/screenshot-service.ts
  modified:
    - apps/desktop/src-tauri/capabilities/default.json

key-decisions:
  - "claude-haiku-4-5-20251001 for Vision parsing: structured JSON extraction suits Haiku; same model as legacy card blurbs and recruiting grading"
  - "System prompt carries screen instructions, user content = image + 'Parse this screenshot.' — clean separation of instructions from content"
  - "Strip markdown code fences from model response before JSON.parse to handle model wrapping JSON in triple-backtick blocks"
  - "anthropic-dangerous-direct-browser-access header added to allow Tauri WebView direct API calls (matches narrative-service.ts pattern)"

patterns-established:
  - "Vision API pattern: base64 image in content array with type='image', source.type='base64', media_type='image/png'"
  - "Template var substitution: replace {teamName}/{season} in prompt strings before API call"

requirements-completed: [INGST-04, INGST-05]

# Metrics
duration: 2min
completed: 2026-02-24
---

# Phase 8 Plan 01: Screenshot Service Summary

**Claude Vision API integration (parseScreenshot) with four typed screen-type prompts and Tauri dialog:allow-open capability for CFB 25 screenshot ingestion**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-24T23:35:05Z
- **Completed:** 2026-02-24T23:36:17Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Created screenshot-service.ts (171 lines) with parseScreenshot() exporting typed ParsedScreenData union
- Four Vision API system prompts (schedule, player-stats, recruiting, depth-chart) with {teamName}/{season} substitution and strict JSON-only return instructions
- Added dialog:allow-open and fs:allow-read-file to Tauri capabilities, enabling file picker for 08-02 UI
- Reused getApiKey() from legacy-card-service — zero new API key management code

## Task Commits

Each task was committed atomically:

1. **Task 1: Add dialog:allow-open capability and create screenshot-service.ts** - `d9a78c1` (feat)

**Plan metadata:** pending (docs commit)

## Files Created/Modified
- `apps/desktop/src/lib/screenshot-service.ts` - Claude Vision API integration with parseScreenshot(), all screen type definitions, and typed data shapes
- `apps/desktop/src-tauri/capabilities/default.json` - Added dialog:allow-open and fs:allow-read-file permissions

## Decisions Made
- Used claude-haiku-4-5-20251001 (consistent with legacy card blurbs and recruiting grading — structured extraction suits Haiku)
- System prompt holds screen-type instructions; user content is just the image + "Parse this screenshot." — clean separation
- Added markdown code fence stripping before JSON.parse since models sometimes wrap JSON in triple-backticks
- Added anthropic-dangerous-direct-browser-access header to match narrative-service.ts pattern for Tauri WebView

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. Anthropic API key reuses existing getApiKey() from legacy-card-service.ts.

## Next Phase Readiness
- parseScreenshot() is ready for 08-02 to wire up with the file picker UI
- dialog:allow-open capability is in place — Tauri open() dialog can be called immediately in 08-02
- TypeScript compiles with zero errors

## Self-Check: PASSED

All files and commits verified present.

---
*Phase: 08-screenshot-ingestion*
*Completed: 2026-02-24*
