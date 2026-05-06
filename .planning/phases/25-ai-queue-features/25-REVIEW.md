---
phase: 25-ai-queue-features
reviewed: 2026-05-05T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - apps/desktop/src/store/ai-queue-store.ts
  - apps/desktop/src/lib/narrative-service.ts
  - apps/desktop/src/store/game-store.ts
  - apps/desktop/src/pages/PlayerProfilePage.tsx
  - apps/desktop/src/App.tsx
findings:
  critical: 2
  warning: 3
  info: 2
  total: 7
status: issues_found
---

# Phase 25: Code Review Report

**Reviewed:** 2026-05-05
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Phase 25 introduced the AI queue processor (background game-narrative auto-enqueue), the `narrative-service` season/game narrative functions, and wired game logging to auto-enqueue jobs. The queue processor itself is structurally sound — the `processingRef` guard correctly prevents concurrent dispatch and the fire-and-forget contract is maintained. However there are two blockers: a React Rules of Hooks violation in `PlayerProfilePage` where a `useMemo` is called after conditional early returns, and an invalid Anthropic model identifier that will cause every season narrative API call to fail at runtime. Three warnings round out the report, all relating to error-handling gaps and a stuck-job scenario.

---

## Critical Issues

### CR-01: React Rules of Hooks Violation — `useMemo` Called After Conditional Returns

**File:** `apps/desktop/src/pages/PlayerProfilePage.tsx:240`

**Issue:** `useMemo` at line 240 (`legacyCardData`) is called after two conditional early returns at lines 219 (`if (!activeDynasty) return null`) and 221 (`if (!player) { return … }`). React's Rules of Hooks require that hooks are always called in the same order on every render — any hook call below a conditional return is a violation. React will throw a runtime error in strict mode and produce subtle state corruption in production when the condition toggles between renders (e.g., `activeDynasty` goes from null to set, or a player is not yet loaded then loads).

```tsx
// WRONG — useMemo below early returns
if (!activeDynasty) return null;  // line 219
if (!player) { return <…/>; }    // line 221

const legacyCardData = useMemo(() => { … }, [isActive, player, playerSeasons, legacyBlurb]); // line 240
```

**Fix:** Move `legacyCardData` above all early returns, or merge it into the `careerStatsByGroup` memo block that is already above the guards. Since the memo depends on `player` and `isActive` which are derived after the guard, the correct fix is to allow the memo to short-circuit when `player` is absent:

```tsx
// Before any early return:
const legacyCardData = useMemo(() => {
  if (!player || player.status === 'active') return null;
  const cardData = buildLegacyCardData(player, playerSeasons);
  return { ...cardData, blurb: legacyBlurb };
}, [player, playerSeasons, legacyBlurb]);

// Then the guards are safe:
if (!activeDynasty) return null;
if (!player) { return <…/>; }
```

---

### CR-02: Invalid Model Identifier for Season Narrative — All Season Narrative API Calls Fail

**File:** `apps/desktop/src/lib/narrative-service.ts:312`

**Issue:** The `SONNET_MODEL` constant is set to `'claude-sonnet-4-6'` — this is not a valid Anthropic API model identifier. The correct format for Claude Sonnet models requires a date suffix (e.g., `'claude-sonnet-4-5-20251001'` or `'claude-sonnet-4-6-20260101'`). As written, every call to `generateSeasonNarrative` will result in a `400 Bad Request` from the Anthropic API, and the function will silently return `null`. The game narrative path (which uses `HAIKU_MODEL = 'claude-haiku-4-5-20251001'`) follows the correct format and will succeed. The inconsistency is that season narratives are broken while game narratives work, making the failure appear intermittent rather than systematic.

```typescript
// WRONG
const SONNET_MODEL = 'claude-sonnet-4-6';

// FIX — use the fully-qualified model identifier
const SONNET_MODEL = 'claude-sonnet-4-6-20260101';
// or whichever date suffix matches the intended model version
```

Note: The system prompt for this reviewer identifies the current environment as running `claude-sonnet-4-6`, so the correct date suffix should match the production API model name. Verify against Anthropic's model list.

---

## Warnings

### WR-01: Queue Processor — `running` Status Jobs Are Never Re-Processed After App Restart

**File:** `apps/desktop/src/App.tsx:143-161`

**Issue:** The queue processor's `useEffect` only picks up jobs with `status === 'pending'`. The `ai-queue-store` is in-memory only (no Zustand `persist` middleware), so jobs are lost on reload — this part is fine. However, if a job is marked `running` (line 147) and then the app crashes or is hard-killed before the Promise resolves, the job will remain permanently stuck with `status: 'running'` in whatever transient state exists. More critically: if the Zustand store were ever given persistence in the future, `running` jobs would be permanently stuck because the processor skips them. The current code has no recovery path for this status.

Even without persistence, there is a subtler issue: the `updateJobStatus(pending.id, 'running')` call at line 147 triggers a Zustand state update, which causes `pendingAiJobs` to change, which re-fires the `useEffect`. At that point `processingRef.current` is already `true` so the guard holds — but the effect re-fires unnecessarily on every status transition (pending→running, running→done, done is cleared). This is wasteful and could be eliminated.

**Fix:** Add a recovery step that resets any lingering `running` jobs back to `pending` on startup, and filter the `useEffect` trigger to avoid re-firing on status changes that don't add new pending work:

```typescript
// In a startup useEffect or store initializer:
useAiQueueStore.setState((s) => ({
  pendingAiJobs: s.pendingAiJobs.map((j) =>
    j.status === 'running' ? { ...j, status: 'pending' } : j
  ),
}));

// Alternatively, scope the useEffect selector to pending count only:
const pendingCount = useAiQueueStore((s) =>
  s.pendingAiJobs.filter((j) => j.status === 'pending').length
);
useEffect(() => { /* … */ }, [pendingCount]);
```

---

### WR-02: Unhandled Promise Rejection in `handleSaveApiKey` — API Key Save Failure Is Silent

**File:** `apps/desktop/src/pages/PlayerProfilePage.tsx:204-211`

**Issue:** `handleSaveApiKey` calls `prefs.setApiKey()` which can throw (it calls `store.set()` and rethrows on failure, per `prefs-service.ts:28`). If the Tauri plugin store write fails, the `await` at line 206 will throw, the function exits without ever reaching `setApiKeyStatus('saved')` or resetting `apiKeyInput`, and crucially the error is swallowed silently — the user sees nothing and believes the key was not saved (or is confused by the non-response). The `onClick` at line 422 uses bare `handleSaveApiKey` without `void`, so the unhandled rejection also propagates as an unhandled promise rejection.

```typescript
// WRONG
async function handleSaveApiKey() {
  if (apiKeyInput.trim()) {
    await prefs.setApiKey(apiKeyInput.trim()); // can throw
    setApiKeyInput('');
    setApiKeyStatus('saved');
    setTimeout(() => setApiKeyStatus('idle'), 2000);
  }
}

// FIX
async function handleSaveApiKey() {
  if (!apiKeyInput.trim()) return;
  try {
    await prefs.setApiKey(apiKeyInput.trim());
    setApiKeyInput('');
    setApiKeyStatus('saved');
    setTimeout(() => setApiKeyStatus('idle'), 2000);
  } catch {
    // Surface to user — use existing toast infrastructure or inline error state
    useToastStore.getState().error('Failed to save API key', 'Check storage permissions');
  }
}
```

---

### WR-03: `parseInt` on Departure Year Has No NaN Guard

**File:** `apps/desktop/src/pages/PlayerProfilePage.tsx:171`

**Issue:** `departureYear` is a string state bound to an `<input type="number">`. The HTML `min`/`max` attributes are not enforced by React's controlled input — they are browser hints only. A user can type non-numeric characters (e.g. `"abc"`, `"2025e"`) and `departureYear !== ''` will be `true` while `parseInt('2025e', 10)` returns `2025` (JavaScript stops at the first non-digit). However, `parseInt('abc', 10)` returns `NaN`, which would be stored as `NaN` in the database — a `number` field holding `NaN` will silently corrupt the record and can cause downstream display issues (`NaN` rendering as `NaN` in the departure year display at line 369).

```typescript
// WRONG
departureYear: departureYear !== '' ? parseInt(departureYear, 10) : undefined,

// FIX
const parsed = departureYear !== '' ? parseInt(departureYear, 10) : undefined;
if (parsed !== undefined && isNaN(parsed)) {
  setDepartureError('Departure year must be a valid number.');
  return;
}
// then use: departureYear: parsed
```

---

## Info

### IN-01: Unsafe Type Assertion on Cached Narrative — No Shape Validation

**File:** `apps/desktop/src/lib/narrative-service.ts:273,303`

**Issue:** `JSON.parse(raw) as SeasonNarrative` is a bare type assertion with no runtime validation. If the cache contains stale data from a previous schema version (e.g., missing the `tone` field added later), the returned object will fail silently or cause `undefined` to appear in the UI. This is a latent issue that grows in risk as the `SeasonNarrative` type evolves.

**Fix:** Add a lightweight shape check before returning:
```typescript
const parsed = JSON.parse(raw);
if (!parsed || typeof parsed.recap !== 'string' || typeof parsed.tagline !== 'string') return null;
return parsed as SeasonNarrative;
```

---

### IN-02: `console.warn` Left in Production Path

**File:** `apps/desktop/src/lib/narrative-service.ts:333`

**Issue:** `console.warn('[NarrativeService] Claude API response missing text content')` at line 333 fires in a production code path on every API call where the response is unexpectedly empty. While useful during development, this produces noise in production logs and can leak implementation details in environments where the console is accessible.

**Fix:** Remove the `console.warn` or gate it behind a `DEV` environment check. The function already returns `null` gracefully so the warning adds no recovery value.

```typescript
// Remove or gate:
if (import.meta.env.DEV) {
  console.warn('[NarrativeService] Claude API response missing text content');
}
```

---

_Reviewed: 2026-05-05_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
