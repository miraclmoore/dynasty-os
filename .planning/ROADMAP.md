# Roadmap: Dynasty OS

## Milestones

- ✅ **v1.0 Initial MVP** — Phases 1–9 (shipped 2026-02-24)
- 🚧 **v2.0 The Living Dynasty** — Phases 10–13 (in progress)
- 🚧 **v2.1 UX/UI Polish** — Phases 14–18 (in progress)

## Phases

<details>
<summary>✅ v1.0 Initial MVP (Phases 1–9) — SHIPPED 2026-02-24</summary>

- [x] Phase 1: Foundation (4/4 plans) — Tauri + React monorepo, Dexie DB, sport configs, multi-dynasty management
- [x] Phase 2: Core Loop (5/5 plans) — Dashboard, season game logging, auto-calculated records, inline editing
- [x] Phase 3: Player Tracking and Records (4/4 plans) — Roster, career stats, Legacy Cards, leaderboards
- [x] Phase 4: Narrative Engine (2/2 plans) — Claude AI season recaps, three tone presets, tagline caching
- [x] Phase 5: CFB Features (4/4 plans) — Recruiting, transfer portal, NFL Draft tracker, prestige chart
- [x] Phase 6: Social and Legacy (3/3 plans) — Rivalries, program timeline PDF export, opponent scouting
- [x] Phase 7: Achievements (2/2 plans) — Achievement engine, Trophy Room, Coaching Resume — completed 2026-02-24
- [x] Phase 8: Screenshot Ingestion (2/2 plans) — Claude Vision API parsing, amber confirmation forms — completed 2026-02-24
- [x] Phase 9: Madden Sync (3/3 plans) — Tauri sidecar, diff confirmation, auto-confirm, file watcher — completed 2026-02-24

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>🚧 v2.0 The Living Dynasty (Phases 10–13) — In Progress</summary>

- [x] **Phase 10: Infrastructure Foundation** - Dexie v6 schema (5 new tables), async AI job queue, localStorage→aiCache migration, core-types additions, 4 npm packages, global store scaffolding (completed 2026-02-25)
- [x] **Phase 11: QOL Wins** - Toast notifications, undo, persistent filters, command palette, CSV export, season checklist, auto-suggest year, recent opponents, inline notes, timeline scrubber (completed 2026-02-25)
- [x] **Phase 12: Community Features** - Coaching staff tracker, CFB-Madden player continuity, playoff simulator, NIL ledger, schedule builder, trade calculator, class grade comparison, auto-sync, record book, rivalry dashboard expansion (plans 01-06 complete; 12-07 verification checkpoint pending)
- [ ] **Phase 13: AI Intelligence Layer** - Living Chronicle, Hot Seat, Opponent Dossiers, Generational Arcs, Rival Prophecy, Obituary Room, The Journalist, Cross-Dynasty Intelligence, Momentum Heat Map, What If Engine, Broadcast Booth, DNA Report

Full details: Phase Details — v2.0 section below.

</details>

### 🚧 v2.1 UX/UI Polish (In Progress)

- [x] **Phase 14: Onboarding Overhaul** - Tour auto-launches on dynasty creation, re-triggerable from persistent entry point, SetupWizard text legibility fix
- [ ] **Phase 15: Navigation** - Page headers with back navigation on all inner pages, visible page context at all times
- [ ] **Phase 16: Tooltips and Quick Entry** - Sidebar tooltip overflow fix, auto-adjusting tooltip placement, QuickEntryHub label legibility
- [ ] **Phase 17: Data Display and Page Audit** - GameLog inline note expansion, sparse inner pages fleshed out with content structure and empty states
- [ ] **Phase 18: Error States** - Recap API error UX with human-readable messages and actionable guidance

## Phase Details — v2.0

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
- [x] 10-01-PLAN.md — Dexie schema v6 migration (5 new tables) + 5 new core types + Player.birthYear
- [x] 10-02-PLAN.md — Install 4 npm packages: cmdk, sonner, zundo, papaparse
- [x] 10-03-PLAN.md — aiCache service layer + localStorage AI content migration (narrative, legacy blurbs)
- [x] 10-04-PLAN.md — Scaffold 4 Zustand stores (Toast, Filter, Undo, AiQueue) + App.tsx wiring

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
- [x] 11-01-PLAN.md — Toast + undo wiring: useToastStore into game/player/player-season/season stores; useUndoStore pushUndo for deletes/edits; RosterPage window.confirm() replaced with toast-undo
- [x] 11-02-PLAN.md — Filter persistence: useFilterStore wired into dynasty switch (clearAll) + RosterPage, LegendsPage, RecordsPage, DraftTrackerPage, TransferPortalPage
- [x] 11-03-PLAN.md — Command palette: CommandPalette.tsx with cmdk Command.Dialog (18 nav pages, sport-gated); App.tsx Cmd+K stub wired to open state
- [x] 11-04-PLAN.md — New features A: csv-export.ts utility + RosterPage/RecordsPage Export CSV buttons; DashboardPage new-season year auto-suggest; LogGameModal recent opponents chips; EditPlayerModal/PlayerProfilePage player notes
- [x] 11-05-PLAN.md — New features B: Dashboard season checklist widget (localStorage, CFB-gated tasks); ProgramTimelinePage horizontal year scrubber with scrollIntoView
- [x] 11-06-PLAN.md — Human verification checkpoint: build check + interactive walkthrough of all 10 QOL features

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
**Plans**: 7 plans

Plans:
- [x] 12-01-PLAN.md — Coaching Staff: coaching-staff-service + coaching-staff-store + CoachingStaffPage + navigation registration (COMM-01)
- [x] 12-02-PLAN.md — NIL Ledger: install recharts, nil-service + nil-store + NilLedgerPage with spend charts (COMM-04)
- [x] 12-03-PLAN.md — Future Schedule + Player Links: future-schedule-service/store + FutureSchedulePage; player-link-service/store + PlayerProfilePage section (COMM-02, COMM-05)
- [x] 12-04-PLAN.md — Playoff Simulator + Trade Calculator: playoff-bracket.ts + PlayoffSimulatorPage (CFB); trade-calculator.ts + TradeCalculatorPage (Madden) (COMM-03, COMM-06)
- [x] 12-05-PLAN.md — Recruiting Comparison + Record Book: RecruitingComparisonPage (CFB, recharts); RecordBookPage (sport-agnostic, direct db queries) (COMM-07, COMM-09)
- [x] 12-06-PLAN.md — Auto-Export + Rivalry Dashboard expansion: auto-export-service + dynasty-store wiring + export-import v2; rivalry momentum + key moments (COMM-08, COMM-10)
- [ ] 12-07-PLAN.md — Human verification checkpoint: build check + interactive walkthrough of all 10 COMM features

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

## Phase Details — v2.1

### Phase 14: Onboarding Overhaul
**Goal**: New users are guided through the full app on first dynasty creation, and existing users can re-discover the tour at any time — no one is left wondering what a section does.
**Depends on**: Phase 13 (or can run in parallel — no data model dependencies)
**Requirements**: ONBD-01, ONBD-02, ONBD-03
**Success Criteria** (what must be TRUE):
  1. After a user creates a new dynasty and lands on the dashboard, the onboarding tour launches automatically and cycles through every major section — sidebar, Log Game, End Season, SeasonAtGlance, RecentActivity, WeeklySnapshot, StatHighlights, QuickEntryHub, Season Checklist, GameLog — each with a spotlight highlight and an explanatory popup
  2. User can dismiss and later re-trigger the full tour at any time via a persistent `?` button visible on the dashboard (or equivalent Settings entry)
  3. SetupWizard description text is fully legible — no dimmed or low-opacity text on the wizard step descriptions
**Plans**: 2 plans

Plans:
- [x] 14-01-PLAN.md — Tour expansion: add data-tour-id to 7 missing widgets, expand TourOverlay to 12 steps, fix auto-launch to fire on dashboard (ONBD-01)
- [x] 14-02-PLAN.md — SetupWizard opacity fix + human verification of all 3 ONBD requirements (ONBD-02, ONBD-03)

### Phase 15: Navigation
**Goal**: Users always know where they are and can get back without hunting for a sidebar link — every inner page feels like a complete, navigable screen.
**Depends on**: Phase 14 (tour must identify pages that are being navigated)
**Requirements**: NAV-01, NAV-02
**Success Criteria** (what must be TRUE):
  1. From every non-root inner page (Coaching Staff, NIL Ledger, Future Schedule, Player Profile, Record Book, Rivalry Dashboard, and all other pages reachable from the sidebar), a back button or breadcrumb is visible and clicking it returns the user to the previous page without a full app reload
  2. Every inner page displays a page title (and optional parent context) in a consistent header position — a user landing mid-session can identify their current location without checking the sidebar
**Plans**: TBD

### Phase 16: Tooltips and Quick Entry
**Goal**: Contextual hints are always readable and never obscured — sidebar tooltips stay inside the viewport and QuickEntryHub category labels are scannable at a glance.
**Depends on**: Phase 14 (onboarding tour relies on tooltip-adjacent positioning logic)
**Requirements**: TIP-01, TIP-02, ENTRY-01
**Success Criteria** (what must be TRUE):
  1. Tooltips triggered by hovering sidebar nav items never overflow or clip at the right viewport edge — they remain fully visible regardless of window width
  2. Tooltip placement automatically flips to the available side (e.g. left-to-right or top-to-bottom) when the default placement does not have sufficient space
  3. QuickEntryHub category labels are large enough that a user can scan and identify the correct entry category without zooming or leaning in
**Plans**: TBD

### Phase 17: Data Display and Page Audit
**Goal**: GameLog notes are readable in full inline, and every inner page has enough structure that it feels intentional whether it has data or not.
**Depends on**: Phase 15 (navigation headers give sparse pages the structural frame they need before content is added)
**Requirements**: DISP-01, DISP-02
**Success Criteria** (what must be TRUE):
  1. In the GameLog, any note that exceeds one line shows an inline "show more" / "show less" control — the user can read the full note without opening a modal or navigating away
  2. Every inner page identified as sparse in the page audit has a non-trivial empty state (descriptive message + call to action) and at least a content skeleton when data is present — no page feels like a dead end
**Plans**: TBD

### Phase 18: Error States
**Goal**: When the Recap API fails, users see a clear explanation and a concrete next step — no raw error strings, no dead UI.
**Depends on**: Phase 16 (tooltip + UI polish baseline in place before layering error UX)
**Requirements**: ERR-01, ERR-02
**Success Criteria** (what must be TRUE):
  1. When the Season Recap API call fails for any reason, the error displayed is a plain-English sentence describing what went wrong — no raw error objects, stack traces, or API response strings are shown to the user
  2. The error UI includes at least one specific actionable suggestion — for example, prompting the user to check their API key in Settings, verify their internet connection, or use the retry button — so the user knows exactly what to do next
**Plans**: TBD

## Progress

**Execution Order:**
v1.0 phases executed 1 → 9. v2.0 phases execute 10 → 11 → 12 → 13. v2.1 phases execute 14 → 15 → 16 → 17 → 18.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 4/4 | Complete | 2026-02-21 |
| 2. Core Loop | v1.0 | 5/5 | Complete | 2026-02-21 |
| 3. Player Tracking and Records | v1.0 | 4/4 | Complete | 2026-02-22 |
| 4. Narrative Engine | v1.0 | 2/2 | Complete | 2026-02-22 |
| 5. CFB Features | v1.0 | 4/4 | Complete | 2026-02-22 |
| 6. Social and Legacy | v1.0 | 3/3 | Complete | 2026-02-22 |
| 7. Achievements | v1.0 | 2/2 | Complete | 2026-02-24 |
| 8. Screenshot Ingestion | v1.0 | 2/2 | Complete | 2026-02-24 |
| 9. Madden Sync | v1.0 | 3/3 | Complete | 2026-02-24 |
| 10. Infrastructure Foundation | v2.0 | 4/4 | Complete | 2026-02-25 |
| 11. QOL Wins | v2.0 | 6/6 | Complete | 2026-02-25 |
| 12. Community Features | v2.0 | 6/7 | In Progress | - |
| 13. AI Intelligence Layer | v2.0 | 0/TBD | Not started | - |
| 14. Onboarding Overhaul | v2.1 | 2/2 | Complete | 2026-02-26 |
| 15. Navigation | v2.1 | 0/TBD | Not started | - |
| 16. Tooltips and Quick Entry | v2.1 | 0/TBD | Not started | - |
| 17. Data Display and Page Audit | v2.1 | 0/TBD | Not started | - |
| 18. Error States | v2.1 | 0/TBD | Not started | - |
