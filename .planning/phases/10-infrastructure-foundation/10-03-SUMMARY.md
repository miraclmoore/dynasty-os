---
phase: 10-infrastructure-foundation
plan: 03
subsystem: ai-cache
tags: [dexie, indexeddb, ai-cache, localStorage-migration, narrative, legacy-blurb]

# Dependency graph
requires:
  - phase: 10-01
    provides: Dexie v6 aiCache table and AiContentType union type
provides:
  - ai-cache-service.ts with getAiCache/setAiCache/deleteAiCache + LRU eviction at 100 entries per dynasty
  - narrative-service.ts reads/writes season narratives via aiCache
  - legacy-card-service.ts reads/writes legacy blurbs via aiCache
  - timeline-service.ts reads narrative taglines via aiCache
  - INFRA-GATE-2: no AI content written to localStorage after this plan
affects: [11-qol-wins, 13-ai-intelligence-layer]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - aiCache service layer: single entry point (ai-cache-service.ts) for all Dexie aiCache reads/writes
    - LRU eviction on insert path only: update path skips eviction to avoid unnecessary queries
    - Async blurb loading in LegendsPage: useEffect with Promise.all loads blurbs from Dexie into state
    - dynastyId threading: all aiCache calls require dynastyId for proper LRU scoping per dynasty

key-files:
  created:
    - apps/desktop/src/lib/ai-cache-service.ts
  modified:
    - apps/desktop/src/lib/narrative-service.ts
    - apps/desktop/src/lib/legacy-card-service.ts
    - apps/desktop/src/lib/timeline-service.ts
    - apps/desktop/src/store/narrative-store.ts
    - apps/desktop/src/pages/SeasonRecapPage.tsx
    - apps/desktop/src/pages/PlayerProfilePage.tsx
    - apps/desktop/src/pages/LegendsPage.tsx

key-decisions:
  - "ai-cache-service.ts is the single Dexie aiCache wrapper: all AI content access goes through getAiCache/setAiCache/deleteAiCache — no direct db.aiCache calls in other files"
  - "LRU eviction only on insert path: update (existing cacheKey) skips eviction since count is unchanged; avoids extra sortBy query on every update"
  - "dynastyId threading via Dynasty object: narrative-service already receives Dynasty param; aiCache requires dynastyId for LRU scoping"
  - "loadCachedNarrative made async in NarrativeStore: Dexie reads are async; signature changed from (seasonId) to (dynastyId, seasonId)"
  - "getCachedBlurb/setCachedBlurb helpers added to legacy-card-service: pages call these instead of directly importing ai-cache-service"
  - "LegendsPage blurbs loaded via useEffect + Promise.all: useMemo cannot be async; state (blurbsByPlayerId) populated after Dexie reads complete"
  - "Old localStorage entries (dynasty-os-narrative-* and legacy-blurb-*) silently orphaned: no migration code written per RESEARCH.md decision (AI content is regeneratable)"

requirements-completed: [INFRA-GATE-2]

# Metrics
duration: 4min
completed: 2026-02-25
---

# Phase 10 Plan 03: aiCache Service Layer and localStorage Migration Summary

**aiCache service layer created (getAiCache/setAiCache/deleteAiCache with LRU eviction at 100 per dynasty) and all localStorage AI content caching migrated to Dexie aiCache across narrative, legacy blurb, and timeline services**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-02-25T04:38:52Z
- **Completed:** 2026-02-25T04:42:39Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- `ai-cache-service.ts` created as the canonical wrapper for all Dexie `aiCache` table operations
- LRU eviction implemented: after each insert, entries exceeding 100 per dynasty are deleted oldest-first via `bulkDelete`
- `narrative-service.ts` fully migrated: `getCachedNarrative` and `clearCachedNarrative` are now async and use `getAiCache`/`deleteAiCache`; `generateSeasonNarrative` writes to `setAiCache` instead of `localStorage.setItem`
- `legacy-card-service.ts` augmented with `getCachedBlurb`/`setCachedBlurb` helpers; page components updated to use these
- `timeline-service.ts` migrated: reads narrative taglines from `getAiCache` instead of `localStorage.getItem`
- `narrative-store.ts` updated: `loadCachedNarrative` is now async and accepts `dynastyId`
- `SeasonRecapPage.tsx`, `PlayerProfilePage.tsx`, `LegendsPage.tsx` all updated to use Dexie-backed cache
- API key (`dynasty-os-anthropic-api-key`) remains in localStorage — only AI-generated content migrated
- Desktop build passes with 0 TypeScript errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ai-cache-service.ts** - `82f29d0` (feat)
2. **Task 2: Migrate narrative-service.ts and legacy-card-service.ts** - `5cfb400` (feat)

## Files Created/Modified

- `apps/desktop/src/lib/ai-cache-service.ts` — NEW: getAiCache/setAiCache/deleteAiCache + LRU eviction
- `apps/desktop/src/lib/narrative-service.ts` — getCachedNarrative/clearCachedNarrative async + aiCache; generateSeasonNarrative writes aiCache
- `apps/desktop/src/lib/legacy-card-service.ts` — added getCachedBlurb/setCachedBlurb helpers using aiCache
- `apps/desktop/src/lib/timeline-service.ts` — reads narrative taglines from aiCache instead of localStorage
- `apps/desktop/src/store/narrative-store.ts` — loadCachedNarrative signature updated to (dynastyId, seasonId): Promise<void>
- `apps/desktop/src/pages/SeasonRecapPage.tsx` — passes activeDynasty.id to loadCachedNarrative
- `apps/desktop/src/pages/PlayerProfilePage.tsx` — uses getCachedBlurb/setCachedBlurb; useEffect depends on activeDynasty.id
- `apps/desktop/src/pages/LegendsPage.tsx` — blurbs loaded async via getCachedBlurb in useEffect; blurbsByPlayerId state

## Decisions Made

- `ai-cache-service.ts` is the single point of access for `db.aiCache` — no other file queries the table directly
- LRU eviction runs only on the insert path (new cache key), skipped on updates to avoid unnecessary read overhead
- `getCachedBlurb`/`setCachedBlurb` added to `legacy-card-service.ts` as the blurb cache API — keeps the interface cohesive and avoids leaking `ai-cache-service` imports into page components
- `LegendsPage` blurb loading moved from synchronous `useMemo` to async `useEffect` with `Promise.all` — Dexie reads cannot be synchronous

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Migrated timeline-service.ts localStorage narrative reads**
- **Found during:** Task 2 verification grep
- **Issue:** `timeline-service.ts` reads `localStorage.getItem('dynasty-os-narrative-{seasonId}')` — the plan verification grep caught this as a match
- **Fix:** Updated `getTimelineNodes` to use `getAiCache(dynastyId, ...)` instead; function was already async so no signature change required
- **Files modified:** `apps/desktop/src/lib/timeline-service.ts`
- **Commit:** `5cfb400` (included in Task 2 commit)

**2. [Rule 2 - Missing Critical Functionality] Updated PlayerProfilePage.tsx and LegendsPage.tsx localStorage blurb reads/writes**
- **Found during:** Task 2 — grep showed `localStorage.*legacy-blurb` in page files, outside `lib/`
- **Issue:** Pages directly used `localStorage.getItem/setItem` for blurbs; `legacy-card-service.ts` did not previously handle the cache persistence pattern
- **Fix:** Added `getCachedBlurb`/`setCachedBlurb` to `legacy-card-service.ts`; updated both pages to use them; `LegendsPage` now loads blurbs via async `useEffect`
- **Files modified:** `apps/desktop/src/pages/PlayerProfilePage.tsx`, `apps/desktop/src/pages/LegendsPage.tsx`
- **Commit:** `5cfb400`

**3. [Rule 2 - Missing Critical Functionality] Updated narrative-store.ts and SeasonRecapPage.tsx for async getCachedNarrative**
- **Found during:** Task 2 — making `getCachedNarrative` async required updating its callers
- **Issue:** `narrative-store.ts` called `getCachedNarrative(seasonId)` synchronously; the now-async signature required threading `dynastyId`
- **Fix:** `loadCachedNarrative` in store made async and signature updated; `SeasonRecapPage.tsx` updated to pass `activeDynasty.id`
- **Files modified:** `apps/desktop/src/store/narrative-store.ts`, `apps/desktop/src/pages/SeasonRecapPage.tsx`
- **Commit:** `5cfb400`

## User Setup Required

None — Dexie aiCache table was created in Phase 10-01.

## Next Phase Readiness

- INFRA-GATE-2 satisfied: no AI content written to localStorage; all AI cache reads/writes go through Dexie aiCache
- Phase 13 AI features can write directly to aiCache via `setAiCache` from day one
- `AiContentType` re-exported from `ai-cache-service.ts` for convenience

---
*Phase: 10-infrastructure-foundation*
*Completed: 2026-02-25*
