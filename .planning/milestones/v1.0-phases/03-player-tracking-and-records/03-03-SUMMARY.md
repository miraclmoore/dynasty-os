---
phase: 03-player-tracking-and-records
plan: "03"
subsystem: ui
tags: [legacy-card, claude-api, html-to-image, tauri, png-export, react, zustand, localStorage]

# Dependency graph
requires:
  - phase: 03-02
    provides: career-stats.ts (computeCareerStats/computeCareerAwards/computeSeasonCount), player-season-service.ts (getPlayerSeasonsByDynasty), PlayerProfilePage with departure recording
provides:
  - LegacyCard component (forwardRef, gold/dark gradient design)
  - LegacyCardExport component (Tauri-safe PNG export via plugin-dialog + plugin-fs)
  - LegendsPage with position/era/award filters
  - legacy-card-service.ts (buildLegacyCardData, generateLegacyBlurb, API key management)
  - Auto-generation of Legacy Card + Claude Haiku blurb on player departure
affects: [04-recruiting-pipeline, 09-polish-and-export]

# Tech tracking
tech-stack:
  added: [html-to-image@1.11.13]
  patterns:
    - forwardRef pattern for DOM node capture in parent (LegacyCard → LegacyCardExport)
    - Tauri-safe binary file export (toPng → Uint8Array → writeFile, no blob URLs)
    - Optional AI enhancement with graceful degradation (null on missing key or failure)
    - Single bulk DB query + in-memory partition (getPlayerSeasonsByDynasty, not per-player loop)
    - localStorage for blurb persistence (legacy-blurb-{playerId})

key-files:
  created:
    - apps/desktop/src/lib/legacy-card-service.ts
    - apps/desktop/src/components/LegacyCard.tsx
    - apps/desktop/src/components/LegacyCardExport.tsx
    - apps/desktop/src/pages/LegendsPage.tsx
  modified:
    - apps/desktop/src/pages/PlayerProfilePage.tsx
    - apps/desktop/src/pages/DashboardPage.tsx
    - apps/desktop/src/App.tsx
    - apps/desktop/package.json

key-decisions:
  - "Claude Haiku (claude-haiku-4-5-20251001) for blurbs — cheapest/fastest, 200 max_tokens"
  - "Blurb stored in localStorage key legacy-blurb-{playerId}, NOT in Player.notes field"
  - "Single getPlayerSeasonsByDynasty call in LegendsPage — partitioned in memory by playerId"
  - "generateLegacyBlurb always returns null on error — never throws, never blocks departure"

patterns-established:
  - "Tauri file export: toPng (html-to-image) → base64 → Uint8Array → save() dialog → writeFile()"
  - "forwardRef on visual card component so parent can capture DOM node for export"
  - "Legacy blurb generation fires after departure submit as background promise — never awaited"

# Metrics
duration: 4min
completed: 2026-02-22
---

# Phase 3 Plan 03: Legacy Cards Summary

**Legacy Cards auto-generated at departure with career stats, optional Claude Haiku Hall of Fame blurb, Tauri-safe PNG export, and filterable Program Legends gallery**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-22T04:07:37Z
- **Completed:** 2026-02-22T04:11:27Z
- **Tasks:** 2/2
- **Files modified:** 8

## Accomplishments

- `buildLegacyCardData` assembles career stats/awards/season count into a `LegacyCardData` struct; `generateLegacyBlurb` calls Claude Haiku with a Hall of Fame announcer prompt and gracefully returns null on missing key or any failure
- `LegacyCard` (forwardRef, 400px gold/dark gradient) renders player name, position, career stats grid, award badges, and optional italic AI blurb
- `LegacyCardExport` exports PNG via `toPng` → `Uint8Array` → `save()` dialog → `writeFile()` — no blob URLs or anchor.click()
- `LegendsPage` loads all playerSeasons in a single `getPlayerSeasonsByDynasty` call, partitions by playerId in memory, and renders a filterable grid (position, era/decade, award)
- `PlayerProfilePage` auto-fires blurb generation as a background promise after departure submit; shows Legacy Card + Export button + Regenerate Blurb + API key settings for departed players
- `DashboardPage` Actions panel gains a "Program Legends" nav button; `App.tsx` wires real `LegendsPage` replacing placeholder

## Task Commits

Each task was committed atomically:

1. **Task 1: Legacy card service with Claude API blurb generation** - `5233818` (feat)
2. **Task 2: Legacy Card component, PNG export, Legends gallery, and departure trigger wiring** - `7440477` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `apps/desktop/src/lib/legacy-card-service.ts` — LegacyCardData interface, buildLegacyCardData, generateLegacyBlurb, getApiKey/setApiKey/clearApiKey
- `apps/desktop/src/components/LegacyCard.tsx` — Visual Legacy Card, forwardRef, gold/dark gradient
- `apps/desktop/src/components/LegacyCardExport.tsx` — PNG export button (Tauri-safe: plugin-dialog + plugin-fs)
- `apps/desktop/src/pages/LegendsPage.tsx` — Program Legends gallery with position/era/award filters
- `apps/desktop/src/pages/PlayerProfilePage.tsx` — Legacy Card wiring, auto-blurb on departure, API key settings
- `apps/desktop/src/pages/DashboardPage.tsx` — Added Program Legends nav button
- `apps/desktop/src/App.tsx` — Replaced LegendsPage placeholder with real component
- `apps/desktop/package.json` — Added html-to-image@1.11.13

## Decisions Made

- **Claude Haiku for blurbs:** `claude-haiku-4-5-20251001` — cheapest and fastest; a 2-3 sentence blurb doesn't need Sonnet-class reasoning
- **localStorage for blurb persistence:** Key `legacy-blurb-{playerId}` keeps blurb text out of the Player record (no schema change, no DB write on regenerate)
- **Blurb generation as fire-and-forget promise:** Called after departure submit completes; never awaited on the critical path — departure always succeeds even if Claude API is down
- **Single bulk query in LegendsPage:** `getPlayerSeasonsByDynasty(dynastyId)` once, then `O(n)` in-memory partition by `playerId` — avoids N+1 query pattern

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. The Anthropic API key is stored by the user in-app via the Legacy Card settings UI (localStorage key `dynasty-os-anthropic-api-key`).

## Next Phase Readiness

- Legacy Cards are production-ready for CFB dynasties
- LegendsPage renders gracefully with zero departed players (empty state message)
- PNG export path tested at build level; runtime requires Tauri fs/dialog plugins already registered in `src-tauri/Cargo.toml` (registered in Phase 01)
- Plan 03-04 (leaderboards) can proceed immediately — career stats infrastructure is complete

---
*Phase: 03-player-tracking-and-records*
*Completed: 2026-02-22*
