---
phase: 22
plan: "04"
subsystem: screenshot-pipeline
tags: [cfb, recruiting, screenshot, rule-of-19, display-only]
dependency_graph:
  requires: [21-01, 22-01, 22-02, 22-03]
  provides: [recruiting-motivations-screen-type, recruiting-calculator]
  affects: [ScreenshotIngestionPage, screenshot-service, recruiting-calculator]
tech_stack:
  added: []
  patterns: [rule-of-19-hard-sell, display-only-screen-type, grade-point-table]
key_files:
  created:
    - apps/desktop/src/lib/recruiting-calculator.ts
  modified:
    - apps/desktop/src/lib/screenshot-service.ts
    - apps/desktop/src/pages/ScreenshotIngestionPage.tsx
decisions:
  - "recruiting-calculator.ts isolated as standalone utility for reuse in Phase 24 recruiting tools"
  - "Display-only screen type pattern: no initEditableState mutation, no DB write, Done button only"
  - "Recommendation banner gated on all 3 grades present (null guard in getHardSellRecommendation)"
  - "Grade color: A=green-400, B=amber-400, C/D/F=red-400 using startsWith for +/- variants"
metrics:
  duration: "~2 min"
  completed: "2026-05-04"
  tasks: 3
  files: 3
---

# Phase 22 Plan 04: PIPE-03 — Recruiting Motivations Screen Type Summary

**One-liner:** CFB-only `recruiting-motivations` screen type with AI prompt using all 14 deal-breaker categories and inline Rule of 19 Hard Sell / Send the House recommendation.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 0 | Create `recruiting-calculator.ts` | c3f43bb | apps/desktop/src/lib/recruiting-calculator.ts |
| 1 | Add `recruiting-motivations` to `screenshot-service.ts` | 3d3044f | apps/desktop/src/lib/screenshot-service.ts |
| 2 | Add CFB screen type + render confirmation UI | c4844d6 | apps/desktop/src/pages/ScreenshotIngestionPage.tsx |

## What Was Built

### Task 0: `recruiting-calculator.ts`

New utility with the full A+ (13) through F (1) grade point table. Exports:
- `gradeToPoints(grade)` — maps letter grade to point value
- `getHardSellRecommendation(g1, g2, g3)` — returns `'Hard Sell'` | `'Send the House'` | `null` (null when any grade missing)

Isolated in `lib/` for Phase 24 reuse in recruiting tools (Hard Sell calculator page).

### Task 1: `screenshot-service.ts` modifications

- `ScreenType` union extended with `'recruiting-motivations'`
- `RecruitingMotivationsParsedData` interface added (recruits array with name, 3 motivation+grade pairs, dealBreaker)
- `ParsedScreenData` union includes the new type
- `SCREEN_TYPE_LABELS['recruiting-motivations']` = `'Recruit Pitch Screen'`
- `SCREEN_TYPE_PROMPTS['recruiting-motivations']` — template literal using `CFB_DEAL_BREAKER_CATEGORIES.join(', ')` so all 14 category strings appear verbatim in the AI prompt

### Task 2: `ScreenshotIngestionPage.tsx` modifications

- `RecruitingMotivationsParsedData` and `getHardSellRecommendation` imported
- `CFB_SCREEN_TYPES` array includes `'recruiting-motivations'` (not in `NFL_SCREEN_TYPES`)
- `renderRecruitingMotivationsForm()` renders:
  - Header with recruit name
  - Screenshot thumbnail
  - Inline recommendation banner (green for Hard Sell, amber for Send the House) — only when all 3 grades parsed
  - Motivation table: category name, grade (color-coded), deal breaker status
  - Done button (no save action — display-only)
- `renderConfirmationForm()` switch has `case 'recruiting-motivations':` before `default:`
- `initEditableState()` has `else-if` branch for `'recruiting-motivations'` (display-only, no state mutation)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — this is a display-only screen type; no DB write is attempted and the UI renders all parsed data directly.

## Threat Flags

None — no new network endpoints, auth paths, or trust boundary changes. The `recruiting-motivations` prompt routes through the existing `callAnthropic` Rust command.

## Self-Check: PASSED

- [x] apps/desktop/src/lib/recruiting-calculator.ts exists
- [x] apps/desktop/src/lib/screenshot-service.ts modified (commits 3d3044f)
- [x] apps/desktop/src/pages/ScreenshotIngestionPage.tsx modified (commit c4844d6)
- [x] Commits c3f43bb, 3d3044f, c4844d6 all exist in git log
- [x] `npx tsc --noEmit` exits 0 with no errors
