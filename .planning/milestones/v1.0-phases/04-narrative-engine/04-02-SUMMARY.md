---
phase: 04-narrative-engine
plan: "02"
subsystem: ui
tags: [react, zustand, typescript, narrative, localstorage, claude, tailwind]

# Dependency graph
requires:
  - phase: 04-01
    provides: narrative-service.ts, useNarrativeStore, NarrativeTone type, generateSeasonNarrative, loadCachedNarrative
  - phase: 03-player-tracking
    provides: Season data model, useDynastyStore, useSeasonStore
  - phase: 01-foundation
    provides: legacy-card-service.ts getApiKey()/setApiKey() for API key management
provides:
  - SeasonRecapPage.tsx — full page with tone selector, generate flow, tagline display, cache-on-mount
  - season-recap page type in navigation-store.ts with goToSeasonRecap(seasonId) helper
  - Dashboard Actions panel entry point (amber "Season Recap" button)
  - App.tsx routing case for season-recap
affects:
  - 04-03 (future narrative features: any additional narrative UI surfaces)
  - Any phase adding new page types (navigation-store pattern established)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Tone selector card pattern (horizontal card group, ring-2 ring-amber-500 active state)
    - loadCachedNarrative-on-mount pattern (instant display without API call on revisit)
    - forceRefresh=true regeneration pattern (overwrites cache with new tone)
    - Season summary context card (shows Record, Conf Record, Final Ranking, Postseason)
    - Tagline prominent display (text-3xl font-bold text-amber-400)
    - goToSeasonRecap(seasonId) pageParams navigation pattern

key-files:
  created:
    - apps/desktop/src/pages/SeasonRecapPage.tsx
  modified:
    - apps/desktop/src/store/navigation-store.ts
    - apps/desktop/src/App.tsx
    - apps/desktop/src/pages/DashboardPage.tsx

key-decisions:
  - "SeasonRecapPage uses getApiKey()/setApiKey() from legacy-card-service — no new key management"
  - "loadCachedNarrative called on mount — cached narrative displays instantly without API call"
  - "Tone selector defaults to 'espn'; syncs to cached tone on revisit"
  - "Tagline displayed in text-3xl font-bold text-amber-400 — prominent, emotional payoff"
  - "Regenerate button calls generate() with forceRefresh=true to overwrite cache"
  - "Season summary context card shows Record, Conf Record, Final Ranking, Postseason"
  - "goToSeasonRecap(activeSeason.id) called from dashboard — passes seasonId via pageParams"

patterns-established:
  - "goToPage(seasonId) via pageParams: navigation-store pattern for parameterized page navigation"
  - "Amber accent (bg-amber-600) for AI/narrative features: visually distinct from blue/gray data-entry actions"
  - "Tone card selector: horizontal card group with ring-2 highlight for selected state"

# Metrics
duration: ~15min (including human verification)
completed: 2026-02-22
---

# Phase 4 Plan 02: Season Recap Page Summary

**Season Recap UI wired end-to-end: tone selector (ESPN/Hometown/Legend), Claude Sonnet generation with loading state, prominent amber tagline display, instant cache-on-mount revisit, and dashboard Actions panel entry point**

## Performance

- **Duration:** ~15 min (2 auto tasks + human-verify checkpoint)
- **Started:** 2026-02-22
- **Completed:** 2026-02-22
- **Tasks:** 3 (2 auto + 1 checkpoint, approved)
- **Files modified:** 4

## Accomplishments

- Full SeasonRecapPage.tsx (353 lines) with tone selector, generate/regenerate flow, tagline display, API key prompt, error states, and season summary context card
- Navigation wired: season-recap added to Page type, goToSeasonRecap(seasonId) helper, App.tsx routing case
- Dashboard amber "Season Recap" button in Actions panel gives coaches a single-click path to narrative
- Cache-on-mount pattern: returning to the page shows last generated recap instantly with no API call
- Human verification approved — all three tones (ESPN/Hometown/Legend) produce visually distinct UI state, regeneration overwrites cache, cached narrative loads on revisit

## Task Commits

Each task was committed atomically:

1. **Task 1: Add season-recap page to navigation and app routing** - `95e4da2` (feat)
2. **Task 2: Build SeasonRecapPage with tone selector, generate flow, and cached display** - `b04c823` (feat)
3. **Task 3: checkpoint:human-verify** - approved by user (no commit — verification milestone)

**Prior STATE.md update:** `3a23244` (docs: update STATE.md at checkpoint pause)

## Files Created/Modified

- `apps/desktop/src/pages/SeasonRecapPage.tsx` - 353-line full page: tone selector cards, generate/regenerate button with loading state, tagline (text-3xl amber-400), recap paragraph display (whitespace-pre-line, max-w-3xl), season summary context card, API key setup prompt, error handling, cache-on-mount
- `apps/desktop/src/store/navigation-store.ts` - Added 'season-recap' to Page type union; added goToSeasonRecap(seasonId) action
- `apps/desktop/src/App.tsx` - Added `case 'season-recap': return <SeasonRecapPage />` to navigation switch
- `apps/desktop/src/pages/DashboardPage.tsx` - Added amber "Season Recap" button in Actions panel inside activeSeason conditional block

## Decisions Made

- **getApiKey()/setApiKey() from legacy-card-service:** Narrative page reuses the existing Anthropic API key management — zero new key storage code. Same UX as Legacy Card settings.
- **loadCachedNarrative on mount:** On page load, the store checks localStorage before making any API call. Cached narrative renders immediately; coach sees their story before they interact with anything.
- **Tone defaults to 'espn', syncs to cached tone:** First visit defaults to ESPN. On revisit, the selector updates to match whatever tone produced the cached narrative.
- **Tagline in text-3xl font-bold text-amber-400:** The tagline is the most emotionally resonant output — displaying it larger than the body text makes it feel like a headline, not a footnote.
- **forceRefresh=true on Regenerate:** The generate action overwrites the cache. There is no "both tones cached" state — the last-generated tone wins. This keeps the cache simple (one entry per season).
- **Season summary context card:** Record, Conference Record, Final Ranking, and Postseason result shown above or beside the recap so the coach can cross-reference what the AI is working from.
- **goToSeasonRecap(activeSeason.id):** Passes seasonId via pageParams so SeasonRecapPage can call loadCachedNarrative with the correct key on mount without querying the season store again.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — API key is managed in-app via the existing Anthropic key setup prompt (getApiKey/setApiKey from legacy-card-service). No external configuration required.

## Next Phase Readiness

- Season Recap page is complete and accessible from the Dashboard
- All three tone presets generate narratively distinct content via Claude Sonnet 4.6
- Cache layer (localStorage, keyed by seasonId) is operational — instant revisit loads
- Phase 04-03 can add additional narrative surfaces (e.g., player milestone narratives, season preview) using the same narrative-service.ts + useNarrativeStore pattern established in 04-01/04-02
- No blockers for remaining Phase 4 plans

---
*Phase: 04-narrative-engine*
*Completed: 2026-02-22*
