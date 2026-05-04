---
phase: 22
plan: "05"
subsystem: screenshot-ingestion
tags: [multi-image, sequential-parse, progress-indicator, tauri, react]
dependency_graph:
  requires: [22-02, 22-03, 22-04]
  provides: [multi-image-ingestion]
  affects: [ScreenshotIngestionPage]
tech_stack:
  added: []
  patterns: [state-array-concatenation, sequential-async-loop, split-card-ui]
key_files:
  created: []
  modified:
    - apps/desktop/src/pages/ScreenshotIngestionPage.tsx
decisions:
  - imageQueue and imagePaths as parallel arrays — imageQueue holds base64 for parsing, imagePaths holds file paths for display; single-image aliases (imagePath, imageBase64) preserved for renderThumbnail() and existing helpers
  - State accumulation via mergedGameRows/mergedPlayerRows/mergedRecruitRows/mergedDepthEntries — concatenated across all images, committed atomically after parse loop completes
  - Pre-parse card split into two separate conditional blocks — step 1+2 (screen type + file picker) hidden once files selected; step 3 (preview + parse) shown until parse completes
  - setMatchedPlayerIds/setPlayerSearchTerms use functional updater (prev => [...prev, ...newIds]) — safe for per-iteration React state appends during async loop
metrics:
  duration: "~1 min"
  completed_date: "2026-05-04"
  tasks_completed: 3
  files_modified: 1
---

# Phase 22 Plan 05: Multi-Image Ingestion Summary

Multi-image file picker with sequential Vision API parsing loop, "Parsing X of Y…" progress indicator, and merged-state confirmation form showing combined data from all selected images.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Add imageQueue/imagePaths/currentImageIndex state; update handleFileOpen for multiple:true | 7439a81 |
| 2 | Replace handleParse with sequential loop accumulating merged state arrays | 7439a81 |
| 3 | Update loading spinner text, file picker label, preview UI, and pre-parse card guard | 7439a81 |

## What Was Built

**Task 1 — Multi-image state + handleFileOpen:**
Added three new state variables alongside existing declarations: `imageQueue` (base64 strings for parsing), `imagePaths` (file paths for display), and `currentImageIndex` (1-indexed progress). Updated `handleFileOpen` to call `open({ multiple: true })`, normalize the return to `string[]`, read all files to base64 in a sequential loop upfront, and seed both the new multi-image state and the existing single-image aliases (`imagePath`, `imageBase64`).

**Task 2 — Sequential multi-image handleParse:**
Replaced the single-image `handleParse` with a loop over `imageQueue` (falling back to `[imageBase64]` for backward compatibility). Each iteration calls `setCurrentImageIndex(idx)` before the Vision API call to drive the progress indicator. Parsed results are accumulated into `mergedGameRows`, `mergedPlayerRows`, `mergedRecruitRows`, and `mergedDepthEntries`. For player-stats, matched IDs and search terms are appended using functional state updaters. All merged state is committed at once after the loop. `parsedData` is set to the last parsed result for type dispatch in `renderConfirmationForm()`.

**Task 3 — UI updates:**
- Loading spinner: `imageQueue.length > 1 ? "Parsing X of Y…" : "Parsing screenshot…"`
- File picker button: "Choose Image File(s)"
- Pre-parse card guard: split into two conditional blocks — step 1+2 hidden once `imagePaths.length > 0`, step 3 shown when files selected and not yet parsed
- Preview section: uses `imagePaths[0]` for the first image; shows "+N more images selected" count when N > 1
- Parse button: "Parse N Screenshots" when N > 1, "Parse Screenshot" for single

## Deviations from Plan

None — plan executed exactly as written. TypeScript compiled with no errors.

## Verification

- `npx tsc --noEmit` (apps/desktop): zero errors
- `open()` called with `multiple: true`; return type normalized to `string[]`
- `imageQueue`, `imagePaths`, `currentImageIndex` state added
- Loading indicator reads "Parsing X of Y…" when queue > 1
- Single-image flow: falls back to `[imageBase64]` queue, shows "Parsing screenshot…" (not "1 of 1")
- All existing save handlers (handleSaveStats, handleSaveSchedule, handleSaveRecruiting) work unchanged — they iterate merged state arrays

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, or trust boundary changes introduced.

## Self-Check: PASSED

- [x] `apps/desktop/src/pages/ScreenshotIngestionPage.tsx` exists and modified
- [x] Commit 7439a81 exists in git log
- [x] TypeScript: zero errors
