# Phase 19: Safety & Foundations — Research

**Researched:** 2026-05-03
**Domain:** React error boundaries, TypeScript discriminated unions, Dexie typed access, Dexie N+1 query elimination
**Confidence:** HIGH — all four requirements map directly to verified codebase facts; no speculative architecture

---

## Summary

Phase 19 is a surgical four-item cleanup phase. Every requirement has a clear, bounded implementation target with no design ambiguity. The UI-SPEC for SAFE-01 is already approved and locked. SAFE-02 is a single-file type-safety refactor. SAFE-03 is a dependency removal with zero runtime impact (zundo is installed but never imported in source). SAFE-04 replaces `await db.players.get(playerId)` calls inside loops in `records-service.ts` with two bulk queries and an in-memory Map lookup.

The codebase uses React 18.3.1 with TypeScript strict mode (`strict: true` in tsconfig.base.json). Zustand 5.0.3 is the store layer. Dexie 6 is the database. No test infrastructure exists in the project — verification is manual (`tsc --noEmit` + `pnpm run build` are the automated gates).

**Primary recommendation:** Execute in strict file-scope order: SAFE-01 (new component) → SAFE-02 (undo-store.ts edit) → SAFE-03 (package.json edit + pnpm install) → SAFE-04 (records-service.ts edit). Each is independent; there are no shared code paths between them.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Error boundary (SAFE-01) | Frontend (React component layer) | — | React class component; wraps PageContent in App.tsx |
| Undo type safety (SAFE-02) | Frontend (Zustand store) | Database (Dexie access) | Store owns undo logic; type safety enforced at store layer |
| zundo removal (SAFE-03) | Build/dependency layer | — | package.json only; no runtime code references it |
| N+1 query fix (SAFE-04) | Service layer (lib/) | Database (Dexie) | records-service.ts is the sole query origin for leaderboards |

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SAFE-01 | App renders a styled error UI instead of a blank screen when a fatal render error occurs anywhere in the tree | React class component `ErrorBoundary` wraps `<PageContent>` in `App.tsx`; full design spec in `19-UI-SPEC.md` |
| SAFE-02 | UndoStore undo operations use a typed TABLE_MAP constant instead of `db as any` — invalid table names produce compile-time errors | `undo-store.ts` lines 37 and 40 contain `(db as any)[last.table]`; TABLE_MAP derived from DynastyDB property names |
| SAFE-03 | `zundo` does not appear in `package.json` and `pnpm install` does not download it | `zundo` is in `apps/desktop/package.json` dependencies at `2.3.0`; grep confirms zero source file imports |
| SAFE-04 | `getCareerLeaders()` and `getSingleSeasonLeaders()` each fetch all players in a single bulk query, not per-player inside a loop | Both functions in `records-service.ts` contain `await db.players.get(playerId)` inside a `for` loop |
</phase_requirements>

---

## Standard Stack

### Core (no new dependencies needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.3.1 | Error boundary class component | `getDerivedStateFromError` / `componentDidCatch` API; functional components cannot catch render errors [VERIFIED: installed node_modules] |
| Dexie | 6 (workspace package) | `db.players.bulkGet()` for N+1 fix | Dexie `Table.bulkGet(keys)` takes `string[]` and returns `(T | undefined)[]` [VERIFIED: dynasty-db.ts schema] |
| TypeScript | 5.7 | TABLE_MAP keyof type enforcement | `strict: true`; `keyof DynastyDB` produces the exact union of table property names [VERIFIED: tsconfig.base.json] |
| Zustand | 5.0.3 | Store pattern already in place | No changes to Zustand usage; just replace `db as any` with typed lookup [VERIFIED: package.json] |

### No New Packages Required

SAFE-01 through SAFE-04 require zero new npm dependencies. The error boundary uses React's built-in class component API and Tailwind for styling (both already present).

**Installation:** none

---

## Architecture Patterns

### System Architecture Diagram

```
App.tsx
  └── ErrorBoundary (NEW — SAFE-01)
        └── PageContent
              ├── <all page components>
              └── (any render throw → caught here, shows fallback)

undo-store.ts (SAFE-02)
  TABLE_MAP: Record<UndoableTableName, Dexie.Table> (NEW)
  undo() → TABLE_MAP[last.table].add(snapshot)  [typed, no db as any]

package.json (SAFE-03)
  "zundo": "2.3.0"  →  REMOVED
  pnpm install → lockfile updated, package not downloaded

records-service.ts (SAFE-04)
  getSingleSeasonLeaders():
    BEFORE: playerSeasons loop → db.players.get(id) per iteration  [N+1]
    AFTER:  playerSeasons loop → collect playerIds
            db.players.bulkGet(playerIds) → Map<id, Player>
            second pass: Map.get(id) per entry  [2 queries total]

  getCareerLeaders():
    BEFORE: byPlayer Map iteration → db.players.get(playerId) per player  [N+1]
    AFTER:  collect all playerIds from byPlayer Map
            db.players.bulkGet(playerIds) → Map<id, Player>
            second pass: Map.get(id) per entry  [2 queries total]
```

### Recommended File Structure (changes only)

```
apps/desktop/src/
├── components/
│   └── ErrorBoundary.tsx       (NEW — SAFE-01)
├── App.tsx                     (EDIT — wrap PageContent with ErrorBoundary)
├── store/
│   └── undo-store.ts           (EDIT — TABLE_MAP + typed undo())
└── lib/
    └── records-service.ts      (EDIT — bulk query refactor)

apps/desktop/package.json       (EDIT — remove zundo entry)
```

### Pattern 1: React Error Boundary (SAFE-01)

**What:** React class component implementing `getDerivedStateFromError` and `componentDidCatch`. Functional components cannot be error boundaries — this is a hard React API constraint. [VERIFIED: React 18 class component API]

**Full design spec:** locked in `19-UI-SPEC.md` (approved 2026-05-03). Use exact classes, copy, and layout from that spec. Do not improvise.

**Usage in App.tsx:**
```tsx
// Source: 19-UI-SPEC.md + React docs
<ErrorBoundary>
  <PageContent />
</ErrorBoundary>
```

**Skeleton (implement per UI-SPEC):**
```tsx
// Source: React class component error boundary pattern [ASSUMED: standard React API]
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
    // Could log to console.error in dev; no external service
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      // Render fallback per 19-UI-SPEC.md exactly
      return <ErrorFallback ... />;
    }
    return this.props.children;
  }
}
```

**Key constraint from UI-SPEC:** `showDetails` is local component state (not Zustand), toggled inline. `window.location.reload()` is the only recovery path. The component must be `role="alert"`.

### Pattern 2: Typed TABLE_MAP (SAFE-02)

**What:** Replace `(db as any)[last.table]` with a typed constant that maps known table name strings to their Dexie `Table` instances. TypeScript strict mode then catches any invalid key at compile time.

**The four table names currently used in pushUndo calls:**

| String literal | Source store |
|----------------|-------------|
| `'games'` | game-store.ts |
| `'players'` | player-store.ts |
| `'coachingStaff'` | coaching-staff-store.ts |
| `'futureGames'` | future-schedule-store.ts |
| `'nilEntries'` | nil-store.ts |

**Implementation approach:**
```typescript
// Source: verified by grep of all pushUndo callers [VERIFIED: codebase search]
import { db } from '@dynasty-os/db';
import type { Table } from 'dexie';

// Union of all table names that undo operations target
type UndoableTableName = 'games' | 'players' | 'coachingStaff' | 'futureGames' | 'nilEntries';

// Typed map: string key → actual Dexie Table instance
const TABLE_MAP: Record<UndoableTableName, Table<Record<string, unknown>, string>> = {
  games: db.games as unknown as Table<Record<string, unknown>, string>,
  players: db.players as unknown as Table<Record<string, unknown>, string>,
  coachingStaff: db.coachingStaff as unknown as Table<Record<string, unknown>, string>,
  futureGames: db.futureGames as unknown as Table<Record<string, unknown>, string>,
  nilEntries: db.nilEntries as unknown as Table<Record<string, unknown>, string>,
};
```

Then in `undo()`:
```typescript
// Replace: await (db as any)[last.table].add(last.snapshot)
// With:
const table = TABLE_MAP[last.table as UndoableTableName];
if (!table) return; // runtime guard for forward-compat
await table.add(last.snapshot);
```

**Also update `UndoableOperation.table` field type:**
```typescript
// In UndoableOperation interface:
table: UndoableTableName;  // was: string
```

This narrows the type at the interface level so callers passing invalid strings get compile-time errors.

**Alternative approach — keyof DynastyDB:**
Using `keyof DynastyDB` is tempting but includes non-Table members (inherited Dexie properties). The explicit union `UndoableTableName` is more precise and prevents accidentally undoing arbitrary Dexie internals. [ASSUMED: DynastyDB has inherited non-Table Dexie members]

### Pattern 3: zundo Removal (SAFE-03)

**What:** Remove the `"zundo": "2.3.0"` entry from `apps/desktop/package.json` dependencies. Run `pnpm install` to update the lockfile.

**Verification that zundo has zero source imports:**
```bash
# [VERIFIED: codebase search]
grep -r "zundo" apps/desktop/src/ --include="*.ts" --include="*.tsx"
# Returns: (no output) — zundo is in package.json but never imported
```

**Why it was installed:** Phase 10-02 installed `zundo@2.3.0` as part of a 4-package batch (cmdk, sonner, zundo, papaparse). Phase 10-04 decided to use the DB-level UndoableOperation descriptor pattern instead, making zundo unused. [VERIFIED: STATE.md decisions — "UndoStore uses DB-level UndoableOperation descriptor pattern — zundo installed but not used"]

**Command:**
```bash
pnpm --filter @dynasty-os/desktop remove zundo
```
This removes the entry from `apps/desktop/package.json` and updates `pnpm-lock.yaml` in one step. No source file edits required.

### Pattern 4: Bulk Query Refactor (SAFE-04)

**What:** Replace per-player `db.players.get(id)` calls inside `for` loops with a single `db.players.bulkGet(ids)` call before the loop.

**Dexie `bulkGet` signature:** [ASSUMED: standard Dexie v4/v5/v6 API — bulkGet exists in Dexie 3+]
```typescript
// Returns (T | undefined)[] — undefined for IDs not found
await db.players.bulkGet(playerIds: string[]): Promise<(Player | undefined)[]>
```

**Refactored `getSingleSeasonLeaders` core loop:**
```typescript
// Source: records-service.ts lines 52–72 (current N+1 pattern) [VERIFIED: codebase]
// AFTER refactor:

// 1. Collect all playerIds that have a non-zero stat
const candidatePlayerIds = playerSeasons
  .filter((ps) => {
    const value = ps.stats[statKey];
    return value !== undefined && value !== 0;
  })
  .map((ps) => ps.playerId);

// 2. Single bulk query
const playerResults = await db.players.bulkGet(candidatePlayerIds);

// 3. Build Map for O(1) lookup
const playerMap = new Map<string, Player>();
for (const player of playerResults) {
  if (player) playerMap.set(player.id, player);
}

// 4. Build entries using Map (no DB call per iteration)
const entries: LeaderboardEntry[] = [];
for (const ps of playerSeasons) {
  const value = ps.stats[statKey];
  if (value === undefined || value === 0) continue;
  const player = playerMap.get(ps.playerId);
  if (!player) continue;
  entries.push({ ... });
}
```

**Refactored `getCareerLeaders` core loop:**
```typescript
// AFTER refactor:

// 1. Collect all playerIds from the grouped Map
const allPlayerIds = Array.from(byPlayer.keys());

// 2. Single bulk query
const playerResults = await db.players.bulkGet(allPlayerIds);
const playerMap = new Map<string, Player>();
for (const player of playerResults) {
  if (player) playerMap.set(player.id, player);
}

// 3. Inner loop uses Map.get (no db call)
for (const [playerId, seasons] of byPlayer) {
  // ... compute careerValue (unchanged) ...
  const player = playerMap.get(playerId);
  if (!player) continue;
  entries.push({ ... });
}
```

**Result:** Each function goes from O(N) DB queries (one per player in the season set) to exactly 2 DB queries: one for playerSeasons, one bulkGet for players.

### Anti-Patterns to Avoid

- **Wrapping App root in ErrorBoundary:** The spec says wrap `<PageContent>`, not the entire `App`. The `<Toaster>`, `<CommandPalette>`, and `<TickerBar>` live outside `PageContent` and should not be caught. An error in PageContent should not kill the toast notification layer.
- **Using functional component for ErrorBoundary:** `getDerivedStateFromError` requires a class component. React hooks cannot catch render errors in children.
- **Using `keyof DynastyDB` directly in TABLE_MAP:** This would include Dexie internal members. Use the explicit `UndoableTableName` union derived from actual pushUndo callers.
- **`pnpm remove` at workspace root:** `zundo` is in `apps/desktop/package.json`, not the root. Use `pnpm --filter @dynasty-os/desktop remove zundo`.
- **Adding deduplication to getSingleSeasonLeaders:** Multiple entries for the same player in the same season are valid (different stat keys can produce multiple rows). Do not deduplicate by playerId.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bulk player lookup | Custom caching layer | `db.players.bulkGet(ids)` | Dexie provides this; handles not-found gracefully with `undefined` entries |
| Error boundary | Hook-based try/catch wrapper | React class component | React render errors only catchable via `getDerivedStateFromError` class lifecycle |
| Table name type safety | Runtime validation + error throw | TypeScript union type at interface | Compile-time errors catch invalid table names before the code runs |

---

## Common Pitfalls

### Pitfall 1: ErrorBoundary placed too high (wrapping full App)

**What goes wrong:** Wrapping the full `<App>` means that if `<Toaster>` or `<TickerBar>` crash, they also get swallowed — but more critically, placing it above `App` would catch errors in the hidden focus input and tour overlay, leading to confusing "Something went wrong" screens for non-page errors.

**Why it happens:** Devs assume "wrap everything" is safest. In practice, the toaster and ticker are intentionally outside the main page tree.

**How to avoid:** Wrap only `<PageContent />` inside `App`'s render. `Toaster`, `CommandPalette`, `TourOverlay`, `TickerBar` remain unwrapped.

**Warning signs:** The fallback fires when navigating to LauncherPage (which has no page content rendered).

### Pitfall 2: `UndoableOperation.table` typed as `string` but TABLE_MAP keyed as `UndoableTableName`

**What goes wrong:** If the `table` field on `UndoableOperation` remains `string`, then `TABLE_MAP[last.table]` still errors because `string` is not assignable to `UndoableTableName`. TypeScript will complain at the lookup site.

**How to avoid:** Narrow `UndoableOperation.table` to `UndoableTableName` at the interface level. All call sites passing literal strings like `'games'` will automatically narrow to the union — TypeScript is happy with string literals being assigned to union types.

### Pitfall 3: `db.players.bulkGet` returns `(Player | undefined)[]` — not `Player[]`

**What goes wrong:** Attempting to call `.filter(Boolean)` on the result and assign to `Player[]` gets a TypeScript error (`(Player | undefined)[]` is not `Player[]`).

**How to avoid:** Build a `Map<string, Player>` by iterating the result with a `if (player)` guard. This handles the undefined entries correctly and provides O(1) lookup.

### Pitfall 4: zundo still in pnpm-lock.yaml after removal

**What goes wrong:** Running `pnpm install` without `--filter @dynasty-os/desktop` at the workspace root may not pick up the change correctly on some pnpm versions.

**How to avoid:** Use `pnpm --filter @dynasty-os/desktop remove zundo` — this scopes the operation and updates both `package.json` and `pnpm-lock.yaml` atomically. Verify with `grep zundo apps/desktop/package.json` returning nothing.

### Pitfall 5: bulkGet called with an empty array

**What goes wrong:** `db.players.bulkGet([])` is valid in Dexie and returns `[]`, but some implementations may guard against it unnecessarily with a `if (ids.length === 0) return []` early-exit. This is safe to add but not required — Dexie handles it.

**How to avoid:** Either add a guard or don't — it's a no-op optimization. Do not skip it in a way that introduces a conditional code path that diverges from the always-bulk path.

---

## Code Examples

### ErrorBoundary placement in App.tsx

```tsx
// Source: 19-UI-SPEC.md interaction contract + App.tsx review [VERIFIED: App.tsx]
function App() {
  // ... existing state and effects unchanged ...
  return (
    <div className="pb-10">
      {/* hidden input, help button, etc. unchanged */}
      <ErrorBoundary>
        <PageContent />
      </ErrorBoundary>
      <CommandPalette ... />
      <TourOverlay ... />
      <TickerBar />
      <Toaster richColors position="bottom-right" />
    </div>
  );
}
```

### TABLE_MAP full replacement for undo-store.ts

```typescript
// Source: undo-store.ts (current) + codebase pushUndo grep [VERIFIED: codebase]
import { create } from 'zustand';
import { db } from '@dynasty-os/db';
import type { Table } from 'dexie';

// Only the tables that undo operations target
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

export interface UndoableOperation {
  id: string;
  table: UndoableTableName;  // was: string
  operation: 'delete' | 'update';
  recordId: string;
  snapshot: Record<string, unknown>;
  description: string;
  performedAt: number;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `(db as any)[tableName]` | `TABLE_MAP[tableName]` (typed) | Phase 19 (this phase) | TypeScript catches invalid table names at compile time |
| Per-player `db.players.get(id)` in loop | `db.players.bulkGet(ids)` + Map | Phase 19 (this phase) | O(N) queries → 2 queries for leaderboard loads |
| No error boundary (blank white screen) | `ErrorBoundary` class component | Phase 19 (this phase) | Fatal render errors show styled recovery UI |
| `zundo` installed, unused | `zundo` removed from package.json | Phase 19 (this phase) | Smaller dependency surface, no dead code |

---

## Runtime State Inventory

> This phase has no rename/refactor targets. The zundo removal is a build-time dependency change only — no stored data, no OS-registered state, no env vars reference zundo.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — zundo is not a data layer; undo history is in-memory Zustand only | None |
| Live service config | None | None |
| OS-registered state | None | None |
| Secrets/env vars | None | None |
| Build artifacts | `pnpm-lock.yaml` will need updating after zundo removal | `pnpm --filter @dynasty-os/desktop remove zundo` handles this atomically |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | pnpm, tsc | Yes | v22.19.0 | — |
| pnpm | Package removal (SAFE-03) | Yes | 10.15.1 | — |
| TypeScript | Build verification | Yes | 5.7 (in devDeps) | — |
| Dexie | bulkGet (SAFE-04) | Yes | v6 (workspace package) | — |
| React | ErrorBoundary class API | Yes | 18.3.1 | — |

**Missing dependencies with no fallback:** none

---

## Validation Architecture

No test infrastructure exists in this project (no vitest, no jest, no test files anywhere). The `nyquist_validation` key is absent from `.planning/config.json`, which per GSD rules means treated as enabled — but there is no framework to install against. Verification for this phase is manual + build-based.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None installed |
| Config file | None |
| Quick run command | `pnpm --filter @dynasty-os/desktop exec tsc --noEmit` |
| Full suite command | `pnpm --filter @dynasty-os/desktop run build` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SAFE-01 | Error boundary catches render errors | manual-only | `tsc --noEmit` (compile check only) | N/A |
| SAFE-02 | Invalid table string produces compile error | TypeScript compile | `tsc --noEmit` | N/A |
| SAFE-03 | zundo absent from package.json | manual check | `grep zundo apps/desktop/package.json` returns empty | N/A |
| SAFE-04 | Leaderboard uses bulkGet (2 queries) | manual-only | `tsc --noEmit` (no loop-per-call pattern check) | N/A |

**SAFE-01 manual test:** Temporarily throw `throw new Error('test')` inside any page component; verify the styled fallback renders instead of a blank screen; remove the throw.

**SAFE-02 compile test:** After TABLE_MAP is in place, attempt to pass `table: 'nonExistentTable'` anywhere in the codebase and verify `tsc --noEmit` reports a type error. Remove the test string.

**SAFE-04 manual verification:** Add `console.log` inside the player loop before the bulkGet refactor to confirm N queries fire; add after to confirm 2 queries fire. Remove logs before commit.

### Wave 0 Gaps

No test infrastructure to scaffold — this project has no test setup and the config does not specify adding one in this phase. All validation is build + manual.

---

## Security Domain

This phase introduces no new attack surfaces:

| ASVS Category | Applies | Notes |
|---------------|---------|-------|
| V5 Input Validation | No | No new user input |
| V4 Access Control | No | No new routes or permissions |
| V6 Cryptography | No | No new crypto usage |

The ErrorBoundary exposes `error.message` and `error.stack` behind a user-toggled details panel. This is intentionally developer-facing and acceptable in a local desktop app with no network exposure.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `db.players.bulkGet(ids)` is available in the installed Dexie v6 workspace package | Standard Stack, Pattern 4 | If not available, use `db.players.where('id').anyOf(ids).toArray()` as equivalent — slightly less direct but same result |
| A2 | `keyof DynastyDB` includes inherited Dexie members beyond table properties | Pattern 2 | If wrong, `keyof DynastyDB` could be used directly as `UndoableTableName` base type — either way, explicit union is safer |
| A3 | `as unknown as Table<Record<string,unknown>, string>` double-cast will satisfy TypeScript strict mode for TABLE_MAP values | Pattern 2 | If TypeScript rejects this cast path, use type assertion via intermediate `unknown` variable |

---

## Open Questions

1. **Should `UndoableTableName` be exported from `undo-store.ts` and used in all pushUndo callers?**
   - What we know: All five call sites currently use string literals (e.g., `table: 'games'`). TypeScript will accept these literals as assignable to the union type without changes.
   - What's unclear: Whether the planner wants callers to explicitly import and reference `UndoableTableName` or just benefit from it implicitly.
   - Recommendation: Export the type; let call sites benefit silently from the narrower type without requiring explicit imports.

2. **Should the bulkGet deduplication handle duplicate playerIds?**
   - What we know: `getSingleSeasonLeaders` can return multiple entries per player (one per season in "all seasons" mode). The player lookup loop already handles this via Map — the same player just appears multiple times in `entries`.
   - What's unclear: Whether the success criterion "two bulk queries" strictly means deduplication before bulkGet.
   - Recommendation: Deduplicate playerIds before bulkGet (using `[...new Set(candidatePlayerIds)]`) to avoid passing 50 identical IDs for a star player across 10 seasons. This is a correctness optimization, not a behavior change.

---

## Sources

### Primary (HIGH confidence)
- `apps/desktop/src/store/undo-store.ts` — current `db as any` pattern, lines 37 and 40 [VERIFIED]
- `apps/desktop/src/lib/records-service.ts` — current N+1 pattern, `db.players.get(ps.playerId)` in loops [VERIFIED]
- `apps/desktop/package.json` — zundo at `2.3.0`, zundo not imported anywhere in src/ [VERIFIED]
- `apps/desktop/src/App.tsx` — current PageContent structure, no error boundary [VERIFIED]
- `.planning/phases/19-safety-foundations/19-UI-SPEC.md` — approved error boundary design contract [VERIFIED]
- `.planning/STATE.md` — "zundo installed but not used; DB-level restore prevents DB/store inconsistency" [VERIFIED]
- `packages/db/src/dynasty-db.ts` — DynastyDB table names (used to derive UndoableTableName union) [VERIFIED]
- `tsconfig.base.json` — `strict: true` confirmed [VERIFIED]

### Secondary (MEDIUM confidence)
- React 18 class component error boundary API — standard, stable since React 16 [ASSUMED: well-established React pattern]
- Dexie v6 `bulkGet` API availability — present in Dexie 3+ [ASSUMED: standard Dexie API]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in installed node_modules
- Architecture: HIGH — all four requirements map to specific verified file locations
- Pitfalls: HIGH — derived from direct code inspection of the files being edited
- N+1 fix approach: MEDIUM — bulkGet assumed available; fallback documented

**Research date:** 2026-05-03
**Valid until:** 2026-06-03 (stable stack; no external dependencies changing)
