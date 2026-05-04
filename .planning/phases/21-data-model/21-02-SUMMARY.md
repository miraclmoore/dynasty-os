---
phase: 21
plan: "02"
subsystem: data-model
tags:
  - dexie
  - rivalry
  - key-moments
  - migration
  - export-import
dependency_graph:
  requires:
    - "@dynasty-os/db: SCHEMA_V7 with keyMoments table (Plan 21-01)"
    - "@dynasty-os/core-types: KeyMoment interface (Plan 21-01)"
  provides:
    - "rivalry-service: Dexie-backed getKeyMoments / addKeyMoment / deleteKeyMoment"
    - "key-moments-migration: migrateKeyMomentsFromPrefsStore() one-shot migration"
    - "export-import: DynastyExport v3 with rivals[] and keyMoments[]; backward-compatible v1/v2 import"
    - "App.tsx: migration fires on startup after loadAll()"
  affects:
    - "apps/desktop/src/lib/rivalry-service.ts"
    - "apps/desktop/src/lib/key-moments-migration.ts (new)"
    - "apps/desktop/src/lib/export-import.ts"
    - "apps/desktop/src/App.tsx"
    - "apps/desktop/src/pages/RivalryTrackerPage.tsx"
tech_stack:
  added: []
  patterns:
    - "db.keyMoments.where('rivalId').equals(rivalId) — Dexie single-index query with in-memory sort"
    - "db.keyMoments.where('rivalId').equals(rivalId).and(predicate) — Dexie filtered delete pattern"
    - "void migrateKeyMomentsFromPrefsStore() — fire-and-forget after loadAll(); matches evaluateAchievements pattern"
    - "MIGRATION_FLAG in plugin-store — idempotency gate prevents re-running migration on every launch"
    - "rivalIdMap pattern — same Map<string,string> remap pattern as seasonIdMap/playerIdMap in export-import remap path"
key_files:
  created:
    - apps/desktop/src/lib/key-moments-migration.ts
  modified:
    - apps/desktop/src/lib/rivalry-service.ts
    - apps/desktop/src/lib/export-import.ts
    - apps/desktop/src/App.tsx
    - apps/desktop/src/pages/RivalryTrackerPage.tsx
decisions:
  - "addKeyMoment accepts dynastyId as second param — required for db.keyMoments compound [dynastyId+rivalId] index; RivalryTrackerPage passes activeDynasty.id which is guaranteed non-null at that call site"
  - "migrateKeyMomentsFromPrefsStore uses void (fire-and-forget) — migration never blocks App render; matches established fire-and-forget pattern for evaluateAchievements"
  - "Export v3 includes rivals[] alongside keyMoments[] — without rivals, imported keyMoments would be orphaned since rival records are not reconstructed from other tables"
  - "Direct-insert path adds db.rivals+db.keyMoments to transaction array — Dexie requires all touched tables declared upfront in db.transaction()"
  - "Remap path builds rivalIdMap before newKeyMoments map — FK dependency order: rival IDs must be generated before key moment rivalId references can be remapped"
metrics:
  duration: "~12 min"
  completed_date: "2026-05-04"
  tasks_completed: 2
  files_modified: 4
  files_created: 1
---

# Phase 21 Plan 02: Key Moments Migration + Export/Import v3 Summary

**One-liner:** Dexie-backed key moments with one-shot plugin-store migration, DynastyExport v3 adding rivals[] and keyMoments[] with full ID remapping on import.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Rewrite key-moment service against db.keyMoments + write migration helper | 89fa8cf | rivalry-service.ts, key-moments-migration.ts (new), RivalryTrackerPage.tsx |
| 2 | Wire migration on App startup + extend export/import to v3 with keyMoments | 62a758f | App.tsx, export-import.ts |

## New rivalry-service Signatures

```typescript
// unchanged (still rivalId-only)
export async function getKeyMoments(rivalId: string): Promise<KeyMoment[]>

// CHANGED: new dynastyId param between rivalId and moment object
export async function addKeyMoment(
  rivalId: string,
  dynastyId: string,
  moment: { year: number; description: string }
): Promise<KeyMoment>

// unchanged
export async function deleteKeyMoment(rivalId: string, year: number, description: string): Promise<void>

// re-exported from @dynasty-os/core-types (rich shape with id/dynastyId/rivalId/createdAt/updatedAt)
export type { KeyMoment };
```

## Migration Flag

Flag key: `key-moments-migrated-to-dexie-v7`

Behavior:
1. On app launch, `migrateKeyMomentsFromPrefsStore()` fires as `void` (fire-and-forget) after `loadAll()` completes.
2. Migration reads the flag from `dynasty-os.bin`. If `true`, exits immediately (idempotent).
3. Scans all `rival-moments-{rivalId}` entries in plugin-store.
4. For each valid entry, looks up the rival's `dynastyId` from `db.rivals`. Orphaned entries (rival deleted) are cleaned up but not migrated.
5. Bulk-inserts new `KeyMoment` rows into `db.keyMoments`.
6. Deletes all `rival-moments-*` entries from plugin-store after successful Dexie write.
7. Sets flag to `true`. Logs success count to `console.info`.
8. If any step throws, catches silently and logs to `console.warn`. Flag not set — retries next launch.

## DynastyExport v3 Shape

```typescript
export interface DynastyExport {
  version: 1 | 2 | 3;       // v3 adds rivals + keyMoments
  exportedAt: number;
  dynasty: Dynasty;
  seasons: Season[];
  games: Game[];
  players: Player[];
  playerSeasons: PlayerSeason[];
  coachingStaff?: CoachingStaff[];
  nilEntries?: NilEntry[];
  futureGames?: FutureGame[];
  playerLinks?: PlayerLink[];
  rivals?: Rival[];          // NEW in v3
  keyMoments?: KeyMoment[];  // NEW in v3
}
```

Import behavior by version:
- **v1 / v2**: `rivals` and `keyMoments` are `undefined` — both direct-insert and remap paths treat as empty arrays (no-op). Fully backward-compatible.
- **v3**: Both arrays are present. Direct-insert adds to `db.rivals` + `db.keyMoments` unchanged. Remap path generates fresh IDs for all rivals and remaps `rivalId` references on each `KeyMoment`.

## TSC Pass Confirmation

`pnpm --filter @dynasty-os/desktop exec tsc --noEmit` — exits 0, zero TypeScript errors.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

No new threat surfaces beyond the plan's declared threat model (T-21-06 through T-21-10). All mitigations implemented as specified.

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| apps/desktop/src/lib/rivalry-service.ts | FOUND |
| apps/desktop/src/lib/key-moments-migration.ts | FOUND |
| apps/desktop/src/lib/export-import.ts | FOUND |
| apps/desktop/src/App.tsx | FOUND |
| .planning/phases/21-data-model/21-02-SUMMARY.md | FOUND |
| Commit 89fa8cf (Task 1) | FOUND |
| Commit 62a758f (Task 2) | FOUND |
