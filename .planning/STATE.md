# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** The memory layer, narrative engine, and legacy vault that sports games never built — transforming raw dynasty data into stories that persist, compound, and can be shared.
**Current focus:** Milestone v2.1 — UX/UI Polish (Phases 14–18)

## Current Position

Phase: 14 — Onboarding Overhaul (not started)
Plan: —
Status: Roadmap created; ready to plan Phase 14
Last activity: 2026-02-25 — v2.1 roadmap written (Phases 14–18, 12 requirements mapped)

Progress: [Phase 14 of 18] ░░░░░░░░░░░░░░░░░░░░ 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 34
- Average duration: ~4.7 min
- Total execution time: ~123 min

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
| 10-infrastructure-foundation | 4/4 | ~8 min | ~2 min | ✓ Complete |
| 11-qol-wins | 6/6 | ~30 min | ~5 min | ✓ Complete |
| 12-community-features | 6/7 | ~20 min | ~3.3 min | In Progress |
| 13-ai-intelligence-layer | 0/TBD | — | — | Not started |
| 14-onboarding-overhaul | 0/TBD | — | — | Not started |
| 15-navigation | 0/TBD | — | — | Not started |
| 16-tooltips-and-quick-entry | 0/TBD | — | — | Not started |
| 17-data-display-and-page-audit | 0/TBD | — | — | Not started |
| 18-error-states | 0/TBD | — | — | Not started |

**Recent Trend:**
- Last 5 plans: 2 min, 3 min, 3 min, 2 min, 2 min
- Trend: Stable

*Updated after each plan completion*
| Phase 10 P01 | 1 | 2 tasks | 9 files |
| Phase 10 P02 | 1 | 2 tasks | 2 files |
| Phase 10 P03 | 4 | 2 tasks | 8 files |
| Phase 10 P04 | 2 | 2 tasks | 6 files |
| Phase 11-qol-wins P05 | 3 | 2 tasks | 2 files |
| Phase 11 P01 | 5 | 2 tasks | 5 files |
| Phase 11-qol-wins P04 | 5 | 2 tasks | 6 files |
| Phase 11 P02 | 8 | 2 tasks | 5 files |
| Phase 11 P06 | 5 | 2 tasks | 0 files |
| Phase 12 P01 | 2 | 2 tasks | 6 files |
| Phase 12 P02 | 3 | 2 tasks | 8 files |
| Phase 12-community-features P03 | 4 | 2 tasks | 9 files |
| Phase 12-community-features P04 | 4 | 2 tasks | 7 files |
| Phase 12 P04 | 4 | 2 tasks | 7 files |
| Phase 12 P05 | 2 | 2 tasks | 5 files |
| Phase 12 P06 | 9 | 2 tasks | 7 files |

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
- [Phase 11-qol-wins]: dynasty-os-checklist-{seasonId} localStorage key: matches existing naming pattern; keyed by season to reset correctly on season switch
- [Phase 11-qol-wins]: Timeline scrubber only shown when nodes.length > 1: single-season timelines don't need navigation; no-print class hides it during PDF export
- [Phase 11-04]: exportTableToCsv pattern: papaparse.unparse + Tauri save dialog + writeTextFile — reusable for all tabular CSV export (no blob URLs in WKWebView)
- [Phase 11-04]: Recent opponents chips in LogGameModal: useMemo sorted by week desc, 5 unique opponents, chip row above TeamSelect
- [Phase 11-04]: New season year auto-suggest: activeSeason.year + 1 — eliminates manual year entry for the common case
- [Phase 11]: Filter-store-aware initialization uses synchronous getState().getFilters() at component declaration time — safe for in-memory Zustand
- [Phase 11]: Setter wrapper pattern: same public setter name, internal useState renamed with Internal suffix — no JSX changes needed, store sync is side-effect
- [Phase 12]: [Phase 12-02]: NilEntry actual type uses year/durationMonths not startYear/endYear — service and page adapted to match actual DB schema
- [Phase 12]: [Phase 12-02]: recharts v3 Tooltip formatter value typed as number | undefined — null guard required for TypeScript strict mode
- [Phase 12]: [Phase 12-02]: recharts BarChart pattern established: ResponsiveContainer > BarChart > XAxis/YAxis/Tooltip/Bar with amber fill — reuse for 12-05 and 12-07
- [Phase 12]: [Phase 12-03]: FutureGame.isHome boolean (not location string): UI maps home/away/neutral select to isHome via locationToIsHome() helper — actual type has no location field
- [Phase 12]: [Phase 12-03]: PlayerLink uses linkedDynastyId + linkedPlayerId (not linkedPlayerName/linkedTeam): player link form captures dynasty ID and player ID from paired Madden dynasty
- [Phase 12]: [Phase 12-04]: Pure logic in lib/ files (no Zustand) — bracket and trade value are stateless computations
- [Phase 12]: [Phase 12-04]: 12-team bye logic: seeds 1-4 enter round 2 with team2=null; play-in results fill team2 in reverse index order
- [Phase 12]: [Phase 12-04]: Trade Calculator in Navigate group (Madden conditional); Playoff Simulator in CFB Program group (CFB conditional) — consistent with existing sport-gating pattern
- [Phase 12]: [Phase 12-05]: gradeToScore map converts letter grades to numeric for recharts — A+=100, A=95, A-=90, B+=85, B=80, B-=75, etc; letter shown in custom tooltip
- [Phase 12]: [Phase 12-05]: RecordBookPage top performer computed by summing all PlayerSeason.stats values — sport-agnostic, no position-specific key needed
- [Phase 12]: [Phase 12-05]: buildRecordBook pure local function in RecordBookPage (not service layer) — page-specific aggregation matches CoachingResumePage pattern
- [Phase 12]: [Phase 12-06]: auto-export fire-and-forget IIFE pattern: outer async fn returns void immediately, IIFE does real work and catches silently — never blocks UI thread
- [Phase 12]: [Phase 12-06]: DynastyExport version typed as 1|2 union; validateExport accepts both — backward compatibility for existing v1 export files
- [Phase 12]: [Phase 12-06]: fs:scope-app-data added to Tauri capabilities alongside fs:allow-mkdir — both required to write to appDataDir
- [Phase 12]: [Phase 12-06]: calculateSeriesMomentum result cast guard: HeadToHeadRecord.games.result is string; cast to 'W'|'L'|'T' at call site rather than changing records-service type
- [Phase 12]: [Phase 12-06]: Key moments inline form uses momentForms Record<rivalId, MomentFormState> — no modal needed, consistent with inline edit pattern
- [ea77417]: buildSystemPrompt() data-constraint block prevents AI from inventing facts not present in the data payload — grounded prompts only
- [ea77417]: Sport-split ESPN tone: Chris Fowler voice for CFB, Scott Van Pelt voice for NFL — same 'espn' tone key, different personas per sport
- [ea77417]: Tone-keyed narrative cache: cache key includes tone suffix to prevent stale cross-tone results on tone switch
- [ea77417]: generateGameNarrative() — 400 token limit, cached per gameId+tone in aiCache; newspaper icon in GameLog opens inline recap section
- [ea77417]: team-logo-service.ts getTeamLogoUrl() maps to ESPN CDN (NFL: abbreviation-based, CFB: numeric ID-based); returns null for unrecognized names — no broken images for custom teams
- [ea77417]: cfb-espn-ids.ts — 120-team ESPN numeric ID lookup; NFL uses 3-letter abbreviation; onError fallback on <img> for clean degradation

### Phase 12 Decisions

- [Phase 12-01]: CoachingStaffPage uses inline fire/promote UI (toggle state per-row) — no modal, minimal state, no additional dependencies
- [Phase 12-01]: CoachingRole values use API keys mapped to display labels via ROLE_OPTIONS array — consistent with core-types definition
- [Phase 12-01]: Collapsible Staff History section (default open) — avoids long scroll when many coaches have been fired across a long dynasty

### Phase 10 Decisions

- [Phase 10-01]: SCHEMA_V6 uses spread over SCHEMA: guarantees all 13 existing tables preserved; version(6).stores(SCHEMA_V6) not SCHEMA — critical distinction prevents silent table drop
- [Phase 10-01]: AiContentType union defines all 12 Phase 13 content types upfront — avoids future schema/type changes when adding AI features
- [Phase 10-01]: Player.birthYear unindexed optional field — no migration needed; stored as plain object property for trade value calculator age multiplier
- [Phase 10-02]: All 4 npm packages (cmdk, sonner, zundo, papaparse) installed at exact pinned versions in apps/desktop (not workspace root) — frontend runtime deps only
- [Phase 10-02]: pnpm --filter @dynasty-os/desktop routes to correct workspace package for isolated dep installs
- [Phase 10-03]: ai-cache-service.ts is the single Dexie aiCache wrapper — no direct db.aiCache calls outside this file; all AI content access via getAiCache/setAiCache/deleteAiCache
- [Phase 10-03]: LRU eviction on insert path only — update path (existing cacheKey) skips eviction to avoid extra sortBy query overhead
- [Phase 10-03]: getCachedBlurb/setCachedBlurb added to legacy-card-service.ts — pages call these helpers instead of importing ai-cache-service directly
- [Phase 10-03]: loadCachedNarrative in NarrativeStore made async with (dynastyId, seasonId) signature — Dexie reads are async
- [Phase 10-04]: useToastStore wraps sonner toast() calls — no direct toast() imports needed in feature components
- [Phase 10-04]: UndoStore uses DB-level UndoableOperation descriptor pattern — zundo installed but not used; DB-level restore prevents DB/store inconsistency
- [Phase 10-04]: ai-queue-store uses generateId() (crypto.randomUUID via lib/uuid.ts) not uuid npm package — consistent with project pattern
- [Phase 10-04]: Toaster mounted unconditionally outside PageContent so toast() calls on LauncherPage render correctly
- [Phase 10-04]: Cmd+K listener stub registered in App.tsx useEffect — actual command palette implementation deferred to Phase 11 QOL-04
- [Phase 11-01]: toast() imported directly from sonner in game-store/player-store for delete undo action button — useToastStore.success() has no action option; direct sonner API required for Undo onClick callback
- [Phase 11-01]: as unknown as Record<string,unknown> double-cast for Game/Player snapshot — TypeScript strict mode rejects single cast from typed domain objects without index signatures
- [Phase 11-03]: CommandPalette uses useNavigationStore.getState() not hook — nav actions are fire-and-forget; avoids re-render coupling in palette component
- [Phase 11-03]: inputRef imperative focus with 50ms timeout — Tauri WKWebView/WebView2 swallows immediate focus call; 50ms allows Radix Dialog portal to mount
- [Phase 11-03]: Command.Item value IDs prefixed nav- — cmdk fuzzy-filters on value prop; prefixed IDs prevent accidental cross-group matches

### v2.0 Infrastructure Decisions (to be expanded in Phase 10 planning)

- [v2.0-research]: Dexie v6 adds 5 tables: coachingStaff, nilEntries, futureGames, playerLinks, aiCache — document version roadmap before any code to prevent VersionError for existing users
- [v2.0-research]: aiCache table replaces localStorage for ALL AI content — LRU eviction at 100 entries per dynasty; StorageManager.estimate() check at startup
- [v2.0-research]: Async AI job queue (pendingAiJobs: Job[] in Zustand) — saves resolve <200ms; AI populates asynchronously via fire-and-forget pattern
- [v2.0-research]: db.on('versionchange') handler closes DB and reloads — prevents multi-tab deadlock on schema upgrade
- [v2.0-research]: 4 new npm packages: cmdk@1.1.1, sonner@2.0.7, zundo@2.3.0, papaparse@5.5.3 — single install in Phase 10
- [v2.0-research]: Undo uses DB-level operation descriptor ({table, operation, id}), not Zustand snapshot — prevents DB/store inconsistency from side effects
- [v2.0-research]: Ctrl+K autofocus fix: autofocus document.body via hidden input on App.tsx mount — prevents cold-launch swallow by WebView2
- [v2.0-research]: Player.birthYear added in Phase 10 core-types — nullable/optional; required by Trade Value Calculator age multiplier
- [v2.0-research]: Phase 13 AI sub-sequence: Haiku features first (AINT-02, AINT-06, AINT-07, AINT-05, AINT-03) → Sonnet features (AINT-01, AINT-04, AINT-09, AINT-10) → complex synthesis (AINT-08, AINT-12, AINT-11)
- [v2.0-research]: Recharts decision deferred — add recharts@^3.7.0 only if 3+ chart uses confirmed in v2.0 scope (NIL Ledger, Recruiting Comparison, Rivalry Dashboard are candidates)

### Pending Todos

- Madden sidecar production binary: compile with `npx pkg` for Windows x86_64 before v2.0 release
- Windows production memory validation: measure actual <80MB target on packaged Windows build
- sidecar/package.json: `npm install` in src-tauri/sidecar/ required before first use on new machines

### Blockers/Concerns

- Madden 26 schema support in madden-franchise library not yet released — fallback UI is live; in-app version-check + update UI in progress (working tree)
- Sidecar production binary not yet compiled — dev mode uses shell wrapper (requires Node.js on dev machine)
- Windows production memory (<80MB target) not yet validated

## Session Continuity

Last session: 2026-02-25 UTC
Stopped at: v2.1 roadmap creation (Phases 14–18)
Resume file: None

### Work done since 12-06 (not tracked in any plan)

**COMMITTED (ea77417) — "AI recap overhaul, per-game recaps, and team logos":**
- narrative-service.ts: strict data-constraint system prompt, sport-split ESPN tones (CFB=Fowler / NFL=Van Pelt), tone-keyed cache
- generateGameNarrative(): 1-paragraph per-game recap, 400 token limit, cached per gameId+tone
- GameLog.tsx: newspaper icon on completed rows opens inline recap with spinner + tagline
- team-logo-service.ts + cfb-espn-ids.ts: ESPN CDN logo mapping (120 CFB + NFL abbreviations)
- DynastyCard, DashboardPage, SeasonRecapPage: team logos with onError fallback
- core-types: 'game-narrative' added to AiContentType union
- LauncherPage.tsx: skeleton loading cards + improved empty state

**UNCOMMITTED (working tree):**
- MaddenSyncPage.tsx + madden-sync-service.ts: checkMaddenPackageVersion() + updateMaddenPackage() — version check on mount, in-app update button
- madden-reader.cjs: 'version' command handler forwarding to npm view
- index.css: minor style additions

**UNTRACKED (new files, not committed):**
- TickerBar.tsx + ticker-service.ts + ticker-store.ts: live ESPN score/news ticker (60s polling, 20s during live games, NFL+CFB)
- RosterHubPage.tsx + roster-hub-data.ts: community roster hub linking to Operation Sports, curated by Madden year

Next action: Plan Phase 14 — Onboarding Overhaul
