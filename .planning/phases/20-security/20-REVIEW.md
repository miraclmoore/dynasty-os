---
phase: 20-security
reviewed: 2026-05-03T00:00:00Z
depth: standard
files_reviewed: 26
files_reviewed_list:
  - apps/desktop/src-tauri/src/lib.rs
  - apps/desktop/src-tauri/Cargo.toml
  - apps/desktop/src-tauri/capabilities/default.json
  - apps/desktop/src/lib/ai-bridge.ts
  - apps/desktop/src/lib/prefs-service.ts
  - apps/desktop/src/lib/legacy-card-service.ts
  - apps/desktop/src/lib/narrative-service.ts
  - apps/desktop/src/lib/screenshot-service.ts
  - apps/desktop/src/lib/recruiting-service.ts
  - apps/desktop/src/lib/madden-sync-service.ts
  - apps/desktop/src/lib/rivalry-service.ts
  - apps/desktop/src/lib/auto-export-service.ts
  - apps/desktop/src/store/prefs-store.ts
  - apps/desktop/src/App.tsx
  - apps/desktop/src/pages/ScreenshotIngestionPage.tsx
  - apps/desktop/src/pages/SeasonRecapPage.tsx
  - apps/desktop/src/pages/PlayerProfilePage.tsx
  - apps/desktop/src/pages/DashboardPage.tsx
  - apps/desktop/src/pages/RivalryTrackerPage.tsx
  - apps/desktop/src/pages/MaddenSyncPage.tsx
  - apps/desktop/src/pages/RosterPage.tsx
  - apps/desktop/src/pages/LauncherPage.tsx
  - apps/desktop/src/components/TourOverlay.tsx
  - apps/desktop/src/components/OnboardingModal.tsx
  - apps/desktop/src/components/SetupWizard.tsx
  - apps/desktop/src/components/QuickEntryHub.tsx
findings:
  critical: 2
  warning: 4
  info: 3
  total: 9
status: issues_found
---

# Phase 20: Code Review Report

**Reviewed:** 2026-05-03
**Depth:** standard
**Files Reviewed:** 26
**Status:** issues_found

## Summary

Phase 20 migrated all Anthropic API calls from direct frontend `fetch()` to a Rust Tauri command, and migrated all `localStorage` usage to `tauri-plugin-store`. The core security architecture is sound: the API key never leaves the Rust process, `ai-bridge.ts` uses only `invoke()`, the canonical store file name matches between frontend and backend, and no `localStorage` reads exist outside `prefs-service.ts`. The migration is largely correct.

However, two blockers require immediate attention before this phase can be marked done: a wrong field name corrupts every AI vision prompt sent through the screenshot pipeline, and a missing capability permission will cause `store.entries()` — called on every app boot in `loadAll()` — to be denied at runtime by Tauri's permission system. Four warnings cover a race condition in the migration path, silent write failures that cause state divergence, unvalidated HTTP error responses from Anthropic, and an unspecified TLS backend.

---

## Critical Issues

### CR-01: Wrong field name corrupts AI vision prompts in screenshot pipeline

**File:** `apps/desktop/src/pages/ScreenshotIngestionPage.tsx:140`
**Issue:** `activeDynasty.name` is passed as `teamName` to the screenshot parsing prompt, but `name` is the user-facing dynasty label (e.g. "Alabama Dynasty 2024"), not the actual team name (e.g. "Alabama"). The `Dynasty` type carries both fields: `name` (dynasty label) and `teamName` (the team). Every AI vision call in the screenshot pipeline receives the wrong team context, which degrades or breaks roster/stat extraction for any dynasty whose label differs from the team name — which is the common case.

**Fix:**
```typescript
// Line 140 — change:
teamName: activeDynasty.name,
// to:
teamName: activeDynasty.teamName,
```

---

### CR-02: Missing `store:allow-entries` permission causes `loadAll()` to fail at runtime

**File:** `apps/desktop/src-tauri/capabilities/default.json`
**Issue:** `prefs-service.ts:209` calls `store.entries()` inside `loadAll()`, which is invoked on every app boot from `App.tsx`. The Tauri v2 capability system requires each plugin method to be explicitly allowed. The current capability file lists `store:default`, `store:allow-load`, `store:allow-get`, `store:allow-set`, and `store:allow-delete` — but not `store:allow-entries`. At runtime, the `entries()` call will be denied by the permission system, causing `loadAll()` to throw and all prefs (API key visibility, tour state, onboarding state, checklist state, rival key moments) to remain at their uninitialized defaults for the entire session.

**Fix:**
```json
{
  "identifier": "default",
  "windows": ["main"],
  "permissions": [
    "store:default",
    "store:allow-load",
    "store:allow-get",
    "store:allow-set",
    "store:allow-delete",
    "store:allow-entries"
  ]
}
```

---

## Warnings

### WR-01: Race condition between `migrateApiKey()` and `loadAll()` on first boot

**File:** `apps/desktop/src/App.tsx:114-117`
**Issue:** Both calls are fired as unresolved `void` promises with no sequencing:
```typescript
void prefs.migrateApiKey();
void prefs.loadAll();
```
On a first-ever install where a legacy `localStorage` API key exists, `migrateApiKey()` reads the key from `localStorage`, writes it to the plugin-store, and updates `hasApiKey` in Zustand. `loadAll()` fires concurrently and reads from the plugin-store before the write from `migrateApiKey()` completes. The result: `hasApiKey` is left `false` for the session and the key is not visible to any AI feature until the next cold start.

**Fix:**
```typescript
useEffect(() => {
  async function init() {
    await prefs.migrateApiKey();
    await prefs.loadAll();
  }
  void init();
}, []);
```

---

### WR-02: Silent write failures in prefs-service cause in-memory/disk state divergence

**File:** `apps/desktop/src/lib/prefs-service.ts`
**Issue:** Every write function (`setApiKey`, `setTourComplete`, `setOnboardingComplete`, `setSetupWizardState`, `setAutoExportEnabled`, `setChecklistState`, `setRivalKeyMoments`) follows this pattern:

```typescript
try {
  await store.set(KEY, value);
  await store.save();
  usePrefsStore.getState().setSomeValue(value);
} catch {
  // silent
}
```

When `store.set()` or `store.save()` fails (disk full, plugin-store unavailable, permissions error), the Zustand in-memory state is never updated either — but there is no error surfaced to the caller. The user sees their change appear to succeed (the UI optimistically updates from the catch-less Zustand call that never runs), or sees no change at all, with no feedback. Accumulated across a session, disk state and memory state diverge silently. On next boot, `loadAll()` restores stale disk state, losing the session's changes.

**Fix:** At minimum, re-throw or log the error so callers can surface it. Ideally use an optimistic-update pattern that rolls back Zustand state on failure:
```typescript
async function setTourComplete(v: boolean) {
  try {
    const s = await getStore();
    await s.set(KEYS.tourComplete, v);
    await s.save();
    usePrefsStore.getState().setTourComplete(v);
  } catch (err) {
    console.error('[prefs] setTourComplete failed:', err);
    throw err; // let callers handle or surface to user
  }
}
```

---

### WR-03: Anthropic HTTP error responses forwarded as `Ok` to frontend

**File:** `apps/desktop/src-tauri/src/lib.rs:27-28`
**Issue:** The `call_anthropic` command does not check the HTTP status code before deserializing and returning the response body:
```rust
let json: Value = response.json().await.map_err(|e| e.to_string())?;
Ok(json)
```
A 401 (bad API key), 429 (rate limited), or 500 (Anthropic server error) response body is deserialized and returned as `Ok(json)` to the frontend. `ai-bridge.ts` then tries to access `.content[0].text` on an Anthropic error object like `{"type":"error","error":{"type":"authentication_error","message":"..."}}`, which returns `undefined` and propagates as a null result — indistinguishable from a network failure. The actual error reason (rate limit, bad key, quota exceeded) is silently discarded.

**Fix:**
```rust
let status = response.status();
let json: Value = response.json().await.map_err(|e| e.to_string())?;
if !status.is_success() {
    return Err(format!(
        "Anthropic API error {}: {}",
        status.as_u16(),
        json.get("error")
            .and_then(|e| e.get("message"))
            .and_then(|m| m.as_str())
            .unwrap_or("unknown error")
    ));
}
Ok(json)
```

---

### WR-04: `reqwest` dependency has no explicit TLS feature

**File:** `apps/desktop/src-tauri/Cargo.toml:22`
**Issue:** The reqwest dependency is declared without an explicit TLS backend:
```toml
reqwest = { version = "0.12", features = ["json"] }
```
Without `rustls-tls` or `native-tls` explicitly specified, reqwest falls back to its compiled-in default, which varies by reqwest version and build environment. In a cross-platform Tauri app (macOS, Windows, Linux) this is a build-time ambiguity that can produce different TLS stacks per platform, making TLS behavior harder to audit and test.

**Fix:**
```toml
reqwest = { version = "0.12", features = ["json", "rustls-tls"], default-features = false }
```
Using `default-features = false` with explicit `rustls-tls` ensures the same TLS implementation across all platforms without depending on system libraries.

---

## Info

### IN-01: `formatStatKey()` duplicated across two service files

**File:** `apps/desktop/src/lib/narrative-service.ts` / `apps/desktop/src/lib/legacy-card-service.ts`
**Issue:** The `formatStatKey()` helper function is defined verbatim in both files. Any fix to the formatting logic must be applied in two places.

**Fix:** Extract to a shared utility module (e.g. `apps/desktop/src/lib/stat-utils.ts`) and import from both consumers.

---

### IN-02: After inline API key entry in screenshot page, parse requires manual retry

**File:** `apps/desktop/src/pages/ScreenshotIngestionPage.tsx:827-829`
**Issue:** When a user enters their API key inline on the screenshot page (the fallback entry point), the key is saved but parsing is not automatically retried. The user must click "Parse" again manually. This is not a bug but a UX gap that will cause confusion given the page already has queued screenshots.

**Fix:** After a successful `prefs.setApiKey()` call, programmatically trigger the parse flow if screenshots are queued.

---

### IN-03: No per-request timeout on the `reqwest` client in `lib.rs`

**File:** `apps/desktop/src-tauri/src/lib.rs`
**Issue:** The `reqwest::Client` is built with no timeout configuration. If Anthropic is slow to respond or the connection hangs, the Tauri command will block indefinitely, freezing any UI feature that awaits the invoke call.

**Fix:**
```rust
let client = reqwest::Client::builder()
    .timeout(std::time::Duration::from_secs(60))
    .build()
    .map_err(|e| e.to_string())?;
```

---

_Reviewed: 2026-05-03_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
