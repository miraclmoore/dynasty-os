# Feature Research

**Domain:** Desktop sports dynasty companion app (Tauri 2 + React) — v2.0 new capabilities
**Researched:** 2026-02-24
**Confidence:** HIGH (QOL/Community), MEDIUM (AI features — patterns clear, prompts need iteration)

---

## Overview

This research covers 33 new v2.0 features across three buckets: QOL Wins (10), Community Features (10), and AI Intelligence Layer (12 — note: 1 feature was "auto-sync/live data export" which is non-AI and counted in Community). Each feature is assessed for: expected behavior from the user's perspective, table stakes vs differentiator status, complexity, new DB schema needed, and AI vs non-AI classification. The existing data model (Dexie IndexedDB) is used as the baseline.

**Existing DB tables:** dynasties, seasons, games, players, playerSeasons, recruitingClasses, recruits, transferPortalEntries, draftPicks, prestigeRatings, rivals, scoutingNotes, achievements

---

## QOL Features

### 1. Toast Notification System

**Expected behavior:** Every write operation (game logged, player added, edit saved, delete confirmed) produces a non-blocking banner that appears at a consistent position (top-right or bottom-right), auto-dismisses after 3–4 seconds, shows success/error/warning variants, and never blocks primary content. Users do not expect to dismiss toasts manually — they disappear. Errors should persist until dismissed.

**Table stakes or differentiator:** Table stakes. A modern desktop companion with no feedback is broken. Users coming from Google Sheets will have zero tolerance for silent saves. Missing this makes every write feel unreliable.

**Complexity:** LOW

**New DB schema needed:** None. Toast state is ephemeral (Zustand in-memory only).

**AI vs non-AI:** Non-AI.

**Implementation notes:** Use `sonner` (2.3KB gzipped, zero dependencies, imperative `toast()` API callable from anywhere, shadcn/ui ships it natively). Place `<Toaster />` at root level in `App.tsx` outside router. Call `toast.success()` / `toast.error()` from store action catch blocks. No Context API needed — sonner uses a global observer pattern. Confidence: HIGH (well-documented, actively maintained, standard choice in 2025 React ecosystem).

**Anti-feature trap:** Do not add a notification inbox/history panel — overkill for a local desktop app.

---

### 2. Command Palette (Cmd+K)

**Expected behavior:** Pressing Ctrl+K (Windows) opens a centered modal with a search input. As the user types, commands fuzzy-filter in real time. Commands include: navigate to page, switch dynasty, log game, add player, start season recap. Pressing Enter executes; Escape closes. Arrow keys move through results. Groups separate navigation from actions.

**Table stakes or differentiator:** Differentiator. No existing dynasty tracking tool has this. Power users (stats obsessives, commissioners) will love it. It signals "professional software."

**Complexity:** MEDIUM

**New DB schema needed:** None. Commands are derived from live store state (dynasty list, season list, navigation routes).

**AI vs non-AI:** Non-AI.

**Implementation notes:** Use `cmdk` (headless, composable, zero-dependency, powers Linear and Raycast). Wrap with a Zustand `paletteStore` that holds `open: boolean`. Add global `useEffect` keyboard listener in `App.tsx` for `Ctrl+K`. Populate command groups dynamically from `useDynastyStore`, `useSeasonStore`, and a static route registry. Confidence: HIGH.

**Anti-feature trap:** Do not try to build a full "AI assistant chat" inside the palette — that's a different product. Keep it navigation + quick-create actions only.

---

### 3. Last-Action Undo

**Expected behavior:** After a write operation (delete game, edit player stat, delete season), a toast appears with an "Undo" action button. Clicking it within 5 seconds reverses the operation. Only the most recent single action is undoable — this is not a multi-level undo stack. If the user navigates away, the undo opportunity expires.

**Table stakes or differentiator:** Table stakes for delete operations. Users lose data accidentally; this is the safety net. For edit operations, it's a differentiator.

**Complexity:** MEDIUM

**New DB schema needed:** None. Implement as an in-memory "last action" store that holds the previous state snapshot for the affected entity (game, player, playerSeason). The snapshot is cleared on next write or on expiry.

**AI vs non-AI:** Non-AI.

**Implementation notes:** Add an `undoStore` to Zustand: `{ pendingUndo: { type, payload, expiresAt } | null }`. Each store action (deleteGame, updatePlayer, etc.) captures the pre-mutation state in `undoStore` before writing to DB. The toast with undo button reads from `undoStore`. On undo click, re-write the captured payload to DB and reload the affected store. Use `setTimeout` to clear `pendingUndo` after 5 seconds. Do NOT persist undo state (it's ephemeral). Confidence: HIGH — the command/memento hybrid pattern is well-established for this scope.

**Anti-feature trap:** Do not implement multi-level undo (redo stack, ctrl+Z keybinding history). Single-level "undo last delete" is the 90% case. Full undo stack requires structural refactor of all stores and is a distraction from v2.0 goals.

---

### 4. Persistent Filter State

**Expected behavior:** When a user sets filters on any list/table view (roster position filter, game type filter, season year filter), those filters survive page navigation and remain set when the user returns to the same view. Filters reset when the dynasty is switched.

**Table stakes or differentiator:** Table stakes. Users expect apps to remember UI state. Losing filter state on every navigation makes tables feel broken.

**Complexity:** LOW

**New DB schema needed:** None. Use Zustand `persist` middleware with localStorage.

**AI vs non-AI:** Non-AI.

**Implementation notes:** Add a `filterStore` (or `uiPrefsStore`) with Zustand `persist` middleware. Store a map of `{ [routeKey]: FilterState }`. Scope all persisted filter state by `dynastyId` so switching dynasties resets relevant filters. The `persist` middleware serializes to localStorage automatically using the standard `createJSONStorage(localStorage)` pattern. Confidence: HIGH — Zustand persist middleware is the established pattern; zero extra dependencies needed.

**Anti-feature trap:** Do not persist filter state in IndexedDB — localStorage is the right tier for ephemeral UI preferences. Do not make filter state synced across dynasties.

---

## Community Features

### 5. Coaching Staff Lifecycle Tracker

**Expected behavior:** A dedicated staff roster section where each coach entry has: name, role (Head Coach, OC, DC, ST, Position Coach, Analyst), hire year, fire/departure year, tenure duration (auto-calculated), offensive/defensive scheme, career win-loss record while on staff (auto-calculated from game log), and optional notes. Users can filter by role, view current staff vs historical staff. Promotes/role changes are tracked as new entries with a "promoted from" link.

**Table stakes or differentiator:** Differentiator. No existing dynasty tracking app tracks coaching staff at this depth. This is heavily requested on Operation Sports forums. For users doing 20+ year dynasties, staff turnover is a core narrative element.

**Complexity:** MEDIUM

**New DB schema needed:** New table `coachingStaff` with fields: `id, dynastyId, name, role, hireYear, departureYear, scheme, notes, promotedFromId`. Win-loss record is computed at query time from the `games` table using date ranges, not stored.

**AI vs non-AI:** Non-AI (base feature). Could later gain AI for staff analysis, but base tracking is pure data.

**Implementation notes:** Role enum should be extensible (stored as string not enum to avoid schema migrations). "Promoted from" is a self-referential `promotedFromId` field. Active staff = `departureYear` is null. Historical staff = `departureYear` is set. Scheme is free text (no enum — coaching schemes are too varied and game-specific). Confidence: MEDIUM — pattern is straightforward but schema design needs to be right first time to avoid later migrations.

---

### 6. CFB-to-Madden Player Continuity

**Expected behavior:** On a CFB player's profile page, a "Pro Career" section allows the user to link a player record to their Madden dynasty equivalent. The link stores: which Madden dynasty (dynastyId), which Madden player record (playerId), draft round, draft pick number, and NFL team drafted by. Once linked, the player profile shows a split view: college career stats on one side, NFL career stats on the other. Users can also create links from the Madden side.

**Table stakes or differentiator:** Differentiator — and a unique capability. EA's own games do this for Road to Glory (player mode), but no tool does it for dynasty/franchise mode. This is the primary feature that makes Dynasty OS cross-game.

**Complexity:** MEDIUM-HIGH

**New DB schema needed:** New table `playerContinuityLinks` with fields: `id, cfbPlayerId, cfbDynastyId, maddenPlayerId, maddenDynastyId, draftRound, draftPick, draftYear, nflTeam, notes`. This is a cross-dynasty join record. Both playerId fields reference the `players` table but in different dynasties. Draft data may overlap with existing `draftPicks` table — link them or deduplicate.

**AI vs non-AI:** Non-AI (base tracking). AI Generational Player Arcs (feature #18) builds on top of this.

**Implementation notes:** The link must handle the case where either dynasty is deleted — use soft reference (store name/snapshot, not just ID). The profile view needs a cross-dynasty query that loads the linked player's seasons from a different dynastyId. This requires a new query pattern in Dexie (cross-table join on dynastyId). Confidence: MEDIUM — the DB pattern is unusual for this codebase; requires careful design.

---

### 7. Playoff Scenario Simulator

**Expected behavior:** An interactive bracket view for the current season. Users click on matchup slots to pick winners, advancing teams through the bracket round by round. The bracket resets to "unpicked" state at the start of each new season. For CFB, this is a 12-team CFP bracket with first-round bye logic for top-4 seeds. For Madden, this is a 14-team NFL playoff bracket. Once all winners are picked, the view shows the simulated champion. Users can reset and re-simulate. This is a planning/prediction tool, not a simulation engine — no auto-simulation from team stats.

**Table stakes or differentiator:** Table stakes for "commissioner" users. The Operation Sports community explicitly builds season prediction tools in Google Sheets. Bringing this in-app is highly requested.

**Complexity:** MEDIUM

**New DB schema needed:** New table `playoffScenarios` with fields: `id, dynastyId, seasonId, bracketState (JSON blob), createdAt, updatedAt`. BracketState stores the full pick tree as a JSON serializable structure. One record per season — overwrite on each save.

**AI vs non-AI:** Non-AI (base feature). Could later gain "Rival Prophecy" AI layer.

**Implementation notes:** Bracket component is purely presentational — a tree of matchup nodes. State machine: each node has `teamA, teamB, winner`. Picking a winner propagates the winner to the next round's slot. CFB and Madden bracket structures differ and should be driven by sport config. Do not wire this to actual game log results — it's a "what if" planning view, not auto-populated. This keeps complexity low and user expectations clear. Confidence: HIGH — bracket UI is a well-understood pattern; ESPN's playoff machine is the reference implementation.

---

### 8. NIL Budget Ledger

**Expected behavior:** A budget tracking tool for CFB dynasties only. Per season, users can record NIL deals: player name (linked or free-text), amount (number), category (Signing Bonus, Endorsement, Portal Incentive, Retention Bonus), date, and notes. The ledger view shows: total NIL spend this season, spend by category (pie/bar chart), spend by class year, and a transaction list. A season-level NIL "cap" can be set by the user (optional — this is not enforced by the game; it's self-imposed).

**Table stakes or differentiator:** Table stakes for v2.0 CFB users. NIL is the dominant conversation in CFB 26 dynasty communities. EA's own game tracks NIL budget in-game but the data is not exportable — users want a persistent ledger in Dynasty OS.

**Complexity:** LOW-MEDIUM

**New DB schema needed:** New table `nilDeals` with fields: `id, dynastyId, seasonId, year, playerName, playerId (nullable, optional link), amount, category, notes, createdAt, updatedAt`. Category is a string enum: 'signing' | 'endorsement' | 'portal' | 'retention' | 'other'.

**AI vs non-AI:** Non-AI (base feature). No AI needed — this is a spreadsheet-style ledger.

**Implementation notes:** CFB-only gate: show in nav only when `dynasty.sport === 'cfb'`. No enforcement of game NIL mechanics — this is a tracking ledger, not a simulation of game limits. Total spend and category breakdowns are computed queries. Recharts bar/pie chart for visualization. Confidence: HIGH.

**Anti-feature trap:** Do not try to sync NIL data from the game — CFB is console-only and there is no save file parser. This is manual entry only.

---

### 9. Future Schedule Builder + Bowl Projection

**Expected behavior:** A per-dynasty schedule planning tool. Users can add future seasons' games (year, week, opponent, home/away, game type) before they are actually played. These "planned" games are visually distinct from logged games (different color, "upcoming" label). A bowl projection sub-section lets users mark which bowl game they are targeting for the current season — this is a prediction field, not a confirmed result. The schedule builder is distinct from the game log (game log = completed games; schedule builder = future planned matchups).

**Table stakes or differentiator:** Differentiator. This turns Dynasty OS from a backward-looking tracker into a forward-looking planning tool. Content creators use this heavily for "dynasty roadmap" YouTube videos.

**Complexity:** MEDIUM

**New DB schema needed:** Add `status: 'planned' | 'completed'` field to the existing `games` table (or a separate `plannedGames` table — separate is cleaner to avoid polluting the game log queries with filter overhead). Recommendation: separate `scheduledGames` table with: `id, dynastyId, seasonId (nullable for cross-season), year, week (nullable), opponent, homeAway, gameType, bowlName (nullable), notes`. No result fields — planned games have no score.

**AI vs non-AI:** Non-AI.

**Implementation notes:** The season/year on a planned game can be in the future (no need for a seasonId — use year directly). Bowl projection is a single field on the `seasons` table: `targetBowl: string | null` — much simpler than a full sub-table. Confidence: MEDIUM — the UX separation between "planned" and "completed" games needs clear design.

---

### 10. Trade Value Calculator

**Expected behavior:** A Madden-only tool. Users select players (from their Madden roster) on one side and the other side, plus draft picks (round + year). A trade value score is computed and displayed as a color-coded gauge (green = favorable, yellow = fair, red = unfavorable). The algorithm: OVR rating (exponential scale) × position multiplier × age multiplier × contract years remaining multiplier. Draft picks have their own fixed value table (based on round 1–7 and year offset). Users can adjust sliders for each factor if they want to override the algorithm.

**Table stakes or differentiator:** Differentiator. The most popular community tools for Madden franchise are trade calculators (Operation Sports has a Google Sheets version with 50K+ downloads). Building this in-app is a major win.

**Complexity:** MEDIUM

**New DB schema needed:** No new DB table needed for the calculator itself. Trade evaluation is stateless computation. However, to support saved trade proposals, an optional `tradeProposals` table could be added: `id, dynastyId, proposalDate, givePlayers (JSON), receivePlayers (JSON), givePicks (JSON), receivePicks (JSON), notes`. Treat saved proposals as a v2.1 enhancement — the calculator itself needs no storage.

**AI vs non-AI:** Non-AI. The algorithm is deterministic math, not AI generation.

**Implementation notes:** Madden-only gate (`dynasty.sport === 'madden'`). Position multipliers based on established community consensus (QB: 2.5, DE/DL: 2.0, CB: 1.9, WR/TE: 1.8, etc.). Age curve: peak 24–26, sharp drop after 30. Draft pick values use the Jimmy Johnson chart adapted for Madden (Round 1 Pick 1 = 3000 points, Round 7 = 10 points). The `player.overallRating` field from `playerSeasons` is the OVR input. Player age requires a birthYear field not currently on the Player model — add `birthYear?: number` to the Player type. Confidence: MEDIUM — algorithm is well-documented by the community; exact multipliers need tuning.

**Data model gap:** Current `Player` type has no `age` or `birthYear` field. Current `PlayerSeason` has `overallRating?: number`. Need to add `birthYear?: number` to `Player` type.

---

### 11. Recruiting Class Grade Comparison

**Expected behavior:** A side-by-side comparison view for recruiting classes. User selects two or more classes (from their own dynasty across different years, or visually compares class vs class). Metrics shown: class rank, total commits, 5-star count, 4-star count, 3-star count, average stars, top position groups (bar chart by position), geographic distribution (optional). Radar chart overlays two classes across 5-star, 4-star, 3-star, total commits, and class rank axes. AI Grade (from Phase 5) is surfaced alongside.

**Table stakes or differentiator:** Differentiator. The existing recruiting tracker shows one class at a time. Multi-class comparison is a frequently requested feature on the Operation Sports community threads. Radar chart visualization elevates this beyond spreadsheets.

**Complexity:** LOW-MEDIUM

**New DB schema needed:** None. Uses existing `recruitingClasses` and `recruits` tables. Comparison is a computed view over existing data.

**AI vs non-AI:** Non-AI (base comparison). The AI Grade from Phase 5 is surfaced but not re-generated here.

**Implementation notes:** Use Recharts `RadarChart` with multiple `Radar` components for overlay comparison. Normalize radar axes to percentage scale (e.g., class rank inverted so "lower rank = higher value"). The recruits table stores position — use it to build position distribution bar charts. Year selector lets user pick up to 3 classes to compare simultaneously. Confidence: HIGH — Recharts multi-radar is well-documented.

---

### 12. Auto-Sync / Live Data Export

**Expected behavior:** When enabled, every write operation (game logged, player updated, season saved) automatically exports a JSON snapshot of the full dynasty to a user-specified folder path. Optionally exports CSV for any single table. The export happens in the background, non-blocking. The user can set the export path once in Settings. A visual indicator (last exported timestamp) shows in the footer/dashboard.

**Table stakes or differentiator:** Differentiator. This is the "God Mode" backup/integration feature for power users — content creators who feed data into spreadsheets, streamers who display live dynasty data on-screen via OBS, commissioners who publish standings.

**Complexity:** MEDIUM

**New DB schema needed:** No DB changes. Uses existing Tauri `fs` plugin for file system access. Add a Settings record to localStorage: `{ autoExportEnabled: boolean, exportPath: string, lastExportedAt: number }`.

**AI vs non-AI:** Non-AI.

**Implementation notes:** The export logic already exists in `export-import.ts` — this is triggered as a side effect of store writes rather than user-initiated. Use Tauri `tauri-plugin-fs` for file write. The `exportPath` is set via a folder picker dialog (`open({directory: true})`). For CSV export, a lightweight CSV serializer (no library needed — join with commas) on top of IndexedDB queries is sufficient. Debounce exports to once per 5 seconds to avoid hammering disk on rapid sequential writes. Confidence: MEDIUM — Tauri fs plugin is well-documented; the main complexity is the settings UI and path picker.

---

### 13. Historical Season Record Book

**Expected behavior:** A single view showing every season ever played in the dynasty, ordered by year (newest first, toggle to sort by wins, ranking, or year). Each row shows: year, record (W-L), conference record, final ranking, bowl/playoff result, tagline, and key award winners. Clicking a row expands to show the top-5 stat leaders for that season. A "dynasty totals" header bar shows all-time wins, losses, win percentage, national championships, conference titles, and bowl record.

**Table stakes or differentiator:** Table stakes. This is the core "memory layer" product promise. Users expect a one-screen view of their entire dynasty history. The existing dashboard shows the current season; this shows the full arc.

**Complexity:** LOW

**New DB schema needed:** None. Aggregates existing `seasons`, `games`, and `playerSeasons` tables.

**AI vs non-AI:** Non-AI (base view). The Living Chronicle AI feature (#14) can be surfaced from this view.

**Implementation notes:** All data comes from existing tables — this is a query and display problem. The expensive part is fetching player stat leaders per season (N seasons × top-5 query). Implement lazy expansion — only load player stats when a season row is clicked. Virtualize the list with `react-window` if dynasty has 30+ seasons (unlikely at v2 launch but future-proof). Confidence: HIGH.

---

### 14. Rivalry Dashboard with Full Series Context

**Expected behavior:** The existing rivalry tracker shows opponent name and label. The v2.0 expansion adds, for each rivalry: all-time series record (wins, losses, win percentage), current streak (e.g., "Won 3 straight"), last 5 results (W/L dots), scoring averages in series games, biggest win margin ever, biggest loss margin ever, and a "key moments" section where users can pin specific games from the game log as rivalry-defining moments. A momentum score (rolling 3-game weighted average — more recent = higher weight) shows which team has current momentum.

**Table stakes or differentiator:** Differentiator. The current rivals table has only `opponent` and `label`. The full series context is what makes a rivalry feel real — this is the single most-requested expansion in the existing feature set.

**Complexity:** MEDIUM

**New DB schema needed:** Series record and streak are computed from the `games` table (filter by `opponent = rival.opponent`) — no new storage needed for these. Key moments require a new table: `rivalryMoments` with fields: `id, dynastyId, rivalId, gameId, description, createdAt`. Momentum score is computed. Extend the existing `rivals` table with `seriesNotes: string` (free text description, optional).

**AI vs non-AI:** Non-AI (base feature). AI Rival Prophecy (#19) is a separate AI feature that builds on top of series context data.

**Implementation notes:** Series record computation: `db.games.where('[dynastyId+opponent]').equals([dynastyId, rival.opponent])`. This compound index already exists in the schema. Streak computation: sort by week/year, count consecutive same-result games from most recent. Momentum: weight last 3 games (1.0, 0.75, 0.5) and compute weighted win rate. Confidence: HIGH — all data already exists; this is a query and visualization problem.

---

## AI Intelligence Layer

### 15. Living Chronicle

**How it differs from Season Recap:** Season Recap is a one-time, on-demand generation per completed season, focused on the full season arc. The Living Chronicle is an ongoing, incremental document that updates as data is logged — it's the current season's running narrative. Each time a game is logged, the Chronicle either regenerates its "current chapter" or appends a new paragraph. Think: "sports diary that writes itself as your dynasty unfolds," not "end-of-year summary."

**Expected behavior:** A dedicated Chronicle page shows the current season's narrative in chapter format. After every game log (or manually triggered), a new paragraph is generated reflecting the most recent game result and current season context (current record, ranking trend, important matchups ahead). The full Chronicle for previous seasons is stored and readable.

**Complexity:** HIGH

**New DB schema needed:** New table `chronicle` with fields: `id, dynastyId, seasonId, content (TEXT — full markdown), lastGameId (the last game that triggered an update), generatedAt, createdAt, updatedAt`. One record per season, overwritten on each update (not appended — full regeneration of current chapter is simpler than incremental append). Store previous season chronicles by seasonId.

**AI vs non-AI:** AI (Claude API). New prompt needed. System prompt: "You are a dynasty sports chronicler. Write a flowing 2-3 paragraph current-season narrative that reads like an in-progress chapter of a dynasty story. Include the team's journey so far this season, current record, key wins/losses, player storylines, and build anticipation for upcoming games. Use present tense for the current state."

**AI infrastructure:** Uses existing Claude API call pattern (same as narrative-service.ts). Cache in the `chronicle` table (not localStorage — too large). Trigger: auto-run after each game log if `autoChronicle` setting is enabled; otherwise on-demand button. Regeneration cost: 1 API call per game log = medium cost. Gate behind explicit user opt-in (default off).

**Key distinction:** Season Recap = completed season retrospective (past tense, one-time). Living Chronicle = ongoing season diary (present/future tense, updates per game).

---

### 16. Hot Seat / Pressure Meter

**How it works:** A computed pressure index (0–100) derived from the gap between expectations and results. Inputs: preseason ranking expectations (from prestige/poll data), current win-loss record, last N games trend, rivalry game results, bowl eligibility status, conference title race position. Output: a visual meter with color bands (0–33 = Secure, 34–66 = Pressure Building, 67–85 = Hot Seat, 86–100 = On Notice) and an AI-generated one-paragraph coaching situation assessment.

**Expected behavior:** Dashboard widget or dedicated page. Auto-calculates after each game log. AI generates a brief "analyst assessment" of the coach's situation — referencing specific results and what's at stake.

**Complexity:** MEDIUM

**New DB schema needed:** None for the score itself (computed). Cache AI assessment text in localStorage keyed by `dynastyId + seasonId + latestGameId`. Clear cache when new games are logged.

**AI vs non-AI:** Hybrid. The pressure score is algorithmic (deterministic math). The "coaching situation assessment" paragraph is AI-generated (Claude Haiku, ~150 tokens). The score inputs:
- Season win% vs expected win% (from prestige rating)
- Streak factor (last 3 games)
- Rivalry game results (weighted 1.5x vs regular games)
- Ranking trajectory (gained vs lost positions)
- Conference record vs division leader gap

**AI prompt:** "You are a college football analyst. Given this coach's current situation [score, record, key data points], write one sharp, direct paragraph assessing the coaching pressure level. Be specific. Reference actual results. Sound like ESPN reporting."

---

### 17. Opponent Intelligence Dossiers

**What makes a good AI scouting report:** Specificity beats generality. "They allow 28 PPG" is weaker than "They are 2-5 and have allowed 35+ points in 4 straight games." The best AI scouting reports identify patterns, vulnerabilities, and historical head-to-head context.

**Expected behavior:** On the Scouting Cards page, an "AI Dossier" button generates a pre-game intelligence report for an upcoming opponent. The report covers: opponent's current record (from user-entered context), head-to-head history from the game log, last 3 matchup results, scoring patterns, and a "to beat them" tactical recommendation section.

**Complexity:** MEDIUM

**New DB schema needed:** Extend `scoutingNotes` table with `aiDossier: string | null, aiGeneratedAt: number | null`. Or store in a separate `aiDossiers` table to keep clean separation. Recommendation: separate table `aiDossiers`: `id, dynastyId, opponent, content, generatedAt`.

**AI vs non-AI:** AI (Claude API). New prompt. System: "You are a college football intelligence analyst preparing a pre-game dossier. Based on historical matchup data and current season context, generate a structured 3-section scouting report: (1) Series Context, (2) Current Season Profile, (3) Key Vulnerabilities and Tactical Recommendations." Feed in: all games vs this opponent from game log, current season notes from scoutingNotes, dynasty/team context.

**AI infrastructure:** Extends existing Claude API pattern. Cache by `dynastyId + opponent + currentSeasonId`. Invalidate when new games vs that opponent are logged.

---

### 18. Generational Player Arcs

**How it differs from Legacy Cards:** Legacy Cards = a Hall of Fame induction blurb for a player's stats (static, generated once at departure). Generational Player Arcs = a narrative tracing the player's full career journey across multiple seasons, including plot beats (freshman emergence, sophomore breakout, junior year heartbreak, senior legacy), using season-by-season data. It reads like a biography chapter, not an induction speech.

**Expected behavior:** On a player's profile, a "Career Arc" button generates a multi-paragraph narrative. For players who have a CFB-to-Madden link, the arc continues through their pro career as well.

**Complexity:** MEDIUM

**New DB schema needed:** Store in `players` table extension — add `careerArc: string | null, careerArcGeneratedAt: number | null`. Or a new `playerNarratives` table: `id, playerId, dynastyId, type ('legacy' | 'arc'), content, generatedAt`. Recommendation: use `playerNarratives` table for clean separation from the player record.

**AI vs non-AI:** AI (Claude API — Claude Sonnet for longer, higher-quality narrative). New prompt. System: "You are a sports journalist writing the defining career profile of an athlete. Trace their journey season by season, finding the narrative arc: the emergence, the peak, the defining moments, the departure. Write as a 3-4 paragraph career retrospective that reads like a Sports Illustrated feature." Feed in: full `playerSeasons` data, season context (team record, bowl/playoff results), awards, status (graduated/drafted/transferred).

**Key distinction from Legacy Card:** Legacy Card = 2-3 sentences, ceremonial, one-dimensional. Career Arc = 3-4 paragraphs, biographical, longitudinal, finds the story across years.

---

### 19. Rival Prophecy

**How data feeds an AI rivalry prediction:** Series momentum (recent results weighted heavier), current season strength differential, coaching tenure stability on both sides, historical upset patterns (how often does the underdog win?), user-entered notes about the opponent.

**Expected behavior:** On the Rivalry Dashboard, a "Prophecy" button generates an AI prediction for the next matchup — structured as: predicted winner, confidence level, "the x factors," and a narrative paragraph framing the upcoming clash.

**Complexity:** MEDIUM

**New DB schema needed:** Store in `rivalryMoments` table extension or a new `rivalProphecies` table: `id, dynastyId, rivalId, content, generatedAt, nextSeasonYear`. One per rival per season — invalidate when next season starts.

**AI vs non-AI:** AI (Claude Haiku — predictions are medium-length, cost matters). New prompt. System: "You are a college football analyst previewing a rivalry game. Based on historical series data and current season trends, generate a rivalry prediction with: (1) Predicted winner and confidence, (2) The three key factors, (3) A 1-paragraph narrative framing the matchup."

---

### 20. The Obituary Room

**How it differs from Legacy Card AI blurb:** Legacy Card blurb = Hall of Fame induction speech (celebratory, focused on career stats, formal ceremony tone). The Obituary Room = a eulogy for a program legend who has left (any player, not just Hall of Famers) — it's more mournful, narrative, and contextual. It captures what the player meant to the program, not just their stats.

**Expected behavior:** A dedicated "Obituary Room" gallery page showing elegiac tributes for departed players (any player with `status !== 'active'`). Each tribute is AI-generated on demand and cached. The gallery is ordered by departure year, with a search filter. Visual: dark/moody aesthetic, gravestone-style card layout.

**Complexity:** MEDIUM

**New DB schema needed:** Add `obituary: string | null, obituaryGeneratedAt: number | null` to `players` table. Or the `playerNarratives` table (type: 'obituary') handles this cleanly if that table is implemented for Career Arcs.

**AI vs non-AI:** AI (Claude Haiku — short, evocative, 2-3 sentences per tribute). New prompt. System: "You are a program historian writing a brief, elegiac tribute for a player who has departed the program. Capture what they meant — not just stats, but their role in the program's story. 2-3 sentences, lyrical but not overwrought. No emojis."

**Key distinction:** Legacy Card = celebratory, stat-focused, Hall of Fame frame. Obituary = elegiac, narrative, "what we lost" frame. Both can coexist for the same player.

---

### 21. The Journalist

**What game events trigger news blurbs:** (a) Win over ranked opponent, (b) Loss to unranked opponent (upset), (c) Player breaks a program record, (d) Bowl game result, (e) National championship, (f) Conference title, (g) Big comeback win (margin reversal), (h) Shutout, (i) Rival game result. Format: short news headline + 2-3 sentence wire report, as if published immediately after the game.

**Expected behavior:** After each game is logged, if the result qualifies as a "news event" (trigger conditions above), a news blurb is auto-generated and stored. The Dashboard shows the latest blurb. A "News Archive" view shows all blurbs ordered by date. Each blurb has a source name (e.g., "Dynasty Wire," "The Gridiron Report") for flavor.

**Complexity:** MEDIUM-HIGH

**New DB schema needed:** New table `newsBlurbs`: `id, dynastyId, gameId, triggerType, headline, body, publishedAt (=game log date), createdAt`.

**AI vs non-AI:** AI (Claude Haiku — short outputs, high volume = needs to be cheap). New prompt. System: "You are a wire service sports reporter. Write a breaking news headline + 2-3 sentence game report. Be terse, factual, and punchy. Lead with the most surprising or significant fact. No emojis. Format: HEADLINE: [text]\n[body]."

**AI infrastructure note:** This runs after every game log — it is the highest-frequency AI call in the app. Use Claude Haiku to control cost. Implement a trigger evaluation function that checks if the game qualifies before making any API call. If no trigger fires, no API call is made.

---

### 22. Cross-Dynasty Intelligence

**What cross-dynasty comparisons are most valuable:** (1) Win rate comparison across same-era seasons, (2) Recruiting class quality trends over time, (3) Coaching tenure comparison (who's built longer-lasting dynasties?), (4) Common opponents head-to-head cross-dynasty, (5) "Dynasty DNA" comparison (see also: DNA Report feature #26). Users with multiple dynasties (e.g., CFB Alabama dynasty AND Madden Falcons franchise) want to see meta-insights.

**Expected behavior:** A "Cross-Dynasty" page accessible from the dynasty switcher. User selects 2–4 dynasties to compare. The AI generates a "comparative analysis" report covering: season-by-season win rate chart, recruitment class quality trend, peak seasons comparison, and a narrative paragraph identifying patterns and contrasts.

**Complexity:** HIGH

**New DB schema needed:** None for the data — all existing tables have `dynastyId`. Cache AI analysis in `localStorage` keyed by sorted array of dynastyIds + timestamp. The cross-dynasty query pattern (loading multiple dynasties' data simultaneously) is new but uses existing Dexie APIs.

**AI vs non-AI:** AI (Claude Sonnet — this is a synthesis task requiring quality output). New prompt. System: "You are a sports dynasty analyst comparing multiple program histories. Identify the key patterns, contrasts, and narrative through-lines across these dynasties. Write 3-4 paragraphs: one per dynasty character analysis, one comparative conclusion."

**Complexity note:** The main complexity is data aggregation — loading seasons/games/recruiting from multiple dynastyIds simultaneously and building a coherent comparison context for the AI. This is the most computationally complex context-building task in the AI layer.

---

### 23. Momentum Heat Map

**What data this visualizes:** Game-by-game result momentum within a season (or across seasons). Each game is plotted on a grid/heat map where x-axis = week, y-axis = season year (or just single-season view), and color intensity represents momentum level. Momentum for a game = weighted function of: margin of victory/defeat, opponent ranking, game type (playoff/bowl = 1.5x), and streak context.

**Expected behavior:** A visual heat map component on the Dashboard (or Season page). Single-season view shows each game week as a colored cell. Multi-season view shows rows of seasons with color gradients. Hovering a cell shows the game details. A "momentum score" for the current season trend is surfaced as a headline number.

**Complexity:** MEDIUM

**New DB schema needed:** None. All data comes from `games` table. Momentum score is a pure computation.

**AI vs non-AI:** Hybrid. The heat map visualization is non-AI. An optional AI "momentum analysis" paragraph (1-2 sentences) can describe the trend — Claude Haiku, triggered only on-demand. The heat map itself is the primary value; AI is optional enhancement.

**Implementation notes:** Use Recharts `Treemap` or a custom CSS grid for the heat map. Color scale: red (losing momentum) to green (gaining momentum) with neutral gray at midpoint. Momentum formula: `(margin/10 × gameTypeMultiplier × (1 + rankingBonus)) × streakFactor`. This is deterministic and fast. Confidence: MEDIUM — the formula needs playtesting; what feels "right" as a momentum score is subjective.

---

### 24. What If Engine

**What counterfactuals are most compelling for dynasty players:** (1) "What if I hadn't lost that game?" — season record recomputed without a specific loss, (2) "What if that star player hadn't transferred?" — career stats projection if they'd stayed, (3) "What if I'd taken the top recruit?" — season trajectory with a different recruiting class, (4) "What if I'd won the bowl game?" — narrative of the alternate season ending. These are the four canonical what-if scenarios dynasty players debate obsessively.

**Expected behavior:** A "What If Engine" page. User selects a historical event (from a dropdown of: "Remove this game result," "Change this player's departure," "What if recruiting class was higher-rated"). The AI generates a 3-4 paragraph counterfactual narrative exploring the alternate history and its downstream consequences.

**Complexity:** MEDIUM

**New DB schema needed:** No persistent storage needed. Counterfactuals are on-demand generations, not saved artifacts. Cache in localStorage with a compound key (dynastyId + scenarioType + entityId).

**AI vs non-AI:** AI (Claude Sonnet — counterfactual reasoning requires quality). New prompt. System: "You are a dynasty historian exploring alternate timelines. Given the actual history and this counterfactual change, explore what might have been different. Write 3-4 paragraphs in a speculative but grounded voice — reference specific players, games, and seasons. Ground speculation in the actual data provided."

**Key constraint:** The AI does NOT auto-recompute statistics — it writes narrative. There is no stat simulation engine. This is "storytelling what-if," not "Monte Carlo simulation." This keeps complexity manageable and the feature compelling.

---

### 25. Broadcast Booth / Audio Mode

**Right scope for this feature:** Full play-by-play audio is out of scope (requires game event granularity that Dynasty OS doesn't have — only game-level results, not individual plays). The right scope is: TTS audio playback of short, AI-generated recap fragments (2-4 sentences per game, in a sportscaster voice) for the "game recap" moment after logging a game. Think: the game summary you hear on SportsCenter radio, not a play-by-play.

**Expected behavior:** After logging a game, an optional "Broadcast Recap" button triggers: (1) AI generates a 2-4 sentence sportscaster-style recap, (2) Browser Web Speech API (or Tauri TTS plugin) reads it aloud in a selected voice, (3) User can replay or skip. This is a delight feature — not critical path.

**Complexity:** HIGH (for quality implementation)

**New DB schema needed:** None. Audio is ephemeral (not stored). AI text fragment can be cached in localStorage keyed by `gameId`.

**AI vs non-AI:** AI (Claude Haiku for text generation) + TTS (platform-level). Two-step pipeline: generate text → speak text.

**TTS platform constraint:** On Windows (the target platform), the Web Speech API (`window.speechSynthesis`) works natively in WebView/WebKit. The `tauri-plugin-tts` community plugin exists as an alternative for native TTS. ElevenLabs API provides higher quality but adds a second API dependency and per-character cost. **Recommendation:** Default to Web Speech API (zero cost, works on Windows, acceptable quality for a delight feature). Offer ElevenLabs as an opt-in premium option requiring separate API key.

**Anti-feature trap:** Do not try to make this a full audio commentary mode with ongoing narration. The game-level granularity doesn't support it. Scope it as "postgame recap clip" only. This sets correct user expectations.

---

### 26. DNA Report

**What makes a program's "identity":** Play style (passing-heavy vs run-heavy — derived from top stat patterns), recruiting philosophy (stars per class, geographic concentration, position emphasis), coaching signature (how long coaches stay, scheme consistency), title cadence (championship frequency), adversity response (win rate after losses), rivalry performance (up vs down in big games).

**Expected behavior:** A "Program DNA" page with a visual identity card showing: play-style radar chart (6 axes: passing volume, rushing volume, defensive focus, recruiting stars avg, title rate, rivalry performance), an AI-generated "program identity" narrative (3-4 paragraphs describing what kind of program this is and how it was built), and year-by-year DNA drift chart showing how the program's identity has evolved.

**Complexity:** MEDIUM-HIGH

**New DB schema needed:** None for computation. Cache AI narrative in localStorage keyed by `dynastyId + latestSeasonId`. The DNA metrics are computed from existing data.

**AI vs non-AI:** Hybrid. DNA metrics (radar chart data) are algorithmic. The narrative is AI-generated (Claude Sonnet — quality matters here; this is the "what are we?" identity document). New prompt. System: "You are a college football program historian and analyst. Based on decades of dynasty data, analyze the program's identity — its play style, recruiting philosophy, coaching signature, and competitive legacy. Write 3-4 paragraphs that capture not just what the numbers say, but what kind of program this is and how it got that way."

---

## Feature Dependencies

```
Toast Notification System
    └──required by──> Last-Action Undo (undo button lives in toast)
    └──required by──> The Journalist (blurb delivered via toast trigger)
    └──enhances──> all 33 features (feedback layer)

Command Palette
    └──enhances──> all navigation features
    └──requires──> Navigation store (already exists)

CFB-to-Madden Player Continuity
    └──enables──> Generational Player Arcs (cross-game career narrative)

Playoff Scenario Simulator
    └──enhanced by──> Rival Prophecy (AI prediction can pre-fill bracket picks)

Rivalry Dashboard (Series Context)
    └──required by──> Rival Prophecy (AI needs series data)
    └──enhances──> Momentum Heat Map (rivalry games get extra weight)

Coaching Staff Lifecycle Tracker
    └──enhances──> Hot Seat Meter (staff stability is a pressure input)
    └──enhances──> DNA Report (coaching tenure = program identity)

Historical Season Record Book
    └──enhanced by──> Living Chronicle (chronicle surfaced per season row)

Cross-Dynasty Intelligence
    └──requires──> multiple dynasties exist (user must have 2+ dynasties)

NIL Budget Ledger
    └──CFB-only gate (dynasty.sport === 'cfb')

Trade Value Calculator
    └──Madden-only gate (dynasty.sport === 'madden')

Future Schedule Builder
    └──enhances──> Playoff Scenario Simulator (planned future games inform bracket seeding)

The Journalist
    └──triggers from──> game log events (same DB write as Living Chronicle trigger)

DNA Report
    └──enhanced by──> Coaching Staff Lifecycle Tracker (coaching data enriches DNA)
    └──enhanced by──> NIL Budget Ledger (NIL spend pattern is a DNA input for CFB)
```

---

## Feature Complexity Summary

| Feature | Category | Complexity | New DB Tables | AI Required | AI Model |
|---------|----------|------------|---------------|-------------|----------|
| Toast Notification System | QOL | LOW | None | No | — |
| Command Palette | QOL | MEDIUM | None | No | — |
| Last-Action Undo | QOL | MEDIUM | None | No | — |
| Persistent Filter State | QOL | LOW | None | No | — |
| Coaching Staff Lifecycle | Community | MEDIUM | coachingStaff | No | — |
| CFB-to-Madden Continuity | Community | MEDIUM-HIGH | playerContinuityLinks | No | — |
| Playoff Scenario Simulator | Community | MEDIUM | playoffScenarios | No | — |
| NIL Budget Ledger | Community | LOW-MEDIUM | nilDeals | No | — |
| Future Schedule Builder | Community | MEDIUM | scheduledGames | No | — |
| Trade Value Calculator | Community | MEDIUM | None (optional tradeProposals) | No | — |
| Recruiting Class Comparison | Community | LOW-MEDIUM | None | No | — |
| Auto-Sync / Live Export | Community | MEDIUM | None | No | — |
| Historical Season Record Book | Community | LOW | None | No | — |
| Rivalry Dashboard (Series) | Community | MEDIUM | rivalryMoments | No | — |
| Living Chronicle | AI | HIGH | chronicle | Yes | Sonnet |
| Hot Seat / Pressure Meter | AI | MEDIUM | None (cache only) | Yes (optional) | Haiku |
| Opponent Intelligence Dossiers | AI | MEDIUM | aiDossiers | Yes | Sonnet |
| Generational Player Arcs | AI | MEDIUM | playerNarratives | Yes | Sonnet |
| Rival Prophecy | AI | MEDIUM | rivalProphecies | Yes | Haiku |
| The Obituary Room | AI | MEDIUM | playerNarratives | Yes | Haiku |
| The Journalist | AI | MEDIUM-HIGH | newsBlurbs | Yes | Haiku |
| Cross-Dynasty Intelligence | AI | HIGH | None (cache only) | Yes | Sonnet |
| Momentum Heat Map | AI | MEDIUM | None | Hybrid | Haiku (optional) |
| What If Engine | AI | MEDIUM | None (cache only) | Yes | Sonnet |
| Broadcast Booth / Audio Mode | AI | HIGH | None | Yes | Haiku + TTS |
| DNA Report | AI | MEDIUM-HIGH | None (cache only) | Yes | Sonnet |

---

## New DB Schema Required (v2.0)

The following new tables must be added to the Dexie schema (current DB_VERSION = 5; will need version bump for each batch of additions):

| Table | Key Fields | Notes |
|-------|-----------|-------|
| `coachingStaff` | id, dynastyId, name, role, hireYear, departureYear, scheme | Self-referential promotedFromId |
| `playerContinuityLinks` | id, cfbPlayerId, cfbDynastyId, maddenPlayerId, maddenDynastyId | Cross-dynasty join |
| `playoffScenarios` | id, dynastyId, seasonId, bracketState (JSON) | 1 per season, overwrite |
| `nilDeals` | id, dynastyId, seasonId, playerName, amount, category | CFB only |
| `scheduledGames` | id, dynastyId, year, week, opponent, homeAway, gameType | No result fields |
| `rivalryMoments` | id, dynastyId, rivalId, gameId, description | Key moments pin |
| `chronicle` | id, dynastyId, seasonId, content, lastGameId, generatedAt | AI content cache |
| `aiDossiers` | id, dynastyId, opponent, content, generatedAt | AI content cache |
| `playerNarratives` | id, playerId, dynastyId, type ('arc'\|'obituary'), content, generatedAt | Shared for arcs + obituaries |
| `rivalProphecies` | id, dynastyId, rivalId, content, generatedAt, seasonYear | AI content cache |
| `newsBlurbs` | id, dynastyId, gameId, triggerType, headline, body, publishedAt | The Journalist |

**Player model extension needed:** Add `birthYear?: number` to `Player` type (required for Trade Value Calculator age factor).

---

## Anti-Features (Scope Creep Traps)

| Anti-Feature | Why Requested | Why Problematic | Better Alternative |
|--------------|---------------|-----------------|-------------------|
| Multi-level undo (ctrl+Z history) | Feels "professional" | Requires full store refactor; high complexity for rare use case | Single-level last-action undo covers 90% of accidental deletes |
| AI chat assistant inside command palette | "Ask Dynasty OS anything" | Completely different product; blurs the app's identity | Keep palette as navigation + quick-create only; AI content lives in dedicated AI pages |
| Full play-by-play audio narration | Sounds impressive | Game data is game-level only; no play data exists; would require fake/hallucinated play-by-play | Postgame recap clip (Broadcast Booth) — accurate to actual data |
| Real-time game simulation in playoff bracket | "Simulate using team stats" | There is no team stats engine; would require inventing a simulation model | Click-to-pick bracket — user is the simulation engine |
| NIL cap enforcement (salary cap-style) | Realistic CFB NIL rules | The game's NIL mechanics vary by version; enforcing rules creates frustration when they differ | Tracking-only ledger; optional user-set "soft cap" with warning, not enforcement |
| Cloud sync / multi-device dynasty sharing | Obvious user desire | Eliminates local-first advantage; adds auth complexity, server costs, GDPR surface area | JSON export/import already handles portability; cloud sync is v3 |
| Automatic stat simulation for "What If" | Most powerful counterfactual | Requires building a full stats simulation engine (Monte Carlo, probability distributions) | AI narrative counterfactuals — compelling, feasible, grounded in actual data |
| ElevenLabs as default TTS | Higher quality voice | Second paid API dependency; costs per character; overkill for a delight feature | Web Speech API default + ElevenLabs as opt-in setting |
| Full coaching salary/contract tracking | Real-world realism | EA Sports games do not expose coaching salary data; would be entirely manual/fictional | Coaching staff roles, schemes, and tenure — the meaningful data |

---

## MVP Definition for v2.0 Phases

### Phase A: QOL Foundation (Build First)

These unlock the "professional desktop app" feel before the feature-heavy phases.

- [x] Toast notification system — every other feature benefits from this feedback layer
- [x] Persistent filter state — stops daily frustration on existing features
- [x] Last-action undo — safety net for data loss
- [x] Command palette — power user quality of life

### Phase B: High-Value Community Features

- [x] Historical season record book — the "memory layer" core promise
- [x] Rivalry dashboard with full series context — expands the most-used existing feature
- [x] NIL budget ledger — addresses the #1 new CFB 26 mechanic
- [x] Recruiting class grade comparison — builds on existing Phase 5 data
- [x] Coaching staff lifecycle tracker — foundational for DNA Report later
- [x] Playoff scenario simulator — commissioner/prediction use case

### Phase C: Remaining Community + AI Foundation

- [x] Trade value calculator — Madden power feature
- [x] CFB-to-Madden player continuity — cross-game differentiator
- [x] Future schedule builder — planning feature
- [x] Auto-sync / live export — power user / content creator feature
- [x] Living Chronicle — highest-value AI feature (updates per game)
- [x] The Journalist — auto-generated news adds life to the app
- [x] Hot Seat / Pressure Meter — algorithmic + light AI, fast to build

### Phase D: Deep AI Intelligence Layer

- [x] Generational Player Arcs — extends Legacy Card infrastructure
- [x] The Obituary Room — extends Legacy Card infrastructure
- [x] Opponent Intelligence Dossiers — extends scouting card infrastructure
- [x] Rival Prophecy — extends rivalry dashboard
- [x] Momentum Heat Map — visual AI layer on game data
- [x] What If Engine — highest creative value
- [x] DNA Report — synthesis of everything built
- [x] Cross-Dynasty Intelligence — requires multiple dynasties exist
- [x] Broadcast Booth / Audio Mode — delight feature, complex TTS integration

---

## Competitor Feature Analysis

| Feature | Google Sheets (Community) | Dynasty OS v1 | Dynasty OS v2.0 Target |
|---------|--------------------------|---------------|----------------------|
| Season record book | Manual, high friction | Dashboard (current season only) | Full multi-season record book |
| Rivalry tracking | H2H record, manual | Opponent + label only | Full series context, momentum, key moments |
| Coaching staff | Separate tab, no schema | Not tracked | Full lifecycle tracker |
| Trade evaluation | Separate calculator link | Not supported | Built-in Madden calculator |
| NIL tracking | Separate tab | Not supported | Integrated ledger |
| AI narratives | None | Season recap, Legacy Cards | 12 new AI features |
| Playoff simulation | Bracket template | Not supported | Interactive scenario simulator |
| Audio mode | None | None | Broadcast Booth (postgame recap) |
| Cross-dynasty | Not possible | Not supported | Cross-dynasty intelligence |

---

## Sources

- Sonner library: https://github.com/emilkowalski/sonner (HIGH confidence — official repo)
- cmdk library: https://github.com/pacocoursey/cmdk (HIGH confidence — official repo)
- Recharts RadarChart: https://recharts.org/en-US/api/Radar (HIGH confidence — official docs)
- Zustand persist middleware: https://github.com/pmndrs/zustand/blob/main/docs/integrations/persisting-store-data.md (HIGH confidence)
- Web Speech API in Tauri: https://github.com/tauri-apps/tauri/discussions/13460 (MEDIUM confidence — community discussion, Windows confirmed working)
- tauri-plugin-tts: https://github.com/brenogonzaga/tauri-plugin-tts (MEDIUM confidence — community plugin)
- Madden trade value algorithm: Operation Sports community documentation + EA official trade system docs (MEDIUM confidence — community-derived; exact multipliers need tuning)
- Hot seat metrics: https://coacheshotseat.com + CBS Sports hot seat rankings (MEDIUM confidence — real-world metrics adapted to dynasty context)
- CFB-to-Madden player transfer: https://www.ea.com/games/ea-sports-college-football/college-football-26/tips-and-tricks-hub/cfb26-how-to-transfer-from-college-football-26-to-madden-26 (HIGH confidence — official EA source, confirms player crossover exists in Road to Glory; Dynasty OS feature mirrors this concept for dynasty tracking)
- NIL in CFB 26: https://thereformedgamers.com/2025/07/21/ea-sports-college-football-26-dynasty-guide-master-recruiting-nil-deals-mvp-skills/ (MEDIUM confidence)
- College Football 26 multi-year scheduling: https://www.ea.com/games/ea-sports-college-football/college-football-26/news/cfb26-campus-huddle-dynasty-deep-dive (HIGH confidence — official EA source)

---

*Feature research for: Dynasty OS v2.0 new capabilities*
*Researched: 2026-02-24*
