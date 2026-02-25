# Requirements: Dynasty OS v2.0 — The Living Dynasty

**Defined:** 2026-02-24
**Updated:** 2026-02-25 — Trimmed to v2.0 only; v1.0 requirements archived to `.planning/milestones/v1.0-REQUIREMENTS.md`
**Core Value:** The memory layer, narrative engine, and legacy vault that sports games never built — transforming raw dynasty data into stories that persist, compound, and can be shared.

## v2.0 Requirements

Requirements for Milestone v2.0. 32 user-facing requirements across 3 categories. Infrastructure (aiCache migration, async job queue, Dexie v6 schema) is handled as Phase 10 success criteria.

### QOL Wins

- [x] **QOL-01**: User receives a toast notification confirming every successful write operation (game log, player edit, stat entry)
- [x] **QOL-02**: User can undo the last single destructive action (delete or edit) for games, players, and season stats
- [x] **QOL-03**: All list and table filter selections persist across navigation within the same app session
- [x] **QOL-04**: User can open a command palette (Ctrl+K / Cmd+K) to navigate to any page or trigger quick actions from any screen
- [x] **QOL-05**: User can export any data table to a CSV file via the OS file save dialog
- [x] **QOL-06**: New season year input auto-suggests previous season year + 1
- [x] **QOL-07**: Log Game modal shows recently-used opponents as quick-select options
- [x] **QOL-08**: User can add and edit a free-text note on any player record
- [x] **QOL-09**: Dashboard season checklist tracks which annual tasks are complete for the active season
- [x] **QOL-10**: Program Timeline includes a horizontal season scrubber for jumping to any dynasty year directly

### Community Features

- [x] **COMM-01**: User can track coaching staff lifecycle — hire, fire, promote roles with tenure dates and scheme notes
- [x] **COMM-02**: User can link a CFB player record to their NFL/Madden career counterpart across dynasty types
- [x] **COMM-03**: User can simulate a playoff bracket for the current season with customizable seedings
- [x] **COMM-04**: CFB users can log NIL deals per player (amount, brand, duration) and view total spend by class and position
- [x] **COMM-05**: User can build a multi-year future schedule and view projected bowl eligibility
- [x] **COMM-06**: Madden users can calculate trade value for any player based on position, rating, age, and contract
- [x] **COMM-07**: CFB users can compare recruiting class grades side-by-side across seasons or rival programs
- [x] **COMM-08**: User can enable automatic background export of dynasty data to JSON/CSV on every save
- [x] **COMM-09**: User can view a Historical Season Record Book showing all seasons, records, stats, and awards in one scrollable view
- [x] **COMM-10**: User can view an expanded Rivalry Dashboard with series momentum, key moments log, and all-time context per rival

### AI Intelligence Layer

- [ ] **AINT-01**: A Living Chronicle panel displays an AI running narrative of the current season that updates after each logged game
- [ ] **AINT-02**: Dashboard displays a Hot Seat/Pressure Meter — AI-derived coaching pressure index based on results vs expectations
- [ ] **AINT-03**: User can generate an AI Opponent Intelligence Dossier for any upcoming opponent
- [ ] **AINT-04**: User can generate an AI Generational Player Arc narrative tracing a player's full career (distinct from Legacy Card blurb)
- [ ] **AINT-05**: User can view an AI Rival Prophecy predicting rivalry trajectory based on current momentum
- [ ] **AINT-06**: An AI Obituary Room entry auto-generates when a legendary player departs the program
- [ ] **AINT-07**: The Journalist automatically generates a news-wire blurb after significant game events (upsets, ranked matchups, rivalry results)
- [ ] **AINT-08**: User can view Cross-Dynasty Intelligence insights comparing patterns across up to 5 active dynasties
- [ ] **AINT-09**: User can view a Momentum Heat Map showing AI-analyzed momentum shifts across all games in a season
- [ ] **AINT-10**: User can run the What If Engine to explore an AI-generated alternate history for a key dynasty moment
- [ ] **AINT-11**: User can activate Broadcast Booth mode for AI text-to-speech game recap fragments, with graceful fallback when no TTS voices are available
- [ ] **AINT-12**: User can generate a DNA Report — AI analysis of program identity: play style, recruiting philosophy, coaching signature

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

### v2.0 Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| QOL-01 | Phase 11 | Complete |
| QOL-02 | Phase 11 | Complete |
| QOL-03 | Phase 11 | Complete |
| QOL-04 | Phase 11 | Complete |
| QOL-05 | Phase 11 | Complete |
| QOL-06 | Phase 11 | Complete |
| QOL-07 | Phase 11 | Complete |
| QOL-08 | Phase 11 | Complete |
| QOL-09 | Phase 11 | Complete |
| QOL-10 | Phase 11 | Complete |
| COMM-01 | Phase 12 | Complete |
| COMM-02 | Phase 12 | Complete |
| COMM-03 | Phase 12 | Complete |
| COMM-04 | Phase 12 | Complete |
| COMM-05 | Phase 12 | Complete |
| COMM-06 | Phase 12 | Complete |
| COMM-07 | Phase 12 | Complete |
| COMM-08 | Phase 12 | Complete |
| COMM-09 | Phase 12 | Complete |
| COMM-10 | Phase 12 | Complete |
| AINT-01 | Phase 13 | Pending |
| AINT-02 | Phase 13 | Pending |
| AINT-03 | Phase 13 | Pending |
| AINT-04 | Phase 13 | Pending |
| AINT-05 | Phase 13 | Pending |
| AINT-06 | Phase 13 | Pending |
| AINT-07 | Phase 13 | Pending |
| AINT-08 | Phase 13 | Pending |
| AINT-09 | Phase 13 | Pending |
| AINT-10 | Phase 13 | Pending |
| AINT-11 | Phase 13 | Pending |
| AINT-12 | Phase 13 | Pending |

**v2.0 Coverage:**
- v2.0 requirements: 32 total
- QOL complete: 10/10
- Community: 0/10 (Phase 12 pending)
- AI Layer: 0/12 (Phase 13 pending)

---
*Requirements defined: 2026-02-24*
*Last updated: 2026-02-25 — v1.0 archived; trimmed to v2.0 scope only*
