---
phase: 19-safety-foundations
reviewed: 2026-05-03T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - apps/desktop/src/components/ErrorBoundary.tsx
  - apps/desktop/src/App.tsx
  - apps/desktop/src/store/undo-store.ts
  - apps/desktop/package.json
  - apps/desktop/src/lib/records-service.ts
findings:
  critical: 2
  warning: 4
  info: 2
  total: 8
status: issues_found
---

# Phase 19: Code Review Report

**Reviewed:** 2026-05-03T00:00:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Five files were reviewed: the new `ErrorBoundary` component and its integration in `App.tsx`, the new `undo-store.ts`, `records-service.ts`, and `package.json`. The ErrorBoundary and undo store are phase-19 deliverables; `records-service.ts` and `App.tsx` appear to be pre-existing code included for context.

The most serious problems are (1) the `undo()` function in `undo-store.ts` has no error handling — a Dexie write failure during undo silently leaves the history stack in an inconsistent state, and (2) `getSingleSeasonLeaders` in `records-service.ts` is missing a `dynastyId` guard when a `seasonId` is supplied, which means it can return data from a different dynasty's season if two dynasties share a seasonal index entry.

---

## Critical Issues

### CR-01: `undo()` throws unhandled exceptions, leaving history corrupted

**File:** `apps/desktop/src/store/undo-store.ts:60-78`

**Issue:** The `undo()` action calls `table.add()` or `table.put()` (both async Dexie operations) but has no `try/catch`. If the database write fails, the `set(state => ({ history: state.history.slice(0, -1) }))` call on line 78 is never reached — so the entry is **not** popped from history. The next call to `undo()` will attempt the same failed operation again indefinitely. Callers (e.g., `game-store.ts:126`, `player-store.ts:128`) also do not catch the rejection, so the toast "Undo" action will silently fail with an unhandled promise rejection in the renderer.

**Fix:**
```typescript
undo: async () => {
  const { history } = get();
  if (history.length === 0) return;
  const last = history[history.length - 1];
  const table = TABLE_MAP[last.table];
  if (!table) {
    set((state) => ({ history: state.history.slice(0, -1) }));
    return;
  }
  try {
    if (last.operation === 'delete') {
      await table.add(last.snapshot);
    } else if (last.operation === 'update') {
      await table.put(last.snapshot);
    }
  } catch (err) {
    // Pop the entry even on failure to prevent retry loops.
    set((state) => ({ history: state.history.slice(0, -1) }));
    throw err;  // Let callers surface an error toast.
  }
  set((state) => ({ history: state.history.slice(0, -1) }));
},
```

---

### CR-02: `getSingleSeasonLeaders` does not scope by `dynastyId` when `seasonId` is provided — cross-dynasty data leak

**File:** `apps/desktop/src/lib/records-service.ts:39-48`

**Issue:** When a `seasonId` is passed, the query is:
```typescript
db.playerSeasons.where('seasonId').equals(seasonId).toArray()
```
There is no `dynastyId` filter. If two dynasties somehow reference the same `seasonId` (or a caller passes an unvalidated user-supplied value), player seasons from the wrong dynasty are returned. The function signature accepts `dynastyId` but ignores it on this code path. The career-leaders path (line 107) correctly filters by `dynastyId`; this path does not.

**Fix:**
```typescript
if (seasonId) {
  // Filter by both seasonId AND dynastyId to prevent cross-dynasty leakage.
  playerSeasons = await db.playerSeasons
    .where('[dynastyId+seasonId]')  // composite index exists per schema.ts line 6
    .equals([dynastyId, seasonId])
    .toArray();
} else {
  playerSeasons = await db.playerSeasons
    .where('dynastyId')
    .equals(dynastyId)
    .toArray();
}
```
Alternatively, post-filter: `playerSeasons = playerSeasons.filter(ps => ps.dynastyId === dynastyId)`.

---

## Warnings

### WR-01: `ErrorBoundary` "Reload App" button is missing `type="button"`, risking accidental form submission

**File:** `apps/desktop/src/components/ErrorBoundary.tsx:55-59`

**Issue:** The primary "Reload App" button has no `type` attribute. In HTML, a button without `type` inside a `<form>` defaults to `type="submit"`. While there is no visible form here, if the error boundary is ever nested inside a form (or a library component that renders a form), this button will submit the form instead of reloading. The toggle button on line 62 correctly declares `type="button"`.

**Fix:**
```tsx
<button
  type="button"
  onClick={() => window.location.reload()}
  className="w-full px-4 py-2 bg-red-700 ..."
>
  Reload App
</button>
```

---

### WR-02: `ErrorBoundary` wraps only `PageContent`, leaving `CommandPalette`, `TourOverlay`, and `TickerBar` unprotected

**File:** `apps/desktop/src/App.tsx:150-156`

**Issue:** The `ErrorBoundary` is placed around `<PageContent />` only. `CommandPalette`, `TourOverlay`, and `TickerBar` are rendered outside the boundary. A render error thrown in any of those three components will propagate to the root and cause a blank screen with no fallback UI.

**Fix:** Either wrap each unprotected component in its own `ErrorBoundary`, or move the single boundary to wrap the entire `<div className="pb-10">` content:
```tsx
return (
  <ErrorBoundary>
    <div className="pb-10">
      ...
      <PageContent />
      <CommandPalette ... />
      <TourOverlay ... />
      <TickerBar />
      <Toaster ... />
    </div>
  </ErrorBoundary>
);
```

---

### WR-03: `undo-store.ts` `TABLE_MAP` is module-level and references `db` at import time — breaks if `db` is not yet initialized

**File:** `apps/desktop/src/store/undo-store.ts:25-31`

**Issue:** `TABLE_MAP` is constructed at module evaluation time:
```typescript
const TABLE_MAP: Record<UndoableTableName, UndoableTable> = {
  games: db.games as unknown as UndoableTable,
  ...
};
```
If `db` (from `@dynasty-os/db`) initializes lazily or is not ready when this module is first imported, the table references in `TABLE_MAP` will be stale or undefined. Dexie tables are typically attached to the `db` object at construction time, so this is a latent risk rather than a current crash — but it ties module evaluation order to database readiness in a fragile way.

**Fix:** Lazy-evaluate inside `undo()`:
```typescript
undo: async () => {
  ...
  const tableRef = {
    games: db.games,
    players: db.players,
    coachingStaff: db.coachingStaff,
    futureGames: db.futureGames,
    nilEntries: db.nilEntries,
  }[last.table];
  ...
}
```

---

### WR-04: `getCareerLeaders` AVERAGED_STATS list (`sacks`) diverges semantically from a stat that should be summed

**File:** `apps/desktop/src/lib/records-service.ts:6`

**Issue:** `sacks` is included in `AVERAGED_STATS` (same as `career-stats.ts:4`). Career sack totals are universally aggregated by summing across seasons (e.g., a player with 8 sacks in year 1 and 6 sacks in year 2 has 14 career sacks). Averaging them (even weighted by games) produces a "sacks per season" figure, not a career total — which is not what a career leaderboard for sacks should display. This comment on line 97 calls it a "decimal stat" but sacks are integer counts. The bug exists in both `career-stats.ts` and `records-service.ts` and is a pre-existing issue, but it is surfaced here because `records-service.ts` is in scope.

**Fix:** Remove `'sacks'` from `AVERAGED_STATS` in both files:
```typescript
const AVERAGED_STATS = new Set(['passerRating', 'puntAverage']);
```

---

## Info

### IN-01: `ErrorBoundary.componentDidCatch` logs to console in production

**File:** `apps/desktop/src/components/ErrorBoundary.tsx:22-24`

**Issue:** `console.error('ErrorBoundary caught:', error, info)` will appear in production Tauri builds. In a desktop app this is low risk, but it exposes internal error structure to the renderer console. If an error-reporting integration is added later (Sentry, Tauri crash reports), the `componentDidCatch` hook is the right place, but the current `console.error` call does nothing actionable and will be noise in production.

**Fix:** Either remove it, gate it on `import.meta.env.DEV`, or leave a TODO comment indicating where a real error reporter should be wired.

---

### IN-02: `package.json` pins `papaparse` and `cmdk` to exact versions while all other deps use ranges

**File:** `apps/desktop/package.json:22,29`

**Issue:** `"cmdk": "1.1.1"` and `"papaparse": "5.5.3"` are exact-pinned without a comment explaining why (security fix, breaking-change freeze, etc.). `sonner` is also exact-pinned at `"2.0.7"`. Undocumented exact pins cause friction when updating other packages that may introduce compatible patch versions of these libraries, and may hide the need to periodically re-evaluate whether the pins are still necessary.

**Fix:** Add an inline comment in `package.json` (as a `_comment` key or in a PINNED.md file) explaining why these are pinned, or upgrade to range versions if the pin is no longer intentional.

---

_Reviewed: 2026-05-03T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
