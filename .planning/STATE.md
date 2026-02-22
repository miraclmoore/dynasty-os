# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** The memory layer, narrative engine, and legacy vault that sports games never built — transforming raw dynasty data into stories that persist, compound, and can be shared.
**Current focus:** Phase 1 — Foundation

## Current Position

Phase: 1 of 9 (Foundation)
Plan: 3 of 4 in current phase (01-01, 01-02, 01-03 complete; 01-04 pending)
Status: In progress
Last activity: 2026-02-22 — Completed 01-02-PLAN.md (Tauri 2.x desktop shell)

Progress: [███░░░░░░░] 8% (3/36 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: 6.7 min
- Total execution time: 20 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3/4 | 20 min | 6.7 min |

**Recent Trend:**
- Last 5 plans: 7 min, 4 min, 9 min
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

### Pending Todos

None.

### Blockers/Concerns

- madden-franchise library may not support Madden 26 schema at launch — Phase 9 must include fallback path (planned)
- CFB ingestion is console-only; screenshot path is the sole automated ingestion method — Phase 8 coverage is critical for user adoption
- Windows production memory (<80MB target) not yet validated — needs measurement on actual Windows build after Windows dev setup

## Session Continuity

Last session: 2026-02-22 01:44 UTC
Stopped at: Completed 01-02-PLAN.md — Tauri 2.x native desktop window wrapping React frontend
Resume file: None
