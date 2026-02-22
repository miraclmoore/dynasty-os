# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** The memory layer, narrative engine, and legacy vault that sports games never built — transforming raw dynasty data into stories that persist, compound, and can be shared.
**Current focus:** Phase 3 — Player Tracking and Records

## Current Position

Phase: 3 of 9 (Player Tracking and Records)
Plan: 3 of 4 in current phase
Status: In progress
Last activity: 2026-02-22 — Completed 03-03-PLAN.md (Legacy Cards, Claude AI blurb, PNG export, Legends gallery)

Progress: [███████░░░] 33% (12/36 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 12
- Average duration: ~6.3 min
- Total execution time: ~68 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan | Status |
|-------|-------|-------|----------|--------|
| 01-foundation | 4/4 | ~35 min | ~8.8 min | ✓ Complete |
| 02-core-loop | 5/5 | ~36 min | ~7.2 min | ✓ Complete |
| 03-player-tracking | 3/4 | ~11 min | ~3.7 min | In progress |

**Recent Trend:**
- Last 5 plans: 15 min, 2 min, 3 min, 4 min, 4 min
- Trend: Stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Tauri over Electron: <80MB idle RAM target incompatible with Electron's 150-300MB footprint
- Sport Config pattern: isolates sport differences in config objects; shared components stay sport-agnostic
- Local-first, no cloud V1: eliminates auth complexity and hosting costs; JSON export covers portability
- madden-franchise library risk: Madden 26 schema support in-progress — version-check guard + fallback required
- Port 1420 for Vite dev server: Tauri convention; set now to avoid config churn in Plan 01-02
- pnpm v10 onlyBuiltDependencies: esbuild must be explicitly allowed; add to root package.json pnpm.onlyBuiltDependencies
- type: module in desktop packages: required to avoid ESM/CJS ambiguity warnings with Vite + postcss
- SportType lowercase keys ('cfb' | 'madden'): matches getSportConfig() string lookup without case conversion
- Dexie Table<T, string> over EntityTable: Dexie v4.3.0 does not export EntityTable
- PlayerSeason.stats as Record<string, number>: flexible stat storage avoids schema migration per sport
- Tauri icons must be RGBA PNG: proc-macro validates at compile time (not RGB); generate with color_type=6
- macOS RSS inflates Tauri memory: WKWebView shared frameworks counted in RSS; Windows Edge WebView2 target expected to read ~30-50MB
- Blob URL downloads don't work in Tauri WebView: WKWebView and WebView2 block anchor.click() blob downloads; use tauri-plugin-dialog (save()) + tauri-plugin-fs (writeTextFile()) for all file export
- Zustand store pattern: loadDynasties() called after every mutation (create/delete/import); activeDynasty cleared on delete if it matches
- recalculateSeasonRecord pattern: called after every game write (create/update/delete); Season wins/losses/confWins/confLosses always reflect actual game data
- Conference record isolation: confWins/confLosses count only gameType === 'conference' games; bowl/playoff/regular excluded
- useSeasonStore.activeSeason: season with highest year (getSeasonsByDynasty returns descending); UI must also call loadSeasons after logGame to reflect updated W/L
- Dashboard single-subscriber pattern: DashboardPage subscribes to stores and passes props to widgets to avoid duplicate subscriptions and unnecessary re-renders
- WeeklySnapshot currentWeek = max(game.week)+1: represents next week to play (forward-looking), not last week played
- Bounded dropdown pattern: any field with a known valid range (1-25) uses select, not number input — prevents invalid/duplicate entry without manual validation
- usedRankings Set pattern: collect already-used values from store via useMemo, filter from dropdown options to enforce uniqueness per season
- teamRanking not filtered for uniqueness: team's own ranking CAN repeat across weeks (unlike opponentRanking); no usedRankings filter applied
- Dexie multi-version migration: version(1).stores(SCHEMA) + version(N).stores(SCHEMA) required to register upgrade path from any prior version
- Per-game ranking delta derivation: sort games with teamRanking by week desc, delta = previousRanking - currentRanking (positive = moved up in rankings)
- Navigation store over router library: desktop app needs simple page state, not URL routing; useNavigationStore with currentPage/pageParams is sufficient
- cascade-delete in player-service: deletePlayer removes playerSeasons before deleting player record to maintain referential integrity at service layer
- Sparse stats Record: PlayerSeason.stats only stores non-zero values; computeCareerStats treats missing keys as 0 — keeps records lean without information loss
- Position-driven stat display: PlayerProfilePage uses POSITION_STAT_KEYS map to show position-relevant columns in season history table; pattern reusable for leaderboards
- Weighted average for decimal career stats: passerRating/puntAverage/sacks averaged by gamesPlayed (weighted) not summed — falls back to simple average when gamesPlayed=0
- Claude Haiku for Legacy Card blurbs: cheapest/fastest model; 200 max_tokens; blurb generation fires as background promise — never blocks departure
- Legacy blurb in localStorage (legacy-blurb-{playerId}): keeps blurb out of Player record; no DB schema change needed
- Single bulk query for LegendsPage: getPlayerSeasonsByDynasty once, partition in memory — avoids N+1 query loop
- Tauri PNG export pattern: toPng (html-to-image) → base64 → Uint8Array → save() dialog → writeFile() — blob URLs blocked in WKWebView/WebView2

### Pending Todos

None.

### Blockers/Concerns

- madden-franchise library may not support Madden 26 schema at launch — Phase 9 must include fallback path (planned)
- CFB ingestion is console-only; screenshot path is the sole automated ingestion method — Phase 8 coverage is critical for user adoption
- Windows production memory (<80MB target) not yet validated — needs measurement on actual Windows build after Windows dev setup

## Session Continuity

Last session: 2026-02-22 UTC
Stopped at: Completed 03-03-PLAN.md (Legacy Cards, Claude AI blurb, PNG export via Tauri, Legends gallery)
Resume file: None
