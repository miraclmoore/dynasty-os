# Phase 20: Security - Context

**Gathered:** 2026-05-03
**Status:** Ready for planning

<domain>
## Phase Boundary

All Anthropic API calls move behind a Tauri command (`call_anthropic`) so the API key never flows through the WebView, the API key moves from `localStorage` to OS-native `plugin-store`, and all remaining `localStorage` reads/writes are replaced with `prefs-service.ts` — so `grep localStorage.getItem/setItem/removeItem` in `src/` returns zero results.

</domain>

<decisions>
## Implementation Decisions

### API Key Migration

- **D-01:** Auto-migrate silently on first launch. On App.tsx startup: detect `dynasty-os-anthropic-api-key` in `localStorage` → write to plugin-store via `prefs-service.setApiKey()` → remove from `localStorage`. User notices nothing. Zero disruption to existing users.
- **D-02:** `getApiKey()`, `setApiKey()`, and `clearApiKey()` move to `prefs-service.ts` as async functions. `legacy-card-service.ts` re-exports them (or calls prefs-service directly) to minimize callsite churn across the 7 files that import from it.

### Tauri Command (call_anthropic)

- **D-03:** Generic `serde_json::Value` passthrough. The Rust command accepts the full request body as JSON, injects `Authorization` and `anthropic-version` headers (reading the API key from plugin-store in Rust), and forwards to `api.anthropic.com/v1/messages`. Returns `serde_json::Value`. No typed Rust structs needed — avoids maintenance burden as the Anthropic API evolves.
- **D-04:** Use `reqwest` crate for outbound HTTP from Rust. Not `tauri-plugin-http` — reqwest is simpler, requires no capability file entries, and outbound Rust HTTP bypasses the WebView security model entirely (which is the point).
- **D-05:** The API key NEVER appears in frontend code after Phase 20. `ai-bridge.ts` is the single call site — it invokes `call_anthropic` with the messages body only. The Rust command is responsible for reading and injecting the key.

### Prefs-Service Architecture

- **D-06:** Eager PrefsStore (Zustand slice, e.g., `prefs-store.ts` or added to an existing store). `prefs-service.ts` calls `loadAll()` at App.tsx startup — reads all values from plugin-store async, populates the Zustand store. Components and services then read synchronously from `usePrefsStore.getState()`. Same pattern as `dynasty-store` and `season-store`.
- **D-07:** Services gate AI features on `usePrefsStore.getState().hasApiKey` (boolean, synchronously available). Services never call plugin-store directly. When a user saves or clears a key: `await prefs-service.setApiKey(key)` writes plugin-store AND calls `usePrefsStore.setState({ hasApiKey: true })` to keep the store in sync.

### localStorage Scope

- **D-08:** **Rivalry key moments** (`dynasty-os-moments-{rivalId}` in `rivalry-service.ts`) move to plugin-store via `prefs-service.ts` as JSON-serialized arrays. Phase 21 will add the `keyMoments` Dexie table and migrate from plugin-store. Phase 20 does NOT touch the Dexie schema for this — clean phase boundary.
- **D-09:** **Ephemeral one-shot UI flags** (`dynasty-os-onboarding-pending`, `auto-open-add-player`) replace with in-memory module variables. These flags are set and consumed within the same session; no persistence is needed or wanted.
- **D-10:** All other `localStorage` items (Madden save path, Madden watcher state, auto-export setting, setup wizard state, tour-complete, onboarding-complete, season checklist) move to plugin-store via `prefs-service.ts`.

### Canonical Plugin Store File

- **D-11:** Plugin-store file is `dynasty-os.bin` (matching what REQUIREMENTS.md and success criteria reference). All prefs live in this single store file, accessed by string keys.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Security (SEC-01, SEC-02, SEC-03) — exact acceptance criteria for grep checks and plugin-store validation
- `.planning/ROADMAP.md` §Phase 20 — goal, success criteria, dependency on Phase 19

### Files That Need Migration (all localStorage callers)
- `apps/desktop/src/lib/legacy-card-service.ts` — `getApiKey()`/`setApiKey()`/`clearApiKey()` + narrative blurb cache functions
- `apps/desktop/src/lib/narrative-service.ts` — direct `api.anthropic.com` fetch call + `getApiKey()` guard
- `apps/desktop/src/lib/screenshot-service.ts` — direct `api.anthropic.com` fetch call
- `apps/desktop/src/lib/recruiting-service.ts` — direct `api.anthropic.com` fetch call
- `apps/desktop/src/lib/rivalry-service.ts` — `getKeyMoments()`/`addKeyMoment()` localStorage storage
- `apps/desktop/src/lib/madden-sync-service.ts` — save path + watcher state in localStorage
- `apps/desktop/src/lib/auto-export-service.ts` — auto-export enabled flag in localStorage
- `apps/desktop/src/pages/SeasonRecapPage.tsx` — `getApiKey()`/`setApiKey()` imports + direct `api.anthropic.com` fetch
- `apps/desktop/src/pages/PlayerProfilePage.tsx` — `getApiKey()`/`setApiKey()` imports
- `apps/desktop/src/pages/ScreenshotIngestionPage.tsx` — direct `api.anthropic.com` fetch call
- `apps/desktop/src/pages/DashboardPage.tsx` — season checklist in localStorage
- `apps/desktop/src/pages/LauncherPage.tsx` — `dynasty-os-onboarding-pending` flag (→ module var)
- `apps/desktop/src/components/TourOverlay.tsx` — tour-complete flag in localStorage
- `apps/desktop/src/components/OnboardingModal.tsx` — onboarding-complete flag in localStorage
- `apps/desktop/src/components/SetupWizard.tsx` — wizard state per dynastyId + auto-open-add-player flag (→ module var)
- `apps/desktop/src/components/QuickEntryHub.tsx` — auto-open-add-player flag (→ module var)
- `apps/desktop/src/pages/RosterPage.tsx` — reads auto-open-add-player flag (→ module var)
- `apps/desktop/src/App.tsx` — reads `dynasty-os-onboarding-pending` (→ module var)

### Tauri Infrastructure
- `apps/desktop/src-tauri/src/lib.rs` — current Tauri builder (no commands yet; `call_anthropic` + AppState go here)
- `apps/desktop/src-tauri/Cargo.toml` — add `reqwest` + `tauri-plugin-store` crate deps here
- `apps/desktop/package.json` — add `@tauri-apps/plugin-store` npm dep here
- `apps/desktop/src-tauri/capabilities/` — may need store capability entry

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/desktop/src/store/` — Zustand store pattern. The new `prefs-store.ts` follows the same `create<PrefsState>()(...)` pattern with a `loadAll()` action called at startup.
- `apps/desktop/src/lib/legacy-card-service.ts` — existing `getApiKey()`/`setApiKey()`/`clearApiKey()` functions; Phase 20 moves their implementation to prefs-service and re-exports from this file.
- `apps/desktop/src-tauri/src/lib.rs` — current plugin chain (`tauri_plugin_dialog`, `tauri_plugin_fs`, `tauri_plugin_shell`). `tauri_plugin_store` and `call_anthropic` command registration go here.
- `apps/desktop/src/App.tsx` — startup sequence where `loadAll()` should fire (before main UI renders, similar to how dynasty-store bootstraps).

### Established Patterns
- **Fire-and-forget AI calls:** All AI service calls are async and never block saves. `ai-bridge.ts` must preserve this — `callAnthropic()` returns a Promise, callers `.catch()` silently or handle errors in toast.
- **Zustand store eager loading:** `dynasty-store.ts` calls `loadDynasties()` on mount; same pattern for PrefsStore `loadAll()` at App.tsx startup.
- **invoke() pattern:** `@tauri-apps/api/core` `invoke()` is already used indirectly via plugin-dialog and plugin-fs. `ai-bridge.ts` uses the same import pattern: `import { invoke } from '@tauri-apps/api/core'`.
- **`anthropic-dangerous-direct-browser-access`:** This header is currently sent in all direct fetch calls. After Phase 20, it is removed entirely — the Rust command makes the HTTP call, not the browser.

### Integration Points
- `App.tsx` startup — PrefsStore `loadAll()` runs here (async, before render gate or in first useEffect)
- `legacy-card-service.ts` — re-exports `getApiKey()`/`setApiKey()` from prefs-service; 0 callsite changes in consuming pages
- All 4 AI service files (narrative, legacy-card, screenshot, recruiting) — swap `fetch('https://api.anthropic.com/v1/messages', ...)` for `invoke('call_anthropic', { body })` via `ai-bridge.ts`
- `rivalry-service.ts` — swaps `localStorage.get/set` for async `prefs-service.getRivalKeyMoments(rivalId)` / `prefs-service.setRivalKeyMoments(rivalId, moments)`

</code_context>

<specifics>
## Specific Ideas

- The `call_anthropic` Tauri command shape (as confirmed): accepts `body: serde_json::Value`, reads API key from plugin-store in Rust via `AppState`, injects `Authorization: Bearer {key}` and `anthropic-version: 2023-06-01` headers, POSTs to `https://api.anthropic.com/v1/messages`, returns `serde_json::Value`.
- Plugin store file name: `dynasty-os.bin` (as specified in SEC-02 success criterion).
- Auto-migration guard runs once at startup in App.tsx: `if (localStorage.getItem('dynasty-os-anthropic-api-key')) { await prefs.migrateApiKey(); }`. After migration, the localStorage key is deleted.

</specifics>

<deferred>
## Deferred Ideas

- Rivalry key moments → Dexie `keyMoments` table: deferred to Phase 21 (DMOD-01). Phase 20 only moves them from localStorage to plugin-store as a stepping stone.
- `tauri-plugin-http` as HTTP backend: rejected in favor of `reqwest` for simplicity. Not reconsidered unless reqwest causes build issues.

</deferred>

---

*Phase: 20-Security*
*Context gathered: 2026-05-03*
