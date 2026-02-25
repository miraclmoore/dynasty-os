# Project Research Summary

**Project:** Dynasty OS v2.0
**Domain:** Desktop sports dynasty companion app (Tauri 2 + React) — 33-feature milestone
**Researched:** 2026-02-24
**Confidence:** HIGH

## Executive Summary

Dynasty OS v2.0 extends an already-functional Tauri 2 + React + Zustand + Dexie desktop app with 33 new features across three categories: quality-of-life wins, community tracking features, and an AI intelligence layer. The codebase is mature — Phases 1–9 are complete and the existing patterns (Zustand stores, Dexie ORM, Tauri plugins, Anthropic SDK) are proven and consistent. The research confirms that v2.0 requires only 4 new npm packages (`cmdk`, `sonner`, `zundo`, `papaparse`) and 5 new Dexie tables (`coachingStaff`, `nilEntries`, `futureGames`, `playerLinks`, `aiCache`), with the vast majority of features buildable atop the existing stack. No new Rust/Cargo additions are required for core functionality.

The recommended approach is to sequence work infrastructure-first: an AI infrastructure phase must precede all 12 AI features to migrate caches from localStorage to Dexie, establish an async job queue, and define the Dexie v6 schema. This single investment prevents the highest-severity pitfalls — localStorage quota exhaustion and UI-blocking AI calls — and avoids costly retrofitting mid-milestone. Once infrastructure is in place, QOL features, community tracking features, and the AI intelligence layer can be built in parallel or sequenced by complexity.

The primary risks are all infrastructure-related and well-understood. The localStorage AI cache quota problem will cause silent failures at scale if not addressed first. The Dexie migration version plan must be established before any new tables are added. The async AI job queue must be designed before building the Living Chronicle or Journalist features, both of which are triggered by data saves. All three risks have clear, documented mitigations and are addressable in a single infrastructure phase at the start of the milestone.

## Key Findings

### Recommended Stack

The existing stack requires minimal additions. The 4 mandatory new packages fill genuine capability gaps that cannot be reasonably addressed with existing dependencies: `cmdk` for the command palette (headless, fuzzy search, React 18, used by shadcn/ui), `sonner` for toasts (2–3KB, stacking, Tailwind-compatible), `zundo` for single-level undo (under 700B, wraps Zustand temporal middleware), and `papaparse` for CSV export (zero dependencies, `unparse()` converts JSON arrays to CSV). All other features in the 33-feature list — including all 12 AI features — are buildable with the existing Anthropic SDK, Dexie, Zustand, and Tauri plugin stack.

Installation is a single command: `pnpm --filter @dynasty-os/desktop add cmdk sonner zundo papaparse`. No Tauri plugin changes are required. The `tauri-plugin-global-shortcut` Rust plugin is explicitly NOT needed — an in-WebView `keydown` event listener is sufficient for Ctrl+K.

**Core new dependencies:**
- `cmdk@1.1.1`: Command palette component — headless, React 18 `useSyncExternalStore`, ~6KB gzip, no Fuse.js
- `sonner@2.0.7`: Toast notifications — 2–3KB gzip, imperative `toast()` API, no CSP conflicts with Tauri
- `zundo@2.3.0`: Last-action undo via Zustand temporal middleware — under 700B, wraps existing stores
- `papaparse@5.5.3`: CSV export — 0 dependencies, `Papa.unparse(jsonArray)` returns CSV string

**Explicit avoids (do not add):**
- `react-papaparse` wrapper (2+ years stale), `kbar` (still in beta), `@g-loot/react-tournament-brackets` (unmaintained), `tauri-plugin-tts` (2 commits, Dec 2025), any animation or date library

### Expected Features

Research categorized all 33 features by table stakes vs. differentiator status and complexity.

**Must have (table stakes — users expect these, absence makes app feel broken):**
- Toast notification system — silent saves are unacceptable to users migrating from Google Sheets
- Last-action undo for deletes — data safety net; absence causes data loss anxiety
- Persistent filter state — losing filters on navigation makes tables feel broken
- NIL Budget Ledger — dominant conversation in CFB 26 dynasty communities; users have no other tracking option
- Playoff Scenario Simulator — "commissioner" users build this in Google Sheets today; most-requested
- Historical Season Record Book — core "memory layer" product promise; the full dynasty arc view

**Should have (differentiators that elevate the product above spreadsheets):**
- Command Palette (Cmd+K) — signals professional software; no dynasty tool has this
- Trade Value Calculator — most downloaded community tool on Operation Sports (Madden users)
- Rivalry Dashboard expansion — single most-requested expansion of the existing feature set
- Living Chronicle — running AI narrative that updates per game; unique capability
- The Journalist — auto-generates news wire blurbs after significant games
- Generational Player Arcs — longitudinal AI career biography; distinct from Legacy Cards
- Coaching Staff Lifecycle Tracker — heavily requested for 20+ year dynasty users
- CFB-to-Madden Player Continuity — unique cross-game capability; no other tool does this

**Defer or treat as stretch (v2.1+):**
- Broadcast Booth / Audio Mode — Web Speech API voice availability varies per Windows install; graceful fallback required; treat as stretch in AI phase
- Cross-Dynasty Intelligence — most computationally complex context-building in the AI layer; cap at 5 dynasties
- DNA Report — similar complexity to Cross-Dynasty; worth shipping but late in AI phase
- Playoff bracket: custom React/Tailwind component (do not use `@g-loot/react-tournament-brackets`)

**Anti-features identified (explicitly do not build):**
- AI assistant chat inside command palette (different product)
- Multi-level undo/redo stack (single-level is 90% of user need)
- Notification inbox/history panel (overkill for local desktop app)
- NIL enforcement against game limits (user wants a ledger, not a simulator)

### Architecture Approach

The architecture follows a strict layering already established in the codebase: App.tsx (root portals) → Page Layer (React components) → Zustand Store Layer → Service Layer (lib/*.ts) → Dexie ORM → Tauri 2 backend. All 33 features fit this existing pattern without structural changes. Two new global UI elements (ToastContainer, CommandPalette) render as fixed portals in App.tsx above PageContent. Approximately 11 new pages are added to the navigation switch. Five new Zustand stores handle QOL infrastructure. Eight new service files handle new domains. One DB version bump to v6 adds 5 new tables.

**Major components and their responsibilities:**
1. **AI Infrastructure Layer** (`useAIIntelligenceStore` + `ai-intelligence-service.ts`) — Shared async job queue, Dexie `aiCache` table, pending-job tracking, rate limiting, and cache retrieval for all 12 AI features; must be built before any AI feature
2. **QOL Infrastructure** (`useToastStore`, `useUndoStore`, `useFilterStore`, `useCommandPaletteStore`) — Global feedback, undo, filter persistence, and command palette; foundational for all other features
3. **Community Feature Pages** (CoachingStaffPage, NILLedgerPage, PlayoffSimulatorPage, TradeValuePage, RivalryDashboardPage, RecordBookPage, ScheduleBuilderPage) — New pages with new Dexie tables; sport-gated where appropriate (`dynasty.sport === 'cfb'` or `'madden'`)
4. **AI Intelligence Pages** (LivingChroniclePage, MomentumMapPage, WhatIfPage, BroadcastBoothPage, DNAReportPage + inline features on existing pages) — All consume the shared AI infrastructure; use `aiCache` Dexie table not localStorage
5. **Dexie v6 Schema** — 5 new tables: `coachingStaff`, `nilEntries`, `futureGames`, `playerLinks`, `aiCache`; version plan must be documented before any code

### Critical Pitfalls

1. **localStorage AI cache quota explosion** — The existing pattern caches AI narratives in localStorage. Adding 12 AI features multiplies storage 12x without eviction, hitting the 5–10 MiB browser quota within months. Prevention: migrate ALL AI caches to a `Dexie aiCache` table (key, dynastyId, generatedAt, content) with LRU eviction (100 entries per dynasty) BEFORE building any AI feature. Add `StorageManager.estimate()` check at startup.

2. **AI features blocking the UI save path** — If Living Chronicle or The Journalist await Claude API calls (3–8 seconds each) inside the save flow, every game log becomes slow. Prevention: all data-event-triggered AI calls must use a fire-and-forget job queue in Zustand (`pendingAiJobs: Job[]`). The save resolves in under 200ms; AI populates asynchronously. Design the queue before building these features.

3. **Dexie migration version collision** — The current schema has skipped versions (2 and 3 are missing). Adding 5+ new tables without a documented version plan will cause `VersionError` for existing users and potential deadlocks in multi-tab scenarios. Prevention: document a version roadmap (v6: coachingStaff + aiCache; v7: nilEntries + futureGames + playerLinks) before any code. Add a `db.on('versionchange')` handler that closes the DB and reloads.

4. **Cmd+K swallowed by WebView on cold launch** — On Windows WebView2, keyboard events are not received until the user clicks inside the WebView at least once. Prevention: autofocus `document.body` at app startup via a hidden input element on mount. Test Ctrl+K on packaged build without any prior mouse click as part of every release checklist.

5. **Undo/DB inconsistency via stale closure state** — Storing the "previous state" as a Zustand snapshot and restoring it will leave the DB and Zustand inconsistent when side effects (achievement engine, auto-export) run between the action and the undo. Prevention: store undo as a DB-level operation descriptor (`{ table: 'games', operation: 'delete', id: 'xyz' }`), not a state snapshot. Execute undo against Dexie, then call `loadX()` to re-sync Zustand.

## Implications for Roadmap

Based on combined research, the 33 features split cleanly into 4 phases with a mandatory infrastructure phase first.

### Phase 1: Infrastructure Foundation
**Rationale:** Three of the top five critical pitfalls (localStorage AI cache, async job queue, Dexie migration version collision) must be resolved before any feature is built. Getting the DB version plan and AI infrastructure wrong requires retrofitting every subsequent feature. This phase has no user-visible deliverables but prevents catastrophic technical debt.
**Delivers:** Dexie v6 schema with all 5 new tables defined, `aiCache` Dexie table replacing localStorage for all AI caches, async AI job queue (`pendingAiJobs` in Zustand), `StorageManager.estimate()` check at startup, `db.on('versionchange')` handler, Dexie version roadmap document
**Avoids:** Pitfalls 1 (localStorage quota), 2 (AI blocking saves), 3 (Dexie version collision)
**Research flag:** No deeper research needed — mitigations are documented and specific

### Phase 2: QOL Wins
**Rationale:** QOL features are the highest confidence (LOW complexity, no AI, well-documented patterns). They improve every interaction in the app and are prerequisites for good UX in later phases (toast system underpins undo UX; filter persistence improves every list page built in Phase 3). Install the 4 npm packages here.
**Delivers:** Toast notification system (`sonner`), Command Palette (`cmdk`, Ctrl+K), Last-action undo (`zundo`, DB-descriptor pattern), Persistent filter state (Zustand persist), CSV export (`papaparse`), Season Checklist, Auto-suggest season year, Recent opponents in Log Game, Inline player notes, Season timeline scrubber
**Uses:** `cmdk`, `sonner`, `zundo`, `papaparse` (all installed here)
**Avoids:** Pitfall 4 (cold-launch Ctrl+K), Pitfall 5 (undo DB inconsistency), Pitfall 10 (toast z-index behind modals)
**Research flag:** Standard patterns — skip `/gsd:research-phase`

### Phase 3: Community Features
**Rationale:** Community features require the most new Dexie tables (all 5 defined in Phase 1 are consumed here). They are non-AI and medium complexity, making them safer to build after QOL but before the AI layer which depends on stable data. The auto-sync feature belongs here since it depends on file system patterns established by existing export flow.
**Delivers:** Coaching Staff Lifecycle Tracker (new `coachingStaff` table), CFB-to-Madden Player Continuity (`playerLinks` table), Playoff Scenario Simulator, NIL Budget Ledger (`nilEntries` table), Future Schedule Builder (`futureGames` table), Trade Value Calculator, Recruiting Class Grade Comparison, Auto-Sync/Live Data Export, Historical Season Record Book, Rivalry Dashboard expansion
**Avoids:** Pitfall 6 (auto-export race condition — debounce + write lock), Pitfall 7 (CFB-Madden link orphaning — cascade delete hook on same PR)
**Research flag:** No deeper research needed for most. CFB-to-Madden cross-dynasty query pattern is novel for this codebase — validate Dexie `anyOf` performance with large player sets before implementing the linking modal

### Phase 4: AI Intelligence Layer
**Rationale:** All AI features depend on the infrastructure built in Phase 1 (aiCache table, job queue). Building these last ensures the infrastructure is hardened by real usage from earlier phases. Features can be ordered by cost/complexity: cheaper Haiku features (Hot Seat, Journalist, Obituary Room, Rival Prophecy) before more expensive Sonnet features (Living Chronicle, What If Engine, DNA Report, Cross-Dynasty Intelligence).
**Delivers:** Living Chronicle, Hot Seat/Pressure Meter, Opponent Intelligence Dossiers, Generational Player Arcs, Rival Prophecy, The Obituary Room, The Journalist, Cross-Dynasty Intelligence, Momentum Heat Map, What If Engine, Broadcast Booth (stretch), DNA Report
**Uses:** Existing Anthropic SDK, `aiCache` Dexie table, async job queue
**Sub-sequencing recommendation:**
  - 4a (Haiku features — cheap, high frequency): The Journalist, Hot Seat, Rival Prophecy, Opponent Dossiers, Obituary Room
  - 4b (Sonnet features — quality narratives): Living Chronicle, Generational Player Arcs, Momentum Heat Map, What If Engine
  - 4c (Sonnet synthesis — complex context building): Cross-Dynasty Intelligence, DNA Report, Broadcast Booth (stretch)
**Avoids:** Pitfall 1 (aiCache table already in place), Pitfall 2 (job queue already in place), Pitfall 8 (TTS voice availability — graceful fallback from day one), Pitfall 9 (What If hallucination — Dexie queries not Zustand state, completeness assertion before Claude call)
**Research flag:** AI prompt engineering will need iteration; mark Living Chronicle, What If Engine, and Cross-Dynasty Intelligence for `/gsd:research-phase` prompt design before implementation. The Journalist's trigger evaluation logic needs careful spec to avoid over-calling Claude.

### Phase Ordering Rationale

- Phase 1 before everything: localStorage + Dexie migration pitfalls are catastrophic and retrofit-expensive
- Phase 2 before Phase 3: Toast system and undo UX improve every community feature interaction
- Phase 3 before Phase 4: Stable data model (new tables) and sport-gated patterns must be established before AI features consume them
- Phase 4 last: All AI features depend on Phase 1 infrastructure; complex features should land after simpler patterns are proven
- Within Phase 4: Haiku before Sonnet — validate prompt patterns cheaply before committing to expensive Sonnet calls

### Research Flags

Phases needing deeper research during planning:
- **Phase 4 AI features (Living Chronicle, What If Engine, Cross-Dynasty Intelligence):** Prompt engineering requires iteration and is not researchable in advance. Plan a `/gsd:research-phase` spike for each major AI prompt before implementation.
- **Phase 4 Broadcast Booth (TTS):** Voice availability testing on minimal Windows installs should happen before committing to this feature. Consider a dedicated spike.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Infrastructure):** Dexie migration and async queue patterns are well-documented and specific
- **Phase 2 (QOL):** All packages have official docs and established integration patterns
- **Phase 3 (Community):** Standard CRUD patterns; only the CFB-to-Madden cross-dynasty query warrants a brief spike on Dexie `anyOf` performance

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All packages verified via npm/GitHub. Version compatibility confirmed. Clear avoidance list backed by concrete reasons (stale, beta, overkill) |
| Features | HIGH (QOL/Community), MEDIUM (AI) | QOL and community feature patterns are well-understood. AI feature complexity is clear but prompt quality requires empirical iteration — cannot be pre-validated |
| Architecture | HIGH | Based on direct codebase inspection (not assumptions). Integration map covers all 33 features with exact component/store/service/table placement |
| Pitfalls | HIGH | All 10 pitfalls verified against official Tauri GitHub issues, Dexie docs, MDN storage quotas, and Claude API rate limit docs. Specific issue numbers cited |

**Overall confidence:** HIGH

### Gaps to Address

- **AI prompt quality:** Prompt text for all 12 AI features is specced but quality can only be validated through iteration. Treat all AI prompts as v1 drafts requiring tuning after first implementation. Do not over-invest in prompt engineering before seeing real output.
- **Recharts dependency decision:** The NIL Ledger (pie/bar chart), Recruiting Class Comparison (radar chart), and Rivalry Dashboard (momentum visualization) all benefit from Recharts. Research explicitly deferred this decision. Add `recharts@^3.7.0` only after confirming 3+ chart uses in v2.0 scope — if confirmed, install it in Phase 3 alongside NIL Ledger implementation.
- **Player `birthYear` gap:** The Trade Value Calculator requires `player.birthYear` for age-based value multipliers. This field does not currently exist on the `Player` type. Add it in Phase 1 (schema definition phase) alongside other type additions, even if it is nullable/optional at first.
- **CFB-to-Madden cross-dynasty query performance:** The player linking modal queries all players across multiple dynasties via Dexie `anyOf`. Performance at scale (10+ dynasties, 200+ players each) is unverified. Spike before implementing the modal.

## Sources

### Primary (HIGH confidence)
- Tauri keyboard event issues: GitHub Issues #8676, #5464, #13919
- Tauri Web Speech API discussion: GitHub Discussion #8784
- Tauri global shortcut plugin: v2.tauri.app/plugin/global-shortcut (confirmed `CommandOrControl+K` pattern)
- Dexie migration: dexie.org/docs/Version/Version.upgrade(), dexie.org/docs/Dexie/Dexie.on.versionchange
- Dexie cascade delete: dexie.org/docs/Table/Table.hook('deleting'), Dexie GitHub Issue #1932
- `cmdk` GitHub (pacocoursey/cmdk): v1.1.1, React 18 required, breaking changes from v0.x
- `sonner` npm: v2.0.7, 2762 dependents, ~2–3KB gzip
- `zundo` GitHub (charkour/zundo): v2.3.0, under 700B, Zustand v5 compatible
- `papaparse` npm: v5.5.3 (May 2025), 0 dependencies, 2489 dependents
- MDN Storage quotas: developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
- Anthropic rate limits docs: platform.claude.com/docs/en/api/rate-limits
- Architecture research: Direct codebase inspection of Dynasty OS v1 (Phases 1–9)

### Secondary (MEDIUM confidence)
- LogRocket "React toast libraries compared 2025" — `sonner` vs `react-hot-toast` comparison
- LogRocket "Best React chart libraries 2025" — `recharts` vs alternatives
- Operation Sports community forums — trade calculator demand, coaching staff tracking requests
- Lakera hallucination guide 2025 — LLM grounding via complete data snapshots
- RxDB IndexedDB slowness article — single DB vs multiple DB performance patterns

### Tertiary (LOW confidence)
- AI model selection (`claude-haiku-3-5` vs `claude-sonnet-4-5` for specific features) — cost/quality tradeoff guidance from Anthropic docs; exact model choice may need tuning after first implementation
- Trade value algorithm multipliers — community-consensus Jimmy Johnson chart adapted for Madden; exact position/age multipliers need empirical validation against gameplay expectations

---
*Research completed: 2026-02-24*
*Ready for roadmap: yes*
