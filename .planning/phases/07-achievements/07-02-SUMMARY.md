---
phase: 07-achievements
plan: "02"
subsystem: ui
tags: [achievements, trophy-room, coaching-resume, navigation, zustand, dexie]

# Dependency graph
requires:
  - phase: 07-achievements
    plan: "01"
    provides: evaluateAchievements(), useAchievementStore, MILESTONE_DEFINITIONS, DB v5 achievements table
provides:
  - evaluateAchievements hooked into createGame() and updateSeason() — milestones unlock automatically
  - TrophyRoomPage showing 14 MILESTONE_DEFINITIONS grouped by category with earned/locked status
  - CoachingResumePage with career stat aggregation (overall record, win%, bowl record, championships, seasons, total games)
  - Dashboard Trophy Room and Coaching Resume amber navigation buttons
  - 'trophy-room' and 'coaching-resume' pages wired into App.tsx routing
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Fire-and-forget achievement evaluation via evaluateAchievements(dynastyId).catch(()=>{}) — same pattern as Claude Haiku Legacy Card blurbs
    - Direct DB queries in CoachingResumePage (no service layer) — matches records-service no-cache pattern
    - TrophyRoomPage uses Map for O(1) earned achievement lookup keyed on achievementId
    - Promise.all for parallel seasons + games fetch in CoachingResumePage

key-files:
  created:
    - apps/desktop/src/pages/TrophyRoomPage.tsx
    - apps/desktop/src/pages/CoachingResumePage.tsx
  modified:
    - apps/desktop/src/lib/game-service.ts
    - apps/desktop/src/lib/season-service.ts
    - apps/desktop/src/store/navigation-store.ts
    - apps/desktop/src/pages/DashboardPage.tsx
    - apps/desktop/src/App.tsx

key-decisions:
  - "evaluateAchievements fires as fire-and-forget (.catch(()=>{})): achievement evaluation is background enrichment — failure must never block game logging or season update"
  - "CoachingResumePage uses direct db queries (no service): career stats are page-specific aggregations with no sharing risk and fresh reads are correct at dynasty scale"
  - "TrophyRoomPage uses Map<achievementId, Achievement> for earned lookup: O(1) per-milestone check vs O(n) array search across 14 definitions"

requirements-completed: [ACHV-01, ACHV-02, ACHV-03]

# Metrics
duration: 3min
completed: 2026-02-24
---

# Phase 7 Plan 02: Achievement UI and Save Hooks Summary

**evaluateAchievements wired into game and season save paths, TrophyRoomPage displaying all 14 milestones with earned/locked status, CoachingResumePage aggregating career stats (record, win%, bowl, championships) from live DB queries**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-24
- **Completed:** 2026-02-24
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Achievement evaluation now fires automatically when users log a game (createGame) or update season data (updateSeason with bowl/playoff results) — closes the ACHV-01 engine loop
- TrophyRoomPage shows all 14 MILESTONE_DEFINITIONS grouped into three sections (Win Milestones, Bowl Wins, Championships) with earned achievements showing amber border, star, green "Unlocked" badge and formatted date; locked achievements shown dimmed with gray "Locked" badge
- Achievement count summary ("X / Y achievements earned") at top of TrophyRoomPage
- CoachingResumePage computes 6 career stat cards fresh from DB on mount: Overall Record, Win %, Bowl Record, Championships, Seasons Coached, Total Games
- Win % and Championships highlighted in amber-400; other stats in white per spec
- CoachingResumePage cross-links to TrophyRoomPage via "View Trophy Room" button with achievement count
- Dashboard Actions section has Trophy Room and Coaching Resume amber buttons above Manage Roster — sport-agnostic (visible for CFB and Madden dynasties)
- navigation-store Page union extended with 'trophy-room' and 'coaching-resume'; goToTrophyRoom() and goToCoachingResume() actions added
- App.tsx routes both pages

## Task Commits

Each task was committed atomically:

1. **Task 1: Hook evaluateAchievements into game-service and season-service** - `e0e9b03` (feat)
2. **Task 2: TrophyRoomPage with navigation wiring** - `5b5336a` (feat)
3. **Task 3: CoachingResumePage career stats aggregation** - `42ec4cc` (feat)

## Files Created/Modified

- `apps/desktop/src/lib/game-service.ts` - Added evaluateAchievements import and fire-and-forget call in createGame() after recalculateSeasonRecord
- `apps/desktop/src/lib/season-service.ts` - Added evaluateAchievements import and fire-and-forget call in updateSeason() after DB write
- `apps/desktop/src/store/navigation-store.ts` - Extended Page union with 'trophy-room' and 'coaching-resume'; added goToTrophyRoom/goToCoachingResume actions
- `apps/desktop/src/pages/TrophyRoomPage.tsx` - Full trophy room UI with 14 milestone definitions in 3 category groups, earned/locked status per milestone, achievement count summary
- `apps/desktop/src/pages/CoachingResumePage.tsx` - Career stats aggregation page with 6 stat cards, parallel DB query loading, achievement cross-link to Trophy Room
- `apps/desktop/src/pages/DashboardPage.tsx` - Added Trophy Room and Coaching Resume amber buttons in Actions section
- `apps/desktop/src/App.tsx` - Added TrophyRoomPage and CoachingResumePage imports and routing cases

## Decisions Made

- Achievement evaluation fires as fire-and-forget: `.catch(() => {})` pattern ensures failures in the achievement engine never propagate to user-facing game logging or season update flows. Same pattern established for Claude Haiku Legacy Card blurbs.
- CoachingResumePage does not use a service layer: career stat aggregation is page-specific (not shared with other pages), data sets are small at dynasty scale, and fresh reads are always correct. Pattern matches records-service no-cache approach.
- TrophyRoomPage uses `Map<achievementId, Achievement>` derived from the earned achievements array for O(1) per-milestone lookup across 14 definitions.
- In-game championship detection uses `s.playoffResult.toLowerCase().includes('champion')` — consistent with the decision made in 07-01 for evaluateAchievements itself.

## Deviations from Plan

None - plan executed exactly as written. CoachingResumePage stub was created temporarily to allow Task 2's build to compile (App.tsx references both pages), then replaced with the full implementation in Task 3.

## Issues Encountered

None — all three builds passed cleanly on first attempt.

## User Setup Required

None - no external service configuration required.

## Self-Check: PASSED

- `apps/desktop/src/pages/TrophyRoomPage.tsx` exists: FOUND
- `apps/desktop/src/pages/CoachingResumePage.tsx` exists: FOUND
- Commit e0e9b03 exists: FOUND
- Commit 5b5336a exists: FOUND
- Commit 42ec4cc exists: FOUND
- Build passes (5/5 packages): FOUND

---
*Phase: 07-achievements*
*Completed: 2026-02-24*
