---
phase: 20-security
plan: 02
subsystem: ai-callsite-migration
tags:
  - security
  - anthropic
  - ai-bridge
  - api-key-management
  - callAnthropic
dependency_graph:
  requires:
    - Phase 20 Plan 01 (call_anthropic Tauri command, ai-bridge.ts, prefs-service.ts, prefs-store.ts)
  provides:
    - All four AI service files migrated onto callAnthropic (SEC-01 callsite cleanup)
    - All three page components using async prefs.setApiKey + PrefsStore.hasApiKey (SEC-02 progress)
    - SEC-01 grep gate passes phase-wide: zero api.anthropic.com in apps/desktop/src/
    - legacy-card-service re-exports getApiKey/setApiKey/clearApiKey from prefs-service (D-02)
  affects:
    - Plan 03 (can build on clean SEC-01 state; remaining localStorage callsites are non-API-key)
tech_stack:
  added: []
  patterns:
    - callAnthropic() replaces direct fetch to api.anthropic.com in all four service files
    - usePrefsStore.getState().hasApiKey replaces getApiKey() guards in service files
    - usePrefsStore((s) => s.hasApiKey) reactive read replaces useState(Boolean(getApiKey())) in pages
    - await prefs.setApiKey() async write replaces sync setApiKey() localStorage write in pages
    - void prefs.clearApiKey() fire-and-forget for non-critical-path clear in PlayerProfilePage
key_files:
  created: []
  modified:
    - apps/desktop/src/lib/legacy-card-service.ts
    - apps/desktop/src/lib/narrative-service.ts
    - apps/desktop/src/lib/screenshot-service.ts
    - apps/desktop/src/lib/recruiting-service.ts
    - apps/desktop/src/pages/SeasonRecapPage.tsx
    - apps/desktop/src/pages/PlayerProfilePage.tsx
    - apps/desktop/src/pages/ScreenshotIngestionPage.tsx
decisions:
  - "SeasonRecapPage has no inline api.anthropic.com fetch in the current codebase — generation goes through narrative-service via narrative-store. No callAnthropic import added (no direct fetch to replace)."
  - "void prefs.clearApiKey() fire-and-forget pattern for PlayerProfilePage clear handler (non-blocking UX path)"
  - "void handleSaveApiKey() used in onKeyDown Enter handlers to avoid floating Promise warning without blocking event handler"
metrics:
  duration: "~5 minutes"
  completed: "2026-05-04"
  tasks_completed: 2
  files_changed: 7
---

# Phase 20 Plan 02: AI Callsite Migration Summary

**One-liner:** Migrated all four AI service files onto callAnthropic() and three page components onto async prefs.setApiKey + PrefsStore.hasApiKey, satisfying SEC-01 phase-wide (zero api.anthropic.com in src/).

## What Was Built

### Task 1: Four AI Service Files

**`legacy-card-service.ts`:**
- Removed local `getApiKey()`, `setApiKey()`, `clearApiKey()` (localStorage implementations) and the `LOCAL_STORAGE_KEY` constant
- Added `import { callAnthropic } from './ai-bridge'` and `import { usePrefsStore } from '../store/prefs-store'`
- Added re-export: `export { getApiKey, setApiKey, clearApiKey } from './prefs-service'` (D-02 compatibility shim)
- Replaced `fetch('https://api.anthropic.com/v1/messages', ...)` in `generateLegacyBlurb` with `callAnthropic({ model, max_tokens, system, messages })`
- Replaced `const apiKey = getApiKey(); if (!apiKey) return null;` guard with `if (!usePrefsStore.getState().hasApiKey) return null;`

**`narrative-service.ts`:**
- Replaced `import { getApiKey } from './legacy-card-service'` with `import { usePrefsStore } + import { callAnthropic }`
- Replaced the `callClaudeApi` helper's fetch block with `callAnthropic()` call (model `claude-sonnet-4-6` preserved)
- Replaced all three `if (!getApiKey()) return null;` guards with `if (!usePrefsStore.getState().hasApiKey) return null;`

**`screenshot-service.ts`:**
- Replaced `import { getApiKey }` with `import { usePrefsStore } + import { callAnthropic }`
- Replaced fetch block with `callAnthropic()` call including multimodal image content array (model `claude-haiku-4-5-20251001`, max_tokens 1000 preserved)
- Replaced `const apiKey = getApiKey(); if (!apiKey) return null;` with `if (!usePrefsStore.getState().hasApiKey) return null;`

**`recruiting-service.ts`:**
- Replaced `import { getApiKey }` with `import { usePrefsStore } + import { callAnthropic }`
- Replaced fetch block with `callAnthropic()` call (model `claude-haiku-4-5-20251001`, max_tokens 300 preserved)
- Replaced `const apiKey = getApiKey(); if (!apiKey)` guard with `if (!usePrefsStore.getState().hasApiKey)`

### Task 2: Three Page Components

**`SeasonRecapPage.tsx`:**
- Replaced `import { getApiKey, setApiKey }` with `import { usePrefsStore }` + `import * as prefs from '../lib/prefs-service'`
- Replaced `const [hasApiKey, setHasApiKey] = useState<boolean>(() => Boolean(getApiKey()))` with reactive `const hasApiKey = usePrefsStore((s) => s.hasApiKey)`
- Made `handleSaveApiKey` async: `await prefs.setApiKey(trimmed)` replaces sync `setApiKey`; removed `setHasApiKey(true)` (store updates reactively)
- Fixed `onKeyDown` Enter handler to `void handleSaveApiKey()` (avoids floating Promise)
- No `callAnthropic` import added — this page's AI call flows through narrative-service (already migrated in Task 1)

**`PlayerProfilePage.tsx`:**
- Removed `getApiKey, setApiKey, clearApiKey` from legacy-card-service import (kept `buildLegacyCardData, generateLegacyBlurb, getCachedBlurb, setCachedBlurb`)
- Added `import { usePrefsStore }` + `import * as prefs from '../lib/prefs-service'`
- Replaced `const currentApiKey = getApiKey()` with `const hasApiKey = usePrefsStore((s) => s.hasApiKey)`
- Made `handleSaveApiKey` async: `await prefs.setApiKey(...)`
- Changed `clearApiKey()` to `void prefs.clearApiKey()` (fire-and-forget)
- Replaced `!getApiKey()` / `currentApiKey` references with `!hasApiKey` / `hasApiKey` in JSX
- Fixed `onKeyDown` Enter handler to `void handleSaveApiKey()` (avoids floating Promise)

**`ScreenshotIngestionPage.tsx`:**
- Replaced `import { getApiKey, setApiKey }` with `import { usePrefsStore }` + `import * as prefs from '../lib/prefs-service'`
- Replaced `const apiKey = getApiKey(); if (!apiKey) { setApiKeyMissing(true); return; }` in `handleParse` with `if (!usePrefsStore.getState().hasApiKey)`
- Replaced `setApiKey(enteredKey.trim())` in save handler with `void prefs.setApiKey(enteredKey.trim())` (fire-and-forget in onClick, existing `setApiKeyMissing(false)` preserved)
- No `callAnthropic` import — vision calls flow through screenshot-service (migrated in Task 1)

## Final Grep Counts (Phase-Wide)

| Pattern | Count | Expected |
|---------|-------|----------|
| `api.anthropic.com` in `apps/desktop/src/` | 0 | 0 (SEC-01 gate) |
| `anthropic-dangerous-direct-browser-access` in `apps/desktop/src/` | 0 | 0 |
| `localStorage.*dynasty-os-anthropic-api-key` in `legacy-card-service.ts` | 0 | 0 |
| `localStorage.*dynasty-os-anthropic-api-key` in `prefs-service.ts` | 2 | Intentional (D-01 migrateApiKey reads+removes legacy key) |

## Deviation: SeasonRecapPage Has No Inline Fetch

**Found during:** Task 2 reading
**Expected by plan:** SeasonRecapPage.tsx has an inline `api.anthropic.com` fetch in the recap-generation handler
**Reality:** The current code routes through `useNarrativeStore.getState().generate()` → `generateSeasonNarrative()` in narrative-service.ts. There is no direct fetch in SeasonRecapPage.tsx.
**Action:** Did NOT add a spurious `callAnthropic` import. The acceptance criterion requiring the ai-bridge import in SeasonRecapPage cannot be satisfied without adding dead code. Documented here as deviation.
**Rule applied:** This is not a bug or missing feature — the page is already in a more advanced state than the plan assumed.
**Impact:** `grep -cE "from\s+['\"][\.\./]+lib/ai-bridge['\"]" apps/desktop/src/pages/SeasonRecapPage.tsx` returns 0 (not 1 as stated in acceptance criteria). All other acceptance criteria pass.

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1: Four AI service files | `4317217` | legacy-card-service.ts, narrative-service.ts, screenshot-service.ts, recruiting-service.ts |
| Task 2: Three page components | `320d822` | SeasonRecapPage.tsx, PlayerProfilePage.tsx, ScreenshotIngestionPage.tsx |

## No New Files Created

This plan is purely migration — zero new files created. Seven existing files modified.

## Callsites Not in Original Migration List

None found. All seven files were enumerated in CONTEXT.md.

## PlayerProfilePage and ScreenshotIngestionPage

Confirmed: neither imports `callAnthropic`. Their AI flows go through:
- `PlayerProfilePage` → `generateLegacyBlurb` in legacy-card-service (migrated Task 1)
- `ScreenshotIngestionPage` → `parseScreenshot` in screenshot-service (migrated Task 1)

## Threat Flags

None — this plan removes network surface (direct browser-to-Anthropic HTTP) and routes all calls through the existing Rust boundary established in Plan 01. No new endpoints, auth paths, or file access patterns introduced.

## Known Stubs

None — all seven files are fully migrated. No placeholder values or partial implementations.

## Self-Check: PASSED

Files verified to exist:
- `apps/desktop/src/lib/legacy-card-service.ts` — FOUND
- `apps/desktop/src/lib/narrative-service.ts` — FOUND
- `apps/desktop/src/lib/screenshot-service.ts` — FOUND
- `apps/desktop/src/lib/recruiting-service.ts` — FOUND
- `apps/desktop/src/pages/SeasonRecapPage.tsx` — FOUND
- `apps/desktop/src/pages/PlayerProfilePage.tsx` — FOUND
- `apps/desktop/src/pages/ScreenshotIngestionPage.tsx` — FOUND
- Commit `4317217` — FOUND
- Commit `320d822` — FOUND
- SEC-01 gate: `grep -rIn 'api\.anthropic\.com' apps/desktop/src/ | wc -l` = 0 — PASSED
