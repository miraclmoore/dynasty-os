---
phase: 25-ai-queue-features
reviewed: 2026-05-05T12:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - apps/desktop/src/store/ai-queue-store.ts
  - apps/desktop/src/lib/narrative-service.ts
  - apps/desktop/src/store/game-store.ts
  - apps/desktop/src/pages/PlayerProfilePage.tsx
  - apps/desktop/src/App.tsx
findings:
  critical: 0
  warning: 5
  info: 3
  total: 8
status: issues_found
---

# Phase 25: Code Review Report

**Reviewed:** 2026-05-05T12:00:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Phase 25 introduced the AI queue processor, game-narrative auto-enqueue on game log, and the season/game narrative service. The two blockers from the previous review pass (CR-01 React hooks ordering, CR-02 invalid model ID) have both been fixed in the current code: `legacyCardData` `useMemo` is correctly placed above the early returns at line 220, and `SONNET_MODEL` is the fully-qualified `'claude-sonnet-4-6-20260101'`.

Five warnings remain. The most impactful are: an unhandled promise rejection in the API key save handler that silently fails with no user feedback; a `NaN` that can be persisted to the database when departure year input is malformed; an unhandled rejection in the blurb cache-load path; and a queue processor `useEffect` that subscribes to the entire job array and re-fires on every status transition. A zero-length tagline edge case in the narrative parser can silently fall back to the first three words of the model's recap text. Three info items cover unsafe JSON.parse casts, a `console.warn` in production paths, and mixed toast systems in the same store file.

---

## Warnings

### WR-01: `handleSaveApiKey` — Unhandled Promise Rejection, Silent Failure on Storage Error

**File:** `apps/desktop/src/pages/PlayerProfilePage.tsx:204-211`

**Issue:** `prefs.setApiKey()` can throw when the underlying Tauri plugin store write fails. The `await` at line 206 is not wrapped in a try/catch, so any failure exits the function silently: `setApiKeyStatus('saved')` is never called, the input field is not cleared, and the user receives no feedback. Additionally, the `onClick` handler at line 422 calls `handleSaveApiKey` without `void`, so the rejected promise surfaces as an unhandled rejection in the runtime.

**Fix:**
```typescript
async function handleSaveApiKey() {
  if (!apiKeyInput.trim()) return;
  try {
    await prefs.setApiKey(apiKeyInput.trim());
    setApiKeyInput('');
    setApiKeyStatus('saved');
    setTimeout(() => setApiKeyStatus('idle'), 2000);
  } catch {
    // Surface error to user — add an inline error state or use toast infrastructure
    setApiKeyStatus('idle');
    // example: useToastStore.getState().error('Failed to save API key', 'Check storage permissions');
  }
}
```

---

### WR-02: `parseInt` Without NaN Guard — Malformed Departure Year Persists to Database

**File:** `apps/desktop/src/pages/PlayerProfilePage.tsx:171`

**Issue:** `departureYear` is controlled by a string state bound to `<input type="number">`. The `min`/`max` HTML attributes are not enforced by React's controlled input model — they are browser hints only and can be bypassed (e.g., programmatically or on some platforms). When `parseInt('abc', 10)` is called it returns `NaN`. The guard `departureYear !== ''` passes for `'abc'`, so `NaN` is passed as the `departureYear` field to `updatePlayer`. A `NaN` stored in a numeric database field will render as `NaN` in the departure year display at line 369, silently corrupting the record.

**Fix:**
```typescript
// In handleDepartureSubmit, before calling updatePlayer:
const parsedYear = departureYear !== '' ? parseInt(departureYear, 10) : undefined;
if (parsedYear !== undefined && isNaN(parsedYear)) {
  setDepartureError('Departure year must be a valid number.');
  return;
}
// Use parsedYear in the updatePlayer call:
departureYear: parsedYear,
```

---

### WR-03: Unhandled Rejection in Blurb Cache-Load (`getCachedBlurb` Promise)

**File:** `apps/desktop/src/pages/PlayerProfilePage.tsx:120`

**Issue:** The `getCachedBlurb` call in the `useEffect` at line 120 chains `.then()` but has no `.catch()`. `getCachedBlurb` wraps a Dexie IndexedDB operation via `getAiCache`, which can throw on storage corruption or quota errors. The unhandled rejection will appear as an uncaught promise rejection in the runtime and leaves `legacyBlurb` in its initial `undefined` state without any indication to the user.

```typescript
// CURRENT (no error path):
getCachedBlurb(activeDynasty.id, playerId).then((saved) => {
  setLegacyBlurb(saved ?? undefined);
});

// FIX:
getCachedBlurb(activeDynasty.id, playerId)
  .then((saved) => {
    setLegacyBlurb(saved ?? undefined);
  })
  .catch(() => {
    // Storage read failed — blurb stays undefined, no crash
  });
```

---

### WR-04: Queue Processor `useEffect` Subscribes to Full Array — Re-fires on Every Status Transition

**File:** `apps/desktop/src/App.tsx:139-161`

**Issue:** The `useEffect` at line 142 depends on `pendingAiJobs`, which is the entire job array subscribed at line 139. Each `updateJobStatus` call (pending→running at line 147, running→done at line 151, running→failed at line 154) triggers a Zustand state update that re-renders `App` and re-fires the effect. The `processingRef.current` guard at line 144 prevents duplicate dispatches, but the effect still executes and runs `pendingAiJobs.find(...)` on every status change. With many jobs, this fires O(n) times per job. More importantly, if a job is ever left in `running` status (e.g., the app is force-quit after `updateJobStatus(id, 'running')` but before `processJob` resolves), that job will remain permanently stuck since the processor only picks up `'pending'` jobs.

**Fix — scope the selector to avoid unnecessary re-fires:**
```typescript
// Subscribe only to pending-count, not the full array:
const pendingCount = useAiQueueStore((s) =>
  s.pendingAiJobs.filter((j) => j.status === 'pending').length
);

useEffect(() => {
  if (!pendingCount || processingRef.current) return;
  const pending = useAiQueueStore.getState().pendingAiJobs.find((j) => j.status === 'pending');
  if (!pending) return;
  // ... rest of dispatch logic
}, [pendingCount]);
```

**Fix — add stuck-job recovery on mount:**
```typescript
useEffect(() => {
  // Reset any jobs stuck in 'running' from a prior session/crash
  useAiQueueStore.setState((s) => ({
    pendingAiJobs: s.pendingAiJobs.map((j) =>
      j.status === 'running' ? { ...j, status: 'pending' } : j
    ),
  }));
}, []);
```

---

### WR-05: Empty Tagline Falls Back to First Three Words of Recap Text

**File:** `apps/desktop/src/lib/narrative-service.ts:353-356`

**Issue:** In `parseNarrativeResponse`, when a `TAGLINE:` line is found but the content after it is empty (e.g., `"TAGLINE:"` with nothing following), `words` will be `[]`, `words.slice(0, 3).join(' ')` produces `''`, and the `||` short-circuits to the fallback `rawText.split(/\s+/).slice(0, 3).join(' ')`. That fallback splits the entire raw response text — including the recap paragraphs — and uses the first three words of the entire model response as the tagline. Depending on the tone persona used, this could produce a tagline like `"You are a"` or `"The season began"` — both nonsensical as taglines.

**Fix:**
```typescript
if (taglineIndex !== -1) {
  const taglineRaw = lines[taglineIndex].replace(/^TAGLINE:\s*/i, '').trim();
  const words = taglineRaw.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    tagline = ''; // or a safe default like 'Season Complete'
  } else {
    tagline = words.slice(0, 3).join(' ');
  }
  recapLines = lines.slice(0, taglineIndex);
} else {
  tagline = '';
}
```

---

## Info

### IN-01: Unsafe `JSON.parse` Type Assertion — No Shape Validation on Cached Narrative

**File:** `apps/desktop/src/lib/narrative-service.ts:273,303`

**Issue:** `JSON.parse(raw) as SeasonNarrative` performs no runtime validation. If the cache contains stale data from a previous schema version (e.g., missing `tone`, added later), the returned object will fail silently or render `undefined` in the UI. Risk grows as `SeasonNarrative` evolves.

**Fix:**
```typescript
const parsed = JSON.parse(raw);
if (
  !parsed ||
  typeof parsed.recap !== 'string' ||
  typeof parsed.tagline !== 'string' ||
  typeof parsed.tone !== 'string'
) {
  return null;
}
return parsed as SeasonNarrative;
```

---

### IN-02: `console.warn` in Production Code Paths

**File:** `apps/desktop/src/lib/narrative-service.ts:331,400,436`

**Issue:** Three `console.warn` calls exist in live code paths: line 331 fires on every API response that has no text content; lines 400 and 436 fire on every API call failure. These are useful during development but produce noise in production logs (visible via Tauri DevTools) and can leak implementation details. The functions already return `null` gracefully, so the warnings add no recovery value.

**Fix:** Remove or gate behind a dev check:
```typescript
if (import.meta.env.DEV) {
  console.warn('[NarrativeService] Claude API response missing text content');
}
```

---

### IN-03: Mixed Toast Systems in `game-store.ts`

**File:** `apps/desktop/src/store/game-store.ts:2,10,136`

**Issue:** `game-store.ts` imports both `toast` from `'sonner'` (line 2) and `useToastStore` from `'./toast-store'` (line 10). The `logGame` and `updateGame` paths use `useToastStore.getState().success()` / `.error()`, while `deleteGame` calls `toast.success()` directly from sonner (line 136) and its undo callback also calls `toast.success()` (line 142). Only `deleteGame` errors use `useToastStore`. This split means the undo-toast in `deleteGame` bypasses whatever queueing or state the custom toast store provides. The `toast` import from sonner at line 2 is only used in `deleteGame`.

**Fix:** Migrate `deleteGame` to use `useToastStore` exclusively, or document the intentional divergence. Remove the `toast` import from `'sonner'` if it is not needed elsewhere in the file.

---

_Reviewed: 2026-05-05T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
