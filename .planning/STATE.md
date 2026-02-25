# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-24)

**Core value:** The memory layer, narrative engine, and legacy vault that sports games never built — transforming raw dynasty data into stories that persist, compound, and can be shared.
**Current focus:** Milestone v2.0 — The Living Dynasty (defining requirements)

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-02-24 — Milestone v2.0 started

## Performance Metrics

**Velocity:**
- Total plans completed: 25
- Average duration: ~4.8 min
- Total execution time: ~111 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan | Status |
|-------|-------|-------|----------|--------|
| 01-foundation | 4/4 | ~35 min | ~8.8 min | ✓ Complete |
| 02-core-loop | 5/5 | ~36 min | ~7.2 min | ✓ Complete |
| 03-player-tracking | 4/4 | ~14 min | ~3.5 min | ✓ Complete |
| 04-narrative-engine | 2/2 | ~17 min | ~8.5 min | ✓ Complete |
| 05-cfb-features | 4/4 | ~12 min | ~3 min | ✓ Complete |
| 06-social-and-legacy | 3/3 | ~19 min | ~6.3 min | ✓ Complete |
| 07-achievements | 2/2 | ~5 min | ~2.5 min | ✓ Complete |
| 08-screenshot-ingestion | 2/2 | ~4 min | ~2 min | ✓ Complete |
| 09-madden-sync | 3/3 | ~8 min | ~2.7 min | ✓ Complete |

**Recent Trend:**
- Last 5 plans: 4 min, 2 min, 3 min, 3 min, 2 min
- Trend: Stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Tauri over Electron: <80MB idle RAM target incompatible with Electron's 150-300MB footprint
- Sport Config pattern: isolates sport differences in config objects; shared components stay sport-agnostic
- Local-first, no cloud V1: eliminates auth complexity and hosting costs; JSON export covers portability
- madden-franchise library risk: Madden 26 schema support in-progress — version-check guard + fallback implemented in Phase 9
- [Phase 09-madden-sync]: Tauri sidecar = shell wrapper (dev) forwarding to Node.js madden-reader.cjs; production needs pkg compile
- [Phase 09-madden-sync]: sidecar binary name must match platform triple: aarch64-apple-darwin (macOS arm64) or x86_64-apple-darwin
- [Phase 09-madden-sync]: computeSyncDiff team identification uses substring match on dynasty.teamName vs homeTeam/awayTeam strings
- [Phase 09-madden-sync]: fs:allow-watch capability required for tauri-plugin-fs watch() API
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
- Records-service no-cache pattern: getSingleSeasonLeaders/getCareerLeaders/getHeadToHeadRecords compute fresh each call — data sets are small, freshness > optimization
- H2H era filter by year range: coaching era filter is V1 out-of-scope (coaching history not tracked in data model)
- Claude Sonnet 4.6 for season narrative recap: longer-form content than blurbs; Haiku for short blurbs, Sonnet for 2-3 paragraph season stories
- Narrative cache key dynasty-os-narrative-{seasonId}: matches existing localStorage naming pattern; cached by seasonId regardless of tone — forceRefresh=true to regenerate with different tone
- Tagline-in-response pattern: TAGLINE: [three words] parsed from end of API response — no second API call needed
- SeasonRecapPage getApiKey()/setApiKey() reuse: no new API key management code; same in-app prompt pattern as Legacy Card settings
- loadCachedNarrative on mount: SeasonRecapPage displays cached narrative immediately on revisit without any API call
- Tone selector defaults to espn, syncs to cached tone: ESPN is the default on first visit; on revisit, selector updates to match last-used tone
- Tagline text-3xl font-bold text-amber-400: tagline is the emotional headline — larger than body text to feel like a broadcast headline
- Amber accent (bg-amber-600) for AI/narrative features: visually distinct from blue/gray data-entry action buttons on Dashboard
- Single DB version bump (v2→v3) for all 5 Phase 5 tables: prevents migration conflicts across 05-02/03/04 plans
- CFB sport guard pattern: activeDynasty.sport !== 'cfb' check at top of CFB-only pages — reuse in 05-02/03/04
- Structured AI response parsing (GRADE:/ANALYSIS: regex): consistent pattern for structured Claude API responses
- claude-haiku-4-5-20251001 for recruiting class grading: consistent with legacy card blurb model; structured grading suits Haiku's capabilities
- calculateNetImpact as pure function in service (not store): business logic decoupled from Zustand, no side effects, easily testable
- Transfer portal season selector as local state: selectedSeason in component, not store — portal entries are season-scoped, season picker is UI concern only
- War Room two-column layout: lg:grid-cols-2 on desktop, stacked on mobile — same responsive pattern available for 05-03/04
- getPositionBreakdown: case-insensitive position matching (toUpperCase), only returns groups with count > 0
- Draft pick player linking: optional playerId auto-fills playerName and position from player record; playerName always stored as plain string for display without DB lookup
- Season pre-selection in draft form: defaults to seasons[0] (most recent) when seasons load — reduces friction for common case
- calculatePrestigeTrend 5-point threshold: delta > 5 = up, delta < -5 = down, else stable — pure function in service layer
- Pure SVG chart (no external library): polyline/circle/text elements, viewBox 0 0 700 300, recruiting rank Y-axis inverted (1=top, 150=bottom)
- Pre-fill-on-year-match: PrestigeTrackerPage year input onChange checks store for existing record, pre-fills form fields if found — no separate edit mode state needed
- calculateRivalryIntensity pure function: min(10, ceil(totalGames/2)) — intensity earned over time, not configurable
- scoutingNotes Table<Record<string,unknown>> placeholder: typed properly in 06-03, avoids blocking type error in 06-01
- ScoutingNote upsert pattern: check-then-update-or-create via [dynastyId+opponent] compound index; one note per opponent per dynasty
- ScoutingCardPage sport-agnostic: placed in general actions section (not CFB guard); uses getHeadToHeadRecords as opponent list source
- RivalryTrackerPage no sport guard: rivalries are sport-agnostic, unlike CFB-only prestige/recruiting features
- window.print() for timeline PDF export: consistent with Tauri blob URL constraint; no extra dependencies needed
- ProgramTimelinePage no sport guard: timeline is sport-agnostic — seasons exist for all sports
- CSS @media print with no-print classNames: inline style element hides UI chrome during window.print(), page-break-inside: avoid per node
- playoffResult championship detection uses case-insensitive includes('champion'): Season.playoffResult is free-text string — strict equality to 'champion' would never match user entries like "CFP Champion"
- Achievement id compound key is dynastyId+achievementId string: enables db.achievements.put() upsert idempotency without separate exists check
- [Phase 07-achievements]: evaluateAchievements fires as fire-and-forget (.catch(()=>{})): failure must never block game logging or season update — same pattern as Claude Haiku Legacy Card blurbs
- [Phase 07-achievements]: CoachingResumePage uses direct db queries (no service layer): career stats are page-specific aggregations — matches records-service no-cache pattern
- [Phase 08-screenshot-ingestion]: claude-haiku-4-5-20251001 for Vision parsing: structured JSON extraction suits Haiku; same model as legacy card blurbs and recruiting grading
- [Phase 08-screenshot-ingestion]: System prompt carries screen instructions, user content = image + 'Parse this screenshot.' — clean separation of instructions from content
- [Phase 08-screenshot-ingestion]: Strip markdown code fences from model response before JSON.parse — model may wrap JSON in triple-backtick blocks
- [Phase 08-screenshot-ingestion]: anthropic-dangerous-direct-browser-access header required for Tauri WebView direct API calls
- [Phase 08-screenshot-ingestion]: AMBER_INPUT const for amber field classes: single source of truth prevents class drift across 4 form types
- [Phase 08-screenshot-ingestion]: Screenshot ingestion UX pattern: screen type selection -> Tauri file dialog -> preview -> Vision API spinner -> amber confirmation form -> save/discard

### Pending Todos

None. All 9 phases complete.

### Blockers/Concerns

- Madden 26 schema support in madden-franchise library not yet released — fallback UI is live
- Sidecar production binary not yet compiled — dev mode uses shell wrapper (requires Node.js on dev machine); production needs `npx pkg` step
- Windows production memory (<80MB target) not yet validated — needs measurement on actual Windows build
- sidecar/package.json madden-franchise dep needs `npm install` in src-tauri/sidecar/ before first use

## Session Continuity

Last session: 2026-02-24 UTC
Stopped at: Phase 9 Madden Sync complete — all 9 phases done. Milestone 1 complete.
Resume file: None
