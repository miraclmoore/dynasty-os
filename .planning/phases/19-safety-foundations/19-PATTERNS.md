# Phase 19: Safety & Foundations — Pattern Map

**Mapped:** 2026-05-03
**Files analyzed:** 5 (1 new, 4 edited)
**Analogs found:** 5 / 5

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `apps/desktop/src/components/ErrorBoundary.tsx` | component | request-response (render error intercept) | `apps/desktop/src/pages/SeasonRecapPage.tsx` (error state block) + `apps/desktop/src/pages/DashboardPage.tsx` (empty-state layout) | role-match (no class component exists; error/empty state patterns are the closest visual analogs) |
| `apps/desktop/src/App.tsx` | component | request-response | `apps/desktop/src/App.tsx` (itself — edit only) | exact |
| `apps/desktop/src/store/undo-store.ts` | store | event-driven | `apps/desktop/src/store/undo-store.ts` (itself — edit only) | exact |
| `apps/desktop/src/lib/records-service.ts` | service | CRUD / batch | `apps/desktop/src/lib/records-service.ts` (itself — edit only, `getHeadToHeadRecords` as in-file bulk-Map analog) | exact |
| `apps/desktop/package.json` | config | — | `apps/desktop/package.json` (itself — edit only) | exact |

---

## Pattern Assignments

### `apps/desktop/src/components/ErrorBoundary.tsx` (NEW — component, render-error intercept)

**Note:** No existing class component exists in the codebase. This is the first `React.Component` subclass. The visual analog is the SeasonRecapPage error state block (lines 313–327) for color and button, and DashboardPage empty-state (lines 311–326) for centered layout inside `h-[calc(100vh-40px)]`.

**Imports pattern** — copy this exact shape (React import plus nothing else; zero external deps):
```tsx
// Source: apps/desktop/src/components/TickerBar.tsx lines 1-3 (standalone component shape)
import React from 'react';
// No store imports — ErrorBoundary has local state only (class component, no hooks)
```

**Outer container layout** — copy from DashboardPage.tsx line 155 (`h-[calc(100vh-40px)]` established pattern):
```tsx
// Source: apps/desktop/src/pages/DashboardPage.tsx line 155
<div className="flex h-[calc(100vh-40px)] bg-gray-900 text-white overflow-hidden">
// ErrorBoundary uses same height token + adds items-center justify-center:
// "flex h-[calc(100vh-40px)] items-center justify-center bg-gray-900"
```

**Error card surface** — copy from DynastyCard.tsx line 84 (`rounded-xl` card pattern), upgraded with red border:
```tsx
// Source: apps/desktop/src/components/DynastyCard.tsx line 84
// hover:border-white/15 rounded-xl p-5 cursor-pointer
// ErrorBoundary card: bg-gray-800 border border-red-900/50 rounded-xl p-8 max-w-md w-full mx-4 text-center
```

**Error container color + border** — copy from SeasonRecapPage.tsx lines 314–327 (only instance of red error card in the app):
```tsx
// Source: apps/desktop/src/pages/SeasonRecapPage.tsx lines 313–327
{error && !isGenerating && (
  <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 text-center">
    <p className="text-red-300 text-sm mb-3">
      Could not generate recap. Check your API key and try again.
    </p>
    <button
      onClick={handleGenerate}
      className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors"
    >
      Try Again
    </button>
  </div>
)}
// ErrorBoundary: adapts bg-red-900/50 border (muted, full-screen card), same bg-red-700 hover:bg-red-600 CTA
```

**Empty-state heading + body** — copy from DashboardPage.tsx lines 311–326 (centered icon + text + CTA pattern):
```tsx
// Source: apps/desktop/src/pages/DashboardPage.tsx lines 311–326
<div className="flex flex-col items-center justify-center py-16 text-center flex-1">
  <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
    <svg className="w-8 h-8 text-gray-600" ... />
  </div>
  <h2 className="text-gray-300 font-semibold text-lg mb-2">Start Your First Season</h2>
  <p className="text-gray-500 text-sm max-w-sm mb-6">...</p>
  <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors">
    Start {activeDynasty.currentYear} Season
  </button>
</div>
// ErrorBoundary: adapts icon → warning SVG text-red-400, h2 → text-white font-heading, button → bg-red-700
```

**Full class component skeleton** — no analog exists; use the spec-locked implementation from 19-UI-SPEC.md and 19-RESEARCH.md:
```tsx
// Source: 19-RESEARCH.md Pattern 1 + 19-UI-SPEC.md Visual Design section
import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<object>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<object>) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex h-[calc(100vh-40px)] items-center justify-center bg-gray-900"
        >
          <div className="bg-gray-800 border border-red-900/50 rounded-xl p-8 max-w-md w-full mx-4 text-center">
            {/* Warning icon — inline SVG, aria-hidden */}
            <svg
              className="w-12 h-12 text-red-400 mx-auto mb-4"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <h1 className="font-heading font-bold text-2xl text-white mb-2">
              Something went wrong.
            </h1>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              An unexpected error occurred and this part of the app could not load. Reload the app
              to recover — your dynasty data is safe.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-red-700 hover:bg-red-600 text-white text-sm font-bold rounded-lg transition-colors mb-4"
            >
              Reload App
            </button>
            <button
              className="text-xs text-gray-500 hover:text-gray-400 underline cursor-pointer transition-colors"
              aria-expanded={this.state.showDetails}
              onClick={() => this.setState((s) => ({ showDetails: !s.showDetails }))}
            >
              {this.state.showDetails ? 'Hide error details' : 'Show error details'}
            </button>
            {this.state.showDetails && (
              <pre className="mt-2 text-left bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-gray-400 font-mono overflow-auto max-h-32">
                {this.state.error?.message}
                {'\n'}
                {this.state.error?.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
```

---

### `apps/desktop/src/App.tsx` (EDIT — wrap PageContent with ErrorBoundary)

**Analog:** `apps/desktop/src/App.tsx` lines 129–155 (the render return block is the edit target)

**Current render** (lines 129–155):
```tsx
// Source: apps/desktop/src/App.tsx lines 129–155
return (
  <div className="pb-10">
    <input ... />
    {activeDynasty && <button ...>?</button>}
    <PageContent />                     {/* ← line 149: wrap this */}
    <CommandPalette ... />
    <TourOverlay ... />
    <TickerBar />
    <Toaster richColors position="bottom-right" />
  </div>
);
```

**Edit:** Add import at line 31 area and wrap line 149.

**Import to add** (after line 32, following established component import pattern):
```tsx
// Source: apps/desktop/src/App.tsx lines 1–32 (import block pattern)
import { ErrorBoundary } from './components/ErrorBoundary';
```

**Wrap target** (line 149 becomes):
```tsx
// Replace: <PageContent />
// With:
<ErrorBoundary>
  <PageContent />
</ErrorBoundary>
```

**What does NOT change:** `<CommandPalette>`, `<TourOverlay>`, `<TickerBar>`, `<Toaster>` all remain outside `<ErrorBoundary>`. Do not move them.

---

### `apps/desktop/src/store/undo-store.ts` (EDIT — TABLE_MAP + typed UndoableOperation)

**Analog:** `apps/desktop/src/store/undo-store.ts` lines 1–45 (the entire file is the edit target)

**Current imports** (lines 1–2):
```typescript
// Source: apps/desktop/src/store/undo-store.ts lines 1-2
import { create } from 'zustand';
import { db } from '@dynasty-os/db';
```

**Add to imports** (line 3, after existing imports):
```typescript
// Add: apps/desktop/src/store/undo-store.ts — new import
import type { Table } from 'dexie';
```

**Current UndoableOperation interface** (lines 4–12) — `table: string` is the problem:
```typescript
// Source: apps/desktop/src/store/undo-store.ts lines 4-12
export interface UndoableOperation {
  id: string;
  table: string;       // ← CHANGE TO: table: UndoableTableName
  operation: 'delete' | 'update';
  recordId: string;
  snapshot: Record<string, unknown>;
  description: string;
  performedAt: number;
}
```

**New type + TABLE_MAP** (insert before UndoableOperation or after imports):
```typescript
// Source: 19-RESEARCH.md Pattern 2 + codebase grep of all pushUndo callers
export type UndoableTableName =
  | 'games'
  | 'players'
  | 'coachingStaff'
  | 'futureGames'
  | 'nilEntries';

const TABLE_MAP: Record<UndoableTableName, Table<Record<string, unknown>, string>> = {
  games: db.games as unknown as Table<Record<string, unknown>, string>,
  players: db.players as unknown as Table<Record<string, unknown>, string>,
  coachingStaff: db.coachingStaff as unknown as Table<Record<string, unknown>, string>,
  futureGames: db.futureGames as unknown as Table<Record<string, unknown>, string>,
  nilEntries: db.nilEntries as unknown as Table<Record<string, unknown>, string>,
};
```

**Current undo() body with `db as any`** (lines 35–43 — the two problem lines are 37 and 40):
```typescript
// Source: apps/desktop/src/store/undo-store.ts lines 31-43
undo: async () => {
  const { history } = get();
  if (history.length === 0) return;
  const last = history[history.length - 1];
  if (last.operation === 'delete') {
    await (db as any)[last.table].add(last.snapshot);    // line 37 — REPLACE
  } else if (last.operation === 'update') {
    await (db as any)[last.table].put(last.snapshot);    // line 40 — REPLACE
  }
  set((state) => ({ history: state.history.slice(0, -1) }));
},
```

**Replacement undo() body**:
```typescript
// Replace lines 35-43 with:
undo: async () => {
  const { history } = get();
  if (history.length === 0) return;
  const last = history[history.length - 1];
  const table = TABLE_MAP[last.table as UndoableTableName];
  if (!table) return;
  if (last.operation === 'delete') {
    await table.add(last.snapshot);
  } else if (last.operation === 'update') {
    await table.put(last.snapshot);
  }
  set((state) => ({ history: state.history.slice(0, -1) }));
},
```

---

### `apps/desktop/src/lib/records-service.ts` (EDIT — bulk query refactor)

**Analog:** `apps/desktop/src/lib/records-service.ts` — `getHeadToHeadRecords()` function (lines 161–268) is the in-file bulk+Map pattern analog. It already collects all keys, then uses a `Map` for O(1) per-entry lookup.

**Bulk+Map pattern in existing file** (lines 166–168, 200–214 — the established approach):
```typescript
// Source: apps/desktop/src/lib/records-service.ts lines 166-168
const allSeasons: Season[] = await db.seasons.where('dynastyId').equals(dynastyId).toArray();
const seasonYearMap = new Map<string, number>();
for (const season of allSeasons) { seasonYearMap.set(season.id, season.year); }
// ... then later uses seasonYearMap.get(game.seasonId) — O(1) per entry, zero additional queries
```

**Current N+1 pattern in getSingleSeasonLeaders** (lines 54–70 — the target to replace):
```typescript
// Source: apps/desktop/src/lib/records-service.ts lines 54-70
for (const ps of playerSeasons) {
  const value = ps.stats[statKey];
  if (value === undefined || value === 0) continue;
  const player = await db.players.get(ps.playerId);  // line 59 — N+1 problem
  if (!player) continue;
  entries.push({
    playerId: ps.playerId,
    playerName: `${player.firstName} ${player.lastName}`,
    position: player.position,
    value,
    year: ps.year,
    seasonId: ps.seasonId,
  });
}
```

**Replacement for getSingleSeasonLeaders** (replaces lines 52–74):
```typescript
// Collect candidate playerIds (filter first to minimize bulkGet payload)
const candidatePlayerIds = [...new Set(
  playerSeasons
    .filter((ps) => {
      const value = ps.stats[statKey];
      return value !== undefined && value !== 0;
    })
    .map((ps) => ps.playerId)
)];

// Single bulk query — Dexie returns (Player | undefined)[]
const playerResults = await db.players.bulkGet(candidatePlayerIds);

// Build Map for O(1) lookup
const playerMap = new Map<string, Player>();
for (const player of playerResults) {
  if (player) playerMap.set(player.id, player);
}

// Build entries using Map — zero additional DB calls
const entries: LeaderboardEntry[] = [];
for (const ps of playerSeasons) {
  const value = ps.stats[statKey];
  if (value === undefined || value === 0) continue;
  const player = playerMap.get(ps.playerId);
  if (!player) continue;
  entries.push({
    playerId: ps.playerId,
    playerName: `${player.firstName} ${player.lastName}`,
    position: player.position,
    value,
    year: ps.year,
    seasonId: ps.seasonId,
  });
}
```

**Current N+1 pattern in getCareerLeaders** (lines 141–149 — the target to replace):
```typescript
// Source: apps/desktop/src/lib/records-service.ts lines 141-149
// (inside the for (const [playerId, seasons] of byPlayer) loop)
const player = await db.players.get(playerId);  // line 141 — N+1 problem
if (!player) continue;
entries.push({
  playerId,
  playerName: `${player.firstName} ${player.lastName}`,
  position: player.position,
  value: careerValue,
});
```

**Replacement for getCareerLeaders** — add before the `for (const [playerId, seasons] of byPlayer)` loop (after line 100), and change the inner body:
```typescript
// Collect all playerIds from the grouped Map (after the byPlayer grouping, before the loop)
const allPlayerIds = Array.from(byPlayer.keys());
const playerResults = await db.players.bulkGet(allPlayerIds);
const playerMap = new Map<string, Player>();
for (const player of playerResults) {
  if (player) playerMap.set(player.id, player);
}

// In the loop body — replace await db.players.get(playerId) with:
const player = playerMap.get(playerId);   // O(1), no DB call
if (!player) continue;
```

**Required import addition** — `Player` type must be imported if not already (check line 2 of file):
```typescript
// Source: apps/desktop/src/lib/records-service.ts line 2
import type { Season } from '@dynasty-os/core-types';
// Add Player to the import:
import type { Player, Season } from '@dynasty-os/core-types';
```

---

### `apps/desktop/package.json` (EDIT — remove zundo)

**No pattern extraction needed.** This is a single-line deletion + lockfile update via CLI.

**Current state** (line 30 of package.json):
```json
"zundo": "2.3.0",
```

**Command (not a code pattern — for planner reference):**
```bash
pnpm --filter @dynasty-os/desktop remove zundo
```

**Verification:**
```bash
grep zundo apps/desktop/package.json   # must return empty
```

---

## Shared Patterns

### Dexie `db` import
**Source:** `apps/desktop/src/store/undo-store.ts` line 2 and `apps/desktop/src/lib/records-service.ts` line 1
**Apply to:** All edits touching db queries
```typescript
import { db } from '@dynasty-os/db';
```

### `@dynasty-os/core-types` import
**Source:** `apps/desktop/src/lib/records-service.ts` line 2
**Apply to:** `records-service.ts` edit (add `Player` to the existing import)
```typescript
import type { Player, Season } from '@dynasty-os/core-types';
```

### Bulk + Map pattern (existing in-file analog)
**Source:** `apps/desktop/src/lib/records-service.ts` lines 166–168 (`getHeadToHeadRecords`)
**Apply to:** Both `getSingleSeasonLeaders` and `getCareerLeaders` refactors
```typescript
// Fetch all → Map for O(1) lookup — zero per-item DB calls
const allItems = await db.someTable.bulkGet(ids);
const itemMap = new Map<string, SomeType>();
for (const item of allItems) {
  if (item) itemMap.set(item.id, item);
}
```

### Card surface (bg-gray-800 rounded-xl)
**Source:** `apps/desktop/src/components/DynastyCard.tsx` line 84
**Apply to:** ErrorBoundary error card outer div
```tsx
// established: rounded-xl p-5 bg-gray-800 (DynastyCard pattern)
// ErrorBoundary uses: bg-gray-800 border border-red-900/50 rounded-xl p-8
```

### Full-page layout height token
**Source:** `apps/desktop/src/pages/DashboardPage.tsx` line 155
**Apply to:** ErrorBoundary outer container
```tsx
className="flex h-[calc(100vh-40px)] bg-gray-900 text-white overflow-hidden"
// ErrorBoundary: "flex h-[calc(100vh-40px)] items-center justify-center bg-gray-900"
```

### Red CTA button
**Source:** `apps/desktop/src/pages/SeasonRecapPage.tsx` line 323
**Apply to:** ErrorBoundary "Reload App" button
```tsx
className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors"
```

---

## No Analog Found

All files have analogs or are self-edits. The only novel pattern is the React class component itself — no class component exists anywhere in the codebase. The implementation is fully spec-locked in `19-UI-SPEC.md` and `19-RESEARCH.md`, so no codebase analog is required.

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `apps/desktop/src/components/ErrorBoundary.tsx` (class component shape only) | component | render-error intercept | No React class component exists in this codebase; visual patterns sourced from SeasonRecapPage + DashboardPage error/empty states |

---

## Metadata

**Analog search scope:** `apps/desktop/src/` (all .tsx, .ts), `packages/db/src/`
**Files scanned:** App.tsx, undo-store.ts, records-service.ts, dynasty-db.ts, SeasonRecapPage.tsx, DashboardPage.tsx, DynastyCard.tsx, TickerBar.tsx, package.json
**Pattern extraction date:** 2026-05-03
