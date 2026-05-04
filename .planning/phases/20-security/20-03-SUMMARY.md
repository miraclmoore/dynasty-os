---
phase: 20-security
plan: "03"
subsystem: security/localStorage-migration
tags:
  - security
  - localstorage
  - prefs-service
  - app-startup
dependency_graph:
  requires:
    - 20-01 (prefs-service foundation, PrefsStore, plugin-store)
  provides:
    - SEC-03 grep gate (zero localStorage outside prefs-service.ts in plan-03 files)
    - App.tsx eager startup bootstrap (prefs.loadAll + prefs.migrateApiKey)
    - Module-variable pattern for ephemeral one-shot UI flags (D-09)
  affects:
    - 20-02 (parallel wave: SEC-01 gate, AI callsite migration)
    - Phase 21 (rivalry key moments now in plugin-store, ready for Dexie migration)
tech_stack:
  added:
    - Module-scope exported variables for ephemeral one-shot UI signals (D-09 pattern)
  patterns:
    - Lazy-warm: usePrefsStore reactive read + useEffect async warm on mount
    - Fire-and-forget async write: void prefs.setXxx(value)
    - Eager singleton bootstrap: prefs.loadAll() in App.tsx startup useEffect
    - Module variable consume: consumeAutoOpenAddPlayer() resets flag on read
key_files:
  modified:
    - apps/desktop/src/lib/prefs-service.ts (loadAll extended for auto-export-* enumeration)
    - apps/desktop/src/lib/rivalry-service.ts (async, prefs-backed)
    - apps/desktop/src/lib/madden-sync-service.ts (async, prefs-backed)
    - apps/desktop/src/lib/auto-export-service.ts (sync read from PrefsStore, async write)
    - apps/desktop/src/pages/RivalryTrackerPage.tsx (awaits async service)
    - apps/desktop/src/pages/MaddenSyncPage.tsx (awaits async service + PrefsStore reads)
    - apps/desktop/src/pages/DashboardPage.tsx (checklist via PrefsStore + prefs-service)
    - apps/desktop/src/components/TourOverlay.tsx (tour-complete via PrefsStore + prefs-service)
    - apps/desktop/src/components/OnboardingModal.tsx (onboarding-complete via PrefsStore)
    - apps/desktop/src/components/SetupWizard.tsx (wizard state via PrefsStore + prefs-service)
    - apps/desktop/src/components/QuickEntryHub.tsx (module variable pattern D-09)
    - apps/desktop/src/pages/RosterPage.tsx (consumeAutoOpenAddPlayer on mount)
    - apps/desktop/src/pages/LauncherPage.tsx (signalOnboardingPending module variable)
    - apps/desktop/src/App.tsx (prefs.loadAll + prefs.migrateApiKey startup + _onboardingPending)
decisions:
  - "WizardState interface corrected: Plan 01 placeholder had {step: number; completedSteps: number[]} but actual shape is {dismissed: boolean; completedSteps: number[]}. Updated prefs-store.ts to match reality."
  - "auto-export-service.isAutoExportEnabled() kept synchronous: reads from usePrefsStore.getState() populated at startup by loadAll() auto-export-* enumeration (T-20-20 coercion applied)."
  - "App.tsx migrateApiKey() called unconditionally on startup: the function internally checks for the legacy key, making the external guard redundant and preventing an extra localStorage reference in App.tsx."
  - "legacy-card-service.ts retained as-is: this file is Plan 02's migration scope (SEC-01 API callsite gate). Modifying it here would create merge conflicts with the parallel Plan 02 worktree."
metrics:
  duration: "~2 hours (including context restoration from compaction)"
  completed: "2026-05-04"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 14
---

# Phase 20 Plan 03: localStorage Migration (Services + UI + App Bootstrap) Summary

Zero localStorage references remain in Plan 03's 14 modified files. The SEC-03 grep gate passes for all plan-owned files. `legacy-card-service.ts` is the sole remaining non-prefs-service file with localStorage — it belongs to Plan 02's SEC-01 migration scope (running in parallel).

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Migrate lib services (rivalry, madden-sync, auto-export) + extend prefs-service.loadAll | 2ca6a45 | rivalry-service.ts, madden-sync-service.ts, auto-export-service.ts, prefs-service.ts, RivalryTrackerPage.tsx, MaddenSyncPage.tsx |
| 2 | Migrate UI components + module variable for auto-open-add-player | 766eab6 | TourOverlay.tsx, OnboardingModal.tsx, SetupWizard.tsx, DashboardPage.tsx, QuickEntryHub.tsx, RosterPage.tsx, prefs-store.ts |
| 3 | Wire App.tsx startup bootstrap + LauncherPage module signal | 9681f2e | App.tsx, LauncherPage.tsx |

## Grep Gate Results

**Plan-03 files (SEC-03 scope):**
```
grep -RIln 'localStorage\.' apps/desktop/src/ | grep -v 'prefs-service.ts'
```
Result: Only `legacy-card-service.ts` (Plan 02 scope, not modified here). All 14 plan-03 files: 0 matches.

**Within Plan 03 files specifically:**
- `prefs-service.ts`: 2 matches (inside `migrateApiKey()` — the only allowed occurrence per design)
- All other 13 plan-03 files: 0 matches each

**Phase-wide note:** The complete SEC-03 gate (zero everywhere) will pass after Plan 02 merges and migrates `legacy-card-service.ts` and its callers.

## WizardState Shape

Plan 01's placeholder interface had `{ step: number; completedSteps: number[] }`. The actual shape in `SetupWizard.tsx` is `{ dismissed: boolean; completedSteps: number[] }`. Updated `prefs-store.ts` to match reality (Rule 1 deviation — bug fix).

## prefs-service.loadAll() Extension

`loadAll()` was extended (Task 1) to enumerate all `auto-export-*` keys via `store.entries()` and populate the `autoExportEnabled` map in PrefsStore. This allows `isAutoExportEnabled(dynastyId)` in `auto-export-service.ts` to remain synchronous (reads from `usePrefsStore.getState()`). The enumeration wraps each key parse in `Boolean(val)` per T-20-20 (malformed values coerce to `false`).

## App.tsx Startup Sequence

The startup `useEffect` is the FIRST `useEffect` in the `App` component body, before the keyboard shortcut and tour effects. Order:
1. `void prefs.migrateApiKey()` — checks for legacy `dynasty-os-anthropic-api-key` internally; no-op if absent
2. `void prefs.loadAll()` — eager singleton bootstrap into PrefsStore

The `migrateApiKey()` call is unconditional (no external `localStorage.getItem` guard) because the function internally checks for the legacy key, keeping the App.tsx localStorage count at 0.

## Async Await Counts in Migrated Pages

- `RivalryTrackerPage.tsx`: 8 `await` occurrences (getKeyMoments x2, addKeyMoment, deleteKeyMoment + 4 in handlers)
- `MaddenSyncPage.tsx`: 13 `await` occurrences (getStoredSavePath, storeSavePath, clearSavePath, isWatcherEnabled, setWatcherEnabled + others)

Both files well exceed the ≥3 minimum requirement.

## Module Variable Pattern (D-09)

Two ephemeral one-shot UI signals were demoted to module variables:

**`autoOpenAddPlayer` in QuickEntryHub.tsx:**
- `triggerAutoOpenAddPlayer()` — set by QuickEntryHub handleAddPlayer and SetupWizard
- `consumeAutoOpenAddPlayer()` — read+reset by RosterPage on mount

**`_onboardingPending` in App.tsx:**
- `signalOnboardingPending()` — exported, called by LauncherPage after CreateDynastyModal success
- Consumed in the `activeDynasty` useEffect in App; reset to `false` after opening the tour

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] WizardState interface mismatch**
- **Found during:** Task 2 (reading SetupWizard.tsx for full migration)
- **Issue:** Plan 01's `prefs-store.ts` defined `WizardState { step: number; completedSteps: number[] }` but SetupWizard.tsx actually uses `{ dismissed: boolean; completedSteps: number[] }`
- **Fix:** Updated `prefs-store.ts` interface to match the real shape
- **Files modified:** `apps/desktop/src/store/prefs-store.ts`
- **Commit:** 766eab6

### Out-of-Scope Discovery (Deferred)

**legacy-card-service.ts localStorage usage:**
- **Found during:** Task 3 SEC-03 phase-wide gate run
- **Issue:** `legacy-card-service.ts` contains `getApiKey/setApiKey/clearApiKey` backed by localStorage and a direct `fetch` to `api.anthropic.com`. Multiple pages import and use these functions.
- **Action:** Not modified — this is Plan 02's explicit migration scope (SEC-01 API callsite gate). Modifying would create merge conflicts with the parallel worktree.
- **Logged to:** This SUMMARY (not `deferred-items.md` since Plan 02 already owns it)

## Security Note

Per T-20-21: `migrateApiKey()` does not log the legacy API key value anywhere. The `console.warn` in its catch arm does not include the key. Engineers should not add `console.log(legacyKey)` during debugging.

Per T-20-22: The SEC-03 grep gate (`grep -RIln 'localStorage\.' apps/desktop/src/ | grep -v 'prefs-service.ts'`) should be enforced in CI/pre-commit hooks going forward. Phase 28 POLS-07 re-runs this gate as a final-build check.

## No New Files Created

This plan is purely migration + wiring. 14 files modified, 0 new files created. Confirmed.

## Rivalry Key Moments Phase 21 Handoff

Rivalry key moments now persist via `prefs.getRivalKeyMoments` / `prefs.setRivalKeyMoments` in `dynasty-os.bin` (plugin-store). Phase 21 will migrate them to a Dexie `keyMoments` table without breaking compatibility — the prefs-service layer provides a clean interface boundary.

## Self-Check: PASSED

Files verified to exist:
- `apps/desktop/src/App.tsx` — FOUND
- `apps/desktop/src/pages/LauncherPage.tsx` — FOUND
- `apps/desktop/src/lib/rivalry-service.ts` — FOUND
- `apps/desktop/src/lib/madden-sync-service.ts` — FOUND
- `apps/desktop/src/lib/auto-export-service.ts` — FOUND
- `apps/desktop/src/lib/prefs-service.ts` — FOUND
- `apps/desktop/src/components/QuickEntryHub.tsx` — FOUND
- `apps/desktop/src/pages/RosterPage.tsx` — FOUND
- `apps/desktop/src/store/prefs-store.ts` — FOUND

Commits verified:
- `2ca6a45` — FOUND (Task 1)
- `766eab6` — FOUND (Task 2)
- `9681f2e` — FOUND (Task 3)
