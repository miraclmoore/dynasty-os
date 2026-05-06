---
phase: 20-security
fixed_at: 2026-05-03T00:00:00Z
review_path: .planning/phases/20-security/20-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 20: Code Review Fix Report

**Fixed at:** 2026-05-03
**Source review:** .planning/phases/20-security/20-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (2 Critical, 4 Warning — Info excluded per critical_warning scope)
- Fixed: 6
- Skipped: 0

TypeScript compilation: CLEAN (`pnpm exec tsc --noEmit` passes with zero errors after all fixes).

---

## Fixed Issues

### CR-01: Wrong field name corrupts AI vision prompts in screenshot pipeline

**Files modified:** `apps/desktop/src/pages/ScreenshotIngestionPage.tsx`
**Commit:** 9a10c71
**Applied fix:** Changed `teamName: activeDynasty.name` to `teamName: activeDynasty.teamName` at line 140. The `name` field is the dynasty label (e.g. "Alabama Dynasty 2024"); `teamName` is the actual team name (e.g. "Alabama") that the AI vision prompt needs for correct roster/stat extraction context.

---

### CR-02: Missing `store:allow-entries` permission causes `loadAll()` to fail at runtime

**Files modified:** `apps/desktop/src-tauri/capabilities/default.json`
**Commit:** cfebfef
**Applied fix:** Added `"store:allow-entries"` as the 6th entry in the permissions array. Without this, `store.entries()` called inside `loadAll()` on every app boot was denied by Tauri's permission system, leaving all prefs at uninitialized defaults for the session.

---

### WR-01: Race condition between `migrateApiKey()` and `loadAll()` on first boot

**Files modified:** `apps/desktop/src/App.tsx`
**Commit:** 072c340
**Applied fix:** Replaced two concurrent `void` fire-and-forget calls with a sequenced `async function init()` that `await`s `migrateApiKey()` before calling `loadAll()`. On first-ever install with a legacy localStorage key, the original concurrent calls allowed `loadAll()` to read the store before `migrateApiKey()` could write the migrated key, leaving `hasApiKey` false for the session.

---

### WR-02: Silent write failures in prefs-service cause in-memory/disk state divergence

**Files modified:** `apps/desktop/src/lib/prefs-service.ts`
**Commit:** 543e5cd
**Applied fix:** Added `console.error('[prefs] <functionName> failed:', err)` and `throw err` to the catch block of all 10 write functions: `setApiKey`, `clearApiKey`, `setMaddenSavePath`, `setMaddenWatcherEnabled`, `setAutoExportEnabled`, `setSetupWizardState`, `setTourComplete`, `setOnboardingComplete`, `setChecklistState`, and `setRivalKeyMoments`. Read-only functions and the inner catch in `loadAll` (for auto-export enumeration) retain their silent swallow behaviour as they return fallback values.

---

### WR-03: Anthropic HTTP error responses forwarded as `Ok` to frontend

**Files modified:** `apps/desktop/src-tauri/src/lib.rs`
**Commit:** 590db27
**Applied fix:** Captured `response.status()` before consuming the response body into JSON, then checked `status.is_success()` after deserialization. Non-2xx responses now return `Err` with the HTTP status code and the Anthropic error message extracted from `json["error"]["message"]`, making 401/429/500 errors distinguishable from network failures in the frontend.

---

### WR-04: `reqwest` dependency has no explicit TLS feature

**Files modified:** `apps/desktop/src-tauri/Cargo.toml`
**Commit:** 541d0a5
**Applied fix:** Changed the reqwest dependency from `features = ["json"]` to `features = ["json", "rustls-tls"], default-features = false`. This pins the TLS implementation to pure-Rust rustls across all target platforms (macOS, Windows, Linux) rather than relying on the compiled-in default which varies by reqwest version and build environment.

---

## Skipped Issues

None — all 6 in-scope findings were applied successfully.

---

_Fixed: 2026-05-03_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
