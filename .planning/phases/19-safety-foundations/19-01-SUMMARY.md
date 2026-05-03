---
phase: 19-safety-foundations
plan: "01"
subsystem: frontend-safety
tags: [error-boundary, undo-store, type-safety, react-class-component, dexie]
dependency_graph:
  requires: []
  provides:
    - ErrorBoundary class component at apps/desktop/src/components/ErrorBoundary.tsx
    - UndoableTableName union type exported from undo-store
    - TABLE_MAP typed undo lookup (no db as any)
  affects:
    - apps/desktop/src/App.tsx (ErrorBoundary wraps PageContent)
    - apps/desktop/src/store/undo-store.ts (SAFE-02 types propagate to all five pushUndo callers)
tech_stack:
  added: []
  patterns:
    - React class component (first in codebase) with getDerivedStateFromError / componentDidCatch
    - Structural type alias (UndoableTable) to avoid importing dexie directly in apps/desktop
    - TABLE_MAP record pattern for compile-time-safe Dexie table dispatch
key_files:
  created:
    - apps/desktop/src/components/ErrorBoundary.tsx
  modified:
    - apps/desktop/src/App.tsx
    - apps/desktop/src/store/undo-store.ts
decisions:
  - "Structural UndoableTable type instead of import type { Table } from 'dexie': dexie is a dep of @dynasty-os/db, not apps/desktop; importing it directly caused TS2307; structural type {add, put} achieves the same compile-time safety without adding a direct dep"
  - "import type { Table } from 'dexie' blocked by TS2307 (dexie not in apps/desktop deps); replaced with inline structural type UndoableTable"
metrics:
  duration: "~10 minutes"
  completed: "2026-05-03"
  tasks_completed: 3
  files_changed: 3
---

# Phase 19 Plan 01: Error Boundary + Typed Undo Store Summary

**One-liner:** React class component error boundary with styled red-card fallback + TABLE_MAP eliminating `db as any` for typed Dexie undo dispatch.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create ErrorBoundary class component (SAFE-01 part 1) | 3fb8a96 | apps/desktop/src/components/ErrorBoundary.tsx (created) |
| 2 | Wire ErrorBoundary around PageContent in App.tsx (SAFE-01 part 2) | 27736c5 | apps/desktop/src/App.tsx |
| 3 | Replace db as any with typed TABLE_MAP in undo-store (SAFE-02) | 3cbd7aa | apps/desktop/src/store/undo-store.ts |

---

## Verification Results

### SAFE-01: ErrorBoundary Component

All acceptance criteria verified:

- `class ErrorBoundary extends React.Component` — present
- `static getDerivedStateFromError` — present
- `componentDidCatch` — present  
- `role="alert"` — present
- `Something went wrong.` — present
- `your dynasty data is safe` — present
- `window.location.reload()` — present
- `aria-expanded={this.state.showDetails}` — present
- `h-[calc(100vh-40px)]` — present
- `bg-gray-800 border border-red-900/50 rounded-xl p-8` — present
- `bg-red-700 hover:bg-red-600` — present
- `Show error details` / `Hide error details` — present
- Only one import: `import React from 'react'` — confirmed

### SAFE-01 Part 2: App.tsx Integration

- `import { ErrorBoundary } from './components/ErrorBoundary'` — present
- `<ErrorBoundary>` wraps only `<PageContent />` — confirmed
- CommandPalette, TourOverlay, TickerBar, Toaster remain as siblings outside boundary — confirmed
- Hidden input ref and help `?` button unchanged — confirmed

### SAFE-02: Typed Undo Store

- Zero occurrences of `db as any` — confirmed (`grep -c "db as any"` returns 0)
- `export type UndoableTableName` with five literal members — present
- `const TABLE_MAP: Record<UndoableTableName,` — present
- `table: UndoableTableName` on UndoableOperation.table field — present
- `await table.add(last.snapshot)` — present (1 occurrence)
- `await table.put(last.snapshot)` — present (1 occurrence)
- `useUndoStore` and `UndoableOperation` still exported — confirmed

### Manual Negative Test (SAFE-02 gate)

Temporarily edited `game-store.ts` to pass `table: 'notATable'` to pushUndo. TypeScript output:

```
src/store/game-store.ts(69,11): error TS2322: Type '"notATable"' is not assignable to type 'UndoableTableName'.
```

Invalid table name confirmed as compile-time error (TS2322). Revert applied immediately.

### Final tsc --noEmit Exit Code: 0

All three modified files together: `pnpm --filter @dynasty-os/desktop exec tsc --noEmit` exits 0.

Note: TypeScript checking was performed by temporarily copying worktree files to the main project (which has node_modules) — the worktree does not have its own node_modules install. The check is equivalent to running from the worktree once node_modules are installed.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed `import type { Table } from 'dexie'` — replaced with inline structural type**

- **Found during:** Task 3 tsc verification
- **Issue:** `import type { Table } from 'dexie'` caused `TS2307: Cannot find module 'dexie'` because `dexie` is a dependency of `@dynasty-os/db`, not `apps/desktop`. The plan specified this import but it cannot resolve in the desktop package's TypeScript context.
- **Fix:** Defined a local structural type `UndoableTable = { add: ...; put: ... }` that describes the two methods used in `undo()`. The TABLE_MAP type was changed from `Record<UndoableTableName, Table<Record<string,unknown>,string>>` to `Record<UndoableTableName, UndoableTable>`. The `as unknown as UndoableTable` casts for each table entry are equivalent to the plan's `as unknown as Table<...>` casts. All plan acceptance criteria are met — the only difference is the absence of the dexie import.
- **Files modified:** apps/desktop/src/store/undo-store.ts
- **Commit:** 3cbd7aa

---

## Known Stubs

None. All functionality is fully wired:
- ErrorBoundary renders the full fallback UI when `hasError === true`
- TABLE_MAP is fully populated with all five Dexie table instances
- No placeholder data sources or TODO markers present

---

## Threat Flags

No new network endpoints, auth paths, file access patterns, or schema changes introduced. All three files are purely frontend components/stores with no new trust boundaries.

Threat model items T-19-02 and T-19-04/T-19-05 are mitigated as specified:
- T-19-02: error.message/stack rendered as React text nodes (no dangerouslySetInnerHTML)
- T-19-04/T-19-05: TABLE_MAP + UndoableTableName union eliminates arbitrary table access; negative test confirms compile-time enforcement

---

## Self-Check: PASSED

Verified:
- `apps/desktop/src/components/ErrorBoundary.tsx` — FOUND
- `apps/desktop/src/App.tsx` contains `<ErrorBoundary>` — FOUND
- `apps/desktop/src/store/undo-store.ts` contains `TABLE_MAP` — FOUND
- Commit 3fb8a96 — FOUND
- Commit 27736c5 — FOUND
- Commit 3cbd7aa — FOUND
