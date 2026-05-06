---
phase: 25-ai-queue-features
plan: "03"
subsystem: desktop-app
tags: [ai-queue, game-narrative, useEffect, zustand, haiku]

dependency_graph:
  requires:
    - 25-01  # AiJob.type includes 'game-narrative'; generateGameNarrative uses HAIKU_MODEL
    - 25-02  # logGame auto-enqueues game-narrative job in game-store
  provides:
    - AIQE-01  # Queue processor running in App.tsx — enqueued jobs now run to completion
  affects:
    - apps/desktop/src/App.tsx

tech_stack:
  added: []
  patterns:
    - useRef as concurrency guard (processingRef) inside useEffect
    - Zustand getState() for fire-and-forget actions inside async callbacks
    - Module-level async function (processJob) for type-dispatched job execution

key_files:
  created: []
  modified:
    - apps/desktop/src/App.tsx

decisions:
  - processJob defined at module scope (not inside component) to avoid stale-closure risk and keep component body readable
  - processingRef.current guard checked before any async dispatch — prevents double-processing when pendingAiJobs array changes mid-flight
  - clearCompleted() called in .finally() so done/failed jobs are removed regardless of outcome
  - generateGameNarrative called with tone 'espn' matching the default used by SeasonRecapPage
  - Unknown AiJob types fall through as no-ops (T-25-06 mitigation)

metrics:
  duration_minutes: 8
  completed_date: "2026-05-05"
  tasks_completed: 1
  tasks_total: 1
  files_modified: 1
---

# Phase 25 Plan 03: Queue Processor (App.tsx) Summary

**One-liner:** useQueueProcessor hook in App.tsx wires pendingAiJobs from Zustand to processJob, dispatching game-narrative jobs to generateGameNarrative (Haiku model) with a processingRef concurrency guard and clearCompleted() after each cycle.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add useQueueProcessor hook inline in App.tsx | b3b2c79 | apps/desktop/src/App.tsx |

## What Was Built

App.tsx now subscribes to `pendingAiJobs` from `useAiQueueStore`. When a pending job is found:

1. `processingRef.current` is checked to prevent concurrent dispatch
2. Job status is set to `'running'` via `updateJobStatus`
3. `processJob(pending)` is called — dispatches on `job.type`:
   - `'game-narrative'`: fetches game/season/dynasty from Dexie, calls `generateGameNarrative` (HAIKU_MODEL)
   - All other types: no-op (future extension point)
4. On resolution: status set to `'done'` or `'failed'`
5. In `.finally()`: `processingRef.current = false`, then `clearCompleted()` removes done/failed jobs

The processor is fully non-blocking — it never awaits inside the useEffect synchronously. The UI remains responsive throughout.

## Deviations from Plan

None — plan executed exactly as written. The `clearCompleted` grep count returned 2 (comment + call) rather than the plan's stated 1, but this is a documentation wording issue in the acceptance criteria, not a functional deviation. The implementation is correct.

## Threat Mitigations Applied

| ID | Threat | Mitigation |
|----|--------|-----------|
| T-25-06 | Tampering via unknown job types | Unknown types fall through processJob as no-ops; payload cast to explicit struct per job type |
| T-25-07 | DoS via processingRef double-trigger | `processingRef.current = true` at top of effect before any async work; reset in `.finally()` |
| T-25-08 | DoS via done/failed job accumulation | `clearCompleted()` called in `.finally()` after every cycle |

## Known Stubs

None. The queue processor is fully wired: pendingAiJobs -> processJob -> generateGameNarrative -> aiCache.

## Threat Flags

None. No new network endpoints, auth paths, or file access patterns introduced beyond what Plan 01 already established via generateGameNarrative/callAnthropic.

## Self-Check: PASSED

- [x] apps/desktop/src/App.tsx modified and committed at b3b2c79
- [x] Build passes: `pnpm --filter desktop build` exits 0 (1303 modules transformed)
- [x] processJob function present at module scope
- [x] pendingAiJobs subscription and processingRef guard present in App component
- [x] clearCompleted() called in .finally()
- [x] generateGameNarrative imported and called with correct signature (dynasty, season, game, 'espn')
