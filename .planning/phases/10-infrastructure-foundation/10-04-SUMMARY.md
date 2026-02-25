---
phase: 10-infrastructure-foundation
plan: 04
subsystem: ui
tags: [zustand, sonner, undo, ai-queue, toast, filter, react, tauri]

# Dependency graph
requires:
  - phase: 10-02
    provides: sonner@2.0.7 and cmdk@1.1.1 installed in apps/desktop
  - phase: 10-03
    provides: aiCache Dexie service layer; @dynasty-os/db with updated schema
provides:
  - useToastStore with success/error/info/loading/dismiss wrappers around sonner
  - useFilterStore with session-scoped page filter persistence
  - useUndoStore with DB-level UndoableOperation descriptor pattern (20-item history limit)
  - useAiQueueStore with enqueueAiJob() fire-and-forget async job queue and AiJob type
  - App.tsx wired with Toaster, Cmd+K listener stub, and Tauri cold-launch focus fix
affects:
  - 11-qol-wins (consumes all 4 stores for real operations)
  - 13-ai-intelligence-layer (enqueueAiJob() is the entry point for all async AI jobs)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - DB-level UndoableOperation descriptor (table + operation + snapshot) — not Zustand snapshot middleware
    - Async job queue via Zustand (fire-and-forget enqueueAiJob, AI populates asynchronously)
    - generateId() from lib/uuid.ts (crypto.randomUUID) instead of uuid npm package

key-files:
  created:
    - apps/desktop/src/store/toast-store.ts
    - apps/desktop/src/store/filter-store.ts
    - apps/desktop/src/store/undo-store.ts
    - apps/desktop/src/store/ai-queue-store.ts
  modified:
    - apps/desktop/src/store/index.ts
    - apps/desktop/src/App.tsx

key-decisions:
  - "useToastStore wraps sonner toast() calls — no direct toast() imports needed in feature components"
  - "useFilterStore session-scoped: filters: Record<string, Record<string, unknown>> keyed by page name — cleared on dynasty switch in Phase 11"
  - "UndoStore uses DB-level UndoableOperation descriptor pattern (STATE.md decision) — zundo installed but not used here"
  - "ai-queue-store uses generateId() (crypto.randomUUID) not uuid npm package — consistent with existing project pattern in lib/uuid.ts"
  - "Toaster mounted unconditionally outside PageContent so toast() calls on LauncherPage render correctly"
  - "Cmd+K listener stub registered in App.tsx useEffect — actual command palette implementation deferred to Phase 11 QOL-04"

patterns-established:
  - "Toast pattern: call useToastStore.getState().success() from service layer or component — never import toast() directly"
  - "Undo pattern: pushUndo() before destructive DB operation; undo() restores via db[table].add/put"
  - "AI job pattern: enqueueAiJob() adds job synchronously to pendingAiJobs; Phase 13 worker processes queue asynchronously"

requirements-completed: [INFRA-GATE-3, INFRA-GATE-5]

# Metrics
duration: 2min
completed: 2026-02-25
---

# Phase 10 Plan 04: Global Zustand Stores Summary

**Four global Zustand stores scaffolded (toast/filter/undo/AI-queue) with sonner Toaster, Cmd+K listener stub, and Tauri cold-launch focus fix wired into App.tsx**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-25T04:45:09Z
- **Completed:** 2026-02-25T04:47:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Created 4 new Zustand stores covering the Phase 11/13 infrastructure surface: ToastStore, FilterStore, UndoStore, AiQueueStore
- Wired App.tsx with Toaster (unconditionally mounted), hidden autofocus input for Tauri cold-launch fix, and Cmd+K keydown listener stub
- All 4 stores exported from store/index.ts with proper type exports; desktop build passes cleanly

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold ToastStore, FilterStore, UndoStore, and AiQueueStore** - `e90eb6d` (feat)
2. **Task 2: Wire App.tsx — mount Toaster, hidden autofocus input, Cmd+K listener stub** - `b1abb60` (feat)

## Files Created/Modified

- `apps/desktop/src/store/toast-store.ts` - useToastStore with success/error/info/loading/dismiss wrappers around sonner toast()
- `apps/desktop/src/store/filter-store.ts` - useFilterStore with setFilter/getFilters/clearFilters/clearAll for session-scoped page filter persistence
- `apps/desktop/src/store/undo-store.ts` - useUndoStore with pushUndo/undo/clearHistory using DB-level UndoableOperation descriptor pattern; 20-item history limit
- `apps/desktop/src/store/ai-queue-store.ts` - useAiQueueStore with enqueueAiJob/updateJobStatus/clearCompleted; AiJob type covers all 12 Phase 13 content types
- `apps/desktop/src/store/index.ts` - Added exports for all 4 new stores plus UndoableOperation and AiJob types
- `apps/desktop/src/App.tsx` - Added Toaster import + JSX mount, useRef/useEffect for hidden input focus fix and Cmd+K listener

## Decisions Made

- Used `generateId()` from `lib/uuid.ts` (which calls `crypto.randomUUID()`) instead of the `uuid` npm package in ai-queue-store — uuid is not installed; the project already has a consistent uuid helper
- Toaster is placed as last child of the root div, outside PageContent, so toast() calls work unconditionally including on the LauncherPage before any dynasty is loaded
- UndoStore uses the DB-level operation descriptor pattern per STATE.md research decision — zundo (snapshot middleware) is installed but reserved for potential other use; undo correctness requires DB-level restore not Zustand state rollback

## Deviations from Plan

**1. [Rule 3 - Blocking] Replaced `import { v4 as uuidv4 } from 'uuid'` with `import { generateId } from '../lib/uuid'`**
- **Found during:** Task 1 (ai-queue-store.ts creation)
- **Issue:** The `uuid` npm package is not installed in apps/desktop (not in package.json or node_modules). The plan referenced it, but the project already has a `generateId()` helper in `lib/uuid.ts` using `crypto.randomUUID()`
- **Fix:** Used `generateId()` from `../lib/uuid` instead — same result, consistent with all other service files in the project
- **Files modified:** apps/desktop/src/store/ai-queue-store.ts
- **Verification:** Build passes; generateId() is the established project pattern in game-service.ts, prestige-service.ts, etc.
- **Committed in:** e90eb6d (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking import)
**Impact on plan:** No scope creep. The fix aligns ai-queue-store with existing project patterns rather than introducing a new dependency.

## Issues Encountered

None — both tasks executed cleanly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 11 QOL features (toasts, undo, filters, command palette) can call into all 4 stores immediately — stores are exported from store/index.ts and callable from any component
- Phase 13 AI features can call enqueueAiJob() to add jobs to pendingAiJobs; AI worker implementation in Phase 13
- Cmd+K listener stub is registered and ready for command palette wiring in Phase 11 QOL-04

---
*Phase: 10-infrastructure-foundation*
*Completed: 2026-02-25*
