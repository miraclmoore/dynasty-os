---
phase: 23-madden-sync-upgrade
plan: "02"
subsystem: madden-sync
tags: [madden, sync, tauri-fs, capabilities, auto-detect, ux]
requirements: [MSYN-02]

dependency_graph:
  requires: []
  provides:
    - discoverFranchiseFiles (MaddenSyncPage auto-discover helper)
    - fs:allow-read-dir + fs:scope-document-recursive + fs:scope-temp-recursive (Tauri capabilities)
  affects:
    - apps/desktop/src/pages/MaddenSyncPage.tsx
    - apps/desktop/src-tauri/capabilities/default.json

tech_stack:
  added: []
  patterns:
    - fire-and-forget IIFE useEffect (existing pattern extended)
    - discoverFranchiseFiles never-throw helper returning [] on any failure
    - exists() before readDir() to guard nonexistent paths (Pitfall 3)
    - targeted Tauri fs scope permissions (document + temp, not home-recursive)

key_files:
  modified:
    - apps/desktop/src/pages/MaddenSyncPage.tsx
    - apps/desktop/src-tauri/capabilities/default.json

decisions:
  - Use fs:scope-document-recursive + fs:scope-temp-recursive instead of fs:scope-home-recursive (T-23-02-01 threat mitigation — principle of least privilege)
  - MADDEN_YEARS const covers [26, 25, 24] in priority order — most recent first, covers supported versions
  - Both 'saves' and 'Saves' capitalizations scanned for Documents path (Open Question 3 resolution)
  - discoverFranchiseFiles is module-scope pure async helper, not inside component, for testability
  - handleSelectDiscovered mirrors handlePickFile exactly, taking path argument instead of dialog

metrics:
  duration: "~10 min"
  completed: "2026-05-04"
  tasks: 2
  files_modified: 2
---

# Phase 23 Plan 02: MaddenSyncPage Auto-Discover Summary

**One-liner:** Tauri fs:allow-read-dir + document/temp scope capabilities + MaddenSyncPage mount-time .frs file auto-discovery with one-click chip UI above Browse button.

## What Was Built

### Task 1: Tauri Capabilities (default.json)
Added three permissions to `apps/desktop/src-tauri/capabilities/default.json` after `fs:scope-appdata-recursive`:
- `fs:allow-read-dir` — grants the readDir operation
- `fs:scope-document-recursive` — grants recursive access to the OS Documents folder
- `fs:scope-temp-recursive` — grants recursive access to the OS Temp folder

The overly-broad `fs:scope-home-recursive` was NOT added per threat T-23-02-01 (Elevation of Privilege). Accepted scopes are targeted to Madden's known save locations only.

### Task 2: MaddenSyncPage Auto-Discover + Chip UI
Modified `apps/desktop/src/pages/MaddenSyncPage.tsx` with:

1. **New imports** — `documentDir`, `tempDir`, `join` from `@tauri-apps/api/path`; `readDir`, `exists` from `@tauri-apps/plugin-fs`

2. **`MADDEN_YEARS` const** — `[26, 25, 24] as const` — drives the candidate directory search in priority order

3. **`discoverFranchiseFiles()` helper** — module-scope async function that:
   - Resolves `documentDir()` and `tempDir()` with individual try/catch fallbacks
   - Builds candidate dirs for each year: `Documents/Madden NFL {year}/saves`, `.../Saves`, `Temp/Madden NFL {year}`, plus legacy `Temp/Franchise`
   - For each dir: `exists()` check before `readDir()`, filters to `entry.isFile && entry.name.toLowerCase().endsWith('.frs')`
   - Deduplicates via `Set<string>`, returns `[]` on any failure — never throws

4. **`discoveredFiles` state** — `useState<string[]>([])` added to component state block

5. **Auto-discover useEffect** — fire-and-forget IIFE, runs when `activeDynasty.sport === 'madden'`, deps: `[activeDynasty?.id, activeDynasty?.sport]`

6. **`handleSelectDiscovered(path)` handler** — mirrors `handlePickFile` exactly: sets savePath, calls storeSavePath, resets validation/extracted/diff/errorMsg/syncState

7. **Chip row UI** — rendered inside Step 1 section above the Browse button when `discoveredFiles.length > 0`:
   - "Detected Save Files" label (uppercase tracking-wider)
   - Chip buttons showing filename only (`filePath.split(/[\\/]/).pop()`)
   - `title={filePath}` for full path on hover
   - `transition-colors` for hover feedback

## Verification Results

All automated checks passed:
- `node -e "const j=require('./apps/desktop/src-tauri/capabilities/default.json')..."` — OK, three permissions present, scope-home absent
- `pnpm --filter @dynasty-os/desktop build` — exits 0 with zero TypeScript errors
- All grep acceptance criteria: discoverFranchiseFiles, imports, MADDEN_YEARS, discoveredFiles, handleSelectDiscovered, "Detected Save Files", .frs — all present
- No `throw` statements outside comments in discoverFranchiseFiles
- All existing handlers (handlePickFile, handleValidate, handleExtract, handleConfirm, handleCancel, handleReset, handleToggleWatcher, handleClearSavePath, handleUpdate) still present

## Deviations from Plan

None — plan executed exactly as written.

The workspace packages (`@dynasty-os/core-types`, `@dynasty-os/sport-configs`, `@dynasty-os/db`) needed to be built first in the worktree before the desktop app build would succeed. This is a worktree environment setup issue, not a code issue. Built with `pnpm --filter` per package before the final desktop build. All pre-existing errors were resolved by building workspace deps; zero new TypeScript errors introduced.

## Known Stubs

None. The auto-discover feature is fully wired: `discoverFranchiseFiles` → `setDiscoveredFiles` → chip row renders. Chip onClick calls `handleSelectDiscovered` which calls `storeSavePath` — full path persisted to plugin-store.

The feature will show zero chips on non-Windows dev machines (macOS/Linux don't have `%TEMP%\Madden NFL` or `Documents\Madden NFL` paths) — this is expected behavior, not a stub. The Browse fallback renders normally when no files are discovered.

## Threat Flags

No new threat surface beyond what is documented in the plan's `<threat_model>`. All five STRIDE threats were addressed:
- T-23-02-01: Targeted scopes used (document + temp), home-recursive absent — mitigated
- T-23-02-02: Path traversal — `join()` used for all path construction, `.frs` suffix filter applied — mitigated
- T-23-02-03: DoS on broken FS — every async call wrapped in try/catch, fire-and-forget IIFE — mitigated
- T-23-02-04: Info disclosure — accepted (paths shown only to owner in their own storage)
- T-23-02-05: Adversarial chip path — accepted (requires prior local machine compromise)
- T-23-02-06: File extension spoofing — `.toLowerCase().endsWith('.frs')` case-insensitive strict check — mitigated

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add fs capabilities | 9d8ed6b | apps/desktop/src-tauri/capabilities/default.json |
| 2 | Auto-discover + chip UI | 6cb0241 | apps/desktop/src/pages/MaddenSyncPage.tsx |

## Self-Check: PASSED
