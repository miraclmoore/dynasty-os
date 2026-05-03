---
phase: 10-infrastructure-foundation
plan: 01
subsystem: database
tags: [dexie, indexeddb, typescript, schema-migration, core-types]

# Dependency graph
requires:
  - phase: 09-madden-sync
    provides: Final v5 Dexie schema (13 tables) that v6 spreads over
provides:
  - SCHEMA_V6 const with all 18 tables (13 existing + 5 new) for Dexie v6 migration
  - CoachingStaff interface for Phase 12 coaching history features
  - NilEntry interface for Phase 12 NIL deal tracking
  - FutureGame interface for Phase 12 schedule builder
  - PlayerLink interface for cross-dynasty player linking
  - AiCacheEntry interface with AiContentType union for Phase 13 AI layer
  - Player.birthYear optional field for Phase 12 trade value calculator
affects: [10-02, 10-03, 10-04, 11-qol-wins, 12-community-features, 13-ai-intelligence-layer]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - SCHEMA_V6 spread pattern: new schema version spreads over prior SCHEMA to avoid dropping existing tables
    - Dexie multi-version upgrade path: version(1/4/5/6).stores() provides migration from any prior installed version
    - db.on('versionchange') handler: closes DB and reloads window to prevent multi-tab deadlock on schema upgrade

key-files:
  created:
    - packages/core-types/src/coaching-staff.ts
    - packages/core-types/src/nil-entry.ts
    - packages/core-types/src/future-game.ts
    - packages/core-types/src/player-link.ts
    - packages/core-types/src/ai-cache.ts
  modified:
    - packages/db/src/schema.ts
    - packages/db/src/dynasty-db.ts
    - packages/core-types/src/player.ts
    - packages/core-types/src/index.ts

key-decisions:
  - "SCHEMA_V6 uses spread over SCHEMA: guarantees all 13 existing tables are preserved and Dexie does not drop them on upgrade"
  - "version(6).stores(SCHEMA_V6) not version(6).stores(SCHEMA): critical distinction — using old SCHEMA would silently drop the 5 new tables"
  - "db.on('versionchange') closes and reloads: prevents multi-tab IndexedDB deadlock when one tab upgrades schema while another has it open"
  - "Player.birthYear unindexed optional field: no schema migration needed; stored as plain object property, required by trade value calculator age multiplier in Phase 12"
  - "AiContentType union covers all 12 Phase 13 content types upfront: avoids schema change when adding new AI features later"

patterns-established:
  - "Schema spread pattern: SCHEMA_V6 = { ...SCHEMA, newTable: '...' } ensures backward-safe table additions"
  - "Dexie type safety: Table<T, string> for all new tables matching existing pattern"

requirements-completed: [INFRA-GATE-1]

# Metrics
duration: 1min
completed: 2026-02-25
---

# Phase 10 Plan 01: Dexie v6 Schema Migration and Core Types Summary

**Dexie IndexedDB schema bumped from v5 to v6 adding 5 new tables (coachingStaff, nilEntries, futureGames, playerLinks, aiCache), with full TypeScript type contracts for all Phase 12-13 features**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-25T04:31:39Z
- **Completed:** 2026-02-25T04:33:06Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Dexie schema v6 migration path established — upgrades cleanly from any prior version (v1/v4/v5) without VersionError
- All 5 new IndexedDB tables created with compound indexes matching query patterns needed by Phases 12-13
- Complete TypeScript type interfaces defined for all new tables with all required fields (not stubs)
- AiContentType union covers all 12 Phase 13 content types so no future schema change is needed when adding AI features
- db.on('versionchange') handler prevents multi-tab deadlock on upgrade
- Player.birthYear optional field added for trade value calculator age multiplier

## Task Commits

Each task was committed atomically:

1. **Task 2: New core types** - `8b8b712` (feat)
2. **Task 1: Dexie schema v6 migration** - `11d86ed` (feat)

_Note: Task 2 committed first as Task 1 (db package) imports types from @dynasty-os/core-types_

## Files Created/Modified
- `packages/db/src/schema.ts` - Added SCHEMA_V6 const (spreads SCHEMA + 5 new tables), bumped DB_VERSION to 6
- `packages/db/src/dynasty-db.ts` - Added 5 Table declarations, version(6).stores(SCHEMA_V6), versionchange handler
- `packages/core-types/src/coaching-staff.ts` - CoachingStaff interface with CoachingRole union type
- `packages/core-types/src/nil-entry.ts` - NilEntry interface for NIL deal tracking
- `packages/core-types/src/future-game.ts` - FutureGame interface for schedule builder
- `packages/core-types/src/player-link.ts` - PlayerLink interface for cross-dynasty player linking
- `packages/core-types/src/ai-cache.ts` - AiCacheEntry interface with AiContentType union (12 content types)
- `packages/core-types/src/player.ts` - Added birthYear?: number after departureReason
- `packages/core-types/src/index.ts` - Exported all 5 new type modules

## Decisions Made
- Committed types before db package since db imports types — ensures build dependency order is correct
- AiContentType defined with all 12 Phase 13 content types upfront (not adding incrementally) to avoid future schema changes
- SCHEMA_V6 uses spread operator over SCHEMA so existing 13 tables are explicitly preserved — no risk of silent table drop

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None — both `@dynasty-os/core-types` and `@dynasty-os/db` built cleanly on first attempt.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- INFRA-GATE-1 satisfied: Dexie v6 schema and all required types are in place
- Phase 10-02 (new npm packages: cmdk, sonner, zundo, papaparse) can proceed
- Phase 12 features (CoachingStaff, NilEntry, FutureGame, PlayerLink) have their DB tables and types ready
- Phase 13 AI layer (AiCacheEntry, AiContentType) has its DB table and types ready
- All downstream plans in Phase 10 can import the new types from @dynasty-os/core-types

---
*Phase: 10-infrastructure-foundation*
*Completed: 2026-02-25*

## Self-Check: PASSED

All created files confirmed present on disk. All task commits verified in git history:
- `8b8b712` — feat(10-01): add 5 new core types and Player.birthYear for v2.0 features
- `11d86ed` — feat(10-01): bump Dexie schema to v6 with 5 new tables
- `4bd5d44` — docs(10-01): complete plan metadata
