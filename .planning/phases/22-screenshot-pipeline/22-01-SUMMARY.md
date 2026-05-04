---
phase: 22-screenshot-pipeline
plan: "01"
subsystem: ui
tags: [typescript, fuzzy-match, player-matching, screenshot-pipeline]

requires: []
provides:
  - nameSimilarity() function: tiered similarity scoring (exact/substring/char-overlap) for player name strings
  - findBestPlayerMatch() function: returns best-matching Player above 0.4 threshold or null
affects:
  - 22-02-PLAN
  - 22-03-PLAN
  - 22-04-PLAN
  - 22-05-PLAN

tech-stack:
  added: []
  patterns:
    - "Tiered name similarity: exact match (1.0) → substring (0.85) → character set overlap (intersection/maxSize)"
    - "Threshold-gated match: findBestPlayerMatch returns null when best score < 0.4"

key-files:
  created:
    - apps/desktop/src/lib/fuzzy-match.ts
  modified: []

key-decisions:
  - "No external dependencies for fuzzy match — hand-rolled character-set overlap avoids npm footprint"
  - "normalizeName strips apostrophes/hyphens/periods to handle names like Ja'Marr Chase correctly"
  - "0.4 similarity threshold in findBestPlayerMatch balances recall vs precision for OCR-derived names"

patterns-established:
  - "nameSimilarity: normalize → exact → substring → char-set overlap — evaluated top-down, first match wins"
  - "findBestPlayerMatch: returns {player, score} tuple or null — caller decides what to do with score"

requirements-completed: []

duration: 2min
completed: 2026-05-04
---

# Phase 22 Plan 01: Fuzzy Match Utility Summary

**Hand-rolled nameSimilarity() and findBestPlayerMatch() with tiered scoring (exact/substring/char-overlap) and a 0.4 threshold guard — no external dependencies**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-05-04T20:33:00Z
- **Completed:** 2026-05-04T20:34:07Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created `src/lib/fuzzy-match.ts` with no external npm packages
- `nameSimilarity` scores exact matches 1.0, substring matches 0.85, and char-set overlap for all others
- `findBestPlayerMatch` finds the highest-scoring Player above the 0.4 threshold or returns null
- TypeScript compiles with no new errors

## Task Commits

1. **Task 1: Create src/lib/fuzzy-match.ts** - `0a5d934` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified

- `apps/desktop/src/lib/fuzzy-match.ts` — Pure utility: nameSimilarity + findBestPlayerMatch, zero dependencies

## Decisions Made

- No external fuzzy-match library (fuse.js, etc.) — keeps bundle size minimal; the scoring algorithm is straightforward enough to hand-roll
- `normalizeName` strips `' ' . -` characters so names like "Ja'Marr Chase" match "JaMarr Chase" from OCR
- 0.4 threshold chosen to allow for moderate OCR noise while rejecting clearly wrong matches

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `nameSimilarity` and `findBestPlayerMatch` are ready for use by 22-02 (stat screenshot ingestion)
- No blockers

---
*Phase: 22-screenshot-pipeline*
*Completed: 2026-05-04*
