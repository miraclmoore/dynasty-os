---
phase: 01-foundation
plan: "01"
subsystem: infra
tags: [turborepo, pnpm-workspaces, vite, react, tailwindcss, typescript, monorepo, dexie]

# Dependency graph
requires: []
provides:
  - Turborepo + pnpm workspace monorepo at /Users/chanmoore/dev/dynasty-os
  - 4 shared packages: core-types, db, sport-configs, ui-components (all building to dist/)
  - Desktop app at apps/desktop/ with React 18 + Vite 6 + Tailwind CSS 3
  - Vite dev server on port 1420 (Tauri convention)
  - Cross-package workspace imports verified via @dynasty-os/core-types in App.tsx
affects:
  - 01-02-tauri (Tauri wraps this Vite app on port 1420)
  - 01-03-database (db package scaffolded, ready for Dexie schema)
  - 01-04-routing (desktop app App.tsx is the router root)
  - All subsequent phases (monorepo structure is universal dependency)

# Tech tracking
tech-stack:
  added:
    - turbo@2.8.10 (build orchestration)
    - pnpm@10.15.1 (package manager, workspace protocol)
    - react@18.3.1 (UI framework)
    - react-dom@18.3.1 (DOM renderer)
    - vite@6.4.1 (bundler + dev server)
    - "@vitejs/plugin-react@4.3.4" (React fast refresh)
    - tailwindcss@3.4.17 (utility CSS)
    - postcss@8.4.47 (CSS transformation)
    - autoprefixer@10.4.20 (CSS vendor prefixes)
    - zustand@5.0.3 (state management, wired not yet used)
    - dexie@4.0.10 (IndexedDB ORM, dep in @dynasty-os/db)
    - typescript@5.7.0 (type system, strict mode)
  patterns:
    - Workspace protocol (workspace:*) for internal package dependencies
    - Turborepo build pipeline with dependsOn ^build for correct ordering
    - tsconfig.base.json extended by all packages (single source of truth)
    - composite: true on shared packages enables project references
    - Port 1420 reserved for Tauri/Vite convention

key-files:
  created:
    - package.json (root workspace config)
    - pnpm-workspace.yaml (workspace paths)
    - turbo.json (build pipeline)
    - tsconfig.base.json (shared TS config)
    - .gitignore
    - .npmrc
    - packages/core-types/package.json
    - packages/core-types/tsconfig.json
    - packages/core-types/src/index.ts
    - packages/db/package.json
    - packages/db/tsconfig.json
    - packages/db/src/index.ts
    - packages/sport-configs/package.json
    - packages/sport-configs/tsconfig.json
    - packages/sport-configs/src/index.ts
    - packages/ui-components/package.json
    - packages/ui-components/tsconfig.json
    - packages/ui-components/src/index.ts
    - packages/ui-components/src/components/Placeholder.tsx
    - apps/desktop/package.json
    - apps/desktop/tsconfig.json
    - apps/desktop/tsconfig.node.json
    - apps/desktop/vite.config.ts
    - apps/desktop/index.html
    - apps/desktop/src/main.tsx
    - apps/desktop/src/App.tsx
    - apps/desktop/tailwind.config.ts
    - apps/desktop/postcss.config.js
  modified: []

key-decisions:
  - "Port 1420 used for Vite dev server to match Tauri default convention"
  - "pnpm.onlyBuiltDependencies: [esbuild] added to root package.json for pnpm v10 security model"
  - "type: module added to apps/desktop/package.json to eliminate ESM/CJS ambiguity warning"
  - "composite: true on shared packages enables tsc project references for IDE go-to-definition"

patterns-established:
  - "All shared packages extend ../../tsconfig.base.json and set outDir: dist, composite: true"
  - "All workspace deps use workspace:* protocol in apps/desktop/package.json"
  - "Turbo tasks: build (dependsOn ^build), dev (persistent, no cache), clean (no cache)"
  - "Tailwind content in desktop app includes ui-components source for shared component classes"

# Metrics
duration: 7min
completed: 2026-02-21
---

# Phase 01 Plan 01: Monorepo Foundation Summary

**Turborepo + pnpm workspace monorepo with 4 shared TypeScript packages (core-types, db, sport-configs, ui-components) and a React 18 + Vite 6 + Tailwind 3 desktop app serving on port 1420**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-22T01:23:38Z
- **Completed:** 2026-02-22T01:31:17Z
- **Tasks:** 2 completed
- **Files modified:** 31

## Accomplishments

- Initialized pnpm workspace monorepo with Turborepo pipeline (5 packages all building successfully)
- Scaffolded 4 shared packages with TypeScript composite builds, dist/.js and .d.ts outputs verified
- Created desktop app with React 18 + Vite 6 (port 1420) + Tailwind CSS, cross-package imports verified

## Task Commits

Each task was committed atomically:

1. **Task 1: Initialize monorepo and scaffold all workspaces** - `099711f` (feat)
2. **Task 2: Create desktop app workspace with React + Vite + Tailwind** - `f27d04a` (feat)

**Plan metadata:** (docs commit - see below)

## Files Created/Modified

- `package.json` - Root workspace config with Turborepo scripts and pnpm.onlyBuiltDependencies
- `pnpm-workspace.yaml` - Declares apps/* and packages/* workspace paths
- `turbo.json` - Build pipeline with build/dev/lint/clean tasks
- `tsconfig.base.json` - Shared TS config: ES2022, strict, bundler moduleResolution, jsx: react-jsx
- `.npmrc` - auto-install-peers=true, strict-peer-dependencies=false
- `.gitignore` - node_modules, dist, .turbo, target, *.tsbuildinfo, .DS_Store, .env
- `packages/core-types/src/index.ts` - Dynasty, Player, Season interfaces + CORE_TYPES_VERSION
- `packages/db/src/index.ts` - DB_VERSION=1 and DB_NAME placeholder
- `packages/sport-configs/src/index.ts` - SportConfig interface, CFB_CONFIG, MADDEN_CONFIG
- `packages/ui-components/src/index.ts` - Placeholder component export
- `packages/ui-components/src/components/Placeholder.tsx` - Simple div React component
- `apps/desktop/src/App.tsx` - React root importing Dynasty type + CORE_TYPES_VERSION from core-types
- `apps/desktop/vite.config.ts` - Vite config with @vitejs/plugin-react, port 1420, strictPort
- `apps/desktop/tailwind.config.ts` - Tailwind content includes ui-components source
- `apps/desktop/src/index.css` - @tailwind base/components/utilities

## Decisions Made

- Used `pnpm.onlyBuiltDependencies: ["esbuild"]` in root package.json to handle pnpm v10's new security model requiring explicit opt-in for postinstall scripts
- Added `"type": "module"` to apps/desktop/package.json to resolve Vite's ESM/CJS ambiguity warning on postcss.config.js
- Port 1420 established now (not in Plan 01-02) to avoid Vite config churn when Tauri is wired in the next plan

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added pnpm.onlyBuiltDependencies for esbuild**

- **Found during:** Task 2 (pnpm install with desktop app)
- **Issue:** pnpm v10 requires explicit opt-in for packages that run postinstall scripts. esbuild (Vite dependency) was silently ignored, causing Vite to fail because esbuild binary wasn't built
- **Fix:** Added `"pnpm": { "onlyBuiltDependencies": ["esbuild"] }` to root package.json; ran `pnpm install --force` to trigger esbuild postinstall
- **Files modified:** package.json, pnpm-lock.yaml
- **Verification:** `pnpm build` completed cleanly with no esbuild warnings
- **Committed in:** f27d04a (Task 2 commit)

**2. [Rule 1 - Bug] Added type: module to desktop package.json**

- **Found during:** Task 2 (pnpm build)
- **Issue:** Node.js emitted MODULE_TYPELESS_PACKAGE_JSON warning on postcss.config.js because the package lacked `"type": "module"` declaration
- **Fix:** Added `"type": "module"` to apps/desktop/package.json
- **Files modified:** apps/desktop/package.json
- **Verification:** `pnpm build` ran cleanly with zero warnings
- **Committed in:** f27d04a (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 bug)
**Impact on plan:** Both fixes required for clean operation. No scope creep.

## Issues Encountered

None beyond the deviations documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Port 1420 Vite dev server ready for Tauri to wrap (Plan 01-02)
- `@dynasty-os/db` package scaffolded with dexie dependency installed, ready for schema (Plan 01-03)
- `apps/desktop/src/App.tsx` is the router root, ready for routing setup (Plan 01-04)
- All shared packages have composite TypeScript builds enabling project references in IDE
- No blockers for any subsequent Phase 1 plans

---
*Phase: 01-foundation*
*Completed: 2026-02-21*
