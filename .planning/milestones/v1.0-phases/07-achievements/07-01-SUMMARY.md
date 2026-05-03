---
phase: 07-achievements
plan: "01"
subsystem: database
tags: [dexie, zustand, achievements, milestones, indexeddb]

# Dependency graph
requires:
  - phase: 06-social-and-legacy
    provides: DB v4 schema with rivals and scoutingNotes tables
provides:
  - Achievement interface and MILESTONE_DEFINITIONS (14 milestones across 3 categories)
  - DB v5 schema migration with achievements table
  - evaluateAchievements(dynastyId) idempotent milestone engine
  - getAchievementsByDynasty(dynastyId) service function
  - useAchievementStore Zustand store with loadAchievements action
affects: [07-02-achievements-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Achievement idempotency via Set of existing achievementId lookups before insert
    - db.achievements.put() upsert for milestone persistence (compound id key)
    - Case-insensitive championship detection via includes('champion') on free-text playoffResult

key-files:
  created:
    - packages/core-types/src/achievement.ts
    - apps/desktop/src/lib/achievement-service.ts
    - apps/desktop/src/store/achievement-store.ts
  modified:
    - packages/core-types/src/index.ts
    - packages/db/src/schema.ts
    - packages/db/src/dynasty-db.ts
    - apps/desktop/src/store/index.ts

key-decisions:
  - "playoffResult championship detection uses case-insensitive includes('champion') because the field is free-text (user types 'CFP Champion', 'National Champion', etc.) — strict equality would never match"
  - "Achievement id compound key is dynastyId+achievementId string to enable put() upsert idempotency without separate exists check"
  - "Dexie multi-version migration: version(5).stores(SCHEMA) added alongside existing version(1) and version(4) to register upgrade path"

patterns-established:
  - "Achievement idempotency: load unlockedIds Set, skip any achievementId already present before inserting"
  - "evaluateAchievements called after data save events (game logged, season ended) — safe to call repeatedly"

requirements-completed: [ACHV-01]

# Metrics
duration: 2min
completed: 2026-02-24
---

# Phase 7 Plan 01: Achievement Engine Data Layer Summary

**Idempotent milestone engine with DB v5 schema, 14 MILESTONE_DEFINITIONS across wins/bowl-wins/championships categories, and Zustand store for React consumption**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-24T19:42:04Z
- **Completed:** 2026-02-24T19:43:37Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Achievement interface and 14 MILESTONE_DEFINITIONS (5 wins, 4 bowl-wins, 5 championships milestones)
- DB v5 migration with achievements table indexed on dynastyId, achievementId, and compound [dynastyId+achievementId]
- evaluateAchievements(dynastyId) — idempotent engine that reads existing unlocked IDs, computes current stats, and persists newly-reached milestones via put() upsert
- useAchievementStore with loadAchievements(dynastyId) sorted by most-recently-unlocked first

## Task Commits

Each task was committed atomically:

1. **Task 1: Achievement type, DB v5 migration, achievement service** - `db627b2` (feat)
2. **Task 2: Achievement Zustand store** - `3f154e9` (feat)

## Files Created/Modified
- `packages/core-types/src/achievement.ts` - Achievement interface and MILESTONE_DEFINITIONS const array
- `packages/core-types/src/index.ts` - Added `export * from './achievement'`
- `packages/db/src/schema.ts` - Added achievements table to SCHEMA, bumped DB_VERSION to 5
- `packages/db/src/dynasty-db.ts` - Added Achievement import, achievements Table declaration, version(5).stores(SCHEMA)
- `apps/desktop/src/lib/achievement-service.ts` - evaluateAchievements() and getAchievementsByDynasty() with private helpers
- `apps/desktop/src/store/achievement-store.ts` - useAchievementStore with loadAchievements action
- `apps/desktop/src/store/index.ts` - Added export for useAchievementStore

## Decisions Made
- Championship detection uses `s.playoffResult.toLowerCase().includes('champion')` because `Season.playoffResult` is a free-text field — users type "CFP Champion", "National Champion", etc., so strict equality to 'champion' would never match real data
- Bowl win detection uses `s.bowlGame && s.bowlResult === 'W'` which matches exactly the typed `'W' | 'L' | undefined` enum in the Season interface
- Achievement compound `id` field is `${dynastyId}-${def.achievementId}` enabling `db.achievements.put()` upsert without a separate existence check

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Championship detection adapted from strict equality to case-insensitive substring match**
- **Found during:** Task 1 (achievement-service.ts implementation)
- **Issue:** Plan suggested `playoffResult === 'champion'` but Season.playoffResult is a free-text string (typed as `string | undefined`). The SeasonEndModal confirms this is a plain text input — users type anything. Strict equality would never unlock championships.
- **Fix:** Changed to `s.playoffResult.toLowerCase().includes('champion')` to match "CFP Champion", "National Champion", "champion", etc.
- **Files modified:** apps/desktop/src/lib/achievement-service.ts
- **Verification:** Build passes, logic correct for all common user inputs
- **Committed in:** db627b2 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Essential correctness fix. Without this, championships category would never unlock for any user.

## Issues Encountered
None — build passed cleanly on first attempt after each task.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Achievement engine data layer is complete and ready for Plan 02 UI
- evaluateAchievements(dynastyId) can be called from DashboardPage after game log or season end
- useAchievementStore provides achievements array sorted by unlockedAt desc — ready for display in AchievementsPage

---
*Phase: 07-achievements*
*Completed: 2026-02-24*
