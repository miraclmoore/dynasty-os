---
phase: 22
plan: "03"
subsystem: screenshot-pipeline
tags: [ui, clipboard, csv, depth-chart]
dependency_graph:
  requires: []
  provides: [depth-chart-csv-export]
  affects: [ScreenshotIngestionPage]
tech_stack:
  added: []
  patterns: [navigator.clipboard.writeText, RFC-4180-lite CSV escaping, 2s copied-feedback state]
key_files:
  created: []
  modified:
    - apps/desktop/src/pages/ScreenshotIngestionPage.tsx
decisions:
  - navigator.clipboard.writeText used directly — no Tauri permission required; csv-export.ts skipped (it opens a save dialog to disk)
  - RFC 4180-lite CSV escaping: fields containing commas or double-quotes are wrapped in double-quotes with internal quotes doubled
  - depthCsvCopied state drives 2s button label toggle (Copied! -> Copy as CSV) via setTimeout
metrics:
  duration: "~3 min"
  completed: "2026-05-04"
---

# Phase 22 Plan 03: PIPE-02 — Depth Chart CSV Export Summary

**One-liner:** Depth chart confirmation screen gains clipboard CSV export with RFC 4180-lite escaping and 2-second copied feedback, replacing the removed "not saved in V1" notice.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Update renderDepthChartForm() — remove notice, add Copy CSV button | a9f854f | ScreenshotIngestionPage.tsx |

## What Was Built

- **Removed** the grey `bg-gray-800/50` notice block ("Depth charts are not saved to the database in V1.") from `renderDepthChartForm()`
- **Added** `depthCsvCopied` useState alongside existing depth-chart state declarations
- **Added** `handleCopyDepthChartCsv()` async function in the Save handlers section — builds CSV with header row `Position,Player Name,Depth`, applies RFC 4180-lite escaping for comma/quote-containing fields, calls `navigator.clipboard.writeText()`, and sets `depthCsvCopied` to true for 2 seconds via `setTimeout`
- **Updated** the button row at the bottom of `renderDepthChartForm()`: "Return to Dashboard" retained, "Copy as CSV" (amber, disabled when no entries) added; label toggles to "Copied!" for 2 seconds after successful copy

## Verification Results

- `npx tsc --noEmit` (apps/desktop): exited with no errors
- Grey "not saved in V1" notice block removed from JSX — success criteria met
- "Copy as CSV" button rendered alongside "Return to Dashboard" — success criteria met
- `depthCsvCopied` state drives `{depthCsvCopied ? 'Copied!' : 'Copy as CSV'}` label — success criteria met
- RFC 4180-lite escaping in `handleCopyDepthChartCsv` produces `Position,Player Name,Depth` header + per-entry rows — success criteria met

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — no placeholder data or TODO stubs introduced.

## Threat Flags

None — no new network endpoints, auth paths, or trust boundary changes introduced; clipboard write is a client-only operation.

## Self-Check: PASSED

- [x] `apps/desktop/src/pages/ScreenshotIngestionPage.tsx` modified and committed
- [x] Commit `a9f854f` exists in git log
- [x] TypeScript compiles with no errors
