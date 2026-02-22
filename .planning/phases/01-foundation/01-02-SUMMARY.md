---
phase: 01-foundation
plan: "02"
subsystem: infra
tags: [tauri, tauri-v2, rust, webview, desktop, wry, windows-app, native]

# Dependency graph
requires:
  - phase: 01-01-monorepo
    provides: React 18 + Vite 6 on port 1420 + pnpm workspace monorepo
provides:
  - Tauri 2.x backend scaffolded in apps/desktop/src-tauri/
  - Native desktop window rendering React frontend via WebKit WebView
  - Rust backend (tauri v2.10.2) compiling cleanly (380 crates, 34.68s first build)
  - pnpm tauri dev launches native window from monorepo
  - Performance baselines documented
  - Full monorepo build pipeline verified end-to-end (5/5 packages)
affects:
  - 01-03-database (Tauri window is the host for Dexie/IndexedDB)
  - 01-04-routing (App.tsx is now Tauri WebView entry point)
  - All subsequent phases (Tauri is the delivery vehicle)

# Tech tracking
tech-stack:
  added:
    - "@tauri-apps/cli@2.10.0 (dev, Tauri CLI for pnpm tauri dev/build)"
    - "@tauri-apps/api@2.10.1 (runtime API bindings for frontend)"
    - "tauri@2.10.2 (Rust crate, WebView host)"
    - "tauri-build@2.5.5 (Rust build-dependency)"
    - "wry@0.54.2 (WebView rendering via WKWebView on macOS / WebView2 on Windows)"
    - "tao@0.34.5 (cross-platform windowing)"
  patterns:
    - Tauri v2 lib.rs + main.rs split pattern (lib.rs for mobile entry, main.rs for desktop binary)
    - RGBA placeholder icons generated programmatically for build-time validation
    - vite.config.ts envPrefix includes TAURI_ for Tauri environment variable forwarding
    - tauri.conf.json devUrl points to Vite dev server (port 1420 convention)

key-files:
  created:
    - apps/desktop/src-tauri/Cargo.toml
    - apps/desktop/src-tauri/Cargo.lock
    - apps/desktop/src-tauri/build.rs
    - apps/desktop/src-tauri/tauri.conf.json
    - apps/desktop/src-tauri/capabilities/default.json
    - apps/desktop/src-tauri/src/lib.rs
    - apps/desktop/src-tauri/src/main.rs
    - apps/desktop/src-tauri/icons/32x32.png
    - apps/desktop/src-tauri/icons/128x128.png
    - apps/desktop/src-tauri/icons/128x128@2x.png
    - apps/desktop/src-tauri/icons/icon.ico
    - apps/desktop/src-tauri/icons/icon.icns
  modified:
    - apps/desktop/package.json (added @tauri-apps/cli, @tauri-apps/api, tauri script)
    - apps/desktop/vite.config.ts (added envPrefix TAURI_, build target config)
    - apps/desktop/src/App.tsx (workspace imports, counter button for WebView state test)
    - packages/core-types/src/index.ts (added CORE_TYPES_VERSION export)
    - .gitignore (added src-tauri/gen for Tauri generated schemas)

key-decisions:
  - "Manual src-tauri/ scaffold (not pnpm tauri init): avoids interactive prompts in CI/agent execution"
  - "RGBA PNG icons generated via Python: Tauri requires RGBA PNGs (not RGB), validated at proc-macro time"
  - "Cargo.toml lib section: crate-type = [staticlib, cdylib, rlib] for future mobile support"
  - "vite.config.ts build targets: chrome105 on Windows, safari13 on macOS (matches Tauri platform WebViews)"
  - "Performance measurement: macOS RSS ~104-108MB (WebKit shared libs counted in RSS); Windows target will show lower values with Edge WebView2 shared runtime"

patterns-established:
  - "tauri.conf.json identifier: com.dynasty-os.app (used for OS-level app identity, file associations)"
  - "beforeDevCommand: pnpm dev (Tauri manages Vite lifecycle in dev mode)"
  - "capabilities/default.json: core:default permission set (Tauri v2 explicit capability model)"
  - "src-tauri/gen/ excluded from git: Tauri generates schema files at compile time"

# Metrics
duration: 9min
completed: 2026-02-21
---

# Phase 01 Plan 02: Tauri 2.x Desktop Shell Summary

**Tauri 2.x native window wrapping React 18 + Vite via WebView, with Rust backend (380 crates) compiling in 34.68s, workspace imports from core-types/db/sport-configs verified, and full pnpm build pipeline green**

## Performance

- **Duration:** 9 min
- **Started:** 2026-02-22T01:34:26Z
- **Completed:** 2026-02-22T01:44:13Z
- **Tasks:** 2 completed
- **Files modified:** 17

## Accomplishments

- Scaffolded Tauri 2.x src-tauri/ directory manually (Cargo.toml, build.rs, lib.rs, main.rs, tauri.conf.json, capabilities, icons)
- Rust backend compiled cleanly (380 crates, 34.68s cold compile) - native window launched successfully
- Updated App.tsx to import from all three workspace packages (core-types, db, sport-configs) with interactive counter button proving React state in WebView
- Full monorepo build pipeline verified: `pnpm build` 5/5 packages succeed

## Performance Baselines

| Metric | Value | Target | Notes |
|--------|-------|--------|-------|
| Vite dev server startup | 116ms | n/a | First ready after deps resolve |
| Binary launch to settle | ~4s | <3s | macOS dev measurement; window appears earlier |
| RSS idle (macOS, release) | ~104MB | <80MB | macOS WebKit counts shared libs in RSS |
| RSS idle (macOS, debug) | ~108MB | <80MB | Debug builds always larger |

**Important context on memory:** The <80MB target applies to Windows production builds. On Windows, the Edge WebView2 runtime is shared across all WebView2 apps, so Tauri processes show significantly lower per-process RSS (~30-50MB typical for simple apps). The macOS measurement with WKWebView includes shared framework memory in the process RSS, inflating the number. Final validation against the <80MB target should be done on the Windows target platform.

**Cold start context:** The ~4s macOS measurement includes WebKit WebView initialization which is slower than Windows Edge WebView2. The 3s target on Windows should be achievable with the minimal app complexity. Post-optimization measurements needed on Windows.

## Task Commits

Each task was committed atomically:

1. **Task 1: Initialize Tauri 2.x in the desktop workspace** - `d500cc9` (feat)
2. **Task 2: Performance baseline and monorepo integration** - `fc4d23d` (feat)

**Plan metadata:** (docs commit - see below)

## Files Created/Modified

- `apps/desktop/src-tauri/Cargo.toml` - Rust project manifest: dynasty-os package, tauri v2 + serde deps
- `apps/desktop/src-tauri/Cargo.lock` - Locked dependency tree (380 crates)
- `apps/desktop/src-tauri/build.rs` - Build script: tauri_build::build()
- `apps/desktop/src-tauri/tauri.conf.json` - Tauri config: com.dynasty-os.app, 1280x800 window, port 1420
- `apps/desktop/src-tauri/capabilities/default.json` - core:default capability permission
- `apps/desktop/src-tauri/src/lib.rs` - Tauri Builder setup with generate_context!()
- `apps/desktop/src-tauri/src/main.rs` - Binary entry point, windows_subsystem = "windows"
- `apps/desktop/src-tauri/icons/*.{png,ico,icns}` - RGBA placeholder icons (valid, pass Tauri proc-macro validation)
- `apps/desktop/package.json` - Added @tauri-apps/cli@2.10.0 (dev), @tauri-apps/api@2.10.1, tauri script
- `apps/desktop/vite.config.ts` - Added envPrefix TAURI_, build targets per platform
- `apps/desktop/src/App.tsx` - Workspace imports (CORE_TYPES_VERSION, DB_VERSION, SPORT_CONFIGS_VERSION), counter button
- `packages/core-types/src/index.ts` - Added CORE_TYPES_VERSION = '1.0.0'
- `.gitignore` - Added src-tauri/gen (Tauri generates schemas at compile time)

## Decisions Made

- Manually scaffolded `src-tauri/` instead of running `pnpm tauri init` — interactive prompts are incompatible with agent execution; manual creation gives explicit control over all config values
- Generated RGBA PNG icons with Python instead of using `pnpm tauri icon` — avoids requiring an input image file; placeholder icons satisfy Tauri's proc-macro validation (checks RGBA format at compile time)
- Used `crate-type = ["staticlib", "cdylib", "rlib"]` in Cargo.toml lib section — standard Tauri v2 pattern enabling future iOS/Android mobile targets without Cargo.toml changes
- Set vite.config.ts build targets to chrome105 (Windows/Chromium) and safari13 (macOS/WebKit) — matches Tauri v2's platform-specific WebView engines

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed missing CORE_TYPES_VERSION export in @dynasty-os/core-types**

- **Found during:** Task 2 (performance baseline - full build attempt)
- **Issue:** App.tsx import `{ CORE_TYPES_VERSION } from '@dynasty-os/core-types'` failed TypeScript compilation. The 01-01 plan's SUMMARY referenced this export but the actual package evolution since then removed/never added the version constant.
- **Fix:** Added `export const CORE_TYPES_VERSION = '1.0.0';` to packages/core-types/src/index.ts
- **Files modified:** packages/core-types/src/index.ts
- **Verification:** `pnpm build` 5/5 packages succeed with zero TypeScript errors
- **Committed in:** fc4d23d (Task 2 commit)

**2. [Rule 1 - Bug] Fixed icon format: Tauri requires RGBA PNG (not RGB)**

- **Found during:** Task 1 (first cargo check after scaffolding)
- **Issue:** Initial placeholder icons were 1x1 RGB PNGs; Tauri's `tauri::generate_context!()` proc-macro validates icon format at compile time and panicked: "icon 32x32.png is not RGBA"
- **Fix:** Regenerated all PNG icons with color_type=6 (RGBA, 8 bits per channel) using Python; also regenerated ICO and ICNS with RGBA PNG embedded data
- **Files modified:** apps/desktop/src-tauri/icons/32x32.png, 128x128.png, 128x128@2x.png, icon.ico, icon.icns
- **Verification:** `cargo check` passes cleanly after fix
- **Committed in:** d500cc9 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both essential for compilation. No scope creep.

## Issues Encountered

- Port 1420 conflict on first `pnpm tauri dev` attempt — a previous Vite process was still running. Resolved by killing the process (`lsof -ti:1420 | xargs kill -9`) and re-running.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Tauri window is running and ready for Dexie IndexedDB integration (Plan 01-03)
- App.tsx workspace imports verified — all shared packages accessible from the WebView context
- `apps/desktop/src/App.tsx` is the router root, ready for React Router setup (Plan 01-04)
- Windows production build (<80MB RAM target) needs validation on Windows target platform after Windows setup
- Release build pipeline (`pnpm tauri build`) not yet tested end-to-end (out of scope for this plan)

---
*Phase: 01-foundation*
*Completed: 2026-02-21*
