---
phase: 20-security
plan: 01
subsystem: security-foundation
tags:
  - security
  - tauri
  - rust
  - zustand
  - api-key-management
  - plugin-store
dependency_graph:
  requires:
    - Phase 19 safety foundations (completed)
  provides:
    - call_anthropic Tauri command (Rust backend for all Anthropic HTTP calls)
    - dynasty-os.bin plugin-store as OS-native API key storage
    - PrefsStore Zustand synchronous mirror for all user preferences
    - prefs-service.ts 21-function async wrapper for plugin-store
    - ai-bridge.ts single frontend callAnthropic() entry point
  affects:
    - Plans 02 and 03 (consume this foundation for callsite migrations)
tech_stack:
  added:
    - reqwest 0.12 (Rust HTTP client for outbound Anthropic calls)
    - tauri-plugin-store 2 (Rust crate for OS-native persistent store)
    - "@tauri-apps/plugin-store ^2.4.3" (npm companion package)
  patterns:
    - API key never flows through WebView — Rust reads from dynasty-os.bin and injects as header
    - PrefsStore eager-load pattern mirrors dynasty-store/season-store loadAll() pattern
    - callAnthropic() returns null on error, never throws (fire-and-forget contract)
key_files:
  created:
    - apps/desktop/src-tauri/src/lib.rs (replaced entirely with call_anthropic command)
    - apps/desktop/src/store/prefs-store.ts (new Zustand PrefsStore with 9 fields)
    - apps/desktop/src/lib/prefs-service.ts (new 21-function plugin-store wrapper)
    - apps/desktop/src/lib/ai-bridge.ts (new single frontend Anthropic call site)
  modified:
    - apps/desktop/src-tauri/Cargo.toml (added reqwest + tauri-plugin-store deps)
    - apps/desktop/src-tauri/capabilities/default.json (added 5 store:* permissions)
    - apps/desktop/package.json (added @tauri-apps/plugin-store npm dep)
    - apps/desktop/src-tauri/Cargo.lock (updated by cargo)
    - pnpm-lock.yaml (updated by pnpm)
decisions:
  - "Store file: dynasty-os.bin (matching SEC-02 canonical requirement per D-11)"
  - "Store key for API key: anthropic-api-key (string, stored via plugin-store set/get)"
  - "reqwest 0.12 with json feature resolved to 0.12.28"
  - "tauri-plugin-store 2 resolved to 2.4.3 (both Cargo and npm)"
  - "StoreOptions.defaults: {} required (not optional in tauri-plugin-store v2 types)"
  - "Store permissions: store:default + store:allow-load/get/set/delete all enumerated explicitly (not auto-allowed by core:default in v2)"
  - "loadAll() only populates non-keyed singletons eagerly; per-dynasty/season/rival values loaded lazily"
  - "PrefsStore exposes hasApiKey boolean only — actual key never stored in JS state (D-07)"
metrics:
  duration: "~18 minutes (including Rust crate compilation at 1m 15s)"
  completed: "2026-05-03"
  tasks_completed: 2
  files_changed: 9
---

# Phase 20 Plan 01: Security Foundation Summary

**One-liner:** Rust `call_anthropic` Tauri command + OS-native `dynasty-os.bin` plugin-store + Zustand PrefsStore + 21-function prefs-service + single ai-bridge callAnthropic() frontend entry point.

## What Was Built

### Task 1: Rust Infrastructure + npm Dependency

Replaced the 9-line `lib.rs` with a full `call_anthropic` Tauri command that:
- Reads the API key from the `dynasty-os.bin` plugin-store via `app.store(...).get("anthropic-api-key")`
- Injects `x-api-key`, `anthropic-version`, and `content-type` headers via reqwest
- POSTs the passthrough `serde_json::Value` body to `https://api.anthropic.com/v1/messages`
- Returns `serde_json::Value` — no typed Rust structs, avoids maintenance burden as API evolves

Dependencies added:
- `Cargo.toml`: `reqwest = { version = "0.12", features = ["json"] }` and `tauri-plugin-store = "2"`
- `capabilities/default.json`: `store:default`, `store:allow-load`, `store:allow-get`, `store:allow-set`, `store:allow-delete`
- `apps/desktop/package.json`: `@tauri-apps/plugin-store ^2.4.3`

**Rust build: `cargo build` succeeded** (dev profile, 1m 15s, all crates compiled cleanly).

### Task 2: Frontend Foundation

**`prefs-store.ts`** — Zustand PrefsStore with 9 state fields and matching setters:
- `hasApiKey: boolean` — API key presence flag (never the key itself)
- `maddenSavePath`, `maddenWatcherEnabled`, `autoExportEnabled` — Madden sync prefs
- `setupWizardState`, `tourComplete`, `onboardingComplete` — onboarding/tour state
- `checklistState` (keyed by seasonId), `rivalKeyMoments` (keyed by rivalId)

**`prefs-service.ts`** — 21 exported async functions backed by `dynasty-os.bin`:
- API key: `getApiKey`, `setApiKey`, `clearApiKey`, `migrateApiKey`, `loadAll`
- Madden: `getMaddenSavePath`, `setMaddenSavePath`, `clearMaddenSavePath`, `getMaddenWatcherEnabled`, `setMaddenWatcherEnabled`
- Auto-export: `getAutoExportEnabled`, `setAutoExportEnabled`
- Wizard: `getSetupWizardState`, `setSetupWizardState`
- Tour/Onboarding: `getTourComplete`, `setTourComplete`, `getOnboardingComplete`, `setOnboardingComplete`
- Checklist: `getChecklistState`, `setChecklistState`
- Rival moments: `getRivalKeyMoments`, `setRivalKeyMoments`

**`ai-bridge.ts`** — Single frontend Anthropic call site:
- Wraps `invoke('call_anthropic', { body })` via `@tauri-apps/api/core`
- Returns `null` on error, never throws (preserves fire-and-forget contract)
- Never sees the API key — Rust injects it from plugin-store

## Version Pins Resolved

| Dependency | Resolved Version |
|-----------|-----------------|
| reqwest (Cargo) | 0.12.28 |
| tauri-plugin-store (Cargo) | 2.4.3 |
| @tauri-apps/plugin-store (npm) | 2.4.3 |

## Deviation: StoreOptions.defaults Required

The plan specified `load(STORE_FILE, { autoSave: true })` but `tauri-plugin-store` v2.4.3 requires `defaults` as a non-optional field in `StoreOptions`. Fixed by passing `{ defaults: {}, autoSave: true }`.

**Rule applied:** Rule 1 (Auto-fix bug) — TypeScript type error `TS2345` in prefs-service.ts.

## TypeScript Compilation Note

The worktree's workspace packages (`@dynasty-os/core-types`, etc.) lack `dist/` directories (gitignored), causing pre-existing TS errors in 73 locations across existing files. These errors exist independently of this plan's changes — confirmed by verifying `grep -E "(prefs-store|prefs-service|ai-bridge)" TS errors = 0`.

The new files (`prefs-store.ts`, `prefs-service.ts`, `ai-bridge.ts`) compile cleanly with zero TypeScript errors.

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1: Rust infra + npm dep | `6150d9c` | Cargo.toml, lib.rs, capabilities/default.json, package.json, Cargo.lock, pnpm-lock.yaml |
| Task 2: Frontend foundation | `8857b69` | prefs-store.ts, prefs-service.ts, ai-bridge.ts |

## Zero Existing Callsites Modified

Per the plan's success criteria, no existing callsite was edited. All API key reads/writes still flow through the legacy `getApiKey/setApiKey` in `legacy-card-service.ts`. Plans 02 and 03 perform the migrations.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] StoreOptions.defaults is required in tauri-plugin-store v2**
- **Found during:** Task 2 TypeScript compilation
- **Issue:** `load(STORE_FILE, { autoSave: true })` fails with `TS2345` — `defaults` is a required property in `StoreOptions`
- **Fix:** Changed to `load(STORE_FILE, { defaults: {}, autoSave: true })`
- **Files modified:** `apps/desktop/src/lib/prefs-service.ts`
- **Commit:** `8857b69`

## Threat Flags

None — this plan creates only Rust-side HTTP infrastructure and a new OS-native store. No new network endpoints exposed from frontend, no new auth paths, no file access pattern changes beyond the existing plugin-store file.

## Known Stubs

None — this plan is pure infrastructure. No UI components, no data displayed to users.

## Self-Check: PASSED

- `apps/desktop/src-tauri/src/lib.rs` — FOUND
- `apps/desktop/src/store/prefs-store.ts` — FOUND  
- `apps/desktop/src/lib/prefs-service.ts` — FOUND
- `apps/desktop/src/lib/ai-bridge.ts` — FOUND
- Commit `6150d9c` — FOUND
- Commit `8857b69` — FOUND
