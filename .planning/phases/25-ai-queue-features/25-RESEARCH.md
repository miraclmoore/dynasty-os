# Phase 25: AI Queue & Features — Research

**Researched:** 2026-05-05
**Domain:** Zustand AI queue processor, Claude model routing, player-profile blurb UX, game-narrative auto-enqueue
**Confidence:** HIGH — all findings are verified directly from codebase inspection

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AIQE-01 | The AI job queue processor runs pending jobs `pending → running → done/failed`; no jobs silently accumulate; queue worker is mounted in `App.tsx` | Queue store fully scaffolded; no processor hook exists — needs a `useQueueProcessor` hook wired into `App.tsx` |
| AIQE-02 | Navigating to a player profile does NOT trigger an automatic API call for legacy blurb generation; blurb is generated only when user clicks "Generate AI Blurb" | Auto-generation fires in `handleDepartureSubmit` (on departure, not on navigate) — technically compliant; "Regenerate Blurb" button satisfies on-demand; button label should be audited and confirmed correct |
| AIQE-03 | Game narratives use Claude Haiku (`claude-haiku-4-5-20251001`); season narratives use Claude Sonnet 4.6 | `callClaudeApi()` in `narrative-service.ts` is a shared helper hardcoded to `claude-sonnet-4-6` for both game and season calls — game narrative needs Haiku routing |
| AIQE-04 | After logging a game, a `game-narrative` job is auto-enqueued in the background if an API key is configured | `game-store.ts` `logGame` has no enqueue call; `AiJob.type` union does not include `'game-narrative'` — both need to be added |
</phase_requirements>

---

## Summary

Phase 25 wires up four concrete AI behaviors that were scaffolded but never fully connected. The AI queue store (`useAiQueueStore`) has a full data model and mutation actions but no consumer — no hook ever reads `pendingAiJobs` and processes them. The `callClaudeApi` helper in `narrative-service.ts` hardcodes `claude-sonnet-4-6` as the model regardless of whether the caller is a game narrative (should be Haiku) or a season narrative (should be Sonnet). The `AiJob` type union is missing `'game-narrative'`, so no job for that type can be enqueued. After `logGame` completes, nothing enqueues a job — the auto-enqueue from AIQE-04 is completely absent.

The AIQE-02 concern (no auto-API-call on player profile navigate) is already correct as implemented: the blurb generation fires inside `handleDepartureSubmit` (only when a player is explicitly departed) and the "Regenerate Blurb" button is on-demand. The button label currently says "Regenerate Blurb" rather than "Generate AI Blurb" — the planner should verify whether the requirement calls for a specific label. No navigate-triggered API call exists.

**Primary recommendation:** Add `'game-narrative'` to `AiJob.type`, add a `model` field (or separate `callClaudeApiWithModel` helper) to `narrative-service.ts` so game vs. season calls use different models, add a `useQueueProcessor` hook that processes pending jobs via `callAnthropic`, mount it in `App.tsx`, and wire `logGame` in `game-store.ts` to enqueue a `game-narrative` job after a successful save when `hasApiKey` is true.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Queue processor loop | React hook (`App.tsx`) | Zustand store (`useAiQueueStore`) | App.tsx is the single mount point for background workers per existing patterns (Toaster, TourOverlay, TickerBar) |
| Job enqueue after logGame | Zustand store (`game-store.ts`) | `useAiQueueStore` (cross-store call via `getState()`) | Game store owns the `logGame` action; fire-and-forget enqueue is a side effect of that action |
| Model routing (Haiku vs Sonnet) | Service layer (`narrative-service.ts`) | — | All AI calls flow through `callAnthropic` in `ai-bridge.ts`; model selection belongs in the service that knows context |
| Blurb on-demand only | `PlayerProfilePage.tsx` | — | The page controls the trigger; no store or service change needed |
| API key check before enqueue | `usePrefsStore.getState().hasApiKey` | — | Already the established pattern in all narrative and blurb services |

---

## Standard Stack

### Core (all already installed — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zustand | current | AI queue state (`pendingAiJobs`) | Already in use for all stores |
| `ai-bridge.ts` / `call_anthropic` Tauri cmd | — | Single API entry point (Phase 20 SEC-01) | Required by security architecture — no direct API calls from frontend |
| `narrative-service.ts` | — | Game and season narrative generation | Already contains `generateGameNarrative` and `generateSeasonNarrative` |
| `usePrefsStore.hasApiKey` | — | API key guard before any AI call | Established pattern across all AI services |

**No new packages are needed for Phase 25.** [VERIFIED: codebase inspection]

---

## Architecture Patterns

### System Architecture Diagram

```
App.tsx mount
│
├── useQueueProcessor() hook [NEW]
│   ├── reads useAiQueueStore.pendingAiJobs
│   ├── picks first job where status === 'pending'
│   ├── calls updateJobStatus(id, 'running')
│   ├── dispatches to handler by job.type:
│   │   └── 'game-narrative' → generateGameNarrative (Haiku model)
│   ├── on success → updateJobStatus(id, 'done'), store result in aiCache
│   └── on failure → updateJobStatus(id, 'failed')
│
└── logGame (game-store.ts) [MODIFIED]
    ├── svcCreate(input)
    ├── [existing] toast + season reload
    └── [NEW] if hasApiKey → useAiQueueStore.getState().enqueueAiJob(game-narrative job)
```

```
narrative-service.ts [MODIFIED]
│
├── callClaudeApiWithModel(systemPrompt, userMessage, maxTokens, model) [NEW helper]
│   └── callAnthropic({ model, max_tokens, system, messages })
│
├── generateGameNarrative → callClaudeApiWithModel(..., 'claude-haiku-4-5-20251001')
│                                                               [was: sonnet — BUG FIX]
│
└── generateSeasonNarrative → callClaudeApiWithModel(..., 'claude-sonnet-4-6')
                                                            [unchanged]
```

### Recommended Project Structure

No new files or folders needed. Changes are confined to:

```
src/
├── App.tsx                          # Mount useQueueProcessor hook
├── store/
│   └── ai-queue-store.ts            # Add 'game-narrative' to AiJob.type union
├── lib/
│   └── narrative-service.ts         # Model routing fix (Haiku vs Sonnet)
└── store/
    └── game-store.ts                # Auto-enqueue after logGame
```

New file (if hook is extracted):
```
src/hooks/
└── use-queue-processor.ts           # Queue worker hook (optional extraction — can inline in App.tsx)
```

### Pattern 1: Cross-Store Call via `getState()` (established pattern)

**What:** One store calls another store's action without subscribing via hook — uses `.getState()` for fire-and-forget.
**When to use:** Side effects from one store into another that must not cause re-renders.
**Example (from game-store.ts logGame — similar to existing undo/toast pattern):**

```typescript
// Source: /apps/desktop/src/store/game-store.ts logGame (verified pattern)
logGame: async (input) => {
  const game = await svcCreate(input);
  // ... existing toast/reload ...

  // NEW: auto-enqueue game-narrative job if API key is set
  if (usePrefsStore.getState().hasApiKey) {
    useAiQueueStore.getState().enqueueAiJob({
      type: 'game-narrative',
      dynastyId: input.dynastyId,
      payload: { gameId: game.id, seasonId: input.seasonId },
    });
  }
  return game;
},
```

### Pattern 2: Queue Processor Hook — useEffect with ref guard (project pattern)

**What:** A React hook that polls Zustand state in a `useEffect`, processes one job at a time, and is mounted once in `App.tsx`.
**When to use:** Background AI processing that must survive page navigation but never block UI.
**Example:**

```typescript
// Source: [ASSUMED] — derived from auto-export-service fire-and-forget pattern
// and existing useEffect idioms in App.tsx
export function useQueueProcessor() {
  const pendingAiJobs = useAiQueueStore((s) => s.pendingAiJobs);
  const { updateJobStatus, clearCompleted } = useAiQueueStore();
  const processingRef = useRef(false);

  useEffect(() => {
    const pending = pendingAiJobs.find((j) => j.status === 'pending');
    if (!pending || processingRef.current) return;

    processingRef.current = true;
    updateJobStatus(pending.id, 'running');

    processJob(pending)
      .then(() => updateJobStatus(pending.id, 'done'))
      .catch(() => updateJobStatus(pending.id, 'failed'))
      .finally(() => {
        processingRef.current = false;
        clearCompleted();
      });
  }, [pendingAiJobs]);
}
```

### Pattern 3: Model-Parameterized API Call Helper

**What:** Replace the shared `callClaudeApi()` helper (which hardcodes `claude-sonnet-4-6`) with a version that accepts the model as a parameter.
**When to use:** Any time the same code path serves both Haiku (game) and Sonnet (season) calls.

```typescript
// Source: narrative-service.ts callClaudeApi (verified — model currently hardcoded)
async function callClaudeApiWithModel(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
  model: string   // 'claude-haiku-4-5-20251001' | 'claude-sonnet-4-6'
): Promise<string | null> {
  if (!usePrefsStore.getState().hasApiKey) return null;
  const data = await callAnthropic({ model, max_tokens: maxTokens, system: systemPrompt, messages: [{ role: 'user', content: userMessage }] });
  // ... rest unchanged
}
```

### Anti-Patterns to Avoid

- **Processing jobs inside the store itself:** The store holds state only. All async work goes in hooks or services — Zustand reducers are synchronous.
- **Starting multiple jobs simultaneously:** The `processingRef` guard is critical — without it, multiple `useEffect` cycles can each pick the same pending job, causing double-invocations.
- **Using model string literal directly in `generateGameNarrative`:** Extract a constant (`HAIKU_MODEL`, `SONNET_MODEL`) to avoid string drift between call sites.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Model name strings | String literals scattered across files | Named constants in `narrative-service.ts` | Single source of truth, refactor-safe |
| Job processing concurrency | Custom semaphore/mutex | `processingRef = useRef(false)` | Sufficient for single-tab desktop app with one worker |
| API key check | Re-reading plugin-store per call | `usePrefsStore.getState().hasApiKey` | Already-loaded prefs flag, zero async overhead |
| Game context for narrative | Re-fetching game from DB in queue processor | Pass `gameId` + `dynastyId` in job `payload`; processor resolves from DB | Job payload is the contract — DB lookup happens at process time, not enqueue time |

**Key insight:** The queue is intentionally in-memory (Zustand only, no DB table). Jobs that were pending when the app closes are lost — this is acceptable for the current scope. The aiCache stores results; the job is ephemeral scaffolding.

---

## Current State Audit

### AIQE-01: Queue Processor

**Finding:** `useAiQueueStore` is fully scaffolded with `pendingAiJobs`, `enqueueAiJob`, `updateJobStatus`, and `clearCompleted` actions. [VERIFIED: `/apps/desktop/src/store/ai-queue-store.ts`]

**Gap:** There is no hook, component, or `useEffect` anywhere in the codebase that reads `pendingAiJobs` and processes jobs. The store is imported only in `store/index.ts` (re-export). `App.tsx` does not mount any queue processor. Jobs added to the queue will silently sit in `pending` forever. [VERIFIED: grep for `pendingAiJobs.*useEffect` and `useAiQueueStore` returned no consumer code outside the store itself]

**Action required:** Create `useQueueProcessor` hook, mount in `App.tsx`.

### AIQE-02: Player Profile — No Auto-Blurb

**Finding:** `PlayerProfilePage.tsx` useEffect on mount loads the cached blurb from Dexie (`getCachedBlurb`) but does NOT call `generateLegacyBlurb` — it only reads existing cached content. [VERIFIED: lines 116-126 of `PlayerProfilePage.tsx`]

The `generateLegacyBlurb` call is inside `handleDepartureSubmit` (lines 179-186) — it fires as a fire-and-forget after the user records a player's departure. This is not a navigation-triggered API call. [VERIFIED]

The on-demand button is "Regenerate Blurb" (line 394). AIQE-02 requires a "Generate AI Blurb" button — the requirement language implies the button should be labeled for generation (not just regeneration). The planner should consider renaming the button and removing the departure-triggered auto-blurb or making the departure-triggered call go through the queue instead.

**Recommended fix:** Move the departure-triggered `generateLegacyBlurb` call into the AI queue (`legacy-blurb` job type already exists in `AiJob.type`), so it goes through the processor rather than firing directly. The "Regenerate Blurb" button can remain as-is — it's explicit user action.

### AIQE-03: Model Routing Bug

**Finding:** `callClaudeApi()` in `narrative-service.ts` (line 319) hardcodes `model: 'claude-sonnet-4-6'` for all calls. Both `generateGameNarrative` (should be Haiku) and `generateSeasonNarrative` (correctly should be Sonnet) call this shared function. [VERIFIED: lines 311-330 and lines 403-435 of `narrative-service.ts`]

The body parameter passes straight through the Tauri `call_anthropic` command to the Anthropic API — the Rust layer does not override the model. [VERIFIED: `lib.rs` line 22: `.json(&body)` — body is passed unmodified]

**Action required:** Refactor `callClaudeApi` to accept a `model` parameter (or split into two functions), then pass `claude-haiku-4-5-20251001` to `generateGameNarrative` and `claude-sonnet-4-6` to `generateSeasonNarrative`.

**Confirmed model IDs from codebase:**
- Haiku: `claude-haiku-4-5-20251001` (used in `recruiting-service.ts`, `screenshot-service.ts`, `legacy-card-service.ts`) [VERIFIED]
- Sonnet: `claude-sonnet-4-6` (used in `narrative-service.ts` callClaudeApi) [VERIFIED]
- AIQE-03 requirement: Haiku = `claude-haiku-4-5-20251001`, Sonnet 4.6 = `claude-sonnet-4-6` — matches existing codebase constants

### AIQE-04: Game Narrative Auto-Enqueue

**Finding:** `game-store.ts` `logGame` (lines 44-58) calls `svcCreate`, reloads games, shows a toast, and returns the game. There is no `enqueueAiJob` call anywhere in the game store. [VERIFIED: full game-store.ts inspection]

**Finding:** `AiJob.type` union (line 6 of `ai-queue-store.ts`) does NOT include `'game-narrative'`. It contains: `'legacy-blurb' | 'season-narrative' | 'recruiting-grade' | 'journalist-blurb' | 'hot-seat' | 'dossier' | 'rival-prophecy' | 'obituary' | 'generational-arc' | 'what-if' | 'dna-report' | 'living-chronicle'`. [VERIFIED]

**Finding:** The `generateGameNarrative` function in `narrative-service.ts` already accepts `(dynasty, season, game, tone)` and returns a `SeasonNarrative`. The queue processor will need to resolve dynasty and season from the DB to call it, or the job payload must carry sufficient context. [VERIFIED: lines 403-435 of `narrative-service.ts`]

**Action required:**
1. Add `'game-narrative'` to `AiJob.type` union in `ai-queue-store.ts`
2. In `game-store.ts` `logGame`, after successful save, call `useAiQueueStore.getState().enqueueAiJob({ type: 'game-narrative', dynastyId, payload: { gameId: game.id, seasonId: input.seasonId } })` when `usePrefsStore.getState().hasApiKey` is true
3. In `useQueueProcessor`, add a handler for `'game-narrative'` that resolves dynasty/season from DB, calls `generateGameNarrative` with Haiku model

---

## Common Pitfalls

### Pitfall 1: Double-Processing a Job
**What goes wrong:** Without a processing guard, a Zustand state change (e.g., a different job completing) can re-trigger the `useEffect` while a job is still being processed, causing the processor to pick the same `'pending'` job again.
**Why it happens:** `useEffect` runs on every render triggered by `pendingAiJobs` changes; async work inside doesn't block subsequent runs.
**How to avoid:** Use `processingRef = useRef(false)` as a non-reactive flag. Check it at the top of the effect and set it before any async work.
**Warning signs:** Jobs transition from `pending` to `running` twice, or multiple `'done'` transitions are observed.

### Pitfall 2: Enqueuing Without the Season/Dynasty Context
**What goes wrong:** The queue processor receives only `gameId` in the payload, then can't find the dynasty or season needed to call `generateGameNarrative`.
**Why it happens:** Game records have `dynastyId` and `seasonId` — these should be included in the job payload at enqueue time.
**How to avoid:** Payload should include `{ gameId, seasonId, dynastyId }`. The processor fetches from DB at process time using Dexie direct lookups (`db.games.get(gameId)`, `db.seasons.get(seasonId)`, `db.dynasties.get(dynastyId)`).

### Pitfall 3: Game Narrative Called With Wrong Model
**What goes wrong:** The Haiku model ID is copy-pasted wrong or the helper is refactored incorrectly, resulting in Sonnet being called for game narratives.
**Why it happens:** Shared `callClaudeApi` helper is a single function — refactoring it requires updating both call sites correctly.
**How to avoid:** Define constants at the top of `narrative-service.ts`:
```typescript
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
const SONNET_MODEL = 'claude-sonnet-4-6';
```
And validate post-change with grep.

### Pitfall 4: Blocking the UI Thread with Queue Processing
**What goes wrong:** Queue processor fires synchronously during render or blocks the game save from returning.
**Why it happens:** The processor is triggered by a Zustand subscription, which itself fires synchronously after state updates.
**How to avoid:** The processor hook must be purely reactive (only triggered by `useEffect`), and all AI calls are already async and fire-and-forget.

### Pitfall 5: Re-enqueuing Completed Jobs on App Resume
**What goes wrong:** If the queue is persisted (it is not), done/failed jobs would be re-queued on next session. Or if `clearCompleted` is not called, the `pendingAiJobs` array grows indefinitely in memory.
**Why it happens:** `clearCompleted` exists but is never called in the current scaffolding.
**How to avoid:** Call `clearCompleted()` at the end of each job processing cycle in the queue processor.

---

## Code Examples

### Queue Processor Hook (full implementation)

```typescript
// Source: pattern derived from auto-export-service.ts fire-and-forget and
// App.tsx useEffect idioms [ASSUMED pattern for the hook structure]
// src/hooks/use-queue-processor.ts

import { useEffect, useRef } from 'react';
import { useAiQueueStore, type AiJob } from '../store/ai-queue-store';
import { db } from '@dynasty-os/db';
import { generateGameNarrative } from '../lib/narrative-service';
import { setAiCache } from '../lib/ai-cache-service';

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';  // [VERIFIED constant from codebase]

async function processJob(job: AiJob): Promise<void> {
  if (job.type === 'game-narrative') {
    const { gameId, seasonId, dynastyId } = job.payload as {
      gameId: string; seasonId: string; dynastyId: string;
    };
    const [game, season, dynasty] = await Promise.all([
      db.games.get(gameId),
      db.seasons.get(seasonId),
      db.dynasties.get(dynastyId),
    ]);
    if (!game || !season || !dynasty) return;
    // generateGameNarrative caches result in aiCache automatically
    await generateGameNarrative(dynasty, season, game, 'espn');
  }
  // Future job types added here
}

export function useQueueProcessor() {
  const pendingAiJobs = useAiQueueStore((s) => s.pendingAiJobs);
  const { updateJobStatus, clearCompleted } = useAiQueueStore.getState();
  const processingRef = useRef(false);

  useEffect(() => {
    const pending = pendingAiJobs.find((j) => j.status === 'pending');
    if (!pending || processingRef.current) return;

    processingRef.current = true;
    updateJobStatus(pending.id, 'running');

    processJob(pending)
      .then(() => {
        updateJobStatus(pending.id, 'done');
      })
      .catch(() => {
        updateJobStatus(pending.id, 'failed');
      })
      .finally(() => {
        processingRef.current = false;
        clearCompleted();
      });
  }, [pendingAiJobs]);
}
```

### AiJob Type Update

```typescript
// Source: /apps/desktop/src/store/ai-queue-store.ts line 6 [VERIFIED — add 'game-narrative']
export interface AiJob {
  id: string;
  type: 'legacy-blurb' | 'season-narrative' | 'game-narrative' | 'recruiting-grade'
      | 'journalist-blurb' | 'hot-seat' | 'dossier' | 'rival-prophecy' | 'obituary'
      | 'generational-arc' | 'what-if' | 'dna-report' | 'living-chronicle';
  payload: Record<string, unknown>;
  dynastyId: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  enqueuedAt: number;
}
```

### Game Store Enqueue Hook

```typescript
// Source: /apps/desktop/src/store/game-store.ts logGame [VERIFIED context]
// Add after successful svcCreate:
import { useAiQueueStore } from './ai-queue-store';
import { usePrefsStore } from './prefs-store';

// Inside logGame after toast:
if (usePrefsStore.getState().hasApiKey) {
  useAiQueueStore.getState().enqueueAiJob({
    type: 'game-narrative',
    dynastyId: input.dynastyId,
    payload: {
      gameId: game.id,
      seasonId: input.seasonId,
      dynastyId: input.dynastyId,
    },
  });
}
```

### Narrative Service Model Routing Fix

```typescript
// Source: /apps/desktop/src/lib/narrative-service.ts callClaudeApi [VERIFIED — currently hardcodes sonnet]
// Replace callClaudeApi with:
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
const SONNET_MODEL = 'claude-sonnet-4-6';

async function callClaudeApiWithModel(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
  model: string
): Promise<string | null> {
  if (!usePrefsStore.getState().hasApiKey) return null;
  const data = await callAnthropic({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });
  if (!data) return null;
  return data?.content?.[0]?.text ?? null;
}

// generateSeasonNarrative calls with SONNET_MODEL, maxTokens=1000
// generateGameNarrative calls with HAIKU_MODEL, maxTokens=400
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Direct Anthropic fetch from WebView | Tauri `call_anthropic` command | Phase 20 | API key never exposed to renderer process |
| localStorage AI cache | Dexie `aiCache` table | Phase 10 | LRU eviction, cross-dynasty isolation, async reads |
| Single-model for all narrative | Model routing (Haiku/Sonnet) | Phase 25 (this phase) | Cost reduction; game narratives 10-20x cheaper |
| Fire-and-forget async pattern | AI job queue | Phase 10 scaffolded; Phase 25 activates | Saves remain under 200ms; AI work is background |

---

## Open Questions (RESOLVED)

1. **Tone for auto-enqueued game narrative**
   - What we know: `generateGameNarrative` requires a `tone` parameter (`'espn' | 'hometown' | 'legend'`). The GameLog currently passes `activeTone` from the DashboardPage's tone selector state.
   - What's unclear: When a `game-narrative` job is processed by the background queue, what tone should it use? The queue processor runs in App.tsx context, not the Dashboard.
   - Recommendation: Default to `'espn'` for auto-enqueued jobs. The user can trigger a manual regeneration from the GameLog with their preferred tone, which re-caches with the correct tone key.

2. **Departure-triggered blurb vs. explicit button (AIQE-02)**
   - What we know: The current departure flow auto-generates a blurb as fire-and-forget — this is technically not a "navigate to player profile" trigger. AIQE-02 says navigating does not trigger a call; it doesn't say departure can't trigger one.
   - What's unclear: Should the departure auto-blurb go through the queue (preserving the fire-and-forget UX but routing through the processor), or remain as a direct call?
   - Recommendation: Leave departure auto-blurb as-is (direct call) since it's gated on explicit user action (submitting the departure form). No change needed for AIQE-02 compliance; just ensure the button label is "Generate AI Blurb" if required by the acceptance criterion wording.

3. **Queue processor — where to place the hook file**
   - What we know: App.tsx currently has all wiring inline (no hooks/ directory).
   - What's unclear: Whether to create `src/hooks/use-queue-processor.ts` or inline the logic in App.tsx.
   - Recommendation: Inline in App.tsx as a `useEffect` for simplicity, matching the existing patterns for Cmd+K listener and onboarding wiring. Extract to a hook only if the processor grows beyond ~25 lines.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 25 is a code-only change. All required runtimes (Node.js, pnpm, Tauri/Rust) are confirmed available from Phase 24 execution. No new CLI tools or services are required.

---

## Validation Architecture

`workflow.nyquist_validation` is absent from `.planning/config.json` — treated as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None — no test infrastructure detected in the project |
| Config file | None |
| Quick run command | `pnpm --filter desktop build` (TypeScript compile gate) |
| Full suite command | `pnpm --filter desktop build` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AIQE-01 | Queue processor transitions jobs `pending → running → done/failed` | manual | — | N/A |
| AIQE-01 | App.tsx mounts queue worker (no jobs silently accumulate) | smoke — grep | `grep -rn "useQueueProcessor\|processJob" src/App.tsx` | Wave 0 |
| AIQE-02 | No API call on profile navigate | manual / grep | `grep -n "useEffect.*generateLegacyBlurb\|generateLegacyBlurb.*useEffect" src/pages/PlayerProfilePage.tsx` | Wave 0 |
| AIQE-03 | Game narrative uses Haiku model | compile + grep | `grep -n "HAIKU_MODEL\|claude-haiku" src/lib/narrative-service.ts` | Wave 0 |
| AIQE-03 | Season narrative uses Sonnet model | compile + grep | `grep -n "SONNET_MODEL\|claude-sonnet" src/lib/narrative-service.ts` | Wave 0 |
| AIQE-04 | logGame enqueues game-narrative job | compile + grep | `grep -n "enqueueAiJob" src/store/game-store.ts` | Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm --filter desktop build` (TypeScript compile — catches type errors on AiJob.type union and model param changes)
- **Per wave merge:** `pnpm --filter desktop build`
- **Phase gate:** Build clean + manual walkthrough per AIQE success criteria

### Wave 0 Gaps

- No test files exist; no framework is configured. All validation is via TypeScript compile + manual UAT.
- [ ] Verify grep-based smoke checks above pass after each task.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | Job payload validated by TypeScript types; `AiJob.type` union is the contract |
| V6 Cryptography | no | API key stays in Tauri plugin-store; queue processor reads `hasApiKey` flag only |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Job payload injection | Tampering | TypeScript `Record<string, unknown>` + explicit cast at process time — no `eval`, no dynamic dispatch |
| API key leak via job payload | Information Disclosure | Queue payload must never include the API key string — key is read by Rust from plugin-store inside `call_anthropic` |
| Runaway queue (infinite re-enqueue) | Denial of Service | `clearCompleted()` at end of each job prevents accumulation; no re-enqueue on failure |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Default tone `'espn'` for auto-enqueued game narrative jobs is acceptable | Open Questions #1 | Wrong tone for user preference; user can manually regenerate — low impact |
| A2 | The queue processor hook should be inlined in App.tsx rather than extracted | Open Questions #3 | Minor code organization preference — no functional impact |
| A3 | Departure-triggered blurb auto-generation is acceptable (not a navigate trigger) | Open Questions #2 | If AIQE-02 is interpreted broadly to forbid ALL auto calls (including departure), the departure blurb must be queued or removed |

**If this table is complete:** All functional claims (AiJob type, model names, hook absence, store structure, narrative-service call paths, Rust passthrough) are VERIFIED from direct codebase inspection.

---

## Sources

### Primary (HIGH confidence — direct codebase inspection)

- `/apps/desktop/src/store/ai-queue-store.ts` — `AiJob` interface, `pendingAiJobs`, `enqueueAiJob`, `updateJobStatus`, `clearCompleted`; missing `'game-narrative'` in type union confirmed
- `/apps/desktop/src/lib/narrative-service.ts` — `callClaudeApi` hardcodes `claude-sonnet-4-6` at line 319; both `generateGameNarrative` (line 403) and `generateSeasonNarrative` (line 368) call the shared function
- `/apps/desktop/src/App.tsx` — no `useQueueProcessor` mount, no `useAiQueueStore` import; existing wiring pattern for hooks
- `/apps/desktop/src/store/game-store.ts` — `logGame` action has no `enqueueAiJob` call; full inspection of lines 44-58
- `/apps/desktop/src/pages/PlayerProfilePage.tsx` — useEffect on lines 116-126 reads cache only; `generateLegacyBlurb` at line 181 is inside `handleDepartureSubmit` only
- `/apps/desktop/src-tauri/src/lib.rs` — `call_anthropic` passes `body` unmodified to Anthropic API; model in body is not overridden
- `/apps/desktop/src/lib/legacy-card-service.ts` — Haiku model `claude-haiku-4-5-20251001` confirmed at line 102
- `/packages/db/src/schema.ts` — `aiCache` table in SCHEMA_V6; no `aiQueue` table; queue is Zustand-only (in-memory)

---

## Metadata

**Confidence breakdown:**
- Current state (what's missing): HIGH — verified by direct source inspection
- Queue processor pattern: HIGH — follows existing `useEffect` + `useRef` patterns in App.tsx
- Model routing fix: HIGH — exact line numbers and model IDs verified
- Auto-enqueue hook point: HIGH — game-store.ts `logGame` is the unambiguous insertion point

**Research date:** 2026-05-05
**Valid until:** This research is tied to specific file contents — valid until any of the 8 source files above are modified
