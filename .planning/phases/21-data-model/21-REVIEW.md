---
phase: 21-data-model
reviewed: 2026-05-04T00:00:00Z
depth: standard
files_reviewed: 21
files_reviewed_list:
  - packages/core-types/src/key-moment.ts
  - packages/core-types/src/player.ts
  - packages/core-types/src/season.ts
  - packages/core-types/src/recruiting.ts
  - packages/core-types/src/index.ts
  - packages/db/src/schema.ts
  - packages/db/src/dynasty-db.ts
  - apps/desktop/src/lib/key-moments-migration.ts
  - apps/desktop/src/lib/rivalry-service.ts
  - apps/desktop/src/lib/export-import.ts
  - apps/desktop/src/App.tsx
  - apps/desktop/src/pages/RivalryTrackerPage.tsx
  - apps/desktop/src/lib/cfb-categories.ts
  - apps/desktop/src/components/AddPlayerModal.tsx
  - apps/desktop/src/components/EditPlayerModal.tsx
  - apps/desktop/src/pages/RosterPage.tsx
  - apps/desktop/src/pages/PlayerProfilePage.tsx
  - apps/desktop/src/components/SeasonEndModal.tsx
  - apps/desktop/src/lib/timeline-service.ts
  - apps/desktop/src/pages/DashboardPage.tsx
  - apps/desktop/src/pages/RecruitingPage.tsx
findings:
  critical: 3
  warning: 5
  info: 3
  total: 11
status: issues_found
---

# Phase 21: Code Review Report

**Reviewed:** 2026-05-04
**Depth:** standard
**Files Reviewed:** 21
**Status:** issues_found

## Summary

Phase 21 delivers five data-model extensions (DMOD-01 through DMOD-05): key moments moved from Tauri plugin-store to Dexie, bowl opponent + key events on Season, dev trait on Player (both sports), deal breaker + redshirt on Player (CFB only), and recruit motivation grades + visit week on Recruit. The implementation is structurally sound — the schema, type definitions, migration path, UI forms, and export/import path all exist and are logically connected.

Three blockers were found. The most impactful: the export/import flow silently drops recruiting class and recruit data because those tables are not included in `DynastyExport`, causing permanent data loss on dynasty import round-trips. The second blocker: `deleteRival` does not cascade-delete associated `keyMoments` rows, creating orphaned DB records that silently inflate on every re-add of the same rival. The third blocker: `deleteKeyMoment` deletes all rows matching `rivalId + year + description` — if a user saves two identical moment entries, deleting one silently deletes both.

Five warnings cover: a mid-file `import` statement in App.tsx that violates module spec; silent error-swallowing in the rivalry store; the `getKeyMoments` query not scoping by `dynastyId` (enabling cross-dynasty leakage if `rivalId` collides); the `migrateKeyMomentsFromPrefsStore` setting the migration flag after individual per-key deletions rather than after a full-success flush; and a NaN-passthrough risk in the key moment year form.

---

## Critical Issues

### CR-01: Dynasty export silently drops all recruiting class and recruit data

**File:** `apps/desktop/src/lib/export-import.ts:19-33, 57-79`

**Issue:** `DynastyExport` does not include `recruitingClasses` or `recruits`. The `exportDynasty` function never queries `db.recruitingClasses` or `db.recruits`, and the import path never restores them. A user who exports and re-imports a dynasty permanently loses their entire recruiting history. This is a data loss defect.

**Fix:**
```typescript
// 1. Extend the interface
export interface DynastyExport {
  version: 1 | 2 | 3 | 4;   // bump to 4 when adding these fields
  // ... existing fields ...
  recruitingClasses?: RecruitingClass[];
  recruits?: Recruit[];
}

// 2. Export
const recruitingClasses = await db.recruitingClasses.where('dynastyId').equals(dynastyId).toArray();
const classIds = recruitingClasses.map((c) => c.id);
const recruits = classIds.length > 0
  ? await db.recruits.where('classId').anyOf(classIds).toArray()
  : [];

// 3. Import — non-remap path, inside the transaction:
if (data.recruitingClasses && data.recruitingClasses.length > 0)
  await db.recruitingClasses.bulkAdd(data.recruitingClasses);
if (data.recruits && data.recruits.length > 0)
  await db.recruits.bulkAdd(data.recruits);

// 4. Import — remap path: generate new classId map, remap recruit.classId analogously
// to how seasonIdMap and playerIdMap are handled.
```

---

### CR-02: Deleting a rival leaves orphaned keyMoments rows

**File:** `apps/desktop/src/lib/rivalry-service.ts:31-33`

**Issue:** `deleteRival` deletes only the `rivals` row. All `keyMoments` rows sharing that `rivalId` remain in the DB. These orphaned rows accumulate silently, can never be viewed or deleted by the user, and will be incorrectly re-imported if an export is taken after re-adding the same rival. The migration code itself acknowledges orphaned entries exist (line 56-59) and skips them — the root cause is missing cascade delete here.

**Fix:**
```typescript
export async function deleteRival(id: string): Promise<void> {
  await db.transaction('rw', [db.rivals, db.keyMoments], async () => {
    await db.rivals.delete(id);
    // Cascade: remove all key moments for this rival
    await db.keyMoments.where('rivalId').equals(id).delete();
  });
}
```

---

### CR-03: deleteKeyMoment deletes all duplicates when user adds the same moment twice

**File:** `apps/desktop/src/lib/rivalry-service.ts:107-120`

**Issue:** The delete discriminator is `rivalId + year + description`. If a user adds two key moments with identical year and description (e.g. by clicking "Add" twice on the same entry before the UI refreshes), both rows are written with distinct `id` values. When the user later clicks delete on one, `bulkDelete(matches.map((m) => m.id))` removes all matching rows — silently deleting more than the user intended. The comment at line 104 documents that "description is the discriminator" but does not acknowledge this failure mode.

**Fix:** Delete by the row's unique `id` (which the UI already has access to via the `KeyMoment` object):
```typescript
// In rivalry-service.ts — prefer ID-based delete
export async function deleteKeyMoment(id: string): Promise<void> {
  await db.keyMoments.delete(id);
}

// In RivalryTrackerPage.tsx line 128 — update call site
const handleDeleteMoment = async (rivalId: string, moment: KeyMoment) => {
  await deleteKeyMoment(moment.id);
  // ...
};
```

---

## Warnings

### WR-01: `import` statement placed after executable code in App.tsx

**File:** `apps/desktop/src/App.tsx:16`

**Issue:** The `import { migrateKeyMomentsFromPrefsStore }` statement at line 16 appears after the module-level variable declaration (`let _onboardingPending`) and exported function at lines 11-15. While TypeScript/bundlers hoist static `import` declarations so this works at runtime, it violates the ES module spec ordering convention and will trigger lint errors in projects with `import/first` configured. More critically, it signals the code was edited carelessly — any human reader assumes the imports are complete before line 11.

**Fix:** Move the import to the top of the file with all other imports:
```typescript
import React, { useEffect, useRef, useState } from 'react';
import { Toaster } from 'sonner';
import { useDynastyStore } from './store';
import { useNavigationStore } from './store/navigation-store';
import * as prefs from './lib/prefs-service';
import { migrateKeyMomentsFromPrefsStore } from './lib/key-moments-migration';
// ... remaining imports ...

let _onboardingPending = false;
// ...
```

---

### WR-02: `getKeyMoments` queries by `rivalId` only — potential cross-dynasty leakage if IDs collide

**File:** `apps/desktop/src/lib/rivalry-service.ts:74-77`

**Issue:** The function queries `db.keyMoments.where('rivalId').equals(rivalId)`. The comment in `schema.ts` (line 29) explicitly notes that `dynastyId` is required for export and cascade-delete. But the read path does not filter by `dynastyId`. IDs generated by `generateId()` (likely `crypto.randomUUID()`) make collision astronomically unlikely in practice, but the compound index `[dynastyId+rivalId]` was added precisely to scope reads — the read query does not use it, defeating its purpose and leaving a latent correctness gap if IDs were ever shortened or reused.

**Fix:**
```typescript
// Caller must pass dynastyId (it is always available at call sites)
export async function getKeyMoments(dynastyId: string, rivalId: string): Promise<KeyMoment[]> {
  const moments = await db.keyMoments
    .where('[dynastyId+rivalId]')
    .equals([dynastyId, rivalId])
    .toArray();
  return moments.sort((a, b) => b.year - a.year);
}
```

---

### WR-03: Rivalry store silently swallows all errors

**File:** `apps/desktop/src/store/rivalry-store.ts:40, 51, 62, 73`

**Issue:** All four store actions (`loadRivals`, `addRival`, `editRival`, `removeRival`) catch errors and reset loading state without surfacing the error to the UI or logging it. A failed `addRival` (e.g., Dexie constraint violation) leaves the user staring at the form with no feedback. A failed `removeRival` clears loading but the rival remains in the list, and the store silently resets — a confusing UX.

**Fix:** Propagate errors (or at minimum log them) so callers can display feedback:
```typescript
addRival: async (input, dynastyId) => {
  set({ loading: true });
  try {
    await createRival(input);
    const rivals = await getRivalsByDynasty(dynastyId);
    set({ rivals, loading: false });
  } catch (err) {
    set({ loading: false });
    console.error('[rivalry-store] addRival failed:', err);
    throw err; // allow call site to show a toast
  }
},
```

---

### WR-04: Migration flag set before all legacy plugin-store deletes confirm success

**File:** `apps/desktop/src/lib/key-moments-migration.ts:82-87`

**Issue:** The per-key `store.delete(k)` calls at lines 82-84 are individually `try/catch`-swallowed with an empty catch. The migration flag is then set at line 86 whether or not all deletions succeeded. On the next launch, the migration is skipped (flag is set), but the plugin-store may still contain un-deleted legacy entries — not a data correctness problem (Dexie is the source of truth), but the legacy store is now permanently stale and the comment's guarantee ("deleted to prevent stale data shadowing the Dexie source of truth") is broken.

**Fix:** Either track deletion failures and log them, or accept that deletion is best-effort and update the comment to reflect that:
```typescript
// Option A: log failures without blocking flag
for (const k of migratedKeys) {
  try {
    await store.delete(k);
  } catch (err) {
    console.warn(`[key-moments-migration] failed to delete legacy key "${k}":`, err);
  }
}
await store.set(MIGRATION_FLAG, true);
// The flag is intentionally set even if some deletions failed.
// The Dexie table is the source of truth; stale plugin-store entries are inert.
```

---

### WR-05: Year input in key moment form accepts NaN silently

**File:** `apps/desktop/src/pages/RivalryTrackerPage.tsx:119-120`

**Issue:** `parseInt(form.year, 10)` returns `NaN` for non-numeric input. The guard `if (!year || ...)` short-circuits on falsy values, which includes `NaN`, so the function returns early — that part is correct. However, the `disabled` attribute on the Add button (line 499) only checks `!momentForm.year` (empty string), not that it parses to a valid number. A user can type `"abc"` which passes the disabled check (non-empty string is truthy), clicks Add, and the button appears active even though submit will silently no-op. The year input `type="number"` helps on desktop, but HTML number inputs still allow non-numeric submission in some edge cases and via programmatic manipulation.

**Fix:**
```typescript
// In the button disabled check
disabled={!momentForm.year || isNaN(parseInt(momentForm.year, 10)) || !momentForm.description.trim()}

// Or validate more explicitly in handleAddMoment
const year = parseInt(form.year, 10);
if (!year || isNaN(year) || year < 2000 || year > 2099 || !form.description.trim()) return;
```

---

## Info

### IN-01: `devTrait` field type duplicated between core-types and cfb-categories

**File:** `packages/core-types/src/player.ts:22`, `apps/desktop/src/lib/cfb-categories.ts:34`

**Issue:** `Player.devTrait` is typed as the inline union `'normal' | 'star' | 'superstar' | 'xfactor'` in `player.ts`, while `cfb-categories.ts` re-declares the same values in a `const` array and derives `DevTrait` from it. These must be kept in sync manually. A discrepancy (e.g., adding a new trait to one but not the other) would cause type errors in the UI but not in the DB layer. The comment in `cfb-categories.ts` line 31 acknowledges this duplication ("The same union is duplicated...").

**Fix:** Export `DevTrait` from `core-types` and re-export it from `cfb-categories`, or import it there:
```typescript
// In packages/core-types/src/player.ts
export type DevTrait = 'normal' | 'star' | 'superstar' | 'xfactor';

// In player interface
devTrait?: DevTrait;
```

---

### IN-02: Key moments list uses array index as React key

**File:** `apps/desktop/src/pages/RivalryTrackerPage.tsx:444`

**Issue:** `key={idx}` is used for key moment list items. Each `KeyMoment` has a stable `id` field available on the `moment` object. Using array index as key causes incorrect DOM reconciliation when moments are deleted from the middle of the list (the wrong moment may appear to animate or flicker out).

**Fix:**
```tsx
{moments.map((moment) => (
  <li key={moment.id} className="...">
```

---

### IN-03: `AddPlayerModal` does not expose dealBreaker or isRedshirt fields for CFB

**File:** `apps/desktop/src/components/AddPlayerModal.tsx:1-318`

**Issue:** The `EditPlayerModal` conditionally shows Deal Breaker and Redshirt fields for `sport === 'cfb'` (DMOD-04). `AddPlayerModal` does not show these fields at all — only `devTrait` is exposed. This is not necessarily wrong (both fields are optional), but it creates an asymmetry where CFB users must add a player and then immediately edit it to set their deal breaker. The comment in `player.ts` marks these as "CFB-only" but nothing in the spec document excludes them from the add flow.

**Fix:** Add the CFB-only fields to `AddPlayerModal` analogously to `EditPlayerModal` lines 234-266:
```tsx
{/* Deal Breaker + Redshirt — CFB only (DMOD-04) */}
{sport === 'cfb' && (
  <div className="grid grid-cols-2 gap-3">
    {/* ... same pattern as EditPlayerModal ... */}
  </div>
)}
```

---

_Reviewed: 2026-05-04_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
