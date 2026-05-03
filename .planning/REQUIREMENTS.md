# Requirements: Dynasty OS

**Defined:** 2026-05-03
**Core Value:** The memory layer, narrative engine, and legacy vault that sports games never built — transforming raw dynasty data into stories that persist, compound, and can be shared.

## v2.2 Requirements

Requirements for the Handoff Overhaul milestone. 40 tasks across 10 phases. Source: `docs/dynasty-os-claude-code-handoff.md`.

---

### Safety & Foundations

- [ ] **SAFE-01**: App renders a styled error UI instead of a blank screen when a fatal render error occurs anywhere in the tree
- [ ] **SAFE-02**: UndoStore undo operations use a typed `TABLE_MAP` constant instead of `db as any` — invalid table names produce compile-time errors
- [ ] **SAFE-03**: `zundo` package is removed from `package.json` and is not imported anywhere in the codebase
- [ ] **SAFE-04**: `getCareerLeaders()` and `getSingleSeasonLeaders()` each fetch all players in a single bulk query, not per-player inside a loop

### Security

- [ ] **SEC-01**: No file in `src/` calls `api.anthropic.com` directly — all Anthropic API calls route through the `call_anthropic` Tauri command via `src/lib/ai-bridge.ts`
- [ ] **SEC-02**: The Anthropic API key is stored in `@tauri-apps/plugin-store` (`dynasty-os.bin`), not in `localStorage` — setting a key is not visible in DevTools → Application → Local Storage
- [ ] **SEC-03**: All remaining `localStorage.getItem/setItem/removeItem` calls in `src/` are replaced with `await prefs.get/set/delete` from `src/lib/prefs-service.ts`

### Data Model

- [ ] **DMOD-01**: Rivalry key moments are stored in a Dexie `keyMoments` table (indexed by `[dynastyId+rivalId]`), included in dynasty export/import, and survive an export → fresh-install → import cycle
- [ ] **DMOD-02**: `Season` type has `bowlOpponent?: string` and `keyEvents?: string[]` fields; `SeasonEndModal` captures both; `timeline-service.ts` has no `(season as any)` casts
- [ ] **DMOD-03**: `Player` type has `devTrait?: 'normal' | 'star' | 'superstar' | 'xfactor'`; dev trait selector appears in `AddPlayerModal` and `EditPlayerModal`; colored badge visible on roster and player profile
- [ ] **DMOD-04**: `Player` type has `dealBreaker?: string` (14 CFB 26 categories) and `isRedshirt?: boolean`; both appear in `EditPlayerModal`; CFB roster shows deal breaker tag and RS badge
- [ ] **DMOD-05**: `Recruit` type has `motivation1/2/3?: string`, `dealBreakerMotivation?: string`, and `visitWeek?: number`; all fields save correctly via recruit add/edit forms

### Screenshot Pipeline

- [ ] **PIPE-01**: A player stats screenshot parses, shows a fuzzy match-to-roster UI where mismatches can be corrected, and clicking "Save Stats" writes records to `db.playerSeasons` — stats appear in the Records leaderboard
- [ ] **PIPE-02**: Depth chart screenshot shows parsed data with a "Copy as CSV" button; the "not saved in V1" notice is replaced
- [ ] **PIPE-03**: `recruiting-motivations` is a selectable screenshot type for CFB dynasties; parsing returns structured motivation grades and deal breaker; Hard Sell recommendation is shown inline
- [ ] **PIPE-04**: Screenshot ingestion file picker accepts multiple images; images are parsed sequentially with a progress indicator ("Parsing 3 of 5…"); combined confirm UI shown after all are parsed

### Madden Sync

- [ ] **MSYN-01**: After a Madden sync, player season records contain real stat lines (passing yards, rushing yards, receiving yards, defense stats, etc.) from the `PlayerStats` table — not just an OVR rating
- [ ] **MSYN-02**: On mount, `MaddenSyncPage` auto-detects franchise files in known save locations and shows them as one-click options above the "Browse for file" button

### Recruiting Tools

- [ ] **TOOL-01**: When a recruit has all three motivation grades filled in, the app shows a Hard Sell or Send the House recommendation using the Rule of 19 (sum ≥ 19 = Hard Sell); recommendation also appears inline after parsing a recruiting-motivations screenshot
- [ ] **TOOL-02**: CFB roster players with a `dealBreaker` set display an orange warning tag on the roster row; "Show at-risk" filter highlights all players with a deal breaker
- [ ] **TOOL-03**: A committed recruit card has an "Add to Roster" button that opens `AddPlayerModal` with the recruit's name, position, and star rating pre-filled
- [ ] **TOOL-04**: Adding a draft pick with a linked `playerId` automatically updates that player's status to `'drafted'`

### AI Queue & Features

- [ ] **AIQE-01**: The AI job queue processor runs pending jobs and transitions them `pending → running → done/failed`; no jobs silently accumulate; queue worker is mounted in `App.tsx`
- [ ] **AIQE-02**: Navigating to a player profile does NOT trigger an automatic API call for legacy blurb generation; blurb is generated only when the user clicks "Generate AI Blurb"
- [ ] **AIQE-03**: Game narratives are generated with Claude Haiku (`claude-haiku-4-5-20251001`); season narratives are generated with Claude Sonnet 4.6
- [ ] **AIQE-04**: After logging a game, a `game-narrative` job is auto-enqueued in the background if an API key is configured

### Data Entry UX

- [ ] **UXEN-01**: Dashboard has a Quick Score widget (team score vs opponent score, one-click log) that successfully logs a game in under 5 seconds
- [ ] **UXEN-02**: User can import a CSV of game results using a provided template, preview the rows, confirm, and bulk-create games for the current season
- [ ] **UXEN-03**: User can import a CSV of player data using a provided template and bulk-create up to 30+ players on the roster
- [ ] **UXEN-04**: After selecting a screenshot but before parsing, a tips panel is shown with guidance for best capture results
- [ ] **UXEN-05**: User can select a video recording, have frames extracted (browser-based canvas approach), have frames parsed with Claude Vision, and see a unified review-and-confirm UI

### Navigation & Routing

- [ ] **NRTE-01**: All 24 pages are reachable via `Cmd+K` — CommandPalette includes Rivalry Tracker, Record Book, NIL Ledger, Recruiting Comparison, and Playoff Simulator (CFB-gated)
- [ ] **NRTE-02**: App uses `react-router-dom` `MemoryRouter` + `Routes` for all page navigation; custom SPA router and `useNavigationStore` are replaced; `PlayerProfilePage` uses `useParams`; TypeScript compiles with zero errors

### Polish & Cleanup

- [ ] **POLS-01**: Trade Calculator includes `devTrait` as an input and applies the correct multiplier (Normal 1.0×, Star 1.15×, Superstar 1.30×, X-Factor 1.45×)
- [ ] **POLS-02**: `useFilterStore` is wrapped with Zustand `persist` middleware — active filters survive an app restart
- [ ] **POLS-03**: The four largest page components (`ScreenshotIngestionPage`, `PlayerProfilePage`, `MaddenSyncPage`, `RecruitingPage`) have sub-components extracted; no extracted file exceeds 300 lines
- [ ] **POLS-04**: `TickerBar` has a sport toggle (NFL/CFB) and a hide/show button; preference is persisted via `prefs.set`
- [ ] **POLS-05**: `src/lib/game-version-registry.ts` exists with entries for Madden 25/26/27 and CFB 25/26/27; `CreateDynastyModal` uses it for game version selection; `MaddenSyncPage` uses `saveFilePaths` for auto-detect
- [ ] **POLS-06**: Seasons with `keyEvents` show them as a bullet list on `ProgramTimelinePage`
- [ ] **POLS-07**: `npm run build` passes with zero TypeScript errors; no `localStorage`, `api.anthropic.com`, `db as any`, or `(season as any)` remain in `src/`; all items in the Task 40 checklist pass

---

## Future Requirements

Features acknowledged but deferred beyond v2.2.

### v2.1 UX Polish (Phases 15–18 paused)

- **NAV-01**: User can navigate back from any inner page via back button or breadcrumb
- **NAV-02**: Every inner page displays its page title in a consistent header
- **TIP-01**: Sidebar tooltips do not overflow viewport edges
- **TIP-02**: Tooltip placement auto-adjusts to available space
- **ENTRY-01**: QuickEntryHub category labels are large enough to scan
- **DISP-01**: GameLog notes show an inline expand control for long notes
- **DISP-02**: All sparse inner pages have meaningful empty states
- **ERR-01**: Recap API errors display human-readable messages
- **ERR-02**: Recap API error UI includes a specific actionable suggestion

### v2.0 AI Intelligence Layer (Phase 13 deferred)

- **AINT-01–12**: Living Chronicle, Hot Seat, Opponent Dossiers, Generational Arcs, Rival Prophecy, Obituary Room, The Journalist, Cross-Dynasty Intelligence, Momentum Heat Map, What If Engine, Broadcast Booth, DNA Report

---

## Out of Scope

Explicitly excluded from v2.2.

| Feature | Reason |
|---------|--------|
| Depth chart → DB save | Complex fuzzy matching; deferred to v2.3 (Task 14 ships CSV copy as V1) |
| ffmpeg-based video frame extraction | Dependency complexity; browser canvas approach used instead |
| Coordinator Legacy Tracker | Deferred to V3 |
| NBA 2K / MLB The Show / FIFA support | No offline save parser; V3+ |
| Cloud backup / account system | Local-first at V1; V3 |

---

## Traceability

Which phases cover which requirements.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SAFE-01 | Phase 19 | Pending |
| SAFE-02 | Phase 19 | Pending |
| SAFE-03 | Phase 19 | Pending |
| SAFE-04 | Phase 19 | Pending |
| SEC-01 | Phase 20 | Pending |
| SEC-02 | Phase 20 | Pending |
| SEC-03 | Phase 20 | Pending |
| DMOD-01 | Phase 21 | Pending |
| DMOD-02 | Phase 21 | Pending |
| DMOD-03 | Phase 21 | Pending |
| DMOD-04 | Phase 21 | Pending |
| DMOD-05 | Phase 21 | Pending |
| PIPE-01 | Phase 22 | Pending |
| PIPE-02 | Phase 22 | Pending |
| PIPE-03 | Phase 22 | Pending |
| PIPE-04 | Phase 22 | Pending |
| MSYN-01 | Phase 23 | Pending |
| MSYN-02 | Phase 23 | Pending |
| TOOL-01 | Phase 24 | Pending |
| TOOL-02 | Phase 24 | Pending |
| TOOL-03 | Phase 24 | Pending |
| TOOL-04 | Phase 24 | Pending |
| AIQE-01 | Phase 25 | Pending |
| AIQE-02 | Phase 25 | Pending |
| AIQE-03 | Phase 25 | Pending |
| AIQE-04 | Phase 25 | Pending |
| UXEN-01 | Phase 26 | Pending |
| UXEN-02 | Phase 26 | Pending |
| UXEN-03 | Phase 26 | Pending |
| UXEN-04 | Phase 26 | Pending |
| UXEN-05 | Phase 26 | Pending |
| NRTE-01 | Phase 27 | Pending |
| NRTE-02 | Phase 27 | Pending |
| POLS-01 | Phase 28 | Pending |
| POLS-02 | Phase 28 | Pending |
| POLS-03 | Phase 28 | Pending |
| POLS-04 | Phase 28 | Pending |
| POLS-05 | Phase 28 | Pending |
| POLS-06 | Phase 28 | Pending |
| POLS-07 | Phase 28 | Pending |

**Coverage:**
- v2.2 requirements: 40 total
- Mapped to phases: 40
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-03*
*Last updated: 2026-05-03 — v2.2 Handoff Overhaul milestone start*
