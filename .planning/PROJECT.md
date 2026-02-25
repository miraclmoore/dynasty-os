# Dynasty OS

## What This Is

Dynasty OS is a desktop companion platform for sports game dynasty and franchise modes, built for Windows as a standalone app that lives alongside the game. It solves the single biggest failure of franchise gaming — zero historical memory — by providing persistent stat tracking, Claude AI-powered narrative generation, and shareable legacy artifacts. v1.0 shipped with EA Sports CFB 26 (console, screenshot ingestion) and Madden NFL 26 (PC, direct save file sync). v2.0 (The Living Dynasty) is adding QOL polish, community features, and an AI intelligence layer.

## Core Value

The memory layer, narrative engine, and legacy vault that sports games never built — transforming raw dynasty data into stories that persist, compound, and can be shared.

## Current Milestone: v2.0 The Living Dynasty

**Goal:** Elevate Dynasty OS from a data tracker into an intelligent, living dynasty companion — 33 new capabilities across UX polish, community-requested features, and a novel AI intelligence layer.

**Status:** Phases 10–11 complete (infrastructure + QOL wins). Phases 12–13 in planning (community features + AI layer).

**Target features:**
- QOL Wins (10): ✅ All 10 shipped in Phase 11
- Community Features (10): Coaching staff lifecycle tracker, CFB-to-Madden player continuity, playoff scenario simulator, NIL budget ledger, future schedule builder + bowl projection, trade value calculator, recruiting class grade comparison, auto-sync/live data export, historical season record book, rivalry dashboard with full series context
- AI Intelligence Layer (12): Living Chronicle, Hot Seat/Pressure Meter, Opponent Intelligence Dossiers, Generational Player Arcs, Rival Prophecy, The Obituary Room, The Journalist, Cross-Dynasty Intelligence, Momentum Heat Map, What If Engine, Broadcast Booth/Audio Mode, DNA Report

## Requirements

### Validated

<!-- v1.0 — All shipped (Phases 1–9, archived 2026-02-24) -->
- ✓ Foundation (FOUND-01–06) — Multi-dynasty management, JSON import/export, offline-first — Phase 1 — v1.0
- ✓ Dashboard & Season Management (DASH-01–03, SEAS-01–05) — Core game logging loop — Phase 2 — v1.0
- ✓ Player Tracking & Records (PLAY-01–07, REC-01–03) — Roster, career stats, Legacy Cards, leaderboards — Phase 3 — v1.0
- ✓ Narrative Engine (NARR-01–04) — Claude AI season recaps, tone presets, taglines — Phase 4 — v1.0
- ✓ CFB Features (RECR-01–04, PORT-01–03, DRFT-01–03, PRES-01–03) — Recruiting, portal, draft, prestige — Phase 5 — v1.0
- ✓ Social & Legacy (RIVL-01–03, TIME-01–02, SCOU-01) — Rivalries, timeline, scouting cards — Phase 6 — v1.0
- ✓ Achievements (ACHV-01–03) — Trophy room, achievement engine, coaching resume — Phase 7 — v1.0
- ✓ Screenshot Ingestion (INGST-04–06) — Claude Vision API screenshot parsing + amber confirmation — Phase 8 — v1.0
- ✓ Madden Sync (SYNC-01–07) — Tauri sidecar save file adapter, diff confirm, file watcher — Phase 9 — v1.0

<!-- v2.0 QOL Wins — shipped (Phase 11, 2026-02-25) -->
- ✓ QOL Wins (QOL-01–10) — Toast notifications, undo, persistent filters, Cmd+K palette, CSV export, year auto-suggest, recent opponents, player notes, season checklist, timeline scrubber — Phase 11 — v2.0

### Active

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
- **Monorepo:** Turborepo + pnpm workspaces; shared packages for core-types, db, sport-configs, ui-components
- **Database:** Dexie v6 + IndexedDB — local-first; 18 tables after v2.0 schema migration (5 new in Phase 10: coachingStaff, nilEntries, futureGames, playerLinks, aiCache)
- **AI:** Claude Haiku for short-form (blurbs, class grades, screenshot parsing); Claude Sonnet 4.6 for long-form (season recaps). All AI content cached in Dexie aiCache (migrated from localStorage in Phase 10).
- **State:** Zustand stores: dynasty, season, game, player, narrative, achievement, prestige + ToastStore, FilterStore, UndoStore, AiQueueStore (added Phase 10–11)
- **Madden sync:** madden-franchise npm library (bep713) — direct save file parsing. **Risk:** Madden 26 schema support in-progress at launch. Version-check guard + graceful fallback live.
- **CFB ingestion:** Console-only game; data enters via manual entry + Claude Vision API screenshot parsing.
- **Codebase:** ~15,600 TypeScript LOC across phases 1–11. Build exits 0 on all platform checks.
- **Known gaps (pre-production):** Sidecar production binary not compiled; Windows <80MB validation pending.

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
| Tauri over Electron | <80MB idle RAM target incompatible with Electron's 150-300MB footprint | ✓ Good — target met on macOS; Windows pending |
| CFB as V1 launch title | Largest dynasty community, deepest feature demand, console-only forces screenshot ingestion path | ✓ Good — feature set complete |
| Madden as V1 launch title | PC availability enables direct save file sync — primary competitive moat | ✓ Good — sidecar shipped; Madden 26 schema risk mitigated by fallback |
| P2 features deferred to V2 | P0+P1 is sufficient for compelling V1; P2 adds complexity without core value impact | ✓ Good — v1.0 shipped focused |
| NBA 2K deferred to V3 | No offline save file parser exists; requires live memory injection | ✓ Good — correct deferral |
| Local-first, no cloud V1 | Eliminates auth complexity and hosting costs; JSON export/import covers portability | ✓ Good — zero infra overhead |
| Sport Config pattern | Isolates sport differences in config objects; shared components stay sport-agnostic | ✓ Good — CFB/Madden cleanly separated |
| Claude Haiku for short AI, Sonnet for long-form | Cost/quality balance — blurbs/grades don't need Sonnet depth | ✓ Good — consistent across all phases |
| Blob URL workaround (Tauri PNG/CSV export) | WKWebView/WebView2 block anchor.click() blob downloads | ✓ Good — Tauri dialog+fs pattern reused everywhere |
| Async fire-and-forget for AI calls | Blurbs/achievements must never block game logging saves | ✓ Good — consistent pattern established |
| Dexie aiCache replaces localStorage | localStorage has no LRU, no indexing, pollutes storage namespace | ✓ Good — migrated in Phase 10; LRU at 100 entries |
| Zustand UndoStore DB-level descriptors | zundo state snapshots risk DB/store inconsistency from side effects | ✓ Good — clean undo for game/player/season |
| cmdk for command palette | Headless, accessible, well-maintained — fits Tailwind + TypeScript stack | ✓ Good — 18-page palette shipped in Phase 11 |

---

*Last updated: 2026-02-25 after v1.0 milestone archived; v2.0 Phases 10–11 complete*
