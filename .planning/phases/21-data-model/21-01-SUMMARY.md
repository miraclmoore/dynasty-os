---
phase: 21
plan: "01"
subsystem: data-model
tags:
  - core-types
  - dexie
  - schema-migration
  - types
dependency_graph:
  requires: []
  provides:
    - "@dynasty-os/core-types: KeyMoment interface"
    - "@dynasty-os/core-types: Player.devTrait | Player.dealBreaker | Player.isRedshirt"
    - "@dynasty-os/core-types: Season.bowlOpponent | Season.keyEvents"
    - "@dynasty-os/core-types: Recruit.motivation1/2/3 | Recruit.dealBreakerMotivation | Recruit.visitWeek"
    - "@dynasty-os/db: SCHEMA_V7 with keyMoments table"
    - "@dynasty-os/db: DynastyDB.keyMoments Table<KeyMoment, string>"
    - "@dynasty-os/db: Dexie version 7 migration preserving v1/v4/v5/v6 upgrade paths"
  affects:
    - "packages/core-types"
    - "packages/db"
tech_stack:
  added: []
  patterns:
    - "SCHEMA_V7 spreads SCHEMA_V6 — same additive spread pattern established in Phase 10"
    - "version(7).stores(SCHEMA_V7) appended to version chain without removing prior version() calls"
    - "Optional type fields inserted between notes and createdAt to preserve field ordering convention"
key_files:
  created:
    - packages/core-types/src/key-moment.ts
  modified:
    - packages/core-types/src/player.ts
    - packages/core-types/src/season.ts
    - packages/core-types/src/recruiting.ts
    - packages/core-types/src/index.ts
    - packages/db/src/schema.ts
    - packages/db/src/dynasty-db.ts
decisions:
  - "devTrait typed as 4-value literal union ('normal'|'star'|'superstar'|'xfactor') for compile-time enforcement; runtime relies on same TypeScript build emitting both producer and consumer"
  - "dealBreaker and dealBreakerMotivation typed as string (not union) — 14-category EA list enforced at UI layer; string keeps schema flexible for CFB 27+ category changes"
  - "KeyMoment requires id/dynastyId/rivalId/createdAt/updatedAt beyond the prefs-store shape — Dexie table indexing and dynasty scoping require these fields; Plan 21-02 reconciles the two shapes"
  - "visitWeek typed as number — 1-14 range enforced at form layer, not schema layer"
  - "DB_VERSION bumped from 6 to 7 after SCHEMA_V7 constant added"
metrics:
  duration: "~8 min"
  completed_date: "2026-05-04"
  tasks_completed: 2
  files_modified: 6
  files_created: 1
---

# Phase 21 Plan 01: Data Model v2.2 Type/Schema Foundation Summary

**One-liner:** KeyMoment interface + v2.2 optional fields on Player/Season/Recruit + Dexie v7 keyMoments table with compound index and preserved version chain.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Extend core-types with KeyMoment and v2.2 fields | 943de32 | key-moment.ts (new), player.ts, season.ts, recruiting.ts, index.ts |
| 2 | Add Dexie v7 schema with keyMoments table | aa40768 | schema.ts, dynasty-db.ts |

## Type Fields Added

### KeyMoment (new file: `packages/core-types/src/key-moment.ts`)

```typescript
export interface KeyMoment {
  id: string;
  dynastyId: string;
  rivalId: string;
  year: number;
  description: string;
  createdAt: number;
  updatedAt: number;
}
```

### Player additions (DMOD-03, DMOD-04)

```typescript
devTrait?: 'normal' | 'star' | 'superstar' | 'xfactor';
dealBreaker?: string;
isRedshirt?: boolean;
```

### Season additions (DMOD-02)

```typescript
bowlOpponent?: string;
keyEvents?: string[];
```

### Recruit additions (DMOD-05)

```typescript
motivation1?: string;
motivation2?: string;
motivation3?: string;
dealBreakerMotivation?: string;
visitWeek?: number;
```

## Schema v7 Line

```typescript
// packages/db/src/schema.ts
export const SCHEMA_V7 = {
  ...SCHEMA_V6,
  keyMoments: 'id, dynastyId, rivalId, year, [dynastyId+rivalId]',
} as const;
```

## Version Chain Check

All five version() calls preserved in `packages/db/src/dynasty-db.ts`:

| Version | Schema | Status |
|---------|--------|--------|
| 1 | SCHEMA | Preserved |
| 4 | SCHEMA | Preserved |
| 5 | SCHEMA | Preserved |
| 6 | SCHEMA_V6 | Preserved |
| 7 | SCHEMA_V7 | Added |

## Build Results

- `@dynasty-os/core-types build`: exit 0, zero TypeScript errors
- `@dynasty-os/db build`: exit 0, zero TypeScript errors
- `packages/core-types/dist/key-moment.d.ts`: generated
- `packages/core-types/dist/key-moment.js`: generated
- `packages/db/dist/dynasty-db.d.ts`: contains `keyMoments` property

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — this plan adds type interfaces and schema only. No UI or service logic wired; no stub values.

## Threat Flags

No new threat surfaces beyond the plan's declared threat model (T-21-01 through T-21-05). All mitigations implemented as specified.

## Self-Check: PASSED
