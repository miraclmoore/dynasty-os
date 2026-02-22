# Requirements: Dynasty OS

**Defined:** 2026-02-21
**Core Value:** The memory layer, narrative engine, and legacy vault that sports games never built — transforming raw dynasty data into stories that persist, compound, and can be shared.

## v1 Requirements

Requirements for initial release. Covers P0 (launch-critical) and P1 (launch-complete) features from the PRD.

### Foundation

- [x] **FOUND-01**: User can create a new dynasty (sport, team, coach name, start year, game version)
- [x] **FOUND-02**: User can manage multiple simultaneous dynasties across sports from a unified launcher
- [x] **FOUND-03**: User can switch between dynasties from any screen
- [x] **FOUND-04**: User can export dynasty data as a single JSON file
- [x] **FOUND-05**: User can import a previously exported dynasty JSON file
- [x] **FOUND-06**: App functions 100% offline (except AI narrative features)

### Dashboard

- [x] **DASH-01**: User sees season-at-a-glance hub on launch: current record, latest ranking, recent activity feed
- [x] **DASH-02**: User sees quick entry access to log a game result from the dashboard
- [x] **DASH-03**: User sees stat highlights and upcoming opponent from the dashboard

### Season Management

- [x] **SEAS-01**: User can log game results (opponent, score, home/away, game type, week)
- [x] **SEAS-02**: Season win/loss record auto-calculates from logged game results
- [x] **SEAS-03**: Conference win/loss record auto-calculates from conference game results
- [x] **SEAS-04**: User can record season-end data (final AP/CFP rank, bowl/playoff outcome)
- [x] **SEAS-05**: User sees weekly season snapshot: record, ranking movement, notable stats, upcoming opponent

### Player Tracking

- [x] **PLAY-01**: User can add players to their roster (name, position, recruiting stars, home state)
- [x] **PLAY-02**: User can log season stats per player (passing, rushing, receiving, defense, kicking)
- [x] **PLAY-03**: Career stat totals auto-calculate from all logged season stats
- [x] **PLAY-04**: User can record player departure (graduation, transfer, NFL Draft, injury)
- [x] **PLAY-05**: Player Legacy Card auto-generates at departure: career stats, awards, AI-written blurb
- [x] **PLAY-06**: User can export a Player Legacy Card as a PNG image
- [x] **PLAY-07**: User can browse all Legacy Cards in a Program Legends gallery (filterable by position, era, award)

### Records & Leaderboards

- [x] **REC-01**: Single-season records leaderboard shows top N per stat category for a given season
- [x] **REC-02**: Career records leaderboard shows all-time top N per stat category across all seasons
- [x] **REC-03**: Head-to-head all-time records against every opponent, filterable by era/coaching staff

### Narrative Engine

- [x] **NARR-01**: User can generate an AI season recap (2-3 paragraphs) at season end
- [x] **NARR-02**: User can select narrative tone: ESPN National Desk, Hometown Beat Reporter, or Dynasty Mode Legend
- [x] **NARR-03**: Season recap includes auto-generated 3-word season tagline
- [x] **NARR-04**: Generated narrative content is cached locally and not re-generated unless explicitly requested

### Recruiting (CFB)

- [x] **RECR-01**: User can log a recruiting class (class rank, star distribution, position commits)
- [x] **RECR-02**: User can record individual recruit details (name, position, stars, state, national rank)
- [x] **RECR-03**: Recruiting class grade and AI analysis generates at signing day
- [x] **RECR-04**: Recruiting class history is browsable across all dynasty seasons

### Transfer Portal (CFB)

- [x] **PORT-01**: User can log transfer portal arrivals (player, position, stars, origin school)
- [x] **PORT-02**: User can log transfer portal departures (player, position, destination)
- [x] **PORT-03**: Annual transfer portal activity is viewable in a War Room with net impact rating

### NFL Draft Tracker

- [x] **DRFT-01**: User can log NFL Draft class (player, position, round, team)
- [x] **DRFT-02**: Historical draft class totals are viewable by position and era
- [x] **DRFT-03**: Draft class links to Player records for career context

### Program Prestige (CFB)

- [x] **PRES-01**: User can log annual program prestige rating
- [x] **PRES-02**: Prestige trend (up/down/stable) auto-calculates vs prior 3 seasons
- [x] **PRES-03**: Prestige trajectory chart shows year-over-year trend with recruiting rank overlay

### Rivalries

- [ ] **RIVL-01**: User can designate opponents as rivals with a custom rivalry label
- [ ] **RIVL-02**: Head-to-head record vs rivals auto-calculates from game log
- [ ] **RIVL-03**: Current rivalry streak (wins or losses) displays with intensity score

### Program Timeline

- [ ] **TIME-01**: Program Timeline shows one node per season from dynasty start to present (record, rank, bowl result, tagline, key events)
- [ ] **TIME-02**: User can export the Program Timeline as a formatted PDF

### Opponent Scouting

- [ ] **SCOU-01**: User can view a pre-game opponent scouting card (historical record vs your program, their season stats, tendency notes)

### Achievements

- [ ] **ACHV-01**: Achievement engine evaluates milestone conditions on data save events
- [ ] **ACHV-02**: User can view earned achievements in a Trophy Room (win totals, championships, bowl wins)
- [ ] **ACHV-03**: Coaching resume displays career statistics (overall record, bowl record, championships, win %)

### Data Ingestion — Manual Entry

- [x] **INGST-01**: Team selection auto-populates conference, logo, and stadium (no typing required)
- [x] **INGST-02**: Smart dropdowns for all team, player, position, and conference fields
- [x] **INGST-03**: Inline editing: clicking any stat cell opens it for edit without navigating away

### Data Ingestion — Screenshot Import (CFB)

- [ ] **INGST-04**: User can submit a screenshot of in-game screens (schedule, player stats, recruiting, depth chart)
- [ ] **INGST-05**: Claude Vision API parses screenshot and pre-populates the corresponding form fields
- [ ] **INGST-06**: User reviews and confirms pre-populated data before saving

### Data Ingestion — Madden Save File Sync

- [ ] **SYNC-01**: User can browse to their Madden 26 save file location (one-time setup)
- [ ] **SYNC-02**: App validates the selected file is a valid Madden franchise save
- [ ] **SYNC-03**: User can trigger a manual sync after playing a game week in Madden
- [ ] **SYNC-04**: Sync extracts game results, player stats, rosters, draft data, and presents a confirmation diff
- [ ] **SYNC-05**: User confirms sync changes (10-second auto-confirm option)
- [ ] **SYNC-06**: App shows clear fallback messaging if Madden 26 schema is not yet supported by the library
- [ ] **SYNC-07**: Optional background file watcher prompts user when a save file modification is detected

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### P2 Features (from PRD)

- **P2-01**: Coordinator Legacy Tracker — offensive/defensive coordinator tenures, schemes, win contributions
- **P2-02**: Season Predictions & Accuracy Tracker — pre-season win total prediction; accuracy score at season end
- **P2-03**: Immersive Front Office Inbox — AI-generated coach's inbox triggered by dynasty data events
- **P2-04**: Legacy Score — composite score aggregating win %, championships, recruiting rank, draft production, prestige

### Platform Expansion

- **PLAT-01**: macOS support
- **PLAT-02**: Linux support
- **PLAT-03**: Cloud sync and account system

### Future Sports

- **SPORT-01**: NBA 2K MyNBA support (V3 — pending community save file documentation)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile application | Separate lightweight companion tool, not a full app |
| In-game overlay / game modification | Out of scope permanently — legal and technical risk |
| Multi-user dynasty data merging | High complexity, no demand signal for V1 |
| Cloud backup / account system | Local-first at V1; auth complexity incompatible with launch timeline |
| Monetization (any form) | Free at launch — community trust building |
| NBA 2K, MLB, FIFA support | No offline save parser; V3+ after community tooling matures |
| Real-time multiplayer dynasty tracking | Different product category |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Complete |
| FOUND-02 | Phase 1 | Complete |
| FOUND-03 | Phase 1 | Complete |
| FOUND-04 | Phase 1 | Complete |
| FOUND-05 | Phase 1 | Complete |
| FOUND-06 | Phase 1 | Complete |
| DASH-01 | Phase 2 | Complete |
| DASH-02 | Phase 2 | Complete |
| DASH-03 | Phase 2 | Complete |
| SEAS-01 | Phase 2 | Complete |
| SEAS-02 | Phase 2 | Complete |
| SEAS-03 | Phase 2 | Complete |
| SEAS-04 | Phase 2 | Complete |
| SEAS-05 | Phase 2 | Complete |
| INGST-01 | Phase 2 | Complete |
| INGST-02 | Phase 2 | Complete |
| INGST-03 | Phase 2 | Complete |
| PLAY-01 | Phase 3 | Complete |
| PLAY-02 | Phase 3 | Complete |
| PLAY-03 | Phase 3 | Complete |
| PLAY-04 | Phase 3 | Complete |
| PLAY-05 | Phase 3 | Complete |
| PLAY-06 | Phase 3 | Complete |
| PLAY-07 | Phase 3 | Complete |
| REC-01 | Phase 3 | Complete |
| REC-02 | Phase 3 | Complete |
| REC-03 | Phase 3 | Complete |
| NARR-01 | Phase 4 | Complete |
| NARR-02 | Phase 4 | Complete |
| NARR-03 | Phase 4 | Complete |
| NARR-04 | Phase 4 | Complete |
| RECR-01 | Phase 5 | Complete |
| RECR-02 | Phase 5 | Complete |
| RECR-03 | Phase 5 | Complete |
| RECR-04 | Phase 5 | Complete |
| PORT-01 | Phase 5 | Complete |
| PORT-02 | Phase 5 | Complete |
| PORT-03 | Phase 5 | Complete |
| DRFT-01 | Phase 5 | Complete |
| DRFT-02 | Phase 5 | Complete |
| DRFT-03 | Phase 5 | Complete |
| PRES-01 | Phase 5 | Complete |
| PRES-02 | Phase 5 | Complete |
| PRES-03 | Phase 5 | Complete |
| RIVL-01 | Phase 6 | Pending |
| RIVL-02 | Phase 6 | Pending |
| RIVL-03 | Phase 6 | Pending |
| TIME-01 | Phase 6 | Pending |
| TIME-02 | Phase 6 | Pending |
| SCOU-01 | Phase 6 | Pending |
| ACHV-01 | Phase 7 | Pending |
| ACHV-02 | Phase 7 | Pending |
| ACHV-03 | Phase 7 | Pending |
| INGST-04 | Phase 8 | Pending |
| INGST-05 | Phase 8 | Pending |
| INGST-06 | Phase 8 | Pending |
| SYNC-01 | Phase 9 | Pending |
| SYNC-02 | Phase 9 | Pending |
| SYNC-03 | Phase 9 | Pending |
| SYNC-04 | Phase 9 | Pending |
| SYNC-05 | Phase 9 | Pending |
| SYNC-06 | Phase 9 | Pending |
| SYNC-07 | Phase 9 | Pending |

**Coverage:**
- v1 requirements: 57 total
- Mapped to phases: 57
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-21*
*Last updated: 2026-02-21 after roadmap creation*
