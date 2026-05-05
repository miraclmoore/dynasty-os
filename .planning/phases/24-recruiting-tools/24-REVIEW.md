---
phase: 24-recruiting-tools
reviewed: 2026-05-05T00:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - apps/desktop/package.json
  - apps/desktop/src/components/AddPlayerModal.tsx
  - apps/desktop/src/lib/draft-service.ts
  - apps/desktop/src/lib/recruiting-calculator.ts
  - apps/desktop/src/lib/recruiting-service.ts
  - apps/desktop/src/pages/DraftTrackerPage.tsx
  - apps/desktop/src/pages/RecruitingPage.tsx
  - apps/desktop/src/pages/RosterPage.tsx
  - apps/desktop/src/store/recruiting-store.ts
  - packages/core-types/src/recruiting.ts
findings:
  critical: 0
  warning: 6
  info: 4
  total: 10
status: issues_found
---

# Phase 24: Code Review Report

**Reviewed:** 2026-05-05
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Reviewed ten files spanning the Phase 24 recruiting tools feature: the `Recruit` and `RecruitingClass` data types, CRUD services, the Zustand store, the calculator, and the three pages (`RecruitingPage`, `DraftTrackerPage`, `RosterPage`) plus `AddPlayerModal`. The implementation is well-structured overall. No security vulnerabilities or data-loss risks were found.

Six warnings were identified, primarily logic correctness issues: a stale-state read inside a Zustand `set()` call, silent failures in two async form submissions, a position-sort that places unknown positions at the top of the roster, a single-word recruit name that silently breaks "Add to Roster" pre-fill, and an unhandled secondary error path during optimistic-update revert. Four informational items cover dead code, stars rendering defensiveness, a hardcoded model name, and missing clear-selection behavior in the draft player picker.

---

## Warnings

### WR-01: Stale `get()` Read Inside `deleteClass` Set Call

**File:** `apps/desktop/src/store/recruiting-store.ts:85-91`
**Issue:** `deleteClass` captures `activeClass` from `get()` on line 85, then calls `get().activeClass` again on line 90 inside the object literal passed to `set()`. Because JavaScript evaluates object literals synchronously but concurrent React/Zustand updates can interleave between async `await` points, the two reads may observe different state snapshots. The `recruitsForClass` clear decision on line 90 can therefore diverge from the `activeClass` null-out on line 88, leaving the store in an inconsistent state (either `recruitsForClass` is cleared when it should not be, or kept when the active class was already nulled out).

**Fix:**
```ts
deleteClass: async (id: string, dynastyId: string) => {
  set({ loading: true, error: null });
  try {
    await deleteRecruitingClass(id);
    const classes = await getRecruitingClassesByDynasty(dynastyId);
    const { activeClass } = get(); // single snapshot
    set({
      classes,
      loading: false,
      activeClass: activeClass?.id === id ? null : activeClass,
      recruitsForClass: activeClass?.id === id ? [] : get().recruitsForClass,
    });
  } catch (err) {
    set({ error: String(err), loading: false });
    throw err;
  }
},
```

---

### WR-02: `DraftTrackerPage.handleSubmit` Has No Error Handling — Silent Failure on DB Error

**File:** `apps/desktop/src/pages/DraftTrackerPage.tsx:97-125`
**Issue:** `handleSubmit` is an `async` function that `await`s `addPick(pickInput, activeDynasty.id)` (line 118) with no `try/catch`. If the DB write fails, the promise rejection is unhandled: the form resets as if the save succeeded (line 121), the user gets no feedback, and the pick is lost. The page has no error display element.

**Fix:**
```ts
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  // ... guards ...
  try {
    await addPick(pickInput, activeDynasty.id);
    setForm((f) => ({ ...defaultPickForm, seasonId: f.seasonId }));
  } catch (err) {
    // surface error — add an [error, setError] useState at the top of the component
    setError('Failed to save draft pick. Please try again.');
  }
};
```

---

### WR-03: `RecruitingPage.handleAddRecruit` Has No Error Handling — Silent Failure on DB Error

**File:** `apps/desktop/src/pages/RecruitingPage.tsx:234-255`
**Issue:** Same pattern as WR-02. `handleAddRecruit` calls `await addRecruit(...)` with no `try/catch`. `addRecruit` in the store (`recruiting-store.ts:98-108`) throws on DB error. The form resets immediately after, erasing the recruit data the user just entered, with no feedback. The recruit is not saved.

**Fix:**
```ts
const handleAddRecruit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!activeDynasty || !activeClass) return;
  if (!recruitForm.name.trim()) return;
  try {
    await addRecruit({ ... });
    setRecruitForm(defaultRecruitForm);
  } catch {
    // surface error via toast or inline message
    useToastStore.getState().error('Could not add recruit. Please try again.');
  }
};
```

---

### WR-04: Unknown Player Positions Sort to the Top of the Roster (indexOf -1 Bug)

**File:** `apps/desktop/src/pages/RosterPage.tsx:117-123`
**Issue:** `sortedPlayers` uses `positionOrder.indexOf(player.position)` to sort players by their position in the sport config array. `Array.prototype.indexOf` returns `-1` when the position is not found. Because the sort is ascending, `-1 < 0` means any player with a position not in `sportConfig.positions` (custom entry, typo, sport mismatch) sorts to the very top of the table ahead of all known-position players. This is a silent correctness error: the user sees unknown-position players pinned to the top with no indication why.

**Fix:**
```ts
const positionOrder = sportConfig.positions;
const sortedPlayers = [...filteredPlayers].sort((a, b) => {
  const posA = positionOrder.indexOf(a.position);
  const posB = positionOrder.indexOf(b.position);
  // Push unknown positions (-1) to the bottom
  const normA = posA === -1 ? Infinity : posA;
  const normB = posB === -1 ? Infinity : posB;
  if (normA !== normB) return normA - normB;
  return a.lastName.localeCompare(b.lastName);
});
```

---

### WR-05: Single-Word Recruit Name Silently Blocks "Add to Roster"

**File:** `apps/desktop/src/pages/RecruitingPage.tsx:121-132`
**Issue:** `handleAddToRoster` splits `recruit.name` with `split(' ')` and calls `parts.pop()` to get the last name. For a single-word name (e.g. `"Deion"`) `parts` becomes `[]` after `pop()`, so `firstName = parts.join(' ') = ""`. `AddPlayerModal` requires `firstName.trim() !== ''` for `isValid` (line 47 of `AddPlayerModal.tsx`), so the submit button is permanently disabled. The user opens the modal for a committed recruit and cannot save them — no error message is shown.

**Fix:**
```ts
function handleAddToRoster(recruit: Recruit) {
  const parts = recruit.name.trim().split(/\s+/);
  const lastName = parts.length > 1 ? (parts.pop() ?? '') : '';
  const firstName = parts.join(' ');
  // If only one word, treat the whole name as firstName
  setAddPlayerInitial({
    firstName: firstName || recruit.name.trim(),
    lastName,
    position: recruit.position,
    stars: recruit.stars,
  });
  setAddPlayerOpen(true);
}
```

---

### WR-06: `updateRecruit` Error Revert Can Silently Fail, Leaving Stale Optimistic State

**File:** `apps/desktop/src/store/recruiting-store.ts:110-130`
**Issue:** When `svcUpdateRecruit` throws, the catch block calls `getRecruitsByClass(classId)` to revert the optimistic update. If this secondary DB call also fails (e.g. device offline), the exception is unhandled — the catch block has no inner `try/catch`. The store keeps the stale optimistic state permanently with no revert and no further error signal (the toast is shown but state is wrong). Additionally, if both `recruitsForClass` is empty and `activeClass` is null, `classId` will be `undefined` and the revert is skipped entirely, leaving the optimistic update in place as permanent state.

**Fix:**
```ts
} catch (err) {
  const { recruitsForClass, activeClass } = get();
  const classId = recruitsForClass[0]?.classId ?? activeClass?.id;
  if (classId) {
    try {
      const fresh = await getRecruitsByClass(classId);
      set({ recruitsForClass: fresh });
    } catch {
      // revert failed — log and leave state as-is; user can refresh
      console.warn('[RecruitingStore] Failed to revert optimistic update');
    }
  }
  useToastStore.getState().error('Could not save recruit. Please try again.');
  throw err;
}
```

---

## Info

### IN-01: `deleteClass` Is Destructured but Never Invoked in `RecruitingPage`

**File:** `apps/desktop/src/pages/RecruitingPage.tsx:80`
**Issue:** `deleteClass` is destructured from `useRecruitingStore()` on line 80 but there is no UI element in `RecruitingPage` that calls it. It is dead code at the component level. The store action itself is correctly implemented.
**Fix:** Remove `deleteClass` from the destructuring until a delete affordance is added to the UI.

---

### IN-02: Star Rendering Has No Upper-Bound Guard in `RecruitingPage`

**File:** `apps/desktop/src/pages/RecruitingPage.tsx:740-741`
**Issue:** `'★'.repeat(5 - recruit.stars)` throws `RangeError: Invalid count value` if `recruit.stars > 5` because `String.prototype.repeat` rejects negative counts. The `stars` field in `Recruit` is typed as `number` with only a comment `// 1-5` and the UI constrains input via `<select>`, but there is no runtime validation in `addRecruit` or `updateRecruit` service functions. A record migrated from an earlier schema or manually inserted into the DB could cause the entire recruits table to crash on render. The same inline pattern appears at line 958 (class card render) but without the complement half, so that one is safe.
**Fix:** Add a clamp when rendering: `'★'.repeat(Math.min(5, Math.max(0, recruit.stars)))` and `'★'.repeat(Math.max(0, 5 - recruit.stars))`.

---

### IN-03: Hardcoded AI Model Name in `recruiting-service.ts`

**File:** `apps/desktop/src/lib/recruiting-service.ts:138`
**Issue:** The model string `'claude-haiku-4-5-20251001'` is hardcoded inline. Other files in the codebase use a similar inline pattern but having model identifiers scattered across service files makes version bumps error-prone and grep-dependent.
**Fix:** Extract to a shared constant (e.g. in `ai-bridge.ts` or a `constants.ts` file): `export const AI_GRADE_MODEL = 'claude-haiku-4-5-20251001';`

---

### IN-04: `DraftTrackerPage.handlePlayerSelect` Does Not Clear Auto-Filled Fields When Deselecting

**File:** `apps/desktop/src/pages/DraftTrackerPage.tsx:80-83`
**Issue:** When the user selects "— No link —" (empty `playerId`), only `playerId` is cleared. If the user had previously linked a player (which auto-filled `playerName` and `position`), those fields remain populated with the previously linked player's data. The user must manually clear them. This is a UX inconsistency — linking a player auto-fills, but de-linking does not auto-clear.
**Fix:**
```ts
if (!playerId) {
  setForm((f) => ({ ...f, playerId: '', playerName: '', position: '' }));
  return;
}
```

---

_Reviewed: 2026-05-05_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
