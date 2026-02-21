# Roadmap: Dynasty OS

## Overview

Dynasty OS is built in 9 phases that follow natural build dependencies: monorepo foundation and
sport config first, then the core usable loop (dashboard + season entry), then player tracking and
records, then the AI narrative engine, then CFB-specific features (recruiting, portal, draft,
prestige), then social and legacy features (rivalries, timeline, scouting, achievements), and
finally the two advanced ingestion paths — screenshot import via Vision API and Madden save file
sync — which are isolated adapters that can be built last without blocking anything else.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Monorepo scaffolding, Tauri setup, DB schema, sport config system, multi-dynasty management
- [ ] **Phase 2: Core Loop** - Dashboard, season game logging, auto-calculated records, manual entry UX
- [ ] **Phase 3: Player Tracking and Records** - Roster management, per-season stats, career totals, Legacy Cards, all-time leaderboards
- [ ] **Phase 4: Narrative Engine** - Claude AI season recaps with tone presets, cached taglines, season wrap-up flow
- [ ] **Phase 5: CFB Features** - Recruiting classes, transfer portal war room, NFL Draft tracker, program prestige tracker
- [ ] **Phase 6: Social and Legacy** - Rivalries, program timeline, opponent scouting cards, achievements and trophy room
- [ ] **Phase 7: Achievements** - Achievement engine, trophy room, coaching resume
- [ ] **Phase 8: Screenshot Ingestion** - Claude Vision API screenshot parsing for CFB screens
- [ ] **Phase 9: Madden Sync** - madden-franchise save file adapter with confirmation diff and fallback

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
**Plans**: TBD

Plans:
- [ ] 01-01: Monorepo setup — Turborepo + pnpm workspaces, shared packages scaffold (core-types, db, sport-configs, ui-components)
- [ ] 01-02: Tauri 2.x shell — Rust backend, WebView wiring, Windows build pipeline, performance baselines (<80MB RAM, <3s cold start)
- [ ] 01-03: DB schema and sport config — Dexie ORM schema for all entities, sport config pattern for CFB and Madden, multi-dynasty data model
- [ ] 01-04: Dynasty management UI — create/switch/delete dynasties, JSON export/import, offline-first validation

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
**Plans**: TBD

Plans:
- [ ] 02-01: Dashboard shell — layout, season-at-a-glance widgets, recent activity feed, stat highlights panel
- [ ] 02-02: Season management — game log CRUD, auto-calculated W/L and conference records, season-end data entry, weekly snapshot widget
- [ ] 02-03: Smart entry UX — team/conference auto-populate from sport config, smart dropdowns, inline cell editing

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
**Plans**: TBD

Plans:
- [ ] 03-01: Roster management — add/edit/remove players, position and attribute fields, season stat logging per stat category
- [ ] 03-02: Career totals engine — auto-aggregate from all season stat records, player profile view with career arc
- [ ] 03-03: Legacy Cards — departure trigger, AI blurb generation (Claude API), PNG export, Program Legends gallery with filters
- [ ] 03-04: Records and leaderboards — single-season top N, career top N, head-to-head opponent records filterable by era/staff

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
**Plans**: TBD

Plans:
- [ ] 04-01: Narrative engine package — Claude API integration, prompt templates per tone, season data aggregation into prompt context
- [ ] 04-02: Narrative UI — tone selector, generate/refresh flow, cached recap display, tagline display, season wrap-up screen

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
**Plans**: TBD

Plans:
- [ ] 05-01: Recruiting module — class entry, individual recruit log, signing day AI grade and analysis (Claude API), class history browser
- [ ] 05-02: Transfer portal war room — arrival/departure log, net impact rating calculation, annual war room view
- [ ] 05-03: NFL Draft tracker — draft class entry, historical totals by position/era, player record linking
- [ ] 05-04: Program prestige tracker — annual rating log, trend calculation (vs prior 3 seasons), trajectory chart with recruiting rank overlay

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
**Plans**: TBD

Plans:
- [ ] 06-01: Rivalry tracker — rival designation UI, auto-calculated H2H record and streak from game log, intensity score
- [ ] 06-02: Program timeline — season node data aggregation, scrollable timeline UI, PDF export
- [ ] 06-03: Opponent scouting cards — scouting card UI, historical record derivation, season stats and tendency note fields

### Phase 7: Achievements
**Goal**: The coach's legacy is quantified — milestones auto-unlock as data is saved, a trophy room
displays earned achievements, and a coaching resume summarizes career statistics.
**Depends on**: Phase 6 (full data set exists for milestone evaluation)
**Requirements**: ACHV-01, ACHV-02, ACHV-03
**Success Criteria** (what must be TRUE):
  1. Achievement engine automatically evaluates milestone conditions on every data save event (win totals, championships, bowl wins)
  2. User can view earned achievements in a Trophy Room
  3. Coaching resume displays career statistics: overall record, bowl record, championships, win percentage
**Plans**: TBD

Plans:
- [ ] 07-01: Achievement engine — milestone condition definitions, evaluation hooks on save events, achievement state persistence
- [ ] 07-02: Trophy room and coaching resume — earned achievement display, resume stats aggregation view

### Phase 8: Screenshot Ingestion
**Goal**: CFB coaches can photograph in-game screens and have Dynasty OS pre-populate forms
automatically — reducing manual entry burden by 70-80%.
**Depends on**: Phase 2 (forms exist to pre-populate), Phase 4 (Claude API infrastructure exists)
**Requirements**: INGST-04, INGST-05, INGST-06
**Success Criteria** (what must be TRUE):
  1. User can submit a screenshot of an in-game screen (schedule, player stats, recruiting, depth chart) for parsing
  2. Claude Vision API parses the screenshot and pre-populates the corresponding form fields without user typing
  3. User reviews pre-populated data in a confirmation step and can edit any field before saving
**Plans**: TBD

Plans:
- [ ] 08-01: Vision API integration — screenshot intake UI, Claude Vision API parsing, field mapping per screen type (schedule, stats, recruiting, depth chart)
- [ ] 08-02: Confirmation and correction flow — diff view of parsed vs blank form, editable fields, save confirmation

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
**Plans**: TBD

Plans:
- [ ] 09-01: Save file adapter — madden-franchise library integration, file browser and validation, version-check guard with fallback messaging
- [ ] 09-02: Sync engine — data extraction (game results, stats, rosters, draft), confirmation diff UI, auto-confirm timer
- [ ] 09-03: Background file watcher — optional OS file watcher, save modification detection, user prompt flow

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/4 | Not started | - |
| 2. Core Loop | 0/3 | Not started | - |
| 3. Player Tracking and Records | 0/4 | Not started | - |
| 4. Narrative Engine | 0/2 | Not started | - |
| 5. CFB Features | 0/4 | Not started | - |
| 6. Social and Legacy | 0/3 | Not started | - |
| 7. Achievements | 0/2 | Not started | - |
| 8. Screenshot Ingestion | 0/2 | Not started | - |
| 9. Madden Sync | 0/3 | Not started | - |
