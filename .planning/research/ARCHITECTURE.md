# Architecture Research

**Domain:** Desktop Tauri 2 sports dynasty companion app — v2.0 integration of 33 new features into existing React + Zustand + Dexie codebase
**Researched:** 2026-02-24
**Confidence:** HIGH (based on direct codebase inspection, not training data assumptions)

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          App.tsx (Root)                             │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  ToastContainer (NEW — fixed portal in root)                  │  │
│  │  CommandPalette (NEW — fixed overlay in root)                 │  │
│  │  PageContent (switch on useNavigationStore.currentPage)       │  │
│  │  TickerBar (fixed bottom, already exists)                     │  │
│  └───────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│                          Page Layer                                  │
│  DashboardPage  RosterPage  PlayerProfilePage  RecruitingPage  ...  │
│  (NEW pages: CoachingStaffPage, RivalryDashboardPage,               │
│   PlayoffSimulatorPage, NILLedgerPage, ScheduleBuilderPage,         │
│   TradeValuePage, RecordBookPage, MomentumMapPage, WhatIfPage,      │
│   BroadcastBoothPage, DNAReportPage)                                │
├─────────────────────────────────────────────────────────────────────┤
│                       Zustand Store Layer                            │
│  useGameStore  useSeasonStore  usePlayerStore  useNarrativeStore    │
│  (NEW: useToastStore, useUndoStore, useFilterStore,                 │
│   useCommandPaletteStore, useAIIntelligenceStore)                   │
├─────────────────────────────────────────────────────────────────────┤
│                      Service Layer (lib/*.ts)                        │
│  game-service  narrative-service  player-service  achievement-service│
│  (NEW: coaching-staff-service, nil-service, schedule-service,       │
│   trade-value-service, ai-intelligence-service, csv-export-service, │
│   auto-sync-service, record-book-service)                           │
├─────────────────────────────────────────────────────────────────────┤
│                       Dexie ORM (IndexedDB)                          │
│  Tables v5: dynasties, seasons, games, players, playerSeasons,      │
│  recruitingClasses, recruits, transferPortalEntries, draftPicks,    │
│  prestigeRatings, rivals, scoutingNotes, achievements               │
│  (NEW v6: coachingStaff, nilEntries, futureGames,                   │
│   playerLinks, aiCache)                                             │
├─────────────────────────────────────────────────────────────────────┤
│                   Tauri 2 Backend (Rust + Node.js sidecar)          │
│  plugin-fs (read/write/watch)  plugin-dialog  plugin-shell          │
│  madden-reader sidecar  (NEW: auto-export background writes)        │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | v2.0 Change |
|-----------|----------------|-------------|
| `App.tsx` | Root tree, page routing via switch | Add ToastContainer + CommandPalette portals |
| `useNavigationStore` | currentPage + pageParams | Add ~11 new page names to Page union type |
| `useGameStore` | Game CRUD, season reload | Add undo snapshot before logGame/deleteGame |
| `useToastStore` (NEW) | Toast queue, dismiss, auto-expire | Global feedback system |
| `useUndoStore` (NEW) | Single-level undo stack per operation type | Per-store snapshot before write |
| `useFilterStore` (NEW) | Persistent filter state by page key | Replaces local component useState for filters |
| `useCommandPaletteStore` (NEW) | Open/close, search query, command registry | Global keyboard shortcut handler |
| `useAIIntelligenceStore` (NEW) | AI feature state, cache status, loading flags | Shared across all AI Intelligence features |
| Service files (`lib/*.ts`) | Pure async functions, DB reads/writes, Claude API | New service files per new domain |
| `DynastyDB` (packages/db) | Dexie schema, table definitions | DB version bump to 6, new tables |
| `core-types` (packages) | Shared TypeScript interfaces | New interfaces for all new entities |

---

## Feature Integration Map

This section answers exactly how each of the 33 features integrates with the existing architecture.

---

### Group 1: QOL Wins

#### 1. Toast Notification System

**Integration:** New `useToastStore` Zustand store + `ToastContainer` component rendered once in `App.tsx` above `PageContent`.

**Component tree placement:**
```
App.tsx
  <ToastContainer />   ← fixed top-right overlay, z-50
  <PageContent />
  <TickerBar />
```

**What triggers toasts:** Every store action that writes to DB calls `useToastStore.getState().addToast(...)` as the last step before returning. This keeps toast logic out of the service layer (services know nothing about UI) and out of page components (pages shouldn't be responsible for feedback). The store layer is the natural boundary.

**Trigger sites (call `addToast` after successful write):**
- `useGameStore.logGame()` — "Game logged"
- `useGameStore.deleteGame()` — "Game deleted"
- `useGameStore.updateGame()` — "Game updated"
- `useSeasonStore.createSeason()` — "Season started"
- `usePlayerStore.createPlayer()` — "Player added"
- `useDynastyStore.createDynasty()` — "Dynasty created"
- `useDynastyStore.exportDynasty()` — "Export saved"
- All new v2.0 stores (coaching staff hire/fire, NIL entry, etc.)

**Store shape:**
```typescript
interface Toast { id: string; message: string; type: 'success' | 'error' | 'info'; duration?: number; }
interface ToastStore {
  toasts: Toast[];
  addToast: (message: string, type?: Toast['type'], duration?: number) => void;
  dismiss: (id: string) => void;
}
```

**No new DB tables.** No changes to service layer. ToastContainer uses `createPortal` to render outside the normal flow. Auto-dismiss via `setTimeout` inside `addToast`.

---

#### 2. Cmd+K Command Palette

**Integration:** New `useCommandPaletteStore` + `CommandPalette` component in `App.tsx`. Global `keydown` listener lives in `App.tsx` or a `useEffect` inside `CommandPalette` itself.

**Component tree placement:**
```
App.tsx
  <CommandPalette />   ← fixed overlay, z-60, above ToastContainer
  <PageContent />
  <TickerBar />
```

**Command registry pattern:** Commands are registered as a static array (not dynamic) defined in a `command-registry.ts` file. Each command has `{ id, label, keywords, action, sportGuard? }`. The registry imports navigation store actions and executes them. No new DB.

**Navigation integration:** Commands call `useNavigationStore.getState().navigate(page)` directly — same pattern used everywhere in the codebase.

**Keyboard listener:**
```typescript
// In CommandPalette component's useEffect
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      useCommandPaletteStore.getState().open();
    }
    if (e.key === 'Escape') {
      useCommandPaletteStore.getState().close();
    }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, []);
```

**Tauri WebView note:** `window.addEventListener('keydown')` works in WebView. No Tauri plugin needed. Cmd+K is available on both macOS (Cmd) and Windows (Ctrl) via `e.metaKey || e.ctrlKey`.

**No new DB tables.**

---

#### 3. Last-Action Undo

**Integration:** New `useUndoStore` with a typed snapshot. Hooks into existing stores at the write boundary.

**Undo architecture — single-level, operation-aware:**
```typescript
type UndoSnapshot =
  | { type: 'game-delete'; game: Game }
  | { type: 'game-create'; gameId: string }
  | { type: 'player-delete'; player: Player }
  | { type: 'player-season-delete'; playerSeason: PlayerSeason };

interface UndoStore {
  snapshot: UndoSnapshot | null;
  canUndo: boolean;
  setSnapshot: (s: UndoSnapshot) => void;
  clearSnapshot: () => void;
  undo: () => Promise<void>;
}
```

**Which operations are undoable:**
- Game log (create) — store the game ID; undo calls `deleteGame`
- Game delete — store full `Game` object before deletion; undo calls `db.games.add(game)` directly
- Player delete — store full `Player` + all associated `PlayerSeason` records; undo bulk-restores

Player stats edits and season-end data are NOT undoable (too complex to snapshot reliably; low demand).

**Store integration:** In `useGameStore.logGame()`, after success, call `useUndoStore.getState().setSnapshot({ type: 'game-create', gameId: game.id })`. In `useGameStore.deleteGame()`, capture the full game record first, then after deletion call `setSnapshot({ type: 'game-delete', game })`.

**UI surface:** Toast notification "Game deleted — Undo" with an inline Undo button. When clicked, calls `useUndoStore.getState().undo()`. After navigation away from page, `clearSnapshot()`.

**No new DB tables.**

---

#### 4. Persistent Filter State

**Integration:** New `useFilterStore` with key-value pairs, persisted to `localStorage` via Zustand `persist` middleware.

**Pattern:**
```typescript
interface FilterStore {
  filters: Record<string, Record<string, unknown>>;
  setFilter: (pageKey: string, field: string, value: unknown) => void;
  getFilters: (pageKey: string) => Record<string, unknown>;
  clearFilters: (pageKey: string) => void;
}
```

**Page keys that need filter state:**
- `'roster'` — position, status, search
- `'records'` — era/year range
- `'recruiting'` — year, star level
- `'transfer-portal'` — direction (in/out), year
- `'draft-tracker'` — round, year
- `'legends'` — position, era
- `'rivalry-tracker'` — active only

**Migration:** Each page currently uses `useState` for local filters. Migrate by replacing `useState` with `useFilterStore(s => s.getFilters('roster'))` on read and `useFilterStore.getState().setFilter('roster', 'position', val)` on write.

**Persistence:** Zustand `persist` middleware with `localStorage` storage writes filter state JSON on every change. The key is `dynasty-os-filters`.

**No new DB tables.** Filters are UI preference state, not data.

---

#### 5. CSV Export

**Integration:** New `csv-export-service.ts` in `lib/`. Each exportable page gets an "Export CSV" button that calls the service. The service produces a CSV string, then calls Tauri `save` dialog + `writeTextFile` — the same pattern as `downloadJson` in `export-import.ts`.

**Service pattern:**
```typescript
export async function exportTableToCsv(
  headers: string[],
  rows: Record<string, unknown>[],
  filename: string
): Promise<void> {
  const csvString = buildCsvString(headers, rows);
  const filePath = await save({ defaultPath: filename, filters: [{ name: 'CSV', extensions: ['csv'] }] });
  if (filePath) await writeTextFile(filePath, csvString);
}
```

**Pages that get export buttons:** RosterPage, RecordsPage, RecruitingPage, DraftTrackerPage, PlayerProfilePage (career stats), TransferPortalPage, RivalryTrackerPage (series history).

**Tauri constraint respected:** `writeTextFile` via `@tauri-apps/plugin-fs` is already used in `export-import.ts`. Blob URLs do not work in WebView — this pattern avoids that entirely.

**No new DB tables.**

---

#### 6. Auto-sync / Live Data Export

**Integration:** New `auto-sync-service.ts`. A Dexie hook (`db.on('changes')`) fires after every transaction. The hook calls the auto-sync service which writes a JSON snapshot to a user-configured path.

**Pattern:**
```typescript
// In packages/db/src/dynasty-db.ts constructor, after version definitions:
this.on('changes', (changes) => {
  autoSyncService.handleDbChange(changes);
});
```

**Auto-sync service responsibilities:**
1. Check if auto-sync is enabled (localStorage flag, like Madden watcher)
2. Check if an export path is configured (also localStorage)
3. Debounce with 3-second delay to batch rapid writes
4. Call `writeTextFile` via Tauri to overwrite the JSON file at the configured path

**Configuration UI:** Settings section in dashboard sidebar or a dedicated settings modal. User picks a folder, app stores the path in localStorage.

**Format options:** JSON only (matches existing export format `DynastyExport`). CSV auto-export is a potential future option but JSON is safe and complete.

**Tauri constraint:** Uses `tauri-plugin-fs` `writeTextFile` — already permitted in `tauri.conf.json` based on existing export flow. The write path needs to be in an allowed scope. The user-picked directory must be within an allowed Tauri FS scope (same as the existing save dialog pattern).

**No new DB tables.** The export path preference lives in localStorage alongside the Madden save path pattern.

---

#### 7. Season Checklist

**Integration:** Per-season task list surfaced on dashboard. State stored in `localStorage` keyed by `seasonId` (tasks are ephemeral enough for localStorage; no need for IndexedDB table).

**Component:** `SeasonChecklist` widget on DashboardPage, alongside existing `SeasonAtGlance` widget.

**Default tasks (computed from dynasty sport):**
- CFB: "Log all regular season games", "Close recruiting class", "Record bowl/playoff result", "Generate season recap"
- Madden: "Sync franchise save", "Review depth chart", "Record season result"

**State:** `Record<string, boolean>` per seasonId, stored in localStorage key `dynasty-os-checklist-{seasonId}`.

**No new DB tables.**

---

#### 8. Auto-suggest Season Year

**Integration:** `useSeasonStore.createSeason()` already takes a `year` parameter. The fix is in the UI layer — the "Start Season" button and SeasonEndModal's "Start Next Season" flow should pass `(activeSeason?.year ?? dynasty.currentYear) + 1` as the default year value.

**No new store.** No new DB tables. Single-line fix in two UI locations.

---

#### 9. Recent Opponents in Log Game

**Integration:** `LogGameModal` currently has a text input for opponent. Add a "Recent Opponents" quick-select section above the input that shows the last 10 distinct opponents from `getRecentGames(dynastyId, 20)`.

**`getRecentGames` already exists** in `game-service.ts`. The component reads this data on mount. User clicks a recent opponent name → pre-fills the text input.

**No new DB tables.** No new stores. Component-only change.

---

#### 10. Inline Player Notes

**The `Player` interface already has a `notes?: string` field** (confirmed in `packages/core-types/src/player.ts`). The `PlayerSeason` interface also has `notes?: string`.

**Integration:** Add a notes text area to `PlayerProfilePage` and the player edit modal. The `updatePlayer` service already exists in `player-service.ts`.

**No new DB tables.** No new stores. UI-only addition.

---

#### 11. Season Timeline Scrubber

**Integration:** A horizontal scrubber component on `DashboardPage` (or persistent in the sidebar) that shows all seasons for the active dynasty. Clicking a season calls `useSeasonStore.getState().setActiveSeason(season)`.

**Data source:** `useSeasonStore` already holds `seasons: Season[]`. The scrubber reads this array.

**No new DB tables.** No new stores. Component-only addition.

---

### Group 2: Community Features

#### 12. Coaching Staff Lifecycle Tracker

**Integration:** Requires new DB table, new types in `core-types`, new service, new Zustand store, new page.

**New entity:**
```typescript
// packages/core-types/src/coaching-staff.ts
export type CoachingRole = 'head' | 'offensive-coordinator' | 'defensive-coordinator' |
  'position-coach' | 'special-teams' | 'other';

export interface StaffMember {
  id: string;
  dynastyId: string;
  name: string;
  role: CoachingRole;
  scheme?: string;          // e.g., "Air Raid", "3-4 Defense"
  hiredYear: number;
  firedYear?: number;       // null = still on staff
  promotedFrom?: string;    // previous role
  notes?: string;
  createdAt: number;
  updatedAt: number;
}
```

**DB migration:** v6 adds `coachingStaff` table. Schema entry: `'id, dynastyId, role, hiredYear, [dynastyId+hiredYear]'`.

**Service:** `coaching-staff-service.ts` — CRUD pattern matching `player-service.ts`.

**Store:** `useCoachingStaffStore` — matches existing store patterns (load, create, update, delete, clearError).

**Page:** `CoachingStaffPage` — accessible via nav. Shows current staff + tenure history. CFB-relevant but also useful for Madden (coordinators). NOT sport-guarded — available to all sports.

**No Claude integration for initial implementation.** The "Coaching Resume" page (Phase 7) covers the coach themselves; this tracker covers the staff under them.

---

#### 13. CFB-to-Madden Player Continuity

**Integration:** Links a CFB `Player` record to a Madden `Player` record across dynasties. Stored as a new linking table.

**New entity:**
```typescript
// packages/core-types/src/player-link.ts
export interface PlayerLink {
  id: string;
  cfbPlayerId: string;      // Player.id from a CFB dynasty
  maddenPlayerId: string;   // Player.id from a Madden dynasty
  cfbDynastyId: string;
  maddenDynastyId: string;
  linkYear: number;         // Year of NFL Draft / transition
  notes?: string;
  createdAt: number;
}
```

**DB migration:** v6 adds `playerLinks` table. Schema entry: `'id, cfbPlayerId, maddenPlayerId, [cfbPlayerId+maddenPlayerId]'`.

**Service:** `player-link-service.ts` — create/get/delete link, `getLinkedPlayer(cfbPlayerId)` returns the Madden player.

**UI integration:** On `PlayerProfilePage`, if a player is in a CFB dynasty and has status `'drafted'`, show a "Link to NFL Career" button. This opens a modal to search for the player in the user's Madden dynasties. The modal queries all players across all dynasties.

**Cross-dynasty query:** `db.players.where('dynastyId').anyOf(maddenDynastyIds).toArray()` — Dexie supports this. The modal filters results by name similarity.

**No Claude integration needed.** Pure linking UI.

---

#### 14. Playoff Scenario Simulator

**Integration:** In-memory only, no DB persistence. A modal or full page that takes the current season's games and remaining schedule to simulate bracket outcomes.

**Data inputs:** `useSeasonStore.activeSeason` + `useGameStore.games` + user-input for unplayed games. All in-memory.

**Component:** `PlayoffSimulatorPage` or a modal overlay. User sets expected win/loss outcomes for remaining games and sees what playoff bracket looks like.

**No new DB tables.** No new service files (purely computed from existing data). Pure React component with local state.

**Sport awareness:** CFB shows CFP-style bracket seeding; Madden shows NFL playoff bracket format. Sport config drives layout. This is a CFB-primary feature but the Madden path can be added.

---

#### 15. NIL Budget Ledger

**Integration:** CFB-only feature. New DB table, types, service, store, page.

**New entity:**
```typescript
// packages/core-types/src/nil.ts
export interface NILEntry {
  id: string;
  dynastyId: string;
  playerId?: string;          // optional — some entries are class-wide
  playerName?: string;        // denormalized for display
  position?: string;          // denormalized
  year: number;
  amount: number;             // dollar amount
  category: 'individual' | 'class' | 'position-group';
  notes?: string;
  createdAt: number;
  updatedAt: number;
}
```

**DB migration:** v6 adds `nilEntries` table. Schema entry: `'id, dynastyId, year, playerId, [dynastyId+year]'`.

**Service:** `nil-service.ts` — CRUD + aggregations (`getTotalByYear`, `getTotalByPlayer`, `getTotalByPosition`).

**Store:** `useNILStore`.

**Page:** `NILLedgerPage` — CFB sport guard in navigation sidebar (already exists for other CFB pages). Accessible via CFB nav section.

**Sport guard pattern:** Already established in `DashboardPage.tsx` — `{activeDynasty.sport === 'cfb' && <NavLink ... />}`.

---

#### 16. Future Schedule Builder + Bowl Projection

**Integration:** New DB table for scheduled future games (distinct from the `games` table which is for completed games).

**New entity:**
```typescript
// packages/core-types/src/future-game.ts
export interface FutureGame {
  id: string;
  dynastyId: string;
  year: number;              // which future season
  week: number;
  opponent: string;
  homeAway: HomeAway;
  gameType: GameType;
  projectedResult?: 'W' | 'L';  // user's projection
  notes?: string;
  createdAt: number;
  updatedAt: number;
}
```

**Why a separate table (not extending `games`):** The `games` table tracks completed results. Future games are speculative. Mixing them breaks all result-aggregation logic (`recalculateSeasonRecord` counts by result). A separate table keeps the completed game log clean.

**DB migration:** v6 adds `futureGames` table. Schema entry: `'id, dynastyId, year, week, [dynastyId+year]'`.

**Service:** `future-schedule-service.ts` — CRUD. Simple list by dynastyId+year.

**Page:** `ScheduleBuilderPage` — shows future schedule. Bowl projection is a UI computation from user-projected wins: if projected wins >= threshold, suggest bowl tier.

**No Claude integration for v2.0.** Bowl projection is algorithmic.

---

#### 17. Trade Value Calculator

**Integration:** In-memory calculation for Madden dynasties. No DB persistence needed for calculations themselves. Inputs come from existing `Player` and `PlayerSeason` data.

**Madden sport guard:** Available only when `activeDynasty.sport === 'madden'`.

**Calculation inputs:** Player's `overall` rating (stored in `PlayerSeason.stats.overall` from Madden sync), age, position, contract data (not currently tracked — v2.0 can use OVR + age + position as proxies).

**Component:** `TradeValuePage` — user picks players from their roster and sees computed trade value scores. No service layer needed (pure computation function in the component or a utility file `lib/trade-value-utils.ts`).

**No new DB tables.** No new stores.

---

#### 18. Recruiting Class Grade Comparison

**Integration:** Purely computed from existing `RecruitingClass` table. No new tables.

**Data source:** `useRecruitingStore` already loads `recruitingClasses` for the active dynasty. The comparison view reads multiple classes from this store.

**Component:** Add a "Compare Classes" view to `RecruitingPage` — side-by-side table of star breakdowns, class rank, and AI grades across all recorded classes.

**If comparing across rival dynasties:** `db.recruitingClasses.where('dynastyId').anyOf([...dynastyIds]).toArray()`. This is a cross-dynasty query, same pattern as player continuity above.

**No new DB tables.** No new stores.

---

#### 19. Historical Season Record Book

**Integration:** Aggregation query across existing `seasons`, `games`, and `playerSeasons` tables. New `record-book-service.ts` with aggregation functions. New `RecordBookPage` (or expand existing `RecordsPage`).

**New service:** `record-book-service.ts`
- `getSeasonBySeasonRecords(dynastyId)` — all seasons with W-L, ranking, bowl result
- `getSingleSeasonBests(dynastyId)` — best wins season, highest ranking, most points, etc.
- `getCareerLeadersByCategory(dynastyId)` — delegates to existing `records-service.ts`

**Component:** `RecordBookPage` (new page) — three tabs: Season Log, Season Records, Career Records. NavigationStore gets new `'record-book'` page entry.

**No new DB tables.** Aggregation from existing data.

---

#### 20. Rivalry Dashboard Expansion

**Integration:** Extends the existing `rivals` table and `RivalryTrackerPage`. No new table; extends the existing `Rival` type.

**Extended Rival type (optional fields added):**
```typescript
// Addition to packages/core-types/src/rival.ts
export interface RivalryMoment {
  gameId: string;       // FK to games table
  year: number;
  description: string;  // User-written "key moment" annotation
}

// Extend Rival interface:
interface Rival {
  // ... existing fields ...
  keyMoments?: RivalryMoment[];   // stored as JSON in the record
  notes?: string;                 // series-level notes
}
```

**Why no separate moments table:** The number of moments per rivalry is small (5-10 max). Storing as a JSON array in the `Rival` record is simpler and avoids a join. Dexie handles JSON fields transparently.

**Service additions:** `addRivalryMoment(rivalId, moment)`, `getRivalrySeriesStats(rivalId, dynastyId)` — queries all games where `game.opponent === rival.opponent` and aggregates wins/losses/streaks by year.

**Page update:** `RivalryTrackerPage` expands to show full series timeline, win percentage chart, key moments list, and rivalry notes.

**DB schema change:** `rivals` schema entry gets no new indexes (moments are embedded JSON). The `Rival` type in `core-types` gains optional fields. No DB version bump needed for JSON field additions since Dexie only indexes declared fields.

---

### Group 3: AI Intelligence Layer

All AI features follow the same architectural pattern:

**Shared AI architecture pattern:**
1. A service function in `lib/ai-intelligence-service.ts` (or a dedicated service file for larger features)
2. The service checks a localStorage cache key first (same pattern as `getCachedNarrative`)
3. If cache miss, builds a context object from existing DB data
4. Calls Claude API with `anthropic-dangerous-direct-browser-access: 'true'` header
5. Caches result to localStorage with timestamp
6. Returns typed result or null (never throws)
7. `useAIIntelligenceStore` holds loading state and cached results in memory during the session

**Shared cache pattern:**
```typescript
const AI_CACHE_PREFIX = 'dynasty-os-ai-';
// Cache key = AI_CACHE_PREFIX + featureName + '-' + entityId
// e.g., 'dynasty-os-ai-chronicle-season-abc123'
// e.g., 'dynasty-os-ai-hotseat-dynasty-xyz456'
```

**Model selection:**
- Short blurbs (Hot Seat meter, Journalist breaking news, Prophecy): Claude Haiku (fast, cheap)
- Long-form content (Living Chronicle, Generational Arc, DNA Report, Obituary, Dossiers): Claude Sonnet
- What If Engine (complex reasoning): Claude Sonnet

**New `aiCache` DB table (DB version 6):**
For AI results that need to survive across sessions without relying solely on localStorage (which has ~5MB limit that could fill up with many dynasties):

```typescript
interface AICache {
  id: string;         // featureName + '-' + entityId
  dynastyId: string;
  feature: string;    // 'chronicle' | 'hotseat' | 'dossier' | etc.
  entityId: string;   // seasonId, playerId, opponentName, etc.
  content: string;    // serialized result
  generatedAt: number;
  model: string;      // which Claude model was used
}
```

DB schema entry: `'id, dynastyId, feature, entityId, [dynastyId+feature]'`

**`useAIIntelligenceStore` shape:**
```typescript
interface AIIntelligenceStore {
  loading: Record<string, boolean>;  // key = featureName + entityId
  errors: Record<string, string | null>;
  setLoading: (key: string, loading: boolean) => void;
  setError: (key: string, error: string | null) => void;
}
```

---

#### 21. Living Chronicle

**Trigger:** Fires on `useGameStore.logGame()` success as fire-and-forget (same pattern as `evaluateAchievements`). Only regenerates if 3+ new games have been logged since last generation.

**Service:** `generateLivingChronicle(dynastyId, seasonId)` in `ai-intelligence-service.ts`.

**Context built from:** All games in current season, current record, ranking movement, player season stats so far (partial season).

**Cache key:** `dynasty-os-ai-chronicle-{seasonId}` — regenerates when game count crosses a threshold (3, 6, 9, 12 games).

**UI surface:** New widget on `DashboardPage` — "Chronicle" card showing the current AI running narrative. Displays stale content with a "Season in Progress" badge while a new generation is pending.

---

#### 22. Hot Seat / Pressure Meter

**Trigger:** On-demand (user opens Dashboard or a dedicated widget). Recomputes when season record changes by more than 2 games.

**Service:** `generateHotSeatScore(dynastyId, seasonId)` — returns a numeric pressure score (0-100) + a short AI-written explanation.

**Context:** Current record vs. expectations (prior season finish, prestige rating, recruiting class rank). Purely deterministic computation with an AI-written flavor explanation.

**Model:** Claude Haiku (short output, fast).

**UI surface:** Dashboard widget — pressure gauge visualization (SVG arc, like prestige chart pattern). Color-coded: green < 30, yellow 30-70, red > 70.

---

#### 23. Opponent Intelligence Dossiers

**Trigger:** On-demand, before a game. User selects an opponent and clicks "Generate Dossier".

**Service:** `generateOpponentDossier(dynastyId, opponent)` in `ai-intelligence-service.ts`.

**Context built from:** All games against this opponent (from `scoutingNotes` + `games`), head-to-head record, last 3 game results, any existing scouting notes.

**Cache key:** `dynasty-os-ai-dossier-{dynastyId}-{opponentSlug}`. Regenerates only on explicit user request.

**Model:** Claude Sonnet (detailed scouting report format).

**UI surface:** New section on `ScoutingCardPage` — "AI Dossier" tab alongside existing tendency notes.

---

#### 24. Generational Player Arcs

**Trigger:** On-demand when viewing a departed player's profile or Legacy Card.

**Service:** `generatePlayerArc(dynastyId, playerId)` in `ai-intelligence-service.ts`.

**Context:** Full career stats from all `PlayerSeason` records, awards, departure reason, recruiting star rating.

**Cache key:** `dynasty-os-ai-arc-{playerId}`. Permanent cache (player career doesn't change after departure).

**Model:** Claude Sonnet.

**UI surface:** New "Career Story" section on `PlayerProfilePage` for departed players. Augments the existing Legacy Card blurb.

---

#### 25. Rival Prophecy

**Trigger:** On-demand from `RivalryTrackerPage`.

**Service:** `generateRivalProphecy(dynastyId, rivalId)` — predicts trajectory of rivalry based on recent results, momentum, prestige trends.

**Context:** Series record, last 5 H2H results, both programs' recent win trends (from `seasons` data), prestige ratings.

**Cache key:** `dynasty-os-ai-prophecy-{rivalId}`. Stale after 3 new H2H games.

**Model:** Claude Haiku.

**UI surface:** "Rivalry Prophecy" section on expanded `RivalryTrackerPage`.

---

#### 26. The Obituary Room

**Trigger:** When a player's status changes to `'graduated'`, `'transferred'`, or `'drafted'` (via `updatePlayer` service). Auto-generated as fire-and-forget.

**Service:** `generatePlayerObituary(dynastyId, playerId)` — an AI eulogy for departed program legends.

**Context:** Career stats, awards, departure reason, recruiting star rating, key season moments.

**Cache key:** `dynasty-os-ai-obituary-{playerId}`. Permanent.

**Model:** Claude Sonnet.

**UI surface:** `TrophyRoomPage` gets a new "Obituary Room" section showing departed player eulogies. Also surfaced on `LegendsPage`.

---

#### 27. The Journalist

**Trigger:** Fire-and-forget after significant events: win over ranked opponent, rivalry win, bowl/playoff result, dynasty year milestone.

**Significance detection:** In `game-service.createGame()`, after writing the game, check if `opponentRanking <= 25` and result is `'W'`, or if `game.gameType === 'bowl' || 'playoff'`. If so, trigger `generateJournalistBlurb(dynastyId, gameId)` as fire-and-forget.

**Service:** `generateJournalistBlurb(dynastyId, gameId)` — short "breaking news" blurb.

**Cache key:** `dynasty-os-ai-journalist-{gameId}`. Permanent per game.

**Model:** Claude Haiku.

**UI surface:** Breaking news items in an "In The News" widget on `DashboardPage`. Items expire after 7 days or when the season ends.

---

#### 28. Cross-Dynasty Intelligence

**Trigger:** On-demand from a dedicated page or dashboard widget. Available only when the user has 2+ dynasties.

**Service:** `generateCrossDynastyInsights(dynastyIds: string[])` — compares coaching patterns, win rates, recruiting philosophy across dynasties.

**Context:** Aggregated season records, prestige trends, recruiting class averages across all dynasties.

**Cache key:** `dynasty-os-ai-cross-{sortedDynastyIds.join('-')}`. Stale after 1 season of new data.

**Model:** Claude Sonnet.

**UI surface:** New `CrossDynastyPage` accessible from `LauncherPage` (before selecting an active dynasty). Or a button in the dynasty switcher panel.

---

#### 29. Momentum Heat Map

**Integration:** Visual representation of win/loss momentum across a season. SVG-rendered, like the existing prestige chart.

**Data source:** All games in `useGameStore.games` for the active season. Each game has `teamScore`, `opponentScore`, `opponentRanking`, `result`, `teamRanking`. Momentum is computed from a rolling formula — no AI needed for the base computation.

**AI component (optional):** An AI-written "Momentum Analysis" paragraph explaining the peaks and valleys. Uses `generateMomentumAnalysis(dynastyId, seasonId)`.

**Rendering:** SVG `<path>` drawn from a momentum score array. Same approach as `PrestigeTrackerPage`. The SVG renders fine in Tauri WebView (WKWebView/Edge WebView2 both support SVG fully).

**Component:** `MomentumHeatMap` — a new widget on `DashboardPage` or a section on `SeasonRecapPage`.

**No new DB tables.** Computed from existing game data.

---

#### 30. What If Engine

**Integration:** A modal or page where users pose a historical counterfactual question. The AI reasons using local dynasty data as context.

**Pattern:**
1. User selects a past season and types a "What if..." question
2. Service builds a full season data snapshot (all games, stats, rankings)
3. Sends snapshot + question to Claude Sonnet
4. Response is cached per question hash

**Service:** `generateWhatIf(dynastyId, seasonId, question)` in `ai-intelligence-service.ts`.

**Data snapshot approach:** Build a complete text representation of the season (same as `buildNarrativeContext` in `narrative-service.ts`). Pass this as context to Claude. The AI never accesses the DB directly — all data is serialized to a prompt string before the API call.

**Cache key:** `dynasty-os-ai-whatif-{seasonId}-{hash(question)}`. The question hash is a simple `encodeURIComponent(question).substring(0, 20)`.

**Model:** Claude Sonnet.

**UI surface:** New `WhatIfPage` accessible from `SeasonRecapPage` or the sidebar.

---

#### 31. Broadcast Booth / Audio Mode

**Integration:** Web Speech API (`window.speechSynthesis`) for text-to-speech. This is available in both WKWebView (macOS) and Edge WebView2 (Windows). No external TTS service needed for v2.0.

**Why not external TTS:**
- No API key management
- No latency or network dependency
- System voices are acceptable quality for play-by-play fragments
- External TTS (ElevenLabs, etc.) adds cost, complexity, and a third-party dependency

**Confidence:** HIGH — Web Speech API (`window.speechSynthesis`) is supported in Chromium (Edge WebView2) and WebKit (WKWebView) as of their current versions. Tauri 2 uses these native WebViews; the browser APIs are available in the renderer.

**Service:** `broadcast-booth-service.ts`
```typescript
export function speakText(text: string, rate = 1.1, pitch = 1.0): void {
  if (!window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = rate;
  utterance.pitch = pitch;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  window.speechSynthesis?.cancel();
}
```

**AI component:** Claude Haiku generates "play-by-play fragment" text for a game recap — 2-3 sentences in broadcast voice. This is then spoken via `speakText()`.

**UI surface:** A "Broadcast Booth" button on `SeasonRecapPage` and `GameLog` rows. Clicking a game row speaks the AI-generated fragment for that game.

**No new DB tables.** Audio is never persisted. AI-generated fragments cached in localStorage.

---

#### 32. DNA Report

**Integration:** Deep AI analysis of program identity from all historical data. On-demand.

**Service:** `generateDNAReport(dynastyId)` in `ai-intelligence-service.ts`.

**Context assembled from:**
- All seasons: W-L records, rankings, bowl/playoff outcomes
- All recruiting classes: class ranks, star distributions, position group preferences
- Prestige ratings history
- Transfer portal entries (net positive/negative patterns)
- Top career stat leaders (from `records-service.ts`)

**This is the heaviest context prompt.** Cap the context with a summary of each season (not full game log) to keep token count manageable.

**Cache key:** `dynasty-os-ai-dna-{dynastyId}`. Stale after 2+ seasons of new data.

**Model:** Claude Sonnet.

**UI surface:** New `DNAReportPage`. Accessible from sidebar ("Program DNA" under Program section).

---

## New DB Tables Summary (DB v6)

The existing DB is at version 5. All new tables are added in a single v6 migration.

| Table | Purpose | Schema (Dexie indexes) |
|-------|---------|------------------------|
| `coachingStaff` | Staff member lifecycle records | `id, dynastyId, role, hiredYear, [dynastyId+hiredYear]` |
| `nilEntries` | NIL budget entries per player/year | `id, dynastyId, year, playerId, [dynastyId+year]` |
| `futureGames` | Projected future schedule entries | `id, dynastyId, year, week, [dynastyId+year]` |
| `playerLinks` | CFB-to-Madden player continuity links | `id, cfbPlayerId, maddenPlayerId, [cfbPlayerId+maddenPlayerId]` |
| `aiCache` | Persisted AI-generated content | `id, dynastyId, feature, entityId, [dynastyId+feature]` |

**DB migration strategy:**
```typescript
// In packages/db/src/dynasty-db.ts
this.version(6).stores({
  ...SCHEMA,                    // all existing tables unchanged
  coachingStaff: 'id, dynastyId, role, hiredYear, [dynastyId+hiredYear]',
  nilEntries: 'id, dynastyId, year, playerId, [dynastyId+year]',
  futureGames: 'id, dynastyId, year, week, [dynastyId+year]',
  playerLinks: 'id, cfbPlayerId, maddenPlayerId, [cfbPlayerId+maddenPlayerId]',
  aiCache: 'id, dynastyId, feature, entityId, [dynastyId+feature]',
});
```

Dexie handles forward-only schema migrations automatically. No data migration needed — all new tables are empty on first access.

---

## New Core Types (packages/core-types)

| File | Type(s) | Used By |
|------|---------|---------|
| `src/coaching-staff.ts` | `StaffMember`, `CoachingRole` | coaching-staff-service, DB |
| `src/nil.ts` | `NILEntry` | nil-service, DB |
| `src/future-game.ts` | `FutureGame` | future-schedule-service, DB |
| `src/player-link.ts` | `PlayerLink` | player-link-service, DB |
| `src/ai-cache.ts` | `AICache` | ai-intelligence-service, DB |

All exported from `src/index.ts`.

---

## New Store Files (apps/desktop/src/store)

| Store | Manages | New? |
|-------|---------|------|
| `toast-store.ts` | Toast queue | NEW |
| `undo-store.ts` | Single-level undo snapshot | NEW |
| `filter-store.ts` | Persistent filter state by page | NEW |
| `command-palette-store.ts` | Palette open/close, search | NEW |
| `coaching-staff-store.ts` | Staff member CRUD state | NEW |
| `nil-store.ts` | NIL entry CRUD state | NEW |
| `future-schedule-store.ts` | Future game CRUD state | NEW |
| `ai-intelligence-store.ts` | AI feature loading/error state | NEW |

All follow the exact pattern of existing stores: `GameState & GameActions`, `create<Store>((set, get) => ...)`.

---

## New Service Files (apps/desktop/src/lib)

| File | Responsibility | Calls DB? | Calls Claude? |
|------|---------------|-----------|---------------|
| `coaching-staff-service.ts` | Staff CRUD | Yes | No |
| `nil-service.ts` | NIL entry CRUD + aggregations | Yes | No |
| `future-schedule-service.ts` | Future game CRUD | Yes | No |
| `player-link-service.ts` | Player continuity links | Yes | No |
| `csv-export-service.ts` | CSV string builder + Tauri file save | No (reads via args) | No |
| `auto-sync-service.ts` | Background JSON export on DB change | Reads via exportDynasty | No |
| `record-book-service.ts` | Season/career aggregation queries | Yes | No |
| `ai-intelligence-service.ts` | All AI Intelligence Layer features | Yes (context building) | Yes |
| `broadcast-booth-service.ts` | Web Speech API wrapper | No | Yes (fragment generation) |
| `trade-value-utils.ts` | Madden trade calculation (pure function) | No | No |
| `command-registry.ts` | Static command definitions for palette | No | No |

---

## New Pages (apps/desktop/src/pages)

| Page | Route Key | Sport Guard | Description |
|------|-----------|-------------|-------------|
| `CoachingStaffPage` | `coaching-staff` | None | Staff lifecycle timeline |
| `NILLedgerPage` | `nil-ledger` | CFB only | NIL spend tracking |
| `ScheduleBuilderPage` | `schedule-builder` | None | Future schedule + bowl projection |
| `TradeValuePage` | `trade-value` | Madden only | Trade value calculator |
| `RecordBookPage` | `record-book` | None | Historical season record book |
| `PlayoffSimulatorPage` | `playoff-simulator` | None | In-memory bracket simulator |
| `WhatIfPage` | `what-if` | None | AI counterfactual engine |
| `MomentumMapPage` | `momentum-map` | None | Season momentum visualization |
| `DNAReportPage` | `dna-report` | None | Program DNA AI analysis |
| `CrossDynastyPage` | `cross-dynasty` | Multi-dynasty only | Cross-dynasty AI insights |

`navigation-store.ts` Page union type gets all 10 new page names + corresponding `goTo*()` helper actions.

---

## Recommended Project Structure (New Files Only)

```
apps/desktop/src/
├── components/
│   ├── ToastContainer.tsx         # Fixed portal, app-level
│   ├── CommandPalette.tsx         # Fixed overlay, app-level
│   ├── SeasonChecklist.tsx        # Dashboard widget
│   ├── MomentumHeatMap.tsx        # SVG chart component
│   └── SeasonScrubber.tsx         # Season navigation widget
├── lib/
│   ├── coaching-staff-service.ts
│   ├── nil-service.ts
│   ├── future-schedule-service.ts
│   ├── player-link-service.ts
│   ├── csv-export-service.ts
│   ├── auto-sync-service.ts
│   ├── record-book-service.ts
│   ├── ai-intelligence-service.ts  # All AI features
│   ├── broadcast-booth-service.ts
│   ├── trade-value-utils.ts
│   └── command-registry.ts
├── store/
│   ├── toast-store.ts
│   ├── undo-store.ts
│   ├── filter-store.ts
│   ├── command-palette-store.ts
│   ├── coaching-staff-store.ts
│   ├── nil-store.ts
│   ├── future-schedule-store.ts
│   └── ai-intelligence-store.ts
└── pages/
    ├── CoachingStaffPage.tsx
    ├── NILLedgerPage.tsx
    ├── ScheduleBuilderPage.tsx
    ├── TradeValuePage.tsx
    ├── RecordBookPage.tsx
    ├── PlayoffSimulatorPage.tsx
    ├── WhatIfPage.tsx
    ├── MomentumMapPage.tsx
    ├── DNAReportPage.tsx
    └── CrossDynastyPage.tsx

packages/core-types/src/
├── coaching-staff.ts
├── nil.ts
├── future-game.ts
├── player-link.ts
└── ai-cache.ts
```

---

## Architectural Patterns

### Pattern 1: Store-Triggered Toast (QOL Integration)

**What:** Every write operation in Zustand stores calls `useToastStore.getState().addToast()` after success.
**When to use:** Any operation that modifies data and should confirm success or failure to the user.
**Trade-offs:** The store layer knows about the toast system. This is acceptable because the store is already the UI-facing coordination layer. The alternative (page components handle toasts) scatters feedback logic.

**Example:**
```typescript
// In useGameStore.logGame()
const game = await svcCreate(input);
const games = await getGamesBySeason(input.seasonId);
set({ games, loading: false });
useToastStore.getState().addToast('Game logged', 'success');
return game;
```

---

### Pattern 2: Fire-and-Forget AI (AI Intelligence Integration)

**What:** AI generation is never on the critical path. Triggered after data writes as a background async call with `.catch(() => {})`.
**When to use:** Living Chronicle, Journalist, Obituary Room — any AI feature that should update automatically.
**Trade-offs:** AI content can be briefly stale after a new game is logged. This is acceptable — stale narrative is better than blocking the write path.

**Example:**
```typescript
// In game-service.createGame()
await db.games.add(game);
await recalculateSeasonRecord(input.seasonId);
evaluateAchievements(input.dynastyId).catch(() => {});
generateLivingChronicle(input.dynastyId, input.seasonId).catch(() => {});  // NEW
generateJournalistBlurb(input.dynastyId, game.id).catch(() => {});         // NEW (if significant)
return game;
```

---

### Pattern 3: AI Cache with localStorage Primary + aiCache DB Fallback

**What:** AI content is stored in localStorage for fast synchronous access. If localStorage is near capacity (>4MB used), overflow to the `aiCache` IndexedDB table.
**When to use:** All AI Intelligence features.
**Trade-offs:** localStorage has ~5MB limit. With many dynasties and many AI features, this could overflow. The `aiCache` table provides overflow capacity without changing the read interface.

**Example:**
```typescript
export function getCachedAI(feature: string, entityId: string): string | null {
  try {
    const raw = localStorage.getItem(`dynasty-os-ai-${feature}-${entityId}`);
    if (raw) return raw;
  } catch {
    // localStorage may be full — check DB cache (async caller handles this)
  }
  return null;
}
```

---

### Pattern 4: Sport Guard in Navigation + Services

**What:** CFB-only features (NIL, recruiting) and Madden-only features (Trade Value) check `activeDynasty.sport` before showing nav links and before calling services.
**When to use:** Any feature that only makes sense for one sport.
**Trade-offs:** Sport checking happens in two places (nav display + service guard). This is redundant but correct — the service guard is the true safety net.

**Example:**
```typescript
// Nav guard (DashboardPage.tsx sidebar)
{activeDynasty.sport === 'cfb' && (
  <NavLink label="NIL Ledger" onClick={() => nav.navigate('nil-ledger')} />
)}

// Service guard (nil-service.ts)
export async function getNILEntriesByDynasty(dynastyId: string): Promise<NILEntry[]> {
  // No sport check here — the service doesn't know about the active dynasty's sport.
  // The caller (store/page) must not invoke this for non-CFB dynasties.
  return db.nilEntries.where('dynastyId').equals(dynastyId).toArray();
}
```

---

## Data Flow

### New Feature Data Flow: AI Intelligence Features

```
User opens AI feature (e.g., DNA Report)
    ↓
Page component checks useAIIntelligenceStore.loading['dna-{dynastyId}']
    ↓
If no cache: Page calls ai-intelligence-service.generateDNAReport(dynastyId)
    ↓
Service builds context: reads seasons, recruitingClasses, playerSeasons via Dexie
    ↓
Service calls Claude API (fetch with anthropic-dangerous-direct-browser-access header)
    ↓
Service caches result to localStorage (and aiCache DB if overflow)
    ↓
Service returns typed result to store action
    ↓
Store sets loading: false, stores result in memory
    ↓
Page re-renders with content
```

### New Feature Data Flow: Auto-sync

```
User saves data (e.g., logs game)
    ↓
Dexie db.on('changes') fires
    ↓
auto-sync-service.handleDbChange(changes) called
    ↓
3-second debounce
    ↓
Check: auto-sync enabled? export path configured?
    ↓
exportDynasty(activeDynastyId) builds full JSON snapshot
    ↓
writeTextFile(exportPath, json) via @tauri-apps/plugin-fs
    ↓
(silent — no toast, no UI feedback unless error)
```

### New Feature Data Flow: Undo

```
User deletes game
    ↓
useGameStore.deleteGame(id) called
    ↓
Captures game object from current state
    ↓
Calls svcDelete(id) → game removed from DB
    ↓
useUndoStore.getState().setSnapshot({ type: 'game-delete', game })
    ↓
useToastStore.getState().addToast('Game deleted', 'success', { undoable: true })
    ↓
Toast renders with "Undo" button
    ↓
User clicks Undo
    ↓
useUndoStore.getState().undo() called
    ↓
db.games.add(game) restores record
    ↓
useGameStore.loadGames(game.seasonId) reloads state
    ↓
Toast dismissed
```

---

## Build Order (Dependency-Aware)

Features ordered by implementation priority given data dependencies.

### Wave 1: Infrastructure (no feature dependencies)
1. **DB v6 migration** — Add 5 new tables. Required by waves 2+. Single change in `packages/db`.
2. **New core-types** — Add 5 new type files. Required by all new services.
3. **ToastStore + ToastContainer** — App-wide feedback. Required by all subsequent stores.
4. **FilterStore** — Persistent filters. No dependencies. Can be wired to pages incrementally.
5. **Auto-suggest season year** — Trivial UI fix. No dependencies.

### Wave 2: QOL Wins (require infrastructure only)
6. **CSV export service** — Uses existing export pattern. Wire to existing pages.
7. **Inline player notes** — Notes field already in schema. UI-only.
8. **Recent opponents in Log Game** — Uses existing `getRecentGames`. UI-only.
9. **Season checklist** — localStorage-based. Dashboard widget.
10. **Season timeline scrubber** — Uses existing `seasons` array. Dashboard widget.
11. **UndoStore + undo in game/player stores** — Wire undo into existing stores after ToastStore is done.
12. **CommandPalette + command registry** — Wire navigation after all new pages are built.
13. **Auto-sync service** — Wire Dexie `on('changes')` hook after DB v6 is stable.

### Wave 3: Community Features (require DB v6 tables)
14. **Coaching staff** — New table, service, store, page.
15. **NIL ledger** — New table, service, store, page. CFB guard.
16. **Future schedule builder** — New table, service, store, page.
17. **Player continuity links** — New table, service, UI on PlayerProfilePage.
18. **Historical record book** — Aggregation from existing data. New service + page.
19. **Recruiting class comparison** — Extends RecruitingPage. No new tables.
20. **Trade value calculator** — Madden guard. In-memory. New page only.
21. **Playoff scenario simulator** — In-memory. New page or modal only.
22. **Rivalry dashboard expansion** — Extends existing `Rival` type + `RivalryTrackerPage`.

### Wave 4: AI Intelligence Layer (require community features + full data set)
23. **`aiCache` table + shared AI cache utilities** — Shared infrastructure for all AI features.
24. **`useAIIntelligenceStore`** — Shared loading/error state for all AI features.
25. **Hot Seat / Pressure Meter** — Haiku. Simplest AI feature. Good first AI integration.
26. **The Journalist** — Haiku. Fires on significant game events. Wire into `game-service`.
27. **Living Chronicle** — Sonnet. Fires on game log. Wire into `game-service`.
28. **Generational Player Arcs** — Sonnet. Fires on player departure.
29. **The Obituary Room** — Sonnet. Same trigger as Player Arcs (departure). `TrophyRoomPage` addition.
30. **Rival Prophecy** — Haiku. `RivalryTrackerPage` addition. Requires Wave 3 rivalry expansion.
31. **Opponent Intelligence Dossiers** — Sonnet. `ScoutingCardPage` addition.
32. **Momentum Heat Map** — SVG component. AI paragraph optional. `SeasonRecapPage` or Dashboard.
33. **What If Engine** — Sonnet. New `WhatIfPage`. Standalone, no dependencies beyond full data set.
34. **DNA Report** — Sonnet. New `DNAReportPage`. Requires full historical data (best built last).
35. **Broadcast Booth** — Web Speech API + Haiku. `SeasonRecapPage` addition.
36. **Cross-Dynasty Intelligence** — Sonnet. Multi-dynasty. `CrossDynastyPage`. Build last.

---

## Shared Package Changes Required

| Package | Change | Trigger |
|---------|--------|---------|
| `packages/core-types` | Add 5 new type files + export from index.ts | New DB entities |
| `packages/db` | Add v6 migration with 5 new tables; add new Table declarations to `DynastyDB` class | New features |
| `packages/db` | Import new types from core-types | DB table type safety |
| `packages/ui-components` | No required changes (components live in `apps/desktop/src/components`) | N/A |
| `packages/sport-configs` | Potentially add NIL/playoff config per sport | CFB/Madden feature gating |

**Rebuild required after package changes:** `pnpm -w build` to rebuild `core-types` and `db` packages before the app picks up new types. This is the standard Turborepo workflow already in use.

---

## Anti-Patterns

### Anti-Pattern 1: AI on the Critical Path

**What people do:** Await AI generation before resolving a data write, so the UI feels "complete."
**Why it's wrong:** Claude API calls take 1-5 seconds. Blocking the game log write for AI narrative makes the core loop feel slow. Users tolerate stale AI content but will not tolerate a laggy "Log Game" button.
**Do this instead:** Always fire AI generation as `.catch(() => {})` after the DB write returns. Show a loading spinner or "Generating..." badge in the AI content area. The data save confirms immediately; AI content appears asynchronously.

---

### Anti-Pattern 2: Toast Logic in Page Components

**What people do:** Add `useState` toasts inside individual pages — `const [showToast, setShowToast] = useState(false)`.
**Why it's wrong:** Scatters feedback logic. When a page navigates away before the toast dismisses, the component unmounts and the toast disappears instantly.
**Do this instead:** All toasts go through `useToastStore`. `ToastContainer` lives in `App.tsx` above the page routing and never unmounts.

---

### Anti-Pattern 3: localStorage for Large AI Content

**What people do:** Store full AI-generated content (DNA Report = 800+ words) in localStorage per dynasty per feature.
**Why it's wrong:** localStorage has ~5MB total. With 3 dynasties × 12 AI features × ~500 chars per result = ~18KB. This is fine at first but grows as dynasties mature. After 5 years of data, DNA Reports and Chronicles could each be 2KB+ and the limit becomes real.
**Do this instead:** Use localStorage for short AI results (Hot Seat explanation, Journalist blurbs). Use the `aiCache` Dexie table for long-form content (DNA Report, Living Chronicle, Player Arcs). Check and fall back automatically.

---

### Anti-Pattern 4: New DB Tables in the App Package

**What people do:** Add Dexie table declarations directly in `apps/desktop` rather than in the `packages/db` package.
**Why it's wrong:** Breaks the monorepo architecture — other packages (future mobile app, future CLI) won't see the new tables. The DB package is the canonical schema.
**Do this instead:** All new tables go in `packages/db/src/dynasty-db.ts` and `packages/db/src/schema.ts`. All new types go in `packages/core-types`. Rebuild both packages after changes.

---

### Anti-Pattern 5: Sport Check Inside Service Layer

**What people do:** Add `if (sport !== 'cfb') return` guards inside service functions like `nil-service.ts`.
**Why it's wrong:** Services are data layer — they shouldn't know about the active dynasty's sport. This creates hidden dependencies and makes services untestable in isolation.
**Do this instead:** Sport guards belong in navigation (hiding the nav link) and in the page component (not rendering if wrong sport). The service is always callable; the callers are responsible for only calling it appropriately.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Claude API (Anthropic) | Direct browser fetch with `anthropic-dangerous-direct-browser-access` header; API key from localStorage | Already established. All new AI features follow narrative-service.ts pattern |
| Web Speech API | `window.speechSynthesis` in renderer | Available in WKWebView (macOS) and Edge WebView2 (Windows). No Tauri plugin needed |
| Tauri plugin-fs | `writeTextFile` + `watch` already used | Auto-sync uses same writeTextFile. No new Tauri capabilities needed |
| Tauri plugin-dialog | `save` dialog already used for exports | CSV export uses same pattern |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `packages/core-types` to all other packages | TypeScript imports | All new entity types defined here first |
| `packages/db` to `apps/desktop/src/lib` | Import `{ db }` from `@dynasty-os/db` | Services import db; never import from app package back into packages |
| `useToastStore` to all Zustand stores | `useToastStore.getState().addToast()` calls at store action end | Cross-store call using `.getState()` — not a subscription |
| `ai-intelligence-service.ts` to game/player services | game-service imports ai-intelligence-service and calls fire-and-forget | One-directional; ai service never calls game-service |
| `auto-sync-service.ts` to `export-import.ts` | auto-sync calls `exportDynasty()` from export-import | Reuses existing serialization logic |
| `useUndoStore` to `useGameStore` / `usePlayerStore` | Game/player stores call `useUndoStore.getState().setSnapshot()` | Cross-store call, same `.getState()` pattern |

---

## Tauri WebView Constraints (Critical Reminders)

| Constraint | Impact on v2.0 Features | Mitigation |
|------------|------------------------|------------|
| Blob URLs blocked in WebView renderer | CSV export cannot use `URL.createObjectURL()` | Use Tauri `save` dialog + `writeTextFile` (same as JSON export) |
| No Node.js APIs in renderer | auto-sync-service cannot use `fs` module directly | Use `@tauri-apps/plugin-fs` `writeTextFile` |
| `window.speechSynthesis` availability | Broadcast Booth depends on this | Confirmed available in WebKit and Chromium. Add a feature-detect guard: `if (!window.speechSynthesis) { showUnsupportedMessage(); }` |
| `window.print()` for PDF export | Timeline PDF already uses this | No change needed for existing feature |
| localStorage ~5MB limit | AI content cache overflow | Use aiCache Dexie table for long-form content |
| No filesystem access without Tauri plugin | auto-sync export path must use plugin-fs | Already using plugin-fs for madden watcher; same capability |

---

## Sources

- Direct codebase inspection: all source files in `apps/desktop/src/` and `packages/`
- Existing architecture patterns derived from Phase 1-9 implementations
- Tauri 2 documentation (WebView constraints, plugin-fs, plugin-shell)
- Web Speech API support: confirmed in WebKit (Safari/WKWebView) and Chromium (Edge WebView2) as of 2025
- Dexie v4 schema migration pattern: forward-only versioned migration

---
*Architecture research for: Dynasty OS v2.0 — 33-feature integration into existing Tauri 2 + React + Zustand + Dexie codebase*
*Researched: 2026-02-24*
