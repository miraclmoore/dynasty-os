---
phase: 24-recruiting-tools
plan: "02"
subsystem: recruiting-ui
tags: [recruiting, hard-sell, committed, add-to-roster, tool-01, tool-03]

dependency_graph:
  requires:
    - 24-01 (TOOL-03 foundation — Recruit.isCommitted, updateRecruit store action, AddPlayerModal pre-fill props)
  provides:
    - Hard Sell banner in recruit entry form (TOOL-01, D-04)
    - Per-row Hard Sell badge on saved recruits (TOOL-01, D-06)
    - isCommitted toggle with optimistic update (TOOL-03, D-02)
    - Add to Roster button opening pre-filled AddPlayerModal (TOOL-03, D-03)
  affects:
    - apps/desktop/src/pages/RecruitingPage.tsx (primary page — hard-sell + committed flow)
    - apps/desktop/src/lib/recruiting-calculator.ts (GRADE_POINTS export)

tech_stack:
  added: []
  patterns:
    - IIFE in JSX for inline conditional computation (row badge + form banner)
    - Optimistic toggle via Zustand updateRecruit store action
    - Name-splitting via Array.pop() for pre-fill firstName/lastName

key_files:
  created: []
  modified:
    - apps/desktop/src/lib/recruiting-calculator.ts
    - apps/desktop/src/pages/RecruitingPage.tsx

decisions:
  - Used inline IIFE pattern for Hard Sell banner (avoids adding a top-level computed variable inside a deeply nested component, matches Plan 02 action spec)
  - Placed Hard Sell banner inside the motivation grid wrapper div to keep it visually adjacent to the motivation selects
  - Added Status column header to recruit table to accommodate the new per-row controls
  - CFB_DEAL_BREAKER_CATEGORIES import retained (still used by dealBreakerMotivation select)
  - Plan 05 (TOOL-05 Class Card) will add export button + hidden render target on top of these changes

metrics:
  duration: "~25 min"
  completed: "2026-05-05"
  tasks_completed: 2
  files_modified: 6
---

# Phase 24 Plan 02: Hard Sell Wiring + Committed Flow Summary

Wave 2 consumer plan wired the Hard Sell calculator and isCommitted/Add-to-Roster flow into RecruitingPage, building on the Wave 1 foundation from Plan 01.

## What Was Built

### Plan 01 Foundation (applied as Wave 2 prerequisite — Rule 3 blocking fix)

The Wave 1 foundation commits were not present in this worktree. Applied all Plan 01 changes atomically before proceeding to Plan 02:

- `packages/core-types/src/recruiting.ts` — Added `isCommitted?: boolean` after `visitWeek?` with v2.2 phase comment
- `apps/desktop/src/lib/recruiting-service.ts` — Added `updateRecruit(id, updates)` export delegating to `db.recruits.update`
- `apps/desktop/src/store/recruiting-store.ts` — Added `updateRecruit` store action (optimistic update + revert-on-error + toast), imported `svcUpdateRecruit` and `useToastStore`
- `apps/desktop/src/components/AddPlayerModal.tsx` — Added 4 optional pre-fill props, 4 updated useState initializers, and `useEffect` that re-applies initial values on each `isOpen → true` transition

### Task 1: Export GRADE_POINTS + Motivation Dropdowns + Hard Sell Banner

**File: `apps/desktop/src/lib/recruiting-calculator.ts`**
- Line 6: `const GRADE_POINTS` → `export const GRADE_POINTS` (single-character change)

**File: `apps/desktop/src/pages/RecruitingPage.tsx`**
- Added import: `import { getHardSellRecommendation, GRADE_POINTS } from '../lib/recruiting-calculator'`
- All 3 motivation `<select>` dropdowns now iterate `Object.keys(GRADE_POINTS)` (13 grades A+ through F)
- Placeholder labels updated to "Grade 1 — (optional)", "Grade 2 — (optional)", "Grade 3 — (optional)"
- `CFB_DEAL_BREAKER_CATEGORIES` retained for dealBreakerMotivation select (still in use)
- Hard Sell banner added immediately below the motivation grid using an IIFE pattern:
  - Green (`bg-green-900/20 border-green-600/50`) for "Hard Sell"
  - Amber (`bg-amber-900/20 border-amber-600/50`) for "Send the House"
  - Hidden when any grade is empty (getHardSellRecommendation returns null)

**Form-state variable name:** `recruitForm` (RecruitFormData interface with motivation1/motivation2/motivation3 fields)

### Task 2: Row-level Badge, isCommitted Toggle, Add to Roster

**File: `apps/desktop/src/pages/RecruitingPage.tsx`**

- Added `import { AddPlayerModal } from '../components/AddPlayerModal'`
- Added `import type { RecruitingClass, Recruit } from '@dynasty-os/core-types'` (extended existing)
- Extended `useRecruitingStore()` destructure to include `updateRecruit`
- Added `addPlayerInitial` state (`{ firstName, lastName, position, stars } | null`)
- Added `addPlayerOpen` state (`boolean`)
- Added `handleAddToRoster(recruit: Recruit)` function (splits name on last space, sets pre-fill state, opens modal)
- Added "Status" `<th>` column to recruit table header
- Added per-row `<td>` with flex container holding:
  - Hard Sell badge (IIFE, conditionally rendered when all 3 grades saved)
  - Committed/Uncommitted toggle button (always rendered, calls `updateRecruit`)
  - "Add to Roster" button (conditional on `recruit.isCommitted`, calls `handleAddToRoster`)
- Added `<AddPlayerModal>` instance at bottom of JSX return, guarded by `activeDynasty && addPlayerInitial`

**D-03 compliance:** Recruit record is NOT modified when modal opens or closes. `handleAddToRoster` only sets local UI state; `onClose` only clears that state.

## Deviations from Plan

### Auto-applied: Plan 01 Foundation (Rule 3 — Blocking Prerequisite)

- **Found during:** Task 1 startup — Wave 1 code changes not present in this worktree
- **Issue:** `isCommitted`, `updateRecruit` store action, and AddPlayerModal pre-fill props all absent; Plan 02 cannot proceed without them
- **Fix:** Applied all Plan 01 changes from 24-01-PLAN.md exactly as specified
- **Files modified:** `packages/core-types/src/recruiting.ts`, `apps/desktop/src/lib/recruiting-service.ts`, `apps/desktop/src/store/recruiting-store.ts`, `apps/desktop/src/components/AddPlayerModal.tsx`
- **Commit:** `018c677`

### Style deviation: IIFE for banner instead of pre-computed variable

- **Reason:** The form banner is inside a deeply nested JSX block; an IIFE keeps computation local and avoids adding top-level variables that would need to be declared inside the early-return-guarded section. Same pattern used for the row badge. Functionally equivalent.

## CFB_DEAL_BREAKER_CATEGORIES import status

**Retained** — still used by the `dealBreakerMotivation` select. The 3 motivation grade selects now use `GRADE_POINTS` instead.

## Note for Plan 05

Plan 05 (TOOL-05 Class Card) will add the export button + hidden render target on top of these changes to `RecruitingPage.tsx`. No conflicts expected since Plan 05 touches the class panel section, not the recruit row or form area.

## Known Stubs

None — all data paths are wired. The Hard Sell banner, row badge, toggle, and Add to Roster button all consume live store state.

## Threat Flags

No new security surface beyond what was declared in the plan's threat model (T-24-02-01 through T-24-02-04).

## Self-Check

**Commits:**
- `018c677` — feat(24-01): TOOL-03 foundation
- `eae6a26` — feat(24-02): TOOL-01 GRADE_POINTS + dropdowns + banner
- `1e9c812` — feat(24-02): TOOL-01/03 row-level badge + toggle + Add to Roster

**Key file existence:**
- `apps/desktop/src/lib/recruiting-calculator.ts` — modified (GRADE_POINTS exported)
- `apps/desktop/src/pages/RecruitingPage.tsx` — modified (full wiring)

**TypeScript:** Zero errors confirmed via tsc against main project with node_modules

## Self-Check: PASSED
