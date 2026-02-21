# Dynasty OS

## What This Is

Dynasty OS is a desktop companion platform for sports game dynasty and franchise modes, built for Windows as a standalone app that lives alongside the game. It solves the single biggest failure of franchise gaming — zero historical memory — by providing persistent stat tracking, Claude AI-powered narrative generation, and shareable legacy artifacts. V1 launches with EA Sports CFB 26 (console, screenshot ingestion) and Madden NFL 26 (PC, direct save file sync).

## Core Value

The memory layer, narrative engine, and legacy vault that sports games never built — transforming raw dynasty data into stories that persist, compound, and can be shared.

## Requirements

### Validated

(None yet — ship to validate)

### Active

<!-- P0 — Launch critical -->
- [ ] Dashboard / Command Center — season-at-a-glance hub with standings, recent activity, quick entry access, stat highlights
- [ ] Dynasty Narrative Engine — Claude AI-generated season recaps with ESPN, Hometown, and Legend tone presets; auto-generated season tagline
- [ ] Program Prestige Tracker — year-over-year prestige rating trends, recruiting ranking history, AP/CFP rank trajectory charts
- [ ] Rivalry Record Tracker — head-to-head records vs tracked rivals, streak indicators, rivalry intensity scoring
- [ ] NFL Draft Tracker — annual draft class tracking by player, position, round, team; historical totals
- [ ] Recruiting Class Grades & Analysis — per-class rankings, star distribution, position needs grade, Claude AI class analysis
- [ ] Player Legacy Cards — auto-generated at player departure: career stats, awards, AI Hall of Fame blurb, exportable PNG
<!-- P1 — Launch complete -->
- [ ] Season Snapshot / This Week — weekly recap widget: record, ranking movement, notable stats, upcoming opponent
- [ ] Coach Milestone & Achievement System — trophy room for win totals, championships, bowl wins, coaching tree
- [ ] Multi-Dynasty Support — manage multiple simultaneous dynasties across sports from unified launcher
- [ ] Opponent Scouting Cards — pre-game profile: historical record vs your program, their season stats, tendency notes
- [ ] Transfer Portal War Room — annual portal log: arrivals/departures, position needs analysis, net impact rating
- [ ] Program Timeline / Dynasty Bible — single scrollable page one node per season; exportable as PDF
- [ ] Head-to-Head Records — all-time records against every opponent, filterable by era/coaching staff

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
*Last updated: 2026-02-21 after initialization*
