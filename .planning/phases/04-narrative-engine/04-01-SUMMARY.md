---
phase: 04-narrative-engine
plan: "01"
subsystem: ai
tags: [claude, anthropic, zustand, narrative, localstorage, typescript]

# Dependency graph
requires:
  - phase: 03-player-tracking
    provides: PlayerSeason data model, getPlayerSeasonsBySeason service
  - phase: 02-core-loop
    provides: Game data model, getGamesBySeason service, Season data model
  - phase: 01-foundation
    provides: legacy-card-service.ts with getApiKey() API key management
provides:
  - narrative-service.ts with three-tone Claude API integration and localStorage caching
  - useNarrativeStore Zustand store for narrative state management
  - generateSeasonNarrative, getCachedNarrative, clearCachedNarrative functions
  - NarrativeTone and SeasonNarrative types
affects:
  - 04-02 (SeasonSummaryPage — consumes useNarrativeStore)
  - Any future components displaying season narratives

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Three-tone AI system prompt pattern (ESPN/Hometown/Legend produce distinctly different voice)
    - Tagline-in-response pattern (TAGLINE: xxx parsed from same API response, no separate call)
    - localStorage caching pattern (dynasty-os-narrative-{seasonId}) matching legacy-blurb-{playerId}
    - Service function returns null on failure (never throws) — same pattern as generateLegacyBlurb

key-files:
  created:
    - apps/desktop/src/lib/narrative-service.ts
    - apps/desktop/src/store/narrative-store.ts
  modified:
    - apps/desktop/src/store/index.ts

key-decisions:
  - "Claude Sonnet 4.6 for narrative recap (not Haiku): quality matters for 2-3 paragraph season stories; Haiku reserved for short blurbs"
  - "Tagline parsed from same API response via TAGLINE: format — no second API call"
  - "findLastIndex polyfilled with manual reverse loop — tsconfig target does not include ES2023"
  - "Cache keyed by seasonId only (not tone): cached narrative retains its tone; caller must pass forceRefresh to regenerate with different tone"

patterns-established:
  - "Narrative cache key: dynasty-os-narrative-{seasonId} — matches dynasty-os-anthropic-api-key and legacy-blurb-{playerId} naming convention"
  - "forceRefresh?: boolean pattern: bypasses cache check when explicitly requested"
  - "buildNarrativeContext: async aggregation of dynasty + season + games + player stats before API call"

# Metrics
duration: 2min
completed: 2026-02-22
---

# Phase 4 Plan 01: Narrative Engine Service Layer Summary

**Claude Sonnet 4.6 season recap generator with three distinct tone presets (ESPN/Hometown/Legend), game-log and player-stats context aggregation, TAGLINE: response parsing, and localStorage caching keyed by seasonId**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-22T04:42:24Z
- **Completed:** 2026-02-22T04:44:26Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Three distinct AI tone system prompts: ESPN (authoritative/network-quality), Hometown (warm/community beat reporter), Legend (mythic/dynasty-builder epic narrator)
- Full season context aggregation: dynasty info, W-L record, game-by-game log with rankings and scores, top 5 player stat leaders
- generateSeasonNarrative with localStorage caching — never re-fetches if cached, respects forceRefresh flag
- getApiKey() reused from legacy-card-service.ts — zero new API key management code
- useNarrativeStore with loading/error state wrapping the service cleanly

## Task Commits

Each task was committed atomically:

1. **Task 1: Create narrative service with tone system, API integration, and localStorage caching** - `9dd6b63` (feat)
2. **Task 2: Create narrative Zustand store and add barrel export** - `57630d4` (feat)

## Files Created/Modified

- `apps/desktop/src/lib/narrative-service.ts` - NarrativeTone + SeasonNarrative types, TONE_SYSTEM_PROMPTS record, buildNarrativeContext aggregation, generateSeasonNarrative API call with tagline parsing, getCachedNarrative/clearCachedNarrative localStorage helpers
- `apps/desktop/src/store/narrative-store.ts` - Zustand store with narrative/loading/error state, loadCachedNarrative/generate/clear actions
- `apps/desktop/src/store/index.ts` - Added useNarrativeStore barrel export

## Decisions Made

- **Claude Sonnet 4.6 for narratives (not Haiku):** Season recaps are longer-form, more nuanced content than player blurbs — Sonnet quality justified at 1000 max_tokens
- **Tagline in same response:** Each system prompt instructs Claude to end with "TAGLINE: [three words]" — parsed by finding the last line starting with "TAGLINE:". Fallback: first 3 words of raw text if format fails
- **findLastIndex manual loop:** TypeScript tsconfig target does not include ES2023 — replaced `Array.findLastIndex` with a manual reverse-index loop (caught and fixed by tsc)
- **Cache by seasonId only:** Narrative is cached regardless of tone — if user generates with ESPN tone, that's what's cached. forceRefresh=true required to generate with a different tone

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced findLastIndex with reverse loop for ES2023 compatibility**

- **Found during:** Task 1 (TypeScript compilation check)
- **Issue:** `Array.prototype.findLastIndex` requires `lib: es2023` or later — not in current tsconfig target, causing TS2550 error
- **Fix:** Replaced with a `for` loop iterating from `lines.length - 1` to `0` with early break — identical behavior
- **Files modified:** apps/desktop/src/lib/narrative-service.ts
- **Verification:** `npx tsc --noEmit` — zero errors
- **Committed in:** 9dd6b63 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug / compatibility fix)
**Impact on plan:** Single-line compatibility fix. No scope change or behavioral difference.

## Issues Encountered

None beyond the findLastIndex TS compatibility issue noted above, which was caught and fixed immediately by the compilation check.

## User Setup Required

None — API key management reuses the existing Anthropic key stored at `dynasty-os-anthropic-api-key` in localStorage (set via Settings page from Phase 03).

## Next Phase Readiness

- narrative-service.ts and useNarrativeStore are ready for consumption by Phase 04-02 (SeasonSummaryPage)
- generateSeasonNarrative accepts Dynasty + Season objects — both available from existing stores
- Cache is pre-populated on generate; SeasonSummaryPage can call loadCachedNarrative on mount for instant load
- No blockers for Phase 04-02

---
*Phase: 04-narrative-engine*
*Completed: 2026-02-22*
