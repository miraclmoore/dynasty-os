---
phase: 01-foundation
plan: "03"
subsystem: database
tags: [typescript, dexie, indexeddb, sport-config, core-types, cfb, madden, nfl, orm]

# Dependency graph
requires:
  - phase: 01-foundation/01-01
    provides: Package scaffolds for core-types, db, sport-configs with TypeScript composite builds
provides:
  - All core entity types (Dynasty, Season, Game, Player, PlayerSeason, SportConfig) exported from @dynasty-os/core-types
  - Dexie v4 ORM schema with 5 indexed tables (dynasties, seasons, games, players, playerSeasons)
  - DynastyDB class with typed Table<T, string> for each entity and singleton db export
  - CFB sport config: Power 4 + G5 + Independent teams, conferences, positions, stat categories
  - Madden sport config: all 32 NFL teams in AFC/NFC divisions, positions, stat categories
  - getSportConfig() dynamic resolver by SportType key ('cfb' | 'madden')
affects:
  - 01-04-routing (uses Dynasty type and db for dynasty management UI)
  - All subsequent phases (every feature reads/writes through db package and uses core types)
  - 02-season-management (Season, Game types; seasons/games tables)
  - 03-player-tracking (Player, PlayerSeason types; players/playerSeasons tables)

# Tech tracking
tech-stack:
  added:
    - dexie@4.3.0 (IndexedDB ORM, already installed in plan 01-01, now actively used)
    - "@dynasty-os/core-types workspace:* dep added to @dynasty-os/db and @dynasty-os/sport-configs"
  patterns:
    - Sport Config pattern: each sport has a config object (cfbConfig, maddenConfig) implementing SportConfig interface
    - getSportConfig() resolver: shared code queries config by sport key string - sport-agnostic components stay generic
    - Dexie v4 Table<T, string> typing: each table typed with entity interface and string PK
    - Composite indexes in Dexie schema: [dynastyId+year], [dynastyId+seasonId], etc. for efficient queries
    - PlayerSeason.stats as Record<string, number>: flexible stat storage keyed by StatCategory.key

key-files:
  created:
    - packages/core-types/src/dynasty.ts
    - packages/core-types/src/season.ts
    - packages/core-types/src/game.ts
    - packages/core-types/src/player.ts
    - packages/core-types/src/sport-config.ts
    - packages/db/src/schema.ts
    - packages/db/src/dynasty-db.ts
    - packages/sport-configs/src/cfb.ts
    - packages/sport-configs/src/madden.ts
  modified:
    - packages/core-types/src/index.ts
    - packages/db/src/index.ts
    - packages/db/package.json
    - packages/sport-configs/src/index.ts
    - packages/sport-configs/package.json
    - apps/desktop/src/App.tsx

key-decisions:
  - "SportType is 'cfb' | 'madden' (lowercase): matches getSportConfig() key pattern for string lookups"
  - "Dexie Table<T, string> used over EntityTable: Dexie v4.3.0 exports Table, not EntityTable"
  - "PlayerSeason.stats is Record<string, number>: flexible stat storage without schema migration per sport"
  - "Composite indexes added for common query patterns: [dynastyId+year] for season lookup by dynasty+year"
  - "CFB includes all 4 major conferences (SEC 16, Big Ten 18, Big 12 16, ACC 17) with 2024-25 alignment"
  - "Madden omits classYears and rankingSystems: NFL franchise has no recruiting years or polls"

patterns-established:
  - "Sport Config isolation: cfb.ts and madden.ts export named config objects; index.ts maps them to SportType keys"
  - "getSportConfig(sport) throws on unknown key: fail-fast prevents silent wrong-sport data"
  - "All entity types have id:string (UUID), dynastyId:string, createdAt:number, updatedAt:number"
  - "Optional fields use ? suffix: avoids null checks while keeping types accurate (notes?, bowlGame?, etc.)"

# Metrics
duration: 4min
completed: 2026-02-22
---

# Phase 01 Plan 03: Core Types, Dexie DB, and Sport Configs Summary

**Full TypeScript entity model (Dynasty/Season/Game/Player/PlayerSeason), Dexie v4 ORM with 5 indexed tables, and sport configs for CFB (Power 4 + G5) and Madden NFL (all 32 teams) with getSportConfig() dynamic resolver**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-22T01:35:41Z
- **Completed:** 2026-02-22T01:39:42Z
- **Tasks:** 2 completed
- **Files modified:** 15

## Accomplishments

- Defined 8 TypeScript interfaces/types across 5 files; all exported from @dynasty-os/core-types with full .d.ts output
- Implemented DynastyDB extending Dexie v4 with 5 typed tables and composite indexes for efficient dynasty/season/player queries
- Created complete CFB config (130+ teams across 10 conferences including all Power 4 2024-25 alignments) and Madden config (all 32 NFL teams in 8 divisions) both implementing SportConfig interface

## Task Commits

Each task was committed atomically:

1. **Task 1: Define core TypeScript types for all entities** - `8b72bb3` (feat)
2. **Task 2: Implement Dexie database schema and sport configs** - `59fbace` (feat)

**Plan metadata:** (docs commit - see below)

## Files Created/Modified

- `packages/core-types/src/dynasty.ts` - Dynasty interface, SportType union ('cfb' | 'madden')
- `packages/core-types/src/season.ts` - Season interface with bowl/playoff/ranking fields
- `packages/core-types/src/game.ts` - Game, GameType, GameResult, HomeAway types
- `packages/core-types/src/player.ts` - Player, PlayerSeason, PlayerStatus types
- `packages/core-types/src/sport-config.ts` - SportConfig, TeamInfo, Conference, StatCategory interfaces
- `packages/core-types/src/index.ts` - Re-exports all types from all modules
- `packages/db/src/schema.ts` - SCHEMA constant with 5 Dexie table definitions and indexes
- `packages/db/src/dynasty-db.ts` - DynastyDB class extending Dexie v4; singleton db export
- `packages/db/src/index.ts` - Exports DynastyDB, db, SCHEMA, DB_NAME, DB_VERSION
- `packages/db/package.json` - Added @dynasty-os/core-types workspace:* dependency
- `packages/sport-configs/src/cfb.ts` - Complete CFB config: 130+ teams, 10 conferences, 22 stat categories
- `packages/sport-configs/src/madden.ts` - Complete Madden config: 32 NFL teams, 8 divisions, 22 stat categories
- `packages/sport-configs/src/index.ts` - getSportConfig() resolver, re-exports cfbConfig and maddenConfig
- `packages/sport-configs/package.json` - Added @dynasty-os/core-types workspace:* dependency
- `apps/desktop/src/App.tsx` - Updated to use new Dynasty interface (bug fix - see Deviations)

## Decisions Made

- SportType uses lowercase keys ('cfb' | 'madden') to match getSportConfig() string lookup pattern - avoids case transformation
- Used `Table<T, string>` over `EntityTable<T>` - Dexie v4.3.0 exports Table, EntityTable is a different concept
- PlayerSeason.stats typed as `Record<string, number>` - allows CFB-specific stats (passerRating, puntAverage) and Madden stats to be stored without schema migration
- Added composite indexes ([dynastyId+year], [dynastyId+seasonId], [playerId+year]) for the most common query patterns
- Madden config omits classYears and rankingSystems - NFL franchise mode has no recruiting class years or polling systems

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated App.tsx to use new Dynasty interface**

- **Found during:** Task 2 (full root build verification)
- **Issue:** apps/desktop/src/App.tsx used the old placeholder Dynasty type (`{ id, name }`) and imported `CORE_TYPES_VERSION` which no longer exists after Task 1 replaced it with the full interface. Build failed with TS2305 and TS2740.
- **Fix:** Updated App.tsx to provide all required Dynasty fields and removed the deleted CORE_TYPES_VERSION import. Kept the same visual UI structure.
- **Files modified:** apps/desktop/src/App.tsx
- **Verification:** `pnpm build` succeeds across all 5 packages
- **Committed in:** 59fbace (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary fix for monorepo to compile. Plan 01-02 (Tauri) will also modify App.tsx - this fix is minimal and compatible.

## Issues Encountered

None beyond the deviation documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- @dynasty-os/core-types exports all entity types ready for UI consumption in Plan 01-04 (routing)
- DynastyDB with full Dexie schema ready for CRUD operations in Plan 01-04 (dynasty management UI)
- getSportConfig() resolver ready for sport-specific dropdowns in dynasty creation forms
- All 5 packages build cleanly; no TypeScript errors across entire monorepo
- No blockers for Plan 01-04 or any Phase 2+ plans

---
*Phase: 01-foundation*
*Completed: 2026-02-22*
