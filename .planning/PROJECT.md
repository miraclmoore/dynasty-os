# Dynasty OS

## What This Is

Dynasty OS is a desktop companion platform for sports game dynasty and franchise modes, built for Windows as a standalone app that lives alongside the game. It solves the single biggest failure of franchise gaming — zero historical memory — by providing persistent stat tracking, Claude AI-powered narrative generation, and shareable legacy artifacts. V1 launches with EA Sports CFB 26 (console, screenshot ingestion) and Madden NFL 26 (PC, direct save file sync).

## Core Value

The memory layer, narrative engine, and legacy vault that sports games never built — transforming raw dynasty data into stories that persist, compound, and can be shared.

## Current Milestone: v2.0 The Living Dynasty

**Goal:** Elevate Dynasty OS from a data tracker into an intelligent, living dynasty companion — 33 new capabilities across UX polish, community-requested features, and a novel AI intelligence layer.

**Target features:**
- QOL Wins (10): Toast notifications, season checklist, persistent filters, auto-suggest season year, CSV export, recent opponents in Log Game, inline player notes, last-action undo, Cmd+K command palette, season timeline scrubber
- Community Features (10): Coaching staff lifecycle tracker, CFB-to-Madden player continuity, playoff scenario simulator, NIL budget ledger, future schedule builder + bowl projection, trade value calculator, recruiting class grade comparison, auto-sync/live data export, historical season record book, rivalry dashboard with full series context
- AI Intelligence Layer (12): Living Chronicle, Hot Seat/Pressure Meter, Opponent Intelligence Dossiers, Generational Player Arcs, Rival Prophecy, The Obituary Room, The Journalist, Cross-Dynasty Intelligence, Momentum Heat Map, What If Engine, Broadcast Booth/Audio Mode, DNA Report

## Requirements

### Validated

<!-- v1 — All shipped (Phases 1–9, completed 2026-02-24) -->
- ✓ Foundation (FOUND-01–06) — Multi-dynasty management, JSON import/export, offline-first — Phase 1
- ✓ Dashboard & Season Management (DASH-01–03, SEAS-01–05) — Core game logging loop — Phase 2
- ✓ Player Tracking & Records (PLAY-01–07, REC-01–03) — Roster, career stats, Legacy Cards, leaderboards — Phase 3
- ✓ Narrative Engine (NARR-01–04) — Claude AI season recaps, tone presets, taglines — Phase 4
- ✓ CFB Features (RECR-01–04, PORT-01–03, DRFT-01–03, PRES-01–03) — Recruiting, portal, draft, prestige — Phase 5
- ✓ Social & Legacy (RIVL-01–03, TIME-01–02, SCOU-01) — Rivalries, timeline, scouting cards — Phase 6
- ✓ Achievements (ACHV-01–03) — Trophy room, achievement engine, coaching resume — Phase 7
- ✓ Screenshot Ingestion (INGST-04–06) — Claude Vision API screenshot parsing — Phase 8
- ✓ Madden Sync (SYNC-01–07) — Tauri sidecar save file adapter, diff confirm, file watcher — Phase 9

### Active

<!-- v2.0 QOL Wins -->
- [ ] Toast notification system — app-wide feedback for all write operations
- [ ] Season checklist — per-season task checklist surfaced on dashboard
- [ ] Persistent filters — all list/table filters survive navigation
- [ ] Auto-suggest season year — new season year defaults to last + 1
- [ ] CSV export — export any data table to CSV
- [ ] Recent opponents in Log Game — quick-select last N opponents in game entry modal
- [ ] Inline player notes — free-text note field per player record
- [ ] Last-action undo — single-level undo for game log, player, and stat edits
- [ ] Cmd+K command palette — keyboard-driven navigation and quick actions
- [ ] Season timeline scrubber — horizontal scrubber to jump between seasons

<!-- v2.0 Community Features -->
- [ ] Coaching staff lifecycle tracker — hire/fire/promote staff with tenure and scheme history
- [ ] CFB-to-Madden player continuity — link CFB player records to their NFL/Madden counterparts
- [ ] Playoff scenario simulator — interactive bracket simulator for current season
- [ ] NIL budget ledger — track NIL spend by player, class, and position (CFB)
- [ ] Future schedule builder + bowl projection — build future season schedules, simulate bowl matchups
- [ ] Trade value calculator — Madden trade evaluation using player ratings and contract data
- [ ] Recruiting class grade comparison — side-by-side class comparison across seasons or rivals
- [ ] Auto-sync/live data export — background JSON/CSV export on every save
- [ ] Historical season record book — full year-by-year records, stats, and awards in one view
- [ ] Rivalry dashboard with full series context — expanded rivalry: series history, momentum, key moments

<!-- v2.0 AI Intelligence Layer -->
- [ ] Living Chronicle — real-time AI narrative that updates as season data is logged
- [ ] Hot Seat/Pressure Meter — AI-derived pressure index based on results vs expectations
- [ ] Opponent Intelligence Dossiers — AI-generated pre-game scouting reports
- [ ] Generational Player Arcs — AI narrative tracing a player's full career journey
- [ ] Rival Prophecy — AI prediction of rivalry trajectory based on current momentum
- [ ] The Obituary Room — AI eulogies for departed program legends
- [ ] The Journalist — AI reporter writing breaking news blurbs triggered by game events
- [ ] Cross-Dynasty Intelligence — AI insights comparing patterns across multiple dynasties
- [ ] Momentum Heat Map — visual AI heat map of momentum shifts across a season
- [ ] What If Engine — AI counterfactual simulator for alternate dynasty history
- [ ] Broadcast Booth/Audio Mode — AI text-to-speech play-by-play fragments for game recaps
- [ ] DNA Report — AI analysis of program identity: style, recruiting philosophy, coaching signature

### Out of Scope

- Coordinator Legacy Tracker (P2) — deferred to V2; not core to launch value
- Season Predictions & Accuracy Tracker (P2) — deferred to V2
- Immersive Front Office Inbox (P2) — deferred to V2
- Legacy Score composite (P2) — deferred to V2
- Mobile application — companion screenshot app is a separate lightweight tool, not V1 scope
- NBA 2K, MLB The Show, FIFA/EA FC support — no offline save parser exists; V3+
- Multi-user dynasty merging — high complexity; V2+
- In-game overlay / game modification — out of scope permanently
- Cloud backup / account system — local-first at V1; V2 with cloud sync
- Monetization of any kind — free at launch
- macOS / Linux — V2; ~85% of target users are Windows

## Context

- **Platform:** Tauri 2.x desktop app (Rust backend + native OS WebView). Critical constraint: must not impact gaming PC performance. Target <80MB idle RAM, <15MB installer.
- **Frontend:** React 18 + TypeScript, Tailwind CSS, Zustand state management, Vite bundler
- **Monorepo:** Turborepo + pnpm workspaces; shared packages for core-types, core-engine, narrative-engine, achievement-engine, ui-components, db, adapters, sport-configs
- **Database:** IndexedDB via Dexie ORM — local-first, no server required, query-capable
- **AI:** Anthropic Claude API for narrative generation, Legacy Card blurbs, recruiting class analysis, screenshot parsing (Vision API). All AI content cached locally to prevent re-generation.
- **Madden sync:** madden-franchise npm library (bep713) — direct save file parsing. **Risk:** Madden 26 schema support is actively in development at launch. Version-check guard required; graceful fallback to manual/screenshot entry.
- **CFB ingestion:** Console-only game; data enters via manual entry + Claude Vision API screenshot parsing (mobile companion sends screenshots). ~70-80% manual entry reduction.
- **Target users:** Solo dynasty players (primary), online dynasty commissioners, rebuild specialists, stats obsessives, content creators
- **Community:** Active on NCAAFBseries subreddit, Operation Sports forums, EA Community forums. Current workarounds are manual Google Sheets and screenshot libraries.

## Constraints

- **Tech Stack:** Tauri + React + TypeScript — established in tech spec, not negotiable
- **Performance:** <80MB idle RAM, <15MB installer, <3s cold start — gamer mental bar
- **Platform:** Windows-only at V1 — macOS/Linux deferred to V2
- **Dependency Risk:** madden-franchise library Madden 26 schema support in-progress — must have fallback path
- **AI Cost Control:** Cache all generated content; never re-generate without explicit user request
- **Data Durability:** 100% functional offline except AI features; atomic IndexedDB writes

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Tauri over Electron | <80MB idle RAM target incompatible with Electron's 150-300MB footprint | — Pending |
| CFB as V1 launch title | Largest dynasty community, deepest feature demand, console-only forces screenshot ingestion path | — Pending |
| Madden as V1 launch title | PC availability enables direct save file sync — primary competitive moat | — Pending |
| P2 features deferred to V2 | P0+P1 is sufficient for compelling V1; P2 adds complexity without core value impact | — Pending |
| NBA 2K deferred to V3 | No offline save file parser exists; requires live memory injection | — Pending |
| Local-first, no cloud V1 | Eliminates auth complexity and hosting costs; JSON export/import covers portability | — Pending |
| Sport Config pattern | Isolates sport differences in config objects; shared components stay sport-agnostic; clean multi-sport extensibility | — Pending |

---
*Last updated: 2026-02-24 after Milestone v2.0 start*
