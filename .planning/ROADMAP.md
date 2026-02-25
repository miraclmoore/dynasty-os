# Roadmap: Dynasty OS

## Overview

Dynasty OS is built in 9 phases that follow natural build dependencies: monorepo foundation and
sport config first, then the core usable loop (dashboard + season entry), then player tracking and
records, then the AI narrative engine, then CFB-specific features (recruiting, portal, draft,
prestige), then social and legacy features (rivalries, timeline, scouting, achievements), and
finally the two advanced ingestion paths — screenshot import via Vision API and Madden save file
sync — which are isolated adapters that can be built last without blocking anything else.

Milestone v2.0 (The Living Dynasty) adds 4 phases (10–13): an infrastructure foundation phase
that prepares the Dexie v6 schema and async AI job queue, followed by QOL wins, community features,
and an AI intelligence layer. Phase numbering continues from Phase 9.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Monorepo scaffolding, Tauri setup, DB schema, sport config system, multi-dynasty management
- [x] **Phase 2: Core Loop** - Dashboard, season game logging, auto-calculated records, manual entry UX
- [x] **Phase 3: Player Tracking and Records** - Roster management, per-season stats, career totals, Legacy Cards, all-time leaderboards
- [x] **Phase 4: Narrative Engine** - Claude AI season recaps with tone presets, cached taglines, season wrap-up flow
- [x] **Phase 5: CFB Features** - Recruiting classes, transfer portal war room, NFL Draft tracker, program prestige tracker
- [x] **Phase 6: Social and Legacy** - Rivalries, program timeline, opponent scouting cards, achievements and trophy room
- [x] **Phase 7: Achievements** - Achievement engine, trophy room, coaching resume (completed 2026-02-24)
- [x] **Phase 8: Screenshot Ingestion** - Claude Vision API screenshot parsing for CFB screens (completed 2026-02-24)
- [x] **Phase 9: Madden Sync** - Tauri sidecar + madden-franchise save file adapter with confirmation diff, auto-confirm timer, and file watcher (completed 2026-02-24)
- [x] **Phase 10: Infrastructure Foundation** - Dexie v6 schema (5 new tables), async AI job queue, localStorage→aiCache migration, core-types additions, 4 npm packages, global store scaffolding (completed 2026-02-25)
- [ ] **Phase 11: QOL Wins** - Toast notifications, undo, persistent filters, command palette, CSV export, season checklist, auto-suggest year, recent opponents, inline notes, timeline scrubber
- [ ] **Phase 12: Community Features** - Coaching staff tracker, CFB-Madden player continuity, playoff simulator, NIL ledger, schedule builder, trade calculator, class grade comparison, auto-sync, record book, rivalry dashboard expansion
- [ ] **Phase 13: AI Intelligence Layer** - Living Chronicle, Hot Seat, Opponent Dossiers, Generational Arcs, Rival Prophecy, Obituary Room, The Journalist, Cross-Dynasty Intelligence, Momentum Heat Map, What If Engine, Broadcast Booth, DNA Report

## Phase Details

### Phase 1: Foundation
**Goal**: The project structure and shared infrastructure exist so every subsequent phase builds on
a consistent base — sport config, database schema, Tauri shell, and multi-dynasty management are
all in place.
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06
**Success Criteria** (what must be TRUE):
  1. User can launch the app, create a new dynasty (sport, team, coach name, start year, game version), and return to it on next launch
  2. User can manage multiple dynasties from a unified launcher and switch between them from any screen
  3. User can export a dynasty as a JSON file and re-import it cleanly
  4. App functions fully offline — no network required for any non-AI operation
  5. Monorepo builds cleanly: Tauri shell boots, React renders, Dexie DB initializes, sport config resolves for CFB and Madden
**Plans**: 4 plans

Plans:
- [x] 01-01-PLAN.md — Monorepo setup: Turborepo + pnpm workspaces, shared packages scaffold (core-types, db, sport-configs, ui-components), React + Vite + Tailwind desktop app
- [x] 01-02-PLAN.md — Tauri 2.x shell: Rust backend initialization, WebView wiring to Vite frontend, performance baselines (<80MB RAM, <3s cold start)
- [x] 01-03-PLAN.md — DB schema and sport config: Dexie ORM schema for all entities, sport config pattern with CFB and Madden configs, core TypeScript types
- [x] 01-04-PLAN.md — Dynasty management UI: create/switch/delete dynasties, Zustand store, JSON export/import, offline-first data persistence

### Phase 2: Core Loop
**Goal**: The app is usable — a coach can log game results and see their season taking shape on a
dashboard that surfaces record, rankings, and recent activity.
**Depends on**: Phase 1
**Requirements**: DASH-01, DASH-02, DASH-03, SEAS-01, SEAS-02, SEAS-03, SEAS-04, SEAS-05, INGST-01, INGST-02, INGST-03
**Success Criteria** (what must be TRUE):
  1. User sees a dashboard on launch with current record, latest ranking, recent activity feed, stat highlights, and upcoming opponent
  2. User can log a game result (opponent, score, home/away, game type, week) from the dashboard in under 60 seconds using smart dropdowns
  3. Win/loss and conference records auto-calculate and update immediately after logging a game
  4. User can record season-end data (final ranking, bowl/playoff outcome) and see a weekly season snapshot with ranking movement
  5. Clicking any stat cell opens it for inline editing without navigating away
**Plans**: 5 plans

Plans:
- [x] 02-01-PLAN.md — Season & game data layer: service functions with auto-calculated records, Zustand stores
- [x] 02-02-PLAN.md — Dashboard layout and widgets: season-at-a-glance, recent activity, weekly snapshot
- [x] 02-03-PLAN.md — Game entry and season-end modals: LogGameModal with smart team dropdown, SeasonEndModal
- [x] 02-04-PLAN.md — Stat highlights, game log table, and inline editing: calculated stats, full game table, click-to-edit cells
- [x] 02-05-PLAN.md — Gap closure: per-game teamRanking field, DB migration, ranking movement delta in WeeklySnapshot

### Phase 3: Player Tracking and Records
**Goal**: Coaches can build and track their roster across seasons — every player has a career arc
that culminates in a Legacy Card, and program-wide leaderboards show who the all-time greats are.
**Depends on**: Phase 2
**Requirements**: PLAY-01, PLAY-02, PLAY-03, PLAY-04, PLAY-05, PLAY-06, PLAY-07, REC-01, REC-02, REC-03
**Success Criteria** (what must be TRUE):
  1. User can add players to the roster with position, recruiting stars, and home state, then log per-season stats across all stat categories
  2. Career stat totals auto-calculate from all logged seasons and display on the player profile
  3. When a player departs (graduation, transfer, NFL Draft, injury), a Legacy Card auto-generates with career stats, awards, and an AI-written Hall of Fame blurb
  4. User can export any Legacy Card as a PNG image
  5. User can browse all Legacy Cards in a Program Legends gallery filtered by position, era, or award, and view single-season and all-time records leaderboards
**Plans**: 4 plans

Plans:
- [x] 03-01-PLAN.md — Roster foundation: player CRUD service/store, navigation system, Roster page with add/edit/delete/filter
- [x] 03-02-PLAN.md — Season stats and career totals: PlayerSeason service/store, career aggregation engine, Player Profile page with departure recording
- [x] 03-03-PLAN.md — Legacy Cards: AI blurb via Claude Haiku, PNG export via Tauri dialog+fs, Program Legends gallery with filters
- [x] 03-04-PLAN.md — Records and leaderboards: single-season top N, career top N, head-to-head opponent records with era filter

### Phase 4: Narrative Engine
**Goal**: At the end of each season, coaches can generate an AI-written recap that captures what
the season meant — not just what happened — with their choice of tone and a memorable tagline.
**Depends on**: Phase 3 (season + player data feeds the narrative)
**Requirements**: NARR-01, NARR-02, NARR-03, NARR-04
**Success Criteria** (what must be TRUE):
  1. User can generate a 2-3 paragraph AI season recap after logging a completed season
  2. User can select from three tone presets — ESPN National Desk, Hometown Beat Reporter, or Dynasty Mode Legend — and the output reads distinctly differently
  3. Every generated recap includes an auto-generated 3-word season tagline
  4. Generated narrative content is cached locally and the app never re-generates it unless the user explicitly requests a refresh
**Plans**: 2 plans

Plans:
- [x] 04-01-PLAN.md — Narrative service layer: Claude Sonnet API integration, three tone system prompts, season data aggregation, tagline parsing, localStorage caching, Zustand store
- [x] 04-02-PLAN.md — Season Recap page UI: tone selector, generate/refresh flow, cached recap display, tagline display, dashboard entry point

### Phase 5: CFB Features
**Goal**: CFB-specific program management is complete — recruiting classes are graded and analyzed,
the transfer portal has a war room, NFL Draft production is tracked historically, and program
prestige trends are visible year over year.
**Depends on**: Phase 3 (player records exist), Phase 4 (AI infrastructure exists for recruiting analysis)
**Requirements**: RECR-01, RECR-02, RECR-03, RECR-04, PORT-01, PORT-02, PORT-03, DRFT-01, DRFT-02, DRFT-03, PRES-01, PRES-02, PRES-03
**Success Criteria** (what must be TRUE):
  1. User can log a full recruiting class with class rank, star distribution, and individual recruit details, then see an AI-generated class grade and analysis at signing day
  2. Recruiting class history is browsable across all dynasty seasons
  3. User can log transfer portal arrivals and departures and view the annual War Room with a net impact rating
  4. User can log NFL Draft picks and view historical draft class totals by position and era, with links back to player career records
  5. User can log annual prestige ratings and see a year-over-year trend chart with recruiting rank overlay showing prestige trajectory
**Plans**: 4 plans

Plans:
- [x] 05-01-PLAN.md — DB schema migration (5 new tables) + Recruiting module: class entry, individual recruit log, signing day AI grade via Claude Haiku, class history browser, navigation and dashboard wiring
- [x] 05-02-PLAN.md — Transfer portal war room: arrival/departure service and store, War Room page with side-by-side tables and net impact rating
- [x] 05-03-PLAN.md — NFL Draft tracker: draft pick service and store, historical view by year, position breakdown, player record linking
- [x] 05-04-PLAN.md — Program prestige tracker: prestige rating service and store, trend calculation, SVG line chart with recruiting rank overlay

### Phase 6: Social and Legacy
**Goal**: The program's story is visible — rivals have records and streaks, the entire dynasty
history scrolls as a timeline, and scouting cards exist for upcoming opponents.
**Depends on**: Phase 2 (game log data), Phase 5 (prestige and recruiting data for timeline)
**Requirements**: RIVL-01, RIVL-02, RIVL-03, TIME-01, TIME-02, SCOU-01
**Success Criteria** (what must be TRUE):
  1. User can designate any opponent as a rival with a custom label, and the head-to-head record and current streak auto-calculate from the game log
  2. Rivalry intensity score displays alongside streak indicator
  3. Program Timeline shows one scrollable node per season (record, rank, bowl result, tagline, key events) from dynasty start to present
  4. User can export the Program Timeline as a formatted PDF
  5. User can view a pre-game scouting card for any opponent showing historical record vs the program, season stats, and tendency notes
**Plans**: 3 plans

Plans:
- [x] 06-01-PLAN.md — Rivalry tracker: DB v4 migration (rivals + scoutingNotes tables), Rival type, CRUD service with intensity calculation, Zustand store, RivalryTrackerPage with H2H record and streak pips
- [x] 06-02-PLAN.md — Program timeline: timeline-service aggregating season nodes with localStorage taglines, ProgramTimelinePage with scrollable nodes and window.print() PDF export
- [x] 06-03-PLAN.md — Opponent scouting cards: ScoutingNote type (updates DB placeholder), upsert service, Zustand store, ScoutingCardPage with opponent search, H2H record, and tendency notes

### Phase 7: Achievements
**Goal**: The coach's legacy is quantified — milestones auto-unlock as data is saved, a trophy room
displays earned achievements, and a coaching resume summarizes career statistics.
**Depends on**: Phase 6 (full data set exists for milestone evaluation)
**Requirements**: ACHV-01, ACHV-02, ACHV-03
**Success Criteria** (what must be TRUE):
  1. Achievement engine automatically evaluates milestone conditions on every data save event (win totals, championships, bowl wins)
  2. User can view earned achievements in a Trophy Room
  3. Coaching resume displays career statistics: overall record, bowl record, championships, win percentage
**Plans**: 2 plans

Plans:
- [ ] 07-01-PLAN.md — Achievement engine: Achievement type, DB v5 migration (achievements table), milestone definitions (14 milestones across wins/bowl-wins/championships), evaluateAchievements() service, Zustand store
- [ ] 07-02-PLAN.md — Save hooks + UI: evaluateAchievements wired into game-service and season-service, TrophyRoomPage with earned/locked milestone cards, CoachingResumePage with career stats aggregation, Dashboard wiring

### Phase 8: Screenshot Ingestion
**Goal**: CFB coaches can photograph in-game screens and have Dynasty OS pre-populate forms
automatically — reducing manual entry burden by 70-80%.
**Depends on**: Phase 2 (forms exist to pre-populate), Phase 4 (Claude API infrastructure exists)
**Requirements**: INGST-04, INGST-05, INGST-06
**Success Criteria** (what must be TRUE):
  1. User can submit a screenshot of an in-game screen (schedule, player stats, recruiting, depth chart) for parsing
  2. Claude Vision API parses the screenshot and pre-populates the corresponding form fields without user typing
  3. User reviews pre-populated data in a confirmation step and can edit any field before saving
**Plans**: 2 plans

Plans:
- [ ] 08-01-PLAN.md — Vision API service layer: Tauri dialog:allow-open capability, screenshot-service.ts with Claude Haiku Vision API integration, four screen type prompts (schedule, player-stats, recruiting, depth-chart), ParsedScreenData typed union
- [ ] 08-02-PLAN.md — ScreenshotIngestionPage UI: screen type picker, OS file dialog, image preview, spinner, amber-highlighted pre-populated confirmation form, save/discard, Dashboard "Parse Screenshot" button, navigation + App.tsx wiring

### Phase 9: Madden Sync
**Goal**: Madden coaches can sync their franchise save file directly — game results, player stats,
rosters, and draft data flow in automatically with a clear confirmation step and a graceful fallback
if the library does not yet support Madden 26.
**Depends on**: Phase 3 (roster and player data model), Phase 2 (game log model)
**Requirements**: SYNC-01, SYNC-02, SYNC-03, SYNC-04, SYNC-05, SYNC-06, SYNC-07
**Success Criteria** (what must be TRUE):
  1. User can browse to their Madden 26 save file location once during setup and the app validates it is a valid franchise save
  2. User can trigger a manual sync after playing a game week, and the app extracts game results, player stats, rosters, and draft data
  3. Sync presents a confirmation diff showing what will change before committing anything
  4. User can confirm changes immediately or let a 10-second auto-confirm timer complete
  5. If Madden 26 schema is not yet supported by the madden-franchise library, the app displays clear fallback messaging with a manual entry path; optional background file watcher prompts on save file modification
**Plans**: 3 plans

Plans:
- [x] 09-01-PLAN.md — Tauri sidecar infrastructure (Node.js shell wrapper + madden-franchise), save file picker, validate subcommand, version-check guard with fallback UI
- [x] 09-02-PLAN.md — Sync engine: extract subcommand, computeSyncDiff (games/players/draft), confirmation diff table, 10-second auto-confirm timer
- [x] 09-03-PLAN.md — Background file watcher (tauri-plugin-fs watch()), save modification banner, navigation wiring (Dashboard → MaddenSyncPage)

---

## Milestone v2.0 — The Living Dynasty

### Phase 10: Infrastructure Foundation
**Goal**: The technical substrate for all 33 v2.0 features is in place — Dexie v6 schema with 5 new tables, async AI job queue that keeps saves under 200ms, aiCache replacing localStorage, 4 new npm packages installed and importable, and global stores scaffolded. No user-facing features ship in this phase; every subsequent phase depends on this foundation.
**Depends on**: Phase 9 (v1 complete)
**Requirements**: None (infrastructure gates only — enables QOL-01 through AINT-12)
**Success Criteria** (infrastructure gates — not user-behavior criteria):
  1. Dexie v6 migration runs clean on existing databases with all 5 new tables present: coachingStaff, nilEntries, futureGames, playerLinks, aiCache
  2. aiCache Dexie table replaces localStorage for all AI content caching — no AI content written to localStorage after this phase
  3. Async AI job queue (pendingAiJobs) in Zustand resolves saves in under 200ms regardless of AI call duration
  4. All 4 npm packages install and import cleanly: cmdk, sonner, zundo, papaparse
  5. ToastStore, FilterStore, and UndoStore are wired into App.tsx and callable from any component
**Plans**: 4 plans

Plans:
- [ ] 10-01-PLAN.md — Dexie schema v6 migration (5 new tables) + 5 new core types + Player.birthYear
- [ ] 10-02-PLAN.md — Install 4 npm packages: cmdk, sonner, zundo, papaparse
- [ ] 10-03-PLAN.md — aiCache service layer + localStorage AI content migration (narrative, legacy blurbs)
- [ ] 10-04-PLAN.md — Scaffold 4 Zustand stores (Toast, Filter, Undo, AiQueue) + App.tsx wiring

### Phase 11: QOL Wins
**Goal**: Every interaction in Dynasty OS has responsive feedback, is recoverable from mistakes, and navigates efficiently — coaches feel the app is professional and trustworthy before any new features are added.
**Depends on**: Phase 10 (stores, packages, and aiCache infrastructure in place)
**Requirements**: QOL-01, QOL-02, QOL-03, QOL-04, QOL-05, QOL-06, QOL-07, QOL-08, QOL-09, QOL-10
**Success Criteria** (what must be TRUE):
  1. Every write operation (game log, player edit, stat entry) triggers a visible toast notification confirming success or reporting an error
  2. User can undo the last destructive action (delete or edit) for games, players, and season stats — the data returns to its prior state without any navigation
  3. All list and table filter selections survive navigation within a session — returning to a filtered page shows the same filters active
  4. User can open the command palette with Ctrl+K / Cmd+K from any screen, type to find any page or action, and navigate directly to it
  5. User can export any data table to a CSV file via the OS save dialog, open a season checklist on the dashboard tracking annual tasks, and jump to any dynasty year via the timeline scrubber
**Plans**: 6 plans

Plans:
- [ ] 11-01-PLAN.md — Toast + undo wiring: useToastStore into game/player/player-season/season stores; useUndoStore pushUndo for deletes/edits; RosterPage window.confirm() replaced with toast-undo
- [ ] 11-02-PLAN.md — Filter persistence: useFilterStore wired into dynasty switch (clearAll) + RosterPage, LegendsPage, RecordsPage, DraftTrackerPage, TransferPortalPage
- [ ] 11-03-PLAN.md — Command palette: CommandPalette.tsx with cmdk Command.Dialog (18 nav pages, sport-gated); App.tsx Cmd+K stub wired to open state
- [ ] 11-04-PLAN.md — New features A: csv-export.ts utility + RosterPage/RecordsPage Export CSV buttons; DashboardPage new-season year auto-suggest; LogGameModal recent opponents chips; EditPlayerModal/PlayerProfilePage player notes
- [ ] 11-05-PLAN.md — New features B: Dashboard season checklist widget (localStorage, CFB-gated tasks); ProgramTimelinePage horizontal year scrubber with scrollIntoView
- [ ] 11-06-PLAN.md — Human verification checkpoint: build check + interactive walkthrough of all 10 QOL features

### Phase 12: Community Features
**Goal**: Dynasty OS covers the full lifecycle of managing a dynasty program — coaching staff, cross-game player continuity, recruiting analysis, financial tracking, scheduling, trade evaluation, and the full historical record are all accessible in one place.
**Depends on**: Phase 11 (toast and undo UX underpin every community feature interaction)
**Requirements**: COMM-01, COMM-02, COMM-03, COMM-04, COMM-05, COMM-06, COMM-07, COMM-08, COMM-09, COMM-10
**Success Criteria** (what must be TRUE):
  1. User can hire, fire, and promote coaching staff with tenure dates and scheme notes, and view complete staff history for the dynasty
  2. CFB users can link a player record to their NFL counterpart across dynasty types, simulate a playoff bracket with custom seedings, log NIL deals per player, and build a multi-year future schedule with projected bowl eligibility
  3. Madden users can calculate trade value for any player based on position, rating, age, and contract
  4. User can view the full dynasty arc in a Historical Season Record Book — all seasons, records, stats, and awards in one scrollable view
  5. User can view an expanded Rivalry Dashboard with series momentum, key moment log, and all-time context, and dynasty data auto-exports to JSON/CSV in the background on every save
**Plans**: TBD

### Phase 13: AI Intelligence Layer
**Goal**: Dynasty OS is a living companion that observes, interprets, and narrates the dynasty in real time — AI features are triggered by data events, cached reliably, and sequenced from cheap Haiku features to complex Sonnet synthesis.
**Depends on**: Phase 12 (stable data model with all new tables consumed and validated; sport-gated patterns established)
**Requirements**: AINT-01, AINT-02, AINT-03, AINT-04, AINT-05, AINT-06, AINT-07, AINT-08, AINT-09, AINT-10, AINT-11, AINT-12
**Success Criteria** (what must be TRUE):
  1. After each logged game, The Journalist auto-generates a news-wire blurb for significant events (upsets, ranked matchups, rivalry results) and the Hot Seat meter updates the coaching pressure index on the dashboard — both fire asynchronously without blocking the save
  2. User can generate an AI Opponent Intelligence Dossier for any upcoming opponent, a Rival Prophecy predicting rivalry trajectory, and an Obituary Room entry auto-generates when a legendary player departs
  3. User can view a Living Chronicle panel on the season page showing a running AI narrative that updates after each logged game, and a Momentum Heat Map visualizing momentum shifts across the season
  4. User can generate a Generational Player Arc for any player, run the What If Engine on a key dynasty moment, and generate a DNA Report analyzing program identity
  5. User can view Cross-Dynasty Intelligence insights comparing patterns across up to 5 dynasties, and activate Broadcast Booth mode for AI text-to-speech recap fragments with graceful fallback when TTS voices are unavailable
**Plans**: TBD

## Progress

**Execution Order:**
v1 phases execute 1 → 9. v2.0 phases execute 10 → 11 → 12 → 13.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 4/4 | Complete | - |
| 2. Core Loop | 5/5 | Complete | - |
| 3. Player Tracking and Records | 4/4 | Complete | 2026-02-22 |
| 4. Narrative Engine | 2/2 | Complete | 2026-02-22 |
| 5. CFB Features | 4/4 | Complete | 2026-02-22 |
| 6. Social and Legacy | 3/3 | Complete | 2026-02-22 |
| 7. Achievements | 2/2 | Complete | 2026-02-24 |
| 8. Screenshot Ingestion | 2/2 | Complete | 2026-02-24 |
| 9. Madden Sync | 3/3 | Complete | 2026-02-24 |
| 10. Infrastructure Foundation | 4/4 | Complete    | 2026-02-25 |
| 11. QOL Wins | 1/6 | In Progress|  |
| 12. Community Features | 0/TBD | Not started | - |
| 13. AI Intelligence Layer | 0/TBD | Not started | - |
