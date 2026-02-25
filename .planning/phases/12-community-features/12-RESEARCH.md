# Phase 12: Community Features - Research

**Researched:** 2026-02-24
**Domain:** Feature expansion on existing Tauri 2 + React + Dexie v6 + Zustand stack
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| COMM-01 | User can track coaching staff lifecycle — hire, fire, promote roles with tenure dates and scheme notes | `coachingStaff` table (v6 schema) + `CoachingStaff` type already scaffolded in Phase 10; needs service + store + page |
| COMM-02 | User can link a CFB player record to their NFL/Madden career counterpart across dynasty types | `playerLinks` table (v6 schema) + `PlayerLink` type already scaffolded; needs service + UI on PlayerProfilePage (CFB guard) |
| COMM-03 | User can simulate a playoff bracket for the current season with customizable seedings | Pure in-memory bracket logic; no new DB table needed; CFB-gated; new page |
| COMM-04 | CFB users can log NIL deals per player (amount, brand, duration) and view total spend by class and position | `nilEntries` table (v6 schema) + `NilEntry` type scaffolded; needs service + store + page (CFB guard) |
| COMM-05 | User can build a multi-year future schedule and view projected bowl eligibility | `futureGames` table (v6 schema) + `FutureGame` type scaffolded; needs service + store + page |
| COMM-06 | Madden users can calculate trade value for any player based on position, rating, age, and contract | Pure calculation function; reads from `players` table (existing); `Player.birthYear` field already added; Madden-gated; new page |
| COMM-07 | CFB users can compare recruiting class grades side-by-side across seasons or rival programs | Pure query over existing `recruitingClasses` table; no new table; CFB-gated; new page or panel |
| COMM-08 | User can enable automatic background export of dynasty data to JSON/CSV on every save | Background Tauri fs write triggered after dynasty mutations; settings in localStorage; builds on existing export-import.ts + csv-export.ts |
| COMM-09 | User can view a Historical Season Record Book showing all seasons, records, stats, and awards in one scrollable view | Query `seasons` + `games` + `playerSeasons` (all existing); no new table; new page |
| COMM-10 | User can view an expanded Rivalry Dashboard with series momentum, key moments log, and all-time context per rival | Extends existing RivalryTrackerPage + rivalry-service; no new table needed; derives momentum from existing `games` data |
</phase_requirements>

---

## Summary

Phase 12 is almost entirely a feature build on an already-complete foundation. Every database table this phase needs (`coachingStaff`, `nilEntries`, `futureGames`, `playerLinks`) was created in Phase 10, and every TypeScript type is exported from `@dynasty-os/core-types`. No new npm packages are required for 9 of 10 requirements. The only optional addition is `recharts` — the STATE.md decision deferred it "unless 3+ chart uses confirmed" and Phase 12 provides exactly those cases (NIL spend breakdown, recruiting comparison, rivalry momentum).

The phase decomposes naturally into three work streams: (1) **new CRUD pages** for the 4 pre-scaffolded entities (coaching staff, NIL ledger, future schedule, player links), (2) **pure-computation pages** that read existing data with no new writes (playoff simulator, trade calculator, class grade comparison, record book), and (3) **expansions to existing pages** (rivalry dashboard enhancements, auto-export background task). Each stream maps cleanly to 1-2 plans.

All patterns are established: service/store separation, sport-gated CFB-only guards, toast notifications via `useToastStore`, undo via `useUndoStore`, navigation via `useNavigationStore` + `Page` union, Tauri file export via `save()` + `writeTextFile()`, and CSV export via the `exportTableToCsv()` utility. The planner should follow every existing pattern exactly — Phase 12 is more "build more features like the existing ones" than any architectural introduction.

**Primary recommendation:** Build each COMM requirement as a standalone service + store + page following the exact same layered pattern as COMM-01 (coaching staff) through COMM-10 (rivalry expansion), grouping into plans by domain affinity. Add `recharts@^3` for charts after confirming 3+ uses. No new Dexie schema version is needed.

---

## Standard Stack

### Core (already installed — no changes needed for most features)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Dexie | ^4 (v6 schema) | IndexedDB ORM — all persistent storage | All 4 Phase 12 tables already created in v6 schema |
| Zustand | ^5.0.3 | Zustand store per feature | Store-per-domain pattern established across 15 stores |
| React | ^18.3.1 | Component UI | Project standard |
| Tailwind CSS | ^3.4.17 | Utility-first styling | Project standard — all dark-mode gray-900/800 palette |
| sonner | 2.0.7 | Toast notifications | useToastStore wrapper already in place |
| papaparse | 5.5.3 | CSV export | exportTableToCsv() utility already in place |
| @tauri-apps/plugin-dialog | ^2.6.0 | OS save dialog | Required for all file exports |
| @tauri-apps/plugin-fs | ^2.4.5 | writeTextFile | Required for all file writes |

### Optional Addition: Recharts (decide at plan time)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| recharts | ^3.7.0 | Declarative React charting | If 3+ chart uses confirmed: NIL spend pie/bar, recruiting comparison bar chart, rivalry momentum line chart are exactly 3 confirmed uses |

**Decision gate:** NIL Ledger (COMM-04) wants spend-by-position/class breakdown, Recruiting Comparison (COMM-07) benefits from side-by-side bars, Rivalry Dashboard (COMM-10) needs a momentum trend line. That is 3 confirmed chart uses. STATE.md decision: "add recharts@^3.7.0 only if 3+ chart uses confirmed." Phase 12 clears that bar.

**If recharts is added:**
- The existing `prestige-service.ts` pure SVG chart (PrestigeTrackerPage) does NOT need to be rewritten — keep SVG for that specific sparkline
- Recharts is used only for new Phase 12 charts

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| recharts | Pure SVG (like PrestigeTrackerPage) | SVG is viable for sparklines/simple charts but recharts is much faster to build responsive bar/line charts correctly; at 3+ charts the investment justifies the dependency |
| recharts | chart.js + react-chartjs-2 | More boilerplate; recharts is more idiomatic for React; no advantage |
| recharts | Victory | Less popular, smaller ecosystem |

**Installation (only if recharts is added):**
```bash
pnpm --filter @dynasty-os/desktop add recharts@^3.7.0
```

No other new packages needed.

---

## Architecture Patterns

### Recommended Project Structure for Phase 12

New files follow the existing src/ layout exactly:

```
apps/desktop/src/
├── lib/
│   ├── coaching-staff-service.ts   # COMM-01: CRUD for CoachingStaff
│   ├── nil-service.ts              # COMM-04: CRUD for NilEntry
│   ├── future-schedule-service.ts  # COMM-05: CRUD for FutureGame
│   ├── player-link-service.ts      # COMM-02: CRUD for PlayerLink
│   ├── trade-calculator.ts         # COMM-06: pure trade value function (no DB)
│   ├── playoff-bracket.ts          # COMM-03: pure bracket simulation (no DB)
│   └── auto-export-service.ts      # COMM-08: background dynasty export
├── store/
│   ├── coaching-staff-store.ts     # COMM-01: Zustand store
│   ├── nil-store.ts                # COMM-04: Zustand store
│   ├── future-schedule-store.ts    # COMM-05: Zustand store
│   └── player-link-store.ts        # COMM-02: Zustand store
└── pages/
    ├── CoachingStaffPage.tsx        # COMM-01: hire/fire/promote UI
    ├── NilLedgerPage.tsx            # COMM-04: NIL deal log (CFB guard)
    ├── FutureSchedulePage.tsx       # COMM-05: multi-year schedule builder
    ├── PlayerLinkPage.tsx           # COMM-02: CFB→NFL link UI (CFB guard, or modal)
    ├── PlayoffSimulatorPage.tsx     # COMM-03: bracket UI (CFB guard)
    ├── TradeCalculatorPage.tsx      # COMM-06: trade value UI (Madden guard)
    ├── RecruitingComparisonPage.tsx # COMM-07: side-by-side class grades (CFB guard)
    └── RecordBookPage.tsx           # COMM-09: full history scrollable view
    # RivalryTrackerPage.tsx updated in-place for COMM-10 enhancements
```

### Pattern 1: Service Layer (established, replicate exactly)

**What:** All Dexie queries live in `lib/*-service.ts`. Stores call service functions. Components call store actions. No direct `db.*` calls in components or stores (except CoachingResumePage exception which uses direct db queries for page-specific aggregations — acceptable for record book too).

**When to use:** Every new CRUD entity (coaching staff, NIL, future games, player links).

**Example (coaching-staff-service.ts pattern):**
```typescript
// Follows rivalry-service.ts + game-service.ts pattern exactly
import { db } from '@dynasty-os/db';
import type { CoachingStaff, CoachingRole } from '@dynasty-os/core-types';
import { generateId } from './uuid';

export async function createCoach(
  input: Omit<CoachingStaff, 'id' | 'createdAt' | 'updatedAt'>
): Promise<CoachingStaff> {
  const now = Date.now();
  const coach: CoachingStaff = { ...input, id: generateId(), createdAt: now, updatedAt: now };
  await db.coachingStaff.add(coach);
  return coach;
}

export async function getCoachingStaffByDynasty(dynastyId: string): Promise<CoachingStaff[]> {
  return db.coachingStaff.where('dynastyId').equals(dynastyId).toArray();
}

export async function fireCoach(id: string, fireYear: number): Promise<void> {
  await db.coachingStaff.update(id, { fireYear, updatedAt: Date.now() });
}

export async function updateCoach(
  id: string,
  updates: Partial<Pick<CoachingStaff, 'role' | 'schemeNotes' | 'hireYear'>>
): Promise<void> {
  await db.coachingStaff.update(id, { ...updates, updatedAt: Date.now() });
}

export async function deleteCoach(id: string): Promise<void> {
  await db.coachingStaff.delete(id);
}
```

### Pattern 2: Zustand Store (established, replicate exactly)

**What:** Store holds array state, loading flag, and exposes load/add/edit/remove actions. Uses `useToastStore` for success/error feedback. Uses `useUndoStore` for destructive ops.

**Example (coaching-staff-store.ts):**
```typescript
import { create } from 'zustand';
import { createCoach, getCoachingStaffByDynasty, fireCoach, deleteCoach } from '../lib/coaching-staff-service';
import type { CoachingStaff } from '@dynasty-os/core-types';
import { useToastStore } from './toast-store';
import { useUndoStore } from './undo-store';
import { generateId } from '../lib/uuid';

interface CoachingStaffState { staff: CoachingStaff[]; loading: boolean; }
interface CoachingStaffActions {
  loadStaff: (dynastyId: string) => Promise<void>;
  addCoach: (input: Omit<CoachingStaff, 'id' | 'createdAt' | 'updatedAt'>, dynastyId: string) => Promise<void>;
  removeCoach: (id: string, dynastyId: string) => Promise<void>;
}
export const useCoachingStaffStore = create<CoachingStaffState & CoachingStaffActions>((set) => ({
  staff: [],
  loading: false,
  loadStaff: async (dynastyId) => {
    set({ loading: true });
    const staff = await getCoachingStaffByDynasty(dynastyId);
    set({ staff, loading: false });
  },
  addCoach: async (input, dynastyId) => {
    const coach = await createCoach(input);
    set((s) => ({ staff: [...s.staff, coach] }));
    useToastStore.getState().success('Coach added');
    // Re-load to stay in sync
    const staff = await getCoachingStaffByDynasty(dynastyId);
    set({ staff });
  },
  removeCoach: async (id, dynastyId) => {
    const snap = /* fetch snapshot for undo */ await import('@dynasty-os/db').then(m => m.db.coachingStaff.get(id));
    if (snap) {
      useUndoStore.getState().pushUndo({ id: generateId(), table: 'coachingStaff', operation: 'delete', recordId: id, snapshot: snap as unknown as Record<string,unknown>, description: `Removed coach`, performedAt: Date.now() });
    }
    await deleteCoach(id);
    set((s) => ({ staff: s.staff.filter(c => c.id !== id) }));
    useToastStore.getState().success('Coach removed');
    const staff = await getCoachingStaffByDynasty(dynastyId);
    set({ staff });
  },
}));
```

### Pattern 3: Sport Guard (established, use verbatim)

**What:** CFB-only pages check `activeDynasty.sport !== 'cfb'` at top of component and render nothing (or a placeholder). Madden-only pages check `activeDynasty.sport !== 'madden'`.

**CFB-only features:** COMM-02, COMM-03, COMM-04, COMM-05 (bowl eligibility projection), COMM-07
**Madden-only features:** COMM-06
**Sport-agnostic:** COMM-01, COMM-08, COMM-09, COMM-10

```typescript
// CFB guard at top of component
if (activeDynasty.sport !== 'cfb') return null;

// Madden guard
if (activeDynasty.sport !== 'madden') return null;
```

### Pattern 4: Navigation Registration

**What:** Every new page needs: (1) a new `Page` union member in `navigation-store.ts`, (2) a `goToX` action in the store, (3) a `case 'x'` in `App.tsx` PageContent switch, (4) entries in `CommandPalette.tsx` items array.

**New pages that need navigation registration:**
- `coaching-staff` — COMM-01, sport-agnostic
- `nil-ledger` — COMM-04, CFB guard in CommandPalette
- `future-schedule` — COMM-05
- `playoff-simulator` — COMM-03, CFB guard
- `trade-calculator` — COMM-06, Madden guard
- `recruiting-comparison` — COMM-07, CFB guard
- `record-book` — COMM-09
- (RivalryTrackerPage enhanced in-place, no new page entry needed for COMM-10)
- (PlayerLink UI likely embedded in PlayerProfilePage, not a standalone page — see COMM-02 note)

### Pattern 5: Background Export (COMM-08)

**What:** Auto-export fires as fire-and-forget after successful dynasty saves. Uses existing `exportDynasty()` from `export-import.ts` for JSON, and `exportTableToCsv()` for CSV. Settings persisted in `localStorage` (keyed to dynastyId).

**Critical constraint:** Auto-export CANNOT use `save()` dialog (requires user interaction). Instead: export to a user-configured directory stored in localStorage. On first enable, prompt user for directory via `save()` to capture the path, then write silently on future saves.

**Alternative simpler approach:** Store auto-export files in the Tauri app data directory using `@tauri-apps/api/path.appDataDir()` and always overwrite the same filename (e.g., `{dynastyName}-export.json`). This avoids the directory-picker-on-every-save problem and is the recommended approach.

```typescript
// auto-export-service.ts pattern
import { appDataDir } from '@tauri-apps/api/path';
import { writeTextFile, mkdir } from '@tauri-apps/plugin-fs';
import { exportDynasty } from './export-import';

export async function autoExportDynasty(dynastyId: string, dynastyName: string): Promise<void> {
  try {
    const appDir = await appDataDir();
    const exportDir = `${appDir}/exports`;
    await mkdir(exportDir, { recursive: true });
    const json = await exportDynasty(dynastyId);
    const safe = dynastyName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    await writeTextFile(`${exportDir}/${safe}-export.json`, json);
  } catch {
    // Fire-and-forget — never block save
  }
}
```

**Tauri fs capability note:** `mkdir` requires `fs:allow-mkdir` capability. Check `src-tauri/capabilities/default.json`. If not present, add it.

### Pattern 6: Pure Computation (trade calculator, playoff bracket)

**What:** Some COMM features are pure computation on in-memory data — no new DB tables, just functions that transform data to display. These live in `lib/*.ts` as pure functions.

**Trade Calculator (COMM-06):**
```typescript
// trade-calculator.ts — pure function, no Dexie
export interface TradeValueInput {
  position: string;
  overallRating: number;
  age: number;         // derived from Player.birthYear + current year
  contractYearsLeft: number;  // user input in UI
}

export interface TradeValueResult {
  baseValue: number;
  positionMultiplier: number;
  ageMultiplier: number;
  contractMultiplier: number;
  totalValue: number;
  grade: 'Elite' | 'High' | 'Average' | 'Low';
}

export function calculateTradeValue(input: TradeValueInput): TradeValueResult {
  // Position multipliers: QB > EDGE > CB/WR1 > OL > ...
  // Age curve: peak 24-27, declining after 30
  // Contract: more years left = more valuable
  // Returns 0-100 point scale
}
```

**Playoff Bracket (COMM-03):**
- 4, 8, or 12 team bracket options
- Teams seeded by user (dropdown reorder)
- Simulation: user picks winners per matchup (no AI randomization needed)
- Pure React state machine: `bracket: { round: number; matchups: Matchup[] }[]`
- No persistence (session-only UI state)

### Pattern 7: Historical Record Book (COMM-09)

**What:** Single-page read-heavy view over existing data. Pull all seasons, all games summary, and per-season stat leaders. Pattern: direct `db.*` queries on mount (like CoachingResumePage).

```typescript
// RecordBookPage pattern (no store needed — page-specific aggregation)
useEffect(() => {
  if (!activeDynasty) return;
  Promise.all([
    db.seasons.where('dynastyId').equals(activeDynasty.id).toArray(),
    db.games.where('dynastyId').equals(activeDynasty.id).toArray(),
    db.playerSeasons.where('dynastyId').equals(activeDynasty.id).toArray(),
    db.players.where('dynastyId').equals(activeDynasty.id).toArray(),
  ]).then(([seasons, games, playerSeasons, players]) => {
    // Aggregate: sort seasons asc, compute per-season stats, notable games
    setRecordBook(buildRecordBook(seasons, games, playerSeasons, players));
  });
}, [activeDynasty?.id]);
```

### Pattern 8: Rivalry Dashboard Expansion (COMM-10)

**What:** COMM-10 extends the existing `RivalryTrackerPage.tsx` in-place. Key moments log is stored as a new field on the `Rival` record OR as separate `localStorage` key (simpler, no schema migration). Series momentum = win percentage trend over last N games (pure computation from existing `getHeadToHeadRecords()` data).

**Recommendation:** Extend the `Rival` type with optional `keyMoments?: Array<{year: number; description: string}>` stored in localStorage keyed by rivalId (avoids DB schema migration and Dexie version bump). If key moments need to survive export/import, they can be in localStorage since they are metadata, not core data.

**Schema migration consideration:** If key moments go in DB, that requires `version(7).stores()`. The simpler approach is localStorage since the Rival record is already in the DB and we don't want to bump to v7 for a single optional array field.

### Anti-Patterns to Avoid

- **Direct db.* calls in React components:** Always go through service layer (exception: CoachingResumePage/RecordBookPage pattern for page-specific aggregations)
- **Zustand state for pure computation results:** Trade calculator and playoff bracket results are ephemeral UI state — `useState` in component, not Zustand store
- **Using blob URLs or anchor.click() for file downloads:** Tauri blocks these; always use `save()` dialog + `writeTextFile()`
- **Bumping Dexie schema version for optional metadata:** Use localStorage for non-critical optional data (key moments, user preferences) to avoid migration complexity
- **Sport-ungated CFB features in CommandPalette:** Filter CFB/Madden-only pages from CommandPalette items when `activeDynasty.sport` doesn't match (check existing CommandPalette.tsx pattern)

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV export with proper quoting | Custom CSV serialization | `papaparse.unparse()` via `exportTableToCsv()` (already in lib/) | Edge cases: commas in values, quotes, newlines |
| Toast notifications | Custom toast component | `useToastStore.success/error()` (already wired) | Already globally mounted with sonner |
| Undo for destructive actions | Custom snapshot system | `useUndoStore.pushUndo()` (already wired) | DB-level undo consistent across all stores |
| File download to disk | anchor.click() blob | `save()` + `writeTextFile()` | Blob URLs blocked in Tauri WKWebView/WebView2 |
| Dynasty JSON export | Custom serializer | `exportDynasty()` from export-import.ts | Already handles all tables + ID remapping |
| UUID generation | `crypto.randomUUID()` inline | `generateId()` from lib/uuid.ts | Project pattern — consistent across all services |
| Chart rendering (if using recharts) | Custom SVG (except sparklines) | recharts `<BarChart>`, `<LineChart>`, `<PieChart>` | Responsive, accessible, handles edge cases |

**Key insight:** Phase 12 is infrastructure-complete. Every utility needed is already built. The "don't hand-roll" discipline here is about using what's there rather than re-implementing.

---

## Common Pitfalls

### Pitfall 1: Forgetting Navigation Registration
**What goes wrong:** New page component exists but App.tsx switch case is missing → navigating to the page renders the Dashboard instead.
**Why it happens:** There are 4 separate registration points: `Page` union type, store action, `App.tsx` case, `CommandPalette.tsx` items.
**How to avoid:** Every plan that adds a new page MUST update all 4 locations atomically.
**Warning signs:** Page navigates to Dashboard; TypeScript error on `Page` union.

### Pitfall 2: Dexie Version Bump When Not Needed
**What goes wrong:** Adding a new optional field to an existing type triggers a schema migration, causing `VersionError` for existing users.
**Why it happens:** Dexie only needs `version(N).stores()` when indexed fields change. Plain object property additions do NOT require a version bump.
**How to avoid:** Only bump to `version(7)` if adding a new table or a new Dexie index on an existing table. Adding `keyMoments?: string` to the Rival TypeScript type (but NOT to the schema string) does NOT require a version bump.
**Warning signs:** `VersionError` on app startup for existing data.

### Pitfall 3: Auto-Export Blocking UI
**What goes wrong:** Auto-export (COMM-08) triggers a Tauri `save()` dialog on every save → user is constantly interrupted.
**Why it happens:** `save()` is interactive — it shows an OS dialog. Background export must write to a pre-configured path.
**How to avoid:** Use `appDataDir()` + `writeTextFile()` pattern. Directory is determined once (on feature enable) and stored. Subsequent writes are silent. Wrap in try/catch and never await at call site.
**Warning signs:** OS file picker appearing unexpectedly during game logging.

### Pitfall 4: CFB Guard Missing on CFB-Only Pages
**What goes wrong:** Madden users see CFB-specific pages (NIL, playoff bracket, recruiting comparison) with empty or broken state.
**Why it happens:** Guard is forgotten or placed after data fetching, causing blank/erroring renders.
**How to avoid:** Check `if (activeDynasty.sport !== 'cfb') return null;` at the TOP of the component, before any hooks that depend on CFB data. Same for Madden guard on Trade Calculator.
**Warning signs:** Empty tables on Madden dynasty, TypeScript types compiling but runtime data undefined.

### Pitfall 5: PlayerLink UI Placement
**What goes wrong:** Building a standalone PlayerLinkPage forces users to navigate away from the player they're linking.
**Why it happens:** Temptation to make every feature a separate page.
**How to avoid:** Player links (COMM-02) work best as a section within `PlayerProfilePage.tsx` (CFB-guarded section at bottom). No separate page needed. This matches how player notes were implemented in Phase 11 (section in EditPlayerModal).

### Pitfall 6: Recharts Bundle Size
**What goes wrong:** recharts adds ~300KB to the bundle unnecessarily if only used for 1-2 charts.
**Why it happens:** Installed "just in case" before confirming usage count.
**How to avoid:** Per STATE.md decision, confirm 3+ uses before adding. Phase 12 has exactly 3 confirmed uses (NIL breakdown, recruiting comparison, rivalry momentum). Install once for all three.

### Pitfall 7: Trade Calculator Requiring Non-Existent Data
**What goes wrong:** Trade calculator (COMM-06) needs `overallRating` and `contractYearsLeft` but those aren't stored per-player; `birthYear` is optional.
**Why it happens:** Madden player data is synced from the Madden save file, which may not expose contracts.
**How to avoid:** The trade value calculator UI MUST accept all inputs manually (position, overall rating, age, contract years left are all form fields). `birthYear` can pre-fill the age field if present, but the user can override. This is a calculator UI — inputs are always editable. Do NOT require `birthYear` or `overallRating` to be present in DB.

### Pitfall 8: Recruiting Comparison Cross-Dynasty
**What goes wrong:** COMM-07 says "across seasons or rival programs" — "rival programs" implies comparing against data from other users' dynasties, which is impossible (local-first, no cloud).
**Why it happens:** Requirement wording is ambiguous.
**How to avoid:** "Rival programs" means comparing multiple seasons of your own dynasty side-by-side (e.g., your 2024 class vs your 2025 class vs your 2026 class), not cross-user comparison. The UI should be a multi-season selector for your own `recruitingClasses` data. This is clearly within scope and technically feasible with existing data.

---

## Code Examples

### Service: Creating a NIL Entry

```typescript
// nil-service.ts
import { db } from '@dynasty-os/db';
import type { NilEntry } from '@dynasty-os/core-types';
import { generateId } from './uuid';

export async function createNilEntry(
  input: Omit<NilEntry, 'id' | 'createdAt' | 'updatedAt'>
): Promise<NilEntry> {
  const now = Date.now();
  const entry: NilEntry = { ...input, id: generateId(), createdAt: now, updatedAt: now };
  await db.nilEntries.add(entry);
  return entry;
}

export async function getNilEntriesByDynasty(dynastyId: string): Promise<NilEntry[]> {
  return db.nilEntries.where('dynastyId').equals(dynastyId).toArray();
}

export async function getNilEntriesByPlayer(dynastyId: string, playerId: string): Promise<NilEntry[]> {
  // Use compound index [dynastyId+playerId] from SCHEMA_V6
  return db.nilEntries.where('[dynastyId+playerId]').equals([dynastyId, playerId]).toArray();
}

// Aggregation: total spend by position
export function computeNilSpendByPosition(entries: NilEntry[], players: Map<string, { position: string }>): Record<string, number> {
  const byPosition: Record<string, number> = {};
  for (const e of entries) {
    const pos = players.get(e.playerId)?.position ?? 'Unknown';
    byPosition[pos] = (byPosition[pos] ?? 0) + e.amount;
  }
  return byPosition;
}
```

### Service: Future Schedule Bowl Eligibility Projection

```typescript
// future-schedule-service.ts
import { db } from '@dynasty-os/db';
import type { FutureGame } from '@dynasty-os/core-types';

// CFB bowl eligibility: 6+ wins in regular season
export function projectBowlEligibility(
  futureGames: FutureGame[],
  currentWins: number,
  currentLosses: number
): { eligible: boolean; winsNeeded: number; yearsUntilEligible: number[] } {
  const regularGames = futureGames.filter(g => g.gameType !== 'bowl' && g.gameType !== 'playoff');
  const winsNeeded = Math.max(0, 6 - currentWins);
  return {
    eligible: currentWins >= 6,
    winsNeeded,
    yearsUntilEligible: [], // computed from future years with enough scheduled games
  };
}
```

### Pure Function: Trade Value Calculator

```typescript
// trade-calculator.ts
const POSITION_BASE: Record<string, number> = {
  QB: 100, EDGE: 85, LT: 80, CB: 78, WR: 75, S: 72, DT: 70,
  RB: 65, TE: 65, OL: 60, LB: 60, K: 20, P: 20,
};

export function calculateTradeValue(input: {
  position: string;
  overallRating: number;
  age: number;
  contractYearsLeft: number;
}): { totalValue: number; breakdown: Record<string, number> } {
  const basePos = POSITION_BASE[input.position.toUpperCase()] ?? 60;
  const ratingFactor = (input.overallRating - 50) / 50; // 0-1 scale above 50
  const agePenalty = input.age > 30 ? (input.age - 30) * 0.08 : 0;
  const contractBonus = Math.min(0.2, (input.contractYearsLeft - 1) * 0.05);
  const base = basePos * (1 + ratingFactor);
  const total = Math.round(base * (1 - agePenalty) * (1 + contractBonus));
  return {
    totalValue: Math.max(0, Math.min(150, total)),
    breakdown: { basePosition: basePos, ratingAdjustment: ratingFactor * basePos, agePenalty: -agePenalty * base, contractBonus: contractBonus * base },
  };
}
```

### Rivalry Momentum Calculation (COMM-10)

```typescript
// In rivalry-service.ts — add to existing file
export function calculateSeriesMomentum(games: HeadToHeadRecord['games']): number {
  // Momentum = weighted win rate of last 5 games (recent games weight more)
  // Returns -1 (full disadvantage) to +1 (full advantage)
  const recent = games.slice(0, 5);
  if (recent.length === 0) return 0;
  let weighted = 0;
  let totalWeight = 0;
  recent.forEach((g, i) => {
    const weight = 5 - i; // most recent = weight 5, oldest = weight 1
    weighted += (g.result === 'W' ? 1 : g.result === 'L' ? -1 : 0) * weight;
    totalWeight += weight;
  });
  return totalWeight > 0 ? weighted / totalWeight : 0;
}
```

### Auto-Export Pattern (COMM-08)

```typescript
// auto-export-service.ts
import { appDataDir } from '@tauri-apps/api/path';
import { writeTextFile, mkdir } from '@tauri-apps/plugin-fs';
import { exportDynasty } from './export-import';

const AUTO_EXPORT_KEY = (dynastyId: string) => `dynasty-os-autoexport-${dynastyId}`;

export function isAutoExportEnabled(dynastyId: string): boolean {
  return localStorage.getItem(AUTO_EXPORT_KEY(dynastyId)) === 'true';
}

export function setAutoExportEnabled(dynastyId: string, enabled: boolean): void {
  if (enabled) {
    localStorage.setItem(AUTO_EXPORT_KEY(dynastyId), 'true');
  } else {
    localStorage.removeItem(AUTO_EXPORT_KEY(dynastyId));
  }
}

export async function autoExportIfEnabled(dynastyId: string, dynastyName: string): Promise<void> {
  if (!isAutoExportEnabled(dynastyId)) return;
  // Fire-and-forget — NEVER await this at call site
  (async () => {
    try {
      const appDir = await appDataDir();
      const exportDir = `${appDir}/exports`;
      await mkdir(exportDir, { recursive: true });
      const json = await exportDynasty(dynastyId);
      const safeName = dynastyName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      await writeTextFile(`${exportDir}/${safeName}-latest.json`, json);
    } catch {
      // Never block UI
    }
  })();
}
```

**Call site in dynasty-store or game-store:**
```typescript
// After successful save:
import { autoExportIfEnabled } from '../lib/auto-export-service';
// ...
autoExportIfEnabled(dynastyId, dynastyName); // no await
```

### Tauri Capability Check for mkdir

Check `src-tauri/capabilities/default.json` for `fs:allow-mkdir`. If missing:
```json
// src-tauri/capabilities/default.json — add to permissions array:
"fs:allow-mkdir"
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| localStorage for all AI content | aiCache Dexie table | Phase 10 | COMM-08 auto-export should export aiCache entries too if including full fidelity |
| No undo support | useUndoStore with DB-level descriptors | Phase 10 | All COMM CRUD pages should push undo for delete/edit operations |
| No toast feedback | useToastStore wrapping sonner | Phase 10 | All COMM mutations should call success/error toasts |
| CSV export via blob URL | exportTableToCsv() via Tauri dialog | Phase 11 | All tabular data in COMM features can offer CSV export using this utility |

**Confirmed available in DB (from SCHEMA_V6):**
- `coachingStaff` — indexed on `dynastyId`, `role`, `hireYear`, `[dynastyId+role]`
- `nilEntries` — indexed on `dynastyId`, `playerId`, `year`, `[dynastyId+playerId]`
- `futureGames` — indexed on `dynastyId`, `year`, `[dynastyId+year]`
- `playerLinks` — indexed on `dynastyId`, `playerId`, `[dynastyId+playerId]`

**DB version is v6 — no new tables needed for Phase 12.** All types in `@dynasty-os/core-types` are already exported.

---

## Open Questions

1. **Recharts: confirm install in which plan?**
   - What we know: 3 confirmed chart uses (NIL, recruiting comparison, rivalry momentum)
   - What's unclear: Whether all 3 chart-using features land in same plan or different plans
   - Recommendation: Install recharts in the first plan that needs a chart (likely NIL Ledger or Recruiting Comparison); subsequent plans can import it without re-installing

2. **Auto-export: include aiCache entries or just core data?**
   - What we know: `exportDynasty()` currently exports `dynasties, seasons, games, players, playerSeasons` — not the 4 new Phase 12 tables
   - What's unclear: Should COMM-08 update `exportDynasty()` to include `coachingStaff`, `nilEntries`, etc.?
   - Recommendation: Update `DynastyExport` version to 2 and include the 4 new entity types in the export. aiCache entries are regeneratable — exclude them to keep export lean.

3. **Playoff bracket persistence: session-only or saved to DB?**
   - What we know: Requirement says "simulate" — no mention of saving results
   - What's unclear: Do users want to replay a saved bracket state across sessions?
   - Recommendation: Session-only (useState). If demand exists, it can be added in a later phase. Keeps COMM-03 simple.

4. **Key moments log for COMM-10: localStorage or DB?**
   - What we know: localStorage avoids Dexie v7 bump; DB is more robust for export/import
   - What's unclear: Are key moments important enough to survive dynasty export/import?
   - Recommendation: localStorage keyed by `dynasty-os-moments-{rivalId}`. If export value is needed, update `exportDynasty()` v2 to include them.

5. **Tauri `fs:allow-mkdir` capability: already present?**
   - What we know: Current capabilities include `fs:allow-write-text-file`
   - What's unclear: Whether mkdir is also granted
   - Recommendation: Check `src-tauri/capabilities/default.json` in the auto-export plan; add `fs:allow-mkdir` if missing

---

## Sources

### Primary (HIGH confidence)
- Codebase direct inspection — all types, services, stores, schema verified by reading actual files
- `packages/db/src/schema.ts` — SCHEMA_V6 verified: all 4 Phase 12 tables present with correct indexes
- `packages/core-types/src/` — All 4 Phase 12 entity types verified: CoachingStaff, NilEntry, FutureGame, PlayerLink
- `packages/db/src/dynasty-db.ts` — DB version confirmed at v6, all tables wired as Dexie Table<T, string>
- `apps/desktop/package.json` — Exact package versions confirmed; recharts NOT currently installed
- `apps/desktop/src/lib/export-import.ts` — exportDynasty() pattern verified
- `apps/desktop/src/lib/csv-export.ts` — exportTableToCsv() pattern verified
- `apps/desktop/src/store/toast-store.ts` — useToastStore API verified
- `apps/desktop/src/store/undo-store.ts` — useUndoStore API verified
- `apps/desktop/src/store/navigation-store.ts` — Page union and all 18 navigation actions verified
- `apps/desktop/src/App.tsx` — PageContent switch pattern verified; 18 current cases
- `apps/desktop/src/lib/rivalry-service.ts` — HeadToHeadRecord type verified; calculateRivalryIntensity verified
- `.planning/STATE.md` — All architectural decisions relevant to Phase 12 reviewed (recharts deferral, sport-gated pattern, Tauri export constraint, service/store pattern)

### Secondary (MEDIUM confidence)
- Tauri v2 `@tauri-apps/api/path` `appDataDir()` availability — confirmed in Tauri v2 API by STATE.md decision context and existing usage patterns in codebase
- recharts `^3.7.0` — referenced in STATE.md decision text "add recharts@^3.7.0 only if 3+ chart uses confirmed"; version not independently verified against npm

### Tertiary (LOW confidence)
- Tauri `fs:allow-mkdir` capability name — assumed standard Tauri fs permission; should verify against `src-tauri/capabilities/default.json` in plan execution

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified by direct package.json inspection; recharts is optional with a clear decision gate from STATE.md
- Architecture: HIGH — all patterns verified by reading existing service/store/page files; service layer, sport guards, navigation, toast/undo all confirmed
- DB schema: HIGH — SCHEMA_V6 and all 4 Phase 12 entity types verified by direct file reads; no new tables needed confirmed
- Common Pitfalls: HIGH — derived from observed project decisions in STATE.md and direct code analysis
- Auto-export pattern (COMM-08): MEDIUM — appDataDir() usage is inferred from Tauri v2 patterns, not confirmed by reading an existing example in this codebase; mkdir capability needs verification

**Research date:** 2026-02-24
**Valid until:** 2026-03-24 (stable Tauri 2 + Dexie 4 stack; 30 day window appropriate)
