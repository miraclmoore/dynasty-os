---
phase: 25-ai-queue-features
verified: 2026-05-05T12:00:00Z
status: gaps_found
score: 3/5
overrides_applied: 0
gaps:
  - truth: "Season narratives are generated with Claude Sonnet 4.6 (valid model identifier)"
    status: failed
    reason: "SONNET_MODEL = 'claude-sonnet-4-6' is not a valid Anthropic API model identifier — it is missing the required date suffix. Every call to generateSeasonNarrative will receive a 400 Bad Request from the Anthropic API and silently return null. The code compiles but the feature does not work at runtime."
    artifacts:
      - path: "apps/desktop/src/lib/narrative-service.ts"
        issue: "Line 312: SONNET_MODEL = 'claude-sonnet-4-6' — missing date suffix (e.g., 'claude-sonnet-4-5-20251001' or equivalent). Compare to HAIKU_MODEL = 'claude-haiku-4-5-20251001' which is correct format."
    missing:
      - "Update SONNET_MODEL to the fully-qualified Anthropic model identifier with date suffix (e.g., 'claude-sonnet-4-5-20251001' or 'claude-sonnet-4-6-20260101' — verify against Anthropic model list)"

  - truth: "PlayerProfilePage hooks comply with React Rules of Hooks (no hooks after conditional returns)"
    status: failed
    reason: "CR-01: useMemo at line 240 (legacyCardData) is called after two conditional early returns at lines 219 (if !activeDynasty) and 221 (if !player). React Rules of Hooks require hooks to always be called in the same order on every render. This will throw a runtime error in strict mode and produce state corruption when the condition toggles between renders."
    artifacts:
      - path: "apps/desktop/src/pages/PlayerProfilePage.tsx"
        issue: "Line 240: const legacyCardData = useMemo(...) is below early returns at lines 219 and 221. All hooks must appear before any conditional return."
    missing:
      - "Move legacyCardData useMemo above both early returns, or guard the memo body with a null check (if (!player || player.status === 'active') return null) so the hook is always called but short-circuits safely when player is absent"
---

# Phase 25: AI Queue & Features — Verification Report

**Phase Goal:** The AI job queue reliably processes pending jobs, legacy blurbs are user-initiated only, model routing is correct, and game narratives are auto-enqueued after each logged game.
**Verified:** 2026-05-05T12:00:00Z
**Status:** gaps_found — 2 blockers
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Queue processor in App.tsx picks up pending jobs and transitions them pending → running → done/failed | VERIFIED | App.tsx lines 142–161: useEffect subscribed to pendingAiJobs, finds first pending job, sets running via updateJobStatus, calls processJob, sets done/failed in .then/.catch, calls clearCompleted in .finally; processingRef guard prevents double-processing |
| 2 | Navigating to PlayerProfilePage does not trigger an Anthropic API call | VERIFIED | useEffect at lines 116–126 calls only getCachedBlurb (Dexie read) — no generateLegacyBlurb in any useEffect; generateLegacyBlurb appears only at lines 181 (handleDepartureSubmit) and 196 (handleRegenerateBlurb), both explicit user-action handlers |
| 3 | Button label reads "Generate AI Blurb" when no blurb cached, "Regenerate Blurb" when one exists | VERIFIED | Line 394: `{blurbLoading ? 'Generating...' : legacyBlurb ? 'Regenerate Blurb' : 'Generate AI Blurb'}` — conditional correctly distinguishes both states |
| 4 | Season narratives are generated with a valid Claude Sonnet model identifier | FAILED (BLOCKER — CR-02) | narrative-service.ts line 312: `SONNET_MODEL = 'claude-sonnet-4-6'` — this is NOT a valid Anthropic API model identifier. Missing required date suffix. Every generateSeasonNarrative call will receive a 400 from Anthropic and silently return null. Compare: HAIKU_MODEL = 'claude-haiku-4-5-20251001' uses the correct fully-qualified format. |
| 5 | PlayerProfilePage hooks comply with React Rules of Hooks | FAILED (BLOCKER — CR-01) | useMemo at line 240 (legacyCardData) is called AFTER conditional early returns at lines 219 (`if (!activeDynasty) return null`) and 221 (`if (!player) { return ... }`). React requires hooks to be called in the same order on every render — a hook below a conditional return violates this invariant and will throw in strict mode. |

**Score:** 3/5 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/desktop/src/store/ai-queue-store.ts` | AiJob.type union with 'game-narrative' | VERIFIED | Line 6 confirms 'game-narrative' added to the type union alongside all existing types |
| `apps/desktop/src/lib/narrative-service.ts` | Model routing (HAIKU_MODEL / SONNET_MODEL constants) | PARTIAL | HAIKU_MODEL correct at line 311 ('claude-haiku-4-5-20251001'); SONNET_MODEL broken at line 312 ('claude-sonnet-4-6' missing date suffix — will cause runtime 400 errors) |
| `apps/desktop/src/store/game-store.ts` | Auto-enqueue after logGame | VERIFIED | Lines 55–65: enqueueAiJob called with {type: 'game-narrative', dynastyId, payload: {gameId, seasonId, dynastyId}} when hasApiKey is true; fire-and-forget, never blocks save |
| `apps/desktop/src/pages/PlayerProfilePage.tsx` | Explicit-only blurb generation button with correct label | PARTIAL | Button label conditional correct (line 394). useEffect mount compliant (no generateLegacyBlurb). BUT useMemo at line 240 is called after early returns at lines 219 and 221 — Rules of Hooks violation that will cause runtime errors. |
| `apps/desktop/src/App.tsx` | Queue processor inlined in App component | VERIFIED | Lines 50–67: processJob at module scope; lines 139–161: useAiQueueStore subscription + processingRef guard + clearCompleted in .finally; all four acceptance criteria patterns present |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| game-store.ts logGame | ai-queue-store.ts enqueueAiJob | useAiQueueStore.getState().enqueueAiJob() | WIRED | Lines 12–13 (imports), 55–64 (call); payload includes all three IDs |
| narrative-service.ts generateGameNarrative | callClaudeApiWithModel with HAIKU_MODEL | callClaudeApiWithModel(..., HAIKU_MODEL) | WIRED | Line 426 confirmed |
| narrative-service.ts generateSeasonNarrative | callClaudeApiWithModel with SONNET_MODEL | callClaudeApiWithModel(..., SONNET_MODEL) | BROKEN | Line 390 calls SONNET_MODEL but the constant at line 312 is invalid — API will reject every season narrative call at runtime |
| App.tsx App component | useAiQueueStore pendingAiJobs | useEffect subscribed to pendingAiJobs | WIRED | Line 139 selector, line 142 useEffect dep |
| App.tsx processJob | generateGameNarrative in narrative-service | job.type === 'game-narrative' dispatch | WIRED | Lines 51–65: type check + db lookups + generateGameNarrative call |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| App.tsx queue processor | pendingAiJobs | useAiQueueStore Zustand state | Yes — populated by game-store logGame on each game save when API key configured | FLOWING |
| narrative-service.ts generateGameNarrative | rawText from callClaudeApiWithModel | Anthropic API via callAnthropic (Tauri) | Yes — HAIKU_MODEL is valid format; API calls will succeed | FLOWING |
| narrative-service.ts generateSeasonNarrative | rawText from callClaudeApiWithModel | Anthropic API via callAnthropic (Tauri) | NO — SONNET_MODEL = 'claude-sonnet-4-6' is invalid; API returns 400, rawText is null, function silently returns null | DISCONNECTED |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| 'game-narrative' in AiJob.type union | grep -c "game-narrative" apps/desktop/src/store/ai-queue-store.ts | 1 | PASS |
| HAIKU_MODEL constant defined and used | grep -c "HAIKU_MODEL" apps/desktop/src/lib/narrative-service.ts | 3 (def + 2 uses) | PASS |
| SONNET_MODEL constant defined and used | grep -c "SONNET_MODEL" apps/desktop/src/lib/narrative-service.ts | 3 (def + 2 uses) | PASS (code wired; constant value invalid) |
| SONNET_MODEL has date suffix | grep "SONNET_MODEL" apps/desktop/src/lib/narrative-service.ts | 'claude-sonnet-4-6' (no date suffix) | FAIL |
| Old callClaudeApi function name gone | grep "callClaudeApi[^W]" apps/desktop/src/lib/narrative-service.ts | no matches | PASS |
| enqueueAiJob in game-store logGame | grep -c "enqueueAiJob" apps/desktop/src/store/game-store.ts | 1 | PASS |
| processJob + pendingAiJobs in App.tsx | grep patterns confirmed | all 4 patterns present | PASS |
| clearCompleted in App.tsx .finally | grep -c "clearCompleted" apps/desktop/src/App.tsx | 1 (in .finally) | PASS |
| useMemo hook order (no post-return hooks) | line audit of PlayerProfilePage.tsx | useMemo at line 240 is AFTER returns at 219 and 221 | FAIL |
| No generateLegacyBlurb in any useEffect | grep in PlayerProfilePage.tsx | Only at lines 181, 196 (user handlers) — not in useEffect | PASS |
| Button label conditional in PlayerProfilePage | grep "Generate AI Blurb" PlayerProfilePage.tsx | 1 occurrence at line 394 | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| AIQE-01 | 25-03 | Queue processor processes jobs pending→running→done/failed in App.tsx | SATISFIED | App.tsx lines 142–161: full processor implementation with processingRef guard and clearCompleted |
| AIQE-02 | 25-02 | No Anthropic call on player profile navigate; blurb only on explicit click | SATISFIED | useEffect mount is read-only (getCachedBlurb only); button label correct at line 394; generateLegacyBlurb only in user-initiated handlers |
| AIQE-03 | 25-01 | Game narratives use Haiku; season narratives use Sonnet 4.6 | BLOCKED | Haiku model correct (HAIKU_MODEL = 'claude-haiku-4-5-20251001'); Sonnet model invalid (SONNET_MODEL = 'claude-sonnet-4-6' — missing date suffix — runtime API 400) |
| AIQE-04 | 25-01 | game-narrative job auto-enqueued after logging a game with API key | SATISFIED | game-store.ts lines 55–64: conditional enqueue confirmed |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/desktop/src/pages/PlayerProfilePage.tsx` | 240 | `useMemo` called after conditional early returns at lines 219 and 221 | BLOCKER | React Rules of Hooks violation — throws runtime error in strict mode; state corruption in production when activeDynasty or player toggles between null and set |
| `apps/desktop/src/lib/narrative-service.ts` | 312 | `SONNET_MODEL = 'claude-sonnet-4-6'` — missing date suffix | BLOCKER | Every generateSeasonNarrative call sends an invalid model ID to the Anthropic API; the API returns 400 Bad Request; callClaudeApiWithModel returns null; function silently returns null — season narratives are permanently broken at runtime |
| `apps/desktop/src/lib/narrative-service.ts` | 333 | `console.warn` in production code path | INFO | Logs on every empty API response; leaks implementation detail; no behavioral impact |
| `apps/desktop/src/pages/PlayerProfilePage.tsx` | 204–211 | `handleSaveApiKey` has no error handling around `await prefs.setApiKey()` | WARNING | If Tauri plugin store write fails, error is swallowed silently; user sees no feedback |

---

### Human Verification Required

The following behaviors require a live Tauri runtime with an API key to verify:

#### 1. Queue Job End-to-End (AIQE-01 / AIQE-04)

**Test:** With API key configured, log a game on the game log page.
**Expected:** Open DevTools → Zustand devtools (or log useAiQueueStore.getState()) — a 'game-narrative' job should appear in pendingAiJobs, transition to 'running', then to 'done' and be cleared.
**Why human:** Requires live Tauri app with valid API key; no test infrastructure.

#### 2. No API call on player profile navigate (AIQE-02)

**Test:** Navigate to any PlayerProfilePage.
**Expected:** DevTools Network tab shows no request to api.anthropic.com on page load.
**Why human:** Requires live Tauri runtime with DevTools network inspection.

#### 3. Season narrative API call failure (CR-02 regression)

**Test:** Navigate to Season Recap page → click "Generate Recap" with API key configured.
**Expected (before fix):** No narrative generated; function silently returns null; user sees no error.
**Why human:** Confirms the CR-02 blocker has real user-visible impact before fix; requires live API key.

---

## Gaps Summary

Phase 25 delivered the structural implementation of all four AIQE requirements. The code compiles, the artifacts are substantive, and the wiring is present. However, two code-review-confirmed blockers prevent the phase goal from being fully achieved:

**CR-02 (BLOCKER): SONNET_MODEL invalid model identifier.** `narrative-service.ts` defines `SONNET_MODEL = 'claude-sonnet-4-6'` which is not a valid Anthropic API model identifier — it is missing the required date suffix (compare: the correct HAIKU_MODEL = 'claude-haiku-4-5-20251001'). Every call to `generateSeasonNarrative` will receive a `400 Bad Request` and silently return null. AIQE-03 (season narratives use Sonnet 4.6) is not achieved at runtime even though the code is wired. **Fix:** Update line 312 to the fully-qualified model ID with date suffix.

**CR-01 (BLOCKER): React Rules of Hooks violation in PlayerProfilePage.** The `legacyCardData` useMemo at line 240 is called after conditional early returns at lines 219 and 221. React will throw a runtime error when the early return condition toggles (e.g., player loading state changes). AIQE-02 is functionally correct in intent but ships with a hooks violation that will cause instability. **Fix:** Move the useMemo above all early returns, guarding its body with a null check on `player`.

Both gaps are in files already modified by this phase and require targeted fixes — neither requires architectural changes.

---

_Verified: 2026-05-05T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
