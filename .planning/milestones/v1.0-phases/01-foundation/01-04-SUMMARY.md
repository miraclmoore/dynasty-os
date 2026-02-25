---
phase: 01-foundation
plan: "04"
subsystem: ui
tags: [react, zustand, tailwind, tauri, dexie, export, import, dynasty-management]

# Dependency graph
requires:
  - phase: 01-foundation/01-02
    provides: Tauri 2.x shell with React + Vite frontend wired to WebView
  - phase: 01-foundation/01-03
    provides: Core types, Dexie DB schema, sport configs
provides:
  - Dynasty service layer (createDynasty, getDynasties, getDynasty, updateDynasty, deleteDynasty)
  - Zustand store for dynasty state (dynasties, activeDynasty, loading, error)
  - LauncherPage: dynasty listing, empty state, import, create entry point
  - DashboardPage: placeholder dashboard showing active dynasty info + DynastySwitcher
  - CreateDynastyModal: sport selector, game version dropdown, team/coach/year form
  - DynastyCard: dynasty info display with export and delete actions
  - DynastySwitcher: dropdown to switch between dynasties from any screen
  - ExportImportControls: export via Tauri save dialog, import via file input
  - JSON export/import with ID remapping for conflict resolution
  - Cascade delete (playerSeasons → players → games → seasons → dynasty)
affects:
  - All subsequent phases (DashboardPage is the shell each phase builds into)
  - Phase 2 (Core Loop) builds the real dashboard into this DashboardPage placeholder

# Tech tracking
tech-stack:
  added:
    - zustand@5.x (React state management for dynasty store)
    - "@tauri-apps/plugin-dialog (native save dialog for export)"
    - "@tauri-apps/plugin-fs (writeTextFile for export to disk)"
    - tauri-plugin-dialog@2.6.0 (Rust crate)
    - tauri-plugin-fs@2.4.5 (Rust crate)
  patterns:
    - Zustand slice pattern: state + actions colocated, loadDynasties called after mutations
    - ID remapping on import conflict: when dynasty ID already exists, all IDs regenerated with generateId()
    - Cascade delete via Dexie transaction: playerSeasons → players → games → seasons → dynasty
    - Tauri save dialog + writeTextFile: replaces blob download (blob URLs do not trigger downloads in WKWebView/WebView2)
    - Sport-aware form: CreateDynastyModal resets team/gameVersion when sport changes

key-files:
  created:
    - apps/desktop/src/lib/uuid.ts
    - apps/desktop/src/lib/dynasty-service.ts
    - apps/desktop/src/lib/export-import.ts
    - apps/desktop/src/store/dynasty-store.ts
    - apps/desktop/src/store/index.ts
    - apps/desktop/src/pages/LauncherPage.tsx
    - apps/desktop/src/pages/DashboardPage.tsx
    - apps/desktop/src/components/CreateDynastyModal.tsx
    - apps/desktop/src/components/DynastyCard.tsx
    - apps/desktop/src/components/DynastySwitcher.tsx
    - apps/desktop/src/components/ExportImportControls.tsx
  modified:
    - apps/desktop/src/App.tsx
    - apps/desktop/src-tauri/src/lib.rs
    - apps/desktop/src-tauri/capabilities/default.json
    - apps/desktop/src-tauri/Cargo.toml

key-decisions:
  - "Tauri plugin-dialog + plugin-fs used for export: blob URL + anchor.click() does not trigger file downloads in WKWebView (macOS) or WebView2 (Windows) — native save dialog is required"
  - "createDynastyInput type derived from service function signature: avoids separate interface definition"
  - "Cascade delete uses Dexie transaction: ensures atomic removal of dynasty + all related records"
  - "Import ID remapping generates fresh UUIDs for all entities: prevents PK conflicts on re-import of same file"
  - "ExportImportControls uses hidden file input for import: works cross-platform without Tauri open-dialog dependency"
  - "DashboardPage is a placeholder shell: intentionally minimal, Phase 2 builds the real content into it"

patterns-established:
  - "Store loads dynasties after every mutation: loadDynasties() called at end of create/delete/import"
  - "Active dynasty reset on delete: if deleted dynasty is active, sets activeDynasty to null → returns to Launcher"
  - "App-level routing: App.tsx renders LauncherPage when activeDynasty is null, DashboardPage when set"

# Metrics
duration: ~15min (including export fix)
completed: 2026-02-22
checkpoint_approved: true
---

# Phase 01 Plan 04: Dynasty Management UI Summary

**Full dynasty management UI: launcher page, create/delete/export/import with native Tauri save dialog, Zustand store, and placeholder dashboard with dynasty switcher. All Phase 1 success criteria met.**

## Performance

- **Duration:** ~15 min
- **Tasks:** 2 + 1 post-checkpoint fix
- **Files modified:** 14

## Accomplishments

- Built complete dynasty CRUD service layer backed by Dexie IndexedDB with cascade deletes
- Implemented Zustand store wiring all store actions to service layer with loading/error state
- Created LauncherPage with dynasty card grid, empty state, create modal, and import button
- Built CreateDynastyModal with sport toggle, sport-aware game version dropdown, team/coach/year fields
- Implemented DynastySwitcher dropdown accessible from DashboardPage header
- Built JSON export/import with full entity serialization and ID remapping for conflict-free re-import
- Fixed export to use Tauri native save dialog + fs write (blob URL downloads don't work in WKWebView/WebView2)
- Wired App.tsx to render Launcher vs Dashboard based on activeDynasty

## Task Commits

1. **Task 1: Dynasty service layer, export/import, and Zustand store** — `5d24aa9`
2. **Task 2: Dynasty management UI pages and components** — `a8345be`
3. **Post-checkpoint fix: Tauri dialog+fs plugins for export** — `b5810ff`

## Files Created/Modified

- `apps/desktop/src/lib/uuid.ts` — UUID generator using crypto.randomUUID()
- `apps/desktop/src/lib/dynasty-service.ts` — CRUD operations via Dexie with cascade delete
- `apps/desktop/src/lib/export-import.ts` — JSON export (full entity tree) + import with ID remapping
- `apps/desktop/src/store/dynasty-store.ts` — Zustand store: state + all dynasty actions
- `apps/desktop/src/store/index.ts` — Re-exports useDynastyStore
- `apps/desktop/src/pages/LauncherPage.tsx` — Dynasty launcher with grid layout, empty state, create button
- `apps/desktop/src/pages/DashboardPage.tsx` — Placeholder dashboard with dynasty info + DynastySwitcher
- `apps/desktop/src/components/CreateDynastyModal.tsx` — Dynasty creation form with sport-aware fields
- `apps/desktop/src/components/DynastyCard.tsx` — Dynasty card with export and delete actions
- `apps/desktop/src/components/DynastySwitcher.tsx` — Dropdown to switch dynasties from any screen
- `apps/desktop/src/components/ExportImportControls.tsx` — Export/import button row on Launcher
- `apps/desktop/src/App.tsx` — Updated: conditional render Launcher vs Dashboard
- `apps/desktop/src-tauri/src/lib.rs` — Added tauri-plugin-dialog and tauri-plugin-fs
- `apps/desktop/src-tauri/capabilities/default.json` — Added dialog and fs permissions
- `apps/desktop/src-tauri/Cargo.toml` — Added tauri-plugin-dialog and tauri-plugin-fs crates

## Decisions Made

- Used Tauri `save()` dialog + `writeTextFile()` for export — blob URL downloads don't fire in WKWebView or WebView2
- Import uses hidden `<input type="file">` — avoids Tauri open-dialog dependency, works in WebView
- ID remapping on import conflict generates all-new UUIDs — prevents PK collisions on re-import of same dynasty

## Deviations from Plan

### Post-Checkpoint Fix

**[Rule 1 - Bug] Export used blob URL which doesn't work in Tauri WebView**

- **Found during:** Human checkpoint verification (user confirmed "export does not work")
- **Issue:** `a.click()` with `URL.createObjectURL(blob)` does not trigger file downloads in WKWebView (macOS) or WebView2 (Windows). Tauri WebViews intercept/block these requests.
- **Fix:** Installed `tauri-plugin-dialog` and `tauri-plugin-fs` Rust crates, added JS bindings, registered plugins in `lib.rs`, added permissions to `capabilities/default.json`, rewrote `downloadJson()` to call `save()` (native save dialog) then `writeTextFile(filePath, json)`.
- **Files modified:** lib.rs, capabilities/default.json, Cargo.toml, export-import.ts, dynasty-store.ts
- **Verification:** User confirmed export opens native save dialog and writes JSON file
- **Committed in:** `b5810ff`

## Issues Encountered

None beyond the export deviation documented above.

## User Setup Required

None — no external service configuration required.

## Human Checkpoint Result

**Approved** — User confirmed export works (native save dialog opens, file written). All Phase 1 success criteria satisfied.

## Next Phase Readiness

- Launcher and dashboard shell ready for Phase 2 to build real content into DashboardPage
- Zustand store pattern established; Phase 2 can extend with season/game state
- All 6 FOUND requirements satisfied: create, multi-dynasty, switching, export, import, offline
- No blockers for Phase 2 (Core Loop)

---
*Phase: 01-foundation*
*Completed: 2026-02-22*
