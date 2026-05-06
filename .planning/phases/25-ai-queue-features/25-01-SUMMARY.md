---
phase: 25-ai-queue-features
plan: "01"
subsystem: ai-queue
tags: [ai-queue, model-routing, game-narrative, haiku, sonnet]
dependency_graph:
  requires: []
  provides: [game-narrative-job-type, model-routing-constants, logGame-auto-enqueue]
  affects: [ai-queue-store, narrative-service, game-store]
tech_stack:
  added: []
  patterns: [fire-and-forget-enqueue, model-routing-constants]
key_files:
  created: []
  modified:
    - apps/desktop/src/store/ai-queue-store.ts
    - apps/desktop/src/lib/narrative-service.ts
    - apps/desktop/src/store/game-store.ts
decisions:
  - HAIKU_MODEL constant set to claude-haiku-4-5-20251001 (consistent with recruiting-service and screenshot-service)
  - SONNET_MODEL constant set to claude-sonnet-4-6 (consistent with existing narrative usage)
  - callClaudeApiWithModel takes model as explicit 4th parameter; no default — routing is always intentional
  - enqueueAiJob is fire-and-forget inside logGame; never blocks the game save path
  - hasApiKey gate on enqueue — job only created when user has an API key configured
metrics:
  duration: "2 min"
  completed: "2026-05-06T04:27:58Z"
  tasks: 2
  files_modified: 3
---

# Phase 25 Plan 01: AI Job Type, Model Routing, and Game-Narrative Auto-Enqueue Summary

**One-liner:** Added 'game-narrative' to AiJob type union, wired Haiku/Sonnet model routing constants in narrative-service, and auto-enqueue a game-narrative job on every logGame call when an API key is configured.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add game-narrative to AiJob type and model routing | c38e643 | ai-queue-store.ts, narrative-service.ts |
| 2 | Auto-enqueue game-narrative job in logGame | a85ee16 | game-store.ts |

## What Was Built

**Task 1 — AiJob type + model routing:**
- Added `'game-narrative'` to the `AiJob.type` union in `ai-queue-store.ts`
- Added `HAIKU_MODEL = 'claude-haiku-4-5-20251001'` and `SONNET_MODEL = 'claude-sonnet-4-6'` constants in `narrative-service.ts`
- Renamed `callClaudeApi` to `callClaudeApiWithModel` with an explicit `model: string` 4th parameter
- `generateGameNarrative` now calls with `HAIKU_MODEL` (was hardcoded Sonnet — bug fix)
- `generateSeasonNarrative` now calls with `SONNET_MODEL` (correct model, now explicit)

**Task 2 — Auto-enqueue in logGame:**
- Imported `useAiQueueStore` and `usePrefsStore` in `game-store.ts`
- After toast success in `logGame`, added fire-and-forget `enqueueAiJob` call gated on `hasApiKey`
- Payload: `{ gameId: game.id, seasonId: input.seasonId, dynastyId: input.dynastyId }` — all three IDs required by Plan 03 queue processor

## Deviations from Plan

None — plan executed exactly as written.

The existing `callClaudeApi` had `data?.content?.[0]?.text` with implicit type inference. The rename to `callClaudeApiWithModel` added an explicit cast `(data as { content?: Array<{ text?: string }> })?.content?.[0]?.text` as specified in the plan action — this is a type-safety improvement consistent with the plan's intent.

## Known Stubs

None. All three files wire real behavior — no placeholder values or stub data paths.

## Threat Surface Scan

No new network endpoints, auth paths, or file access patterns introduced. The enqueue in `game-store.ts` passes only typed IDs (never the API key). Model constants are compile-time string literals. Trust boundary analysis matches the plan's threat model:
- T-25-01: Payload typed and constructed from validated Game record — mitigated as planned
- T-25-02: No API key in payload — key is read by Rust inside call_anthropic — mitigated as planned
- T-25-03: Accepted (no re-enqueue on failure, clearCompleted() in Plan 03 processor)

## Self-Check: PASSED

- FOUND: apps/desktop/src/store/ai-queue-store.ts
- FOUND: apps/desktop/src/lib/narrative-service.ts
- FOUND: apps/desktop/src/store/game-store.ts
- FOUND: .planning/phases/25-ai-queue-features/25-01-SUMMARY.md
- FOUND commit: c38e643 (Task 1)
- FOUND commit: a85ee16 (Task 2)
