# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** The memory layer, narrative engine, and legacy vault that sports games never built — transforming raw dynasty data into stories that persist, compound, and can be shared.
**Current focus:** Phase 2 — Core Loop

## Current Position

Phase: 2 of 9 (Core Loop)
Plan: 0 of TBD in current phase
Status: Phase 1 complete ✓ — ready to plan Phase 2
Last activity: 2026-02-22 — Phase 1 complete, verified 10/10 must-haves

Progress: [████░░░░░░] 11% (4/36 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: ~8 min
- Total execution time: ~35 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan | Status |
|-------|-------|-------|----------|--------|
| 01-foundation | 4/4 | ~35 min | ~8.8 min | ✓ Complete |

**Recent Trend:**
- Last 5 plans: 7 min, 4 min, 9 min, 15 min (incl. export fix)
- Trend: Stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Tauri over Electron: <80MB idle RAM target incompatible with Electron's 150-300MB footprint
- Sport Config pattern: isolates sport differences in config objects; shared components stay sport-agnostic
- Local-first, no cloud V1: eliminates auth complexity and hosting costs; JSON export covers portability
- madden-franchise library risk: Madden 26 schema support in-progress — version-check guard + fallback required
- Port 1420 for Vite dev server: Tauri convention; set now to avoid config churn in Plan 01-02
- pnpm v10 onlyBuiltDependencies: esbuild must be explicitly allowed; add to root package.json pnpm.onlyBuiltDependencies
- type: module in desktop packages: required to avoid ESM/CJS ambiguity warnings with Vite + postcss
- SportType lowercase keys ('cfb' | 'madden'): matches getSportConfig() string lookup without case conversion
- Dexie Table<T, string> over EntityTable: Dexie v4.3.0 does not export EntityTable
- PlayerSeason.stats as Record<string, number>: flexible stat storage avoids schema migration per sport
- Tauri icons must be RGBA PNG: proc-macro validates at compile time (not RGB); generate with color_type=6
- macOS RSS inflates Tauri memory: WKWebView shared frameworks counted in RSS; Windows Edge WebView2 target expected to read ~30-50MB
- Blob URL downloads don't work in Tauri WebView: WKWebView and WebView2 block anchor.click() blob downloads; use tauri-plugin-dialog (save()) + tauri-plugin-fs (writeTextFile()) for all file export
- Zustand store pattern: loadDynasties() called after every mutation (create/delete/import); activeDynasty cleared on delete if it matches

### Pending Todos

None.

### Blockers/Concerns

- madden-franchise library may not support Madden 26 schema at launch — Phase 9 must include fallback path (planned)
- CFB ingestion is console-only; screenshot path is the sole automated ingestion method — Phase 8 coverage is critical for user adoption
- Windows production memory (<80MB target) not yet validated — needs measurement on actual Windows build after Windows dev setup

## Session Continuity

Last session: 2026-02-22 UTC
Stopped at: Phase 1 complete — all 4 plans executed and verified 10/10
Resume file: None
