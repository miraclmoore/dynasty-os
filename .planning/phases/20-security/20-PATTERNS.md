# Phase 20: Security - Pattern Map

**Mapped:** 2026-05-03
**Files analyzed:** 23
**Analogs found:** 22 / 23

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `apps/desktop/src/lib/ai-bridge.ts` | service | request-response | `apps/desktop/src/lib/narrative-service.ts` | role-match |
| `apps/desktop/src/lib/prefs-service.ts` | service | request-response | `apps/desktop/src/lib/auto-export-service.ts` | role-match |
| `apps/desktop/src/store/prefs-store.ts` | store | request-response | `apps/desktop/src/store/dynasty-store.ts` | exact |
| `apps/desktop/src/lib/legacy-card-service.ts` | service | request-response | self (modify) | exact |
| `apps/desktop/src/lib/narrative-service.ts` | service | request-response | self (modify) | exact |
| `apps/desktop/src/lib/screenshot-service.ts` | service | request-response | self (modify) | exact |
| `apps/desktop/src/lib/recruiting-service.ts` | service | request-response | self (modify) | exact |
| `apps/desktop/src/lib/rivalry-service.ts` | service | CRUD | self (modify) | exact |
| `apps/desktop/src/lib/madden-sync-service.ts` | service | file-I/O | self (modify) | exact |
| `apps/desktop/src/lib/auto-export-service.ts` | service | file-I/O | self (modify) | exact |
| `apps/desktop/src-tauri/src/lib.rs` | config | request-response | self (modify) | exact |
| `apps/desktop/src-tauri/Cargo.toml` | config | N/A | self (modify) | exact |
| `apps/desktop/src/App.tsx` | component | event-driven | self (modify) | exact |
| `apps/desktop/src/pages/SeasonRecapPage.tsx` | component | request-response | self (modify) | exact |
| `apps/desktop/src/pages/PlayerProfilePage.tsx` | component | request-response | self (modify) | exact |
| `apps/desktop/src/pages/ScreenshotIngestionPage.tsx` | component | request-response | self (modify) | exact |
| `apps/desktop/src/pages/DashboardPage.tsx` | component | CRUD | self (modify) | exact |
| `apps/desktop/src/pages/LauncherPage.tsx` | component | event-driven | self (modify) | exact |
| `apps/desktop/src/components/TourOverlay.tsx` | component | event-driven | self (modify) | exact |
| `apps/desktop/src/components/OnboardingModal.tsx` | component | event-driven | self (modify) | exact |
| `apps/desktop/src/components/SetupWizard.tsx` | component | event-driven | self (modify) | exact |
| `apps/desktop/src/components/QuickEntryHub.tsx` | component | event-driven | self (modify) | exact |
| `apps/desktop/src/pages/RosterPage.tsx` | component | event-driven | self (modify) | exact |

---

## Pattern Assignments

### `apps/desktop/src/lib/ai-bridge.ts` (NEW — service, request-response)

**Analog:** `apps/desktop/src/lib/narrative-service.ts` (the `callClaudeApi` helper, lines 310–347)

This is the single new file. It wraps `invoke('call_anthropic', ...)` the same way `callClaudeApi` wraps `fetch`. It must never read the API key — the Rust command injects it.

**Imports pattern** (copy from narrative-service.ts lines 1–7 — replace fetch with invoke):
```typescript
import { invoke } from '@tauri-apps/api/core';
```

**Core pattern** — the entire file should follow this shape:
```typescript
// The ONLY place in the frontend that touches the Anthropic API.
// The Rust `call_anthropic` command reads the key from plugin-store and injects it.
// This function never sees the API key.
export async function callAnthropic(body: {
  model: string;
  max_tokens: number;
  system: string;
  messages: Array<{ role: string; content: unknown }>;
}): Promise<{ content: Array<{ text: string }> } | null> {
  try {
    const result = await invoke<{ content: Array<{ text: string }> }>('call_anthropic', { body });
    return result;
  } catch (err) {
    console.warn('[AiBridge] call_anthropic failed:', err);
    return null;   // Never throws — callers receive null as the error signal
  }
}
```

**Fire-and-forget contract** (from `dynasty-store.ts` line 60 and `auto-export-service.ts` lines 20–34): callers must `.catch()` silently or handle errors without blocking. `callAnthropic` returns `Promise<... | null>`, never throws.

---

### `apps/desktop/src/lib/prefs-service.ts` (NEW — service, request-response)

**Analog:** `apps/desktop/src/lib/auto-export-service.ts` (async Tauri plugin usage pattern, lines 1–34)

**Imports pattern** — mirrors `auto-export-service.ts` line 1–3 plugin import style:
```typescript
import { load } from '@tauri-apps/plugin-store';
import { usePrefsStore } from '../store/prefs-store';
```

**Core pattern — store file open and key operations:**
```typescript
const STORE_FILE = 'dynasty-os.bin';  // SEC-02 canonical name

async function getStore() {
  return load(STORE_FILE, { autoSave: true });
}

// ── API Key ───────────────────────────────────────────────────────────────────

export async function getApiKey(): Promise<string | null> {
  try {
    const store = await getStore();
    return (await store.get<string>('anthropic-api-key')) ?? null;
  } catch {
    return null;
  }
}

export async function setApiKey(key: string): Promise<void> {
  try {
    const store = await getStore();
    await store.set('anthropic-api-key', key);
    usePrefsStore.getState().setHasApiKey(true);
  } catch {
    // Ignore storage errors
  }
}

export async function clearApiKey(): Promise<void> {
  try {
    const store = await getStore();
    await store.delete('anthropic-api-key');
    usePrefsStore.getState().setHasApiKey(false);
  } catch {
    // Ignore storage errors
  }
}
```

**Migration pattern** (called once at App.tsx startup — D-01):
```typescript
export async function migrateApiKey(): Promise<void> {
  // Called only when localStorage still has the old key (guard is in App.tsx)
  const legacyKey = localStorage.getItem('dynasty-os-anthropic-api-key');
  if (legacyKey) {
    await setApiKey(legacyKey);
    localStorage.removeItem('dynasty-os-anthropic-api-key');
  }
}
```

**loadAll pattern** (called at App.tsx startup, populates PrefsStore synchronously for all services):
```typescript
export async function loadAll(): Promise<void> {
  const store = await getStore();
  const apiKey = await store.get<string>('anthropic-api-key');
  // ... load all other keys
  usePrefsStore.setState({
    hasApiKey: Boolean(apiKey),
    maddenSavePath: ...,
    // etc.
  });
}
```

**Error handling:** Same as `auto-export-service.ts` lines 31–33 — wrap all store calls in try/catch and swallow errors silently (prefs failures never block UI).

---

### `apps/desktop/src/store/prefs-store.ts` (NEW — store, request-response)

**Analog:** `apps/desktop/src/store/dynasty-store.ts` (full file, lines 1–121)
**Secondary analog:** `apps/desktop/src/store/season-store.ts` (lines 1–88) — simpler shape for smaller stores

**Imports pattern** (copy from `dynasty-store.ts` lines 1–2):
```typescript
import { create } from 'zustand';
```

**State + Actions interface pattern** (from `season-store.ts` lines 10–25 — use the typed-split approach):
```typescript
interface PrefsState {
  hasApiKey: boolean;
  maddenSavePath: string | null;
  maddenWatcherEnabled: boolean;
  autoExportEnabled: Record<string, boolean>; // keyed by dynastyId
  setupWizardState: Record<string, WizardState>; // keyed by dynastyId
  tourComplete: boolean;
  onboardingComplete: boolean;
  checklistState: Record<string, Record<string, boolean>>; // keyed by seasonId
  rivalKeyMoments: Record<string, KeyMoment[]>; // keyed by rivalId
}

interface PrefsActions {
  setHasApiKey: (v: boolean) => void;
  setMaddenSavePath: (path: string | null) => void;
  setMaddenWatcherEnabled: (v: boolean) => void;
  // ... one setter per field
}
```

**Store creation pattern** (from `dynasty-store.ts` line 38):
```typescript
export const usePrefsStore = create<PrefsState & PrefsActions>((set) => ({
  // initial state — all falsy/empty
  hasApiKey: false,
  maddenSavePath: null,
  maddenWatcherEnabled: false,
  // ...

  // actions — each calls set()
  setHasApiKey: (v) => set({ hasApiKey: v }),
  // ...
}));
```

**Do NOT** add a `loadAll()` action to the store itself. `loadAll()` lives in `prefs-service.ts` and calls `usePrefsStore.setState(...)` directly — same pattern as `dynasty-store.ts` line 60's `autoExportIfEnabled` cross-store call.

---

### `apps/desktop/src/lib/legacy-card-service.ts` (modify — service, request-response)

**Current file:** `apps/desktop/src/lib/legacy-card-service.ts` (lines 1–172 fully read)

**What changes:**
- Lines 13–39 (API key functions): replace `localStorage` implementation with re-exports from `prefs-service.ts`
- Line 120: replace `fetch('https://api.anthropic.com/v1/messages', ...)` with `callAnthropic(body)` from `ai-bridge.ts`
- Remove `'x-api-key'`, `'anthropic-dangerous-direct-browser-access'`, `'anthropic-version'` headers (Rust injects them)

**New API key re-export pattern** (replaces lines 13–39):
```typescript
// Re-export from prefs-service so callsites don't change
export { getApiKey, setApiKey, clearApiKey } from './prefs-service';
// OR wrap async calls if callers expect sync:
export function getApiKey(): string | null {
  return usePrefsStore.getState().hasApiKey ? '__has_key__' : null;
  // NOTE: actual key is never in frontend state — only hasApiKey boolean
}
```
Note per D-07: services gate on `usePrefsStore.getState().hasApiKey`, NOT on the key value itself. The `getApiKey()` re-export must be async-safe for existing callers.

**New fetch replacement pattern** (line 120 area — copy structure from `callClaudeApi` in `narrative-service.ts` lines 310–347 but use `callAnthropic` instead):
```typescript
import { callAnthropic } from './ai-bridge';

// Replace fetch block (lines 119–153) with:
const data = await callAnthropic({
  model: 'claude-haiku-4-5-20251001',
  max_tokens: 200,
  system: '...',
  messages: [{ role: 'user', content: userMessage }],
});
if (!data) return null;
const text: string | undefined = data?.content?.[0]?.text;
```

---

### `apps/desktop/src/lib/narrative-service.ts` (modify — service, request-response)

**Current file:** `apps/desktop/src/lib/narrative-service.ts` (full file, lines 1–460 read)

**What changes:**
- Line 4: `import { getApiKey } from './legacy-card-service'` → `import { usePrefsStore } from '../store/prefs-store'`
- Lines 315–316: remove `getApiKey()` guard + `'x-api-key'` header injection
- Lines 317–332 (`fetch` call): replace with `callAnthropic(body)` via `ai-bridge.ts`
- Lines 394 and 430: `if (!getApiKey()) return null` → `if (!usePrefsStore.getState().hasApiKey) return null`

**Guard pattern replacement** (lines 394, 430 area):
```typescript
// Before:
if (!getApiKey()) return null;
// After:
if (!usePrefsStore.getState().hasApiKey) return null;
```

**API call replacement** — `callClaudeApi` helper (lines 310–347) becomes:
```typescript
import { callAnthropic } from './ai-bridge';

async function callClaudeApi(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number
): Promise<string | null> {
  if (!usePrefsStore.getState().hasApiKey) return null;
  const data = await callAnthropic({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });
  if (!data) return null;
  const rawText: string | undefined = data?.content?.[0]?.text;
  if (!rawText) {
    console.warn('[NarrativeService] Claude API response missing text content');
    return null;
  }
  return rawText;
}
```

---

### `apps/desktop/src/lib/screenshot-service.ts` (modify — service, request-response)

**Current file:** `apps/desktop/src/lib/screenshot-service.ts` (full file, lines 1–225 read)

**What changes:**
- Line 1: `import { getApiKey } from './legacy-card-service'` → `import { usePrefsStore } from '../store/prefs-store'`
- Lines 151–152: `getApiKey()` guard → `usePrefsStore.getState().hasApiKey` guard
- Lines 165–198 (`fetch` block): replace with `callAnthropic(body)`
- Remove `'x-api-key'`, `'anthropic-dangerous-direct-browser-access'`, `'anthropic-version'` headers

**Fetch replacement pattern** (lines 165–198 — same shape as narrative-service replacement):
```typescript
import { callAnthropic } from './ai-bridge';

// Replace fetch block with:
const data = await callAnthropic({
  model: 'claude-haiku-4-5-20251001',
  max_tokens: 1000,
  system: systemPrompt,
  messages: [{
    role: 'user',
    content: [
      { type: 'image', source: { type: 'base64', media_type: 'image/png', data: base64Data } },
      { type: 'text', text: 'Parse this screenshot.' },
    ],
  }],
});
if (!data) return null;
const rawText: string | undefined = data?.content?.[0]?.text;
```

---

### `apps/desktop/src/lib/recruiting-service.ts` (modify — service, request-response)

**Current file:** lines 1–190 read (AI section lines 87–190)

**What changes:**
- Line 4: `import { getApiKey } from './legacy-card-service'` → `import { usePrefsStore } from '../store/prefs-store'`
- Lines 97–101: `getApiKey()` guard → `usePrefsStore.getState().hasApiKey`
- Lines 130–150 (`fetch` block): replace with `callAnthropic(body)` from `ai-bridge.ts`
- Same header removal as other services

**Pattern:** identical to `narrative-service.ts` fetch replacement — copy that pattern.

---

### `apps/desktop/src/lib/rivalry-service.ts` (modify — service, CRUD)

**Current file:** `apps/desktop/src/lib/rivalry-service.ts` (full file, lines 1–93 read)

**What changes:**
- Lines 64–92 (`getKeyMoments`, `addKeyMoment`, `deleteKeyMoment`): replace `localStorage.getItem/setItem` with async `prefs-service` calls
- These functions become async (return `Promise<...>`)

**Replacement pattern** (replaces lines 73–92):
```typescript
import { getRivalKeyMoments, setRivalKeyMoments } from './prefs-service';

export async function getKeyMoments(rivalId: string): Promise<KeyMoment[]> {
  return getRivalKeyMoments(rivalId);
}

export async function addKeyMoment(rivalId: string, moment: KeyMoment): Promise<void> {
  const existing = await getRivalKeyMoments(rivalId);
  const updated = [...existing, moment].sort((a, b) => b.year - a.year);
  await setRivalKeyMoments(rivalId, updated);
}

export async function deleteKeyMoment(rivalId: string, year: number, description: string): Promise<void> {
  const existing = await getRivalKeyMoments(rivalId);
  const filtered = existing.filter((m) => !(m.year === year && m.description === description));
  await setRivalKeyMoments(rivalId, filtered);
}
```

Note: D-08 confirms rivalry key moments go to plugin-store in Phase 20. Callers that currently call these sync must be updated to `await` them.

---

### `apps/desktop/src/lib/madden-sync-service.ts` (modify — service, file-I/O)

**Current file:** `apps/desktop/src/lib/madden-sync-service.ts` (lines 1–440 read)

**What changes:**
- Lines 13–14 (`STORAGE_KEY_SAVE_PATH`, `STORAGE_KEY_WATCHER` constants): remove
- Lines 96–118 (`getStoredSavePath`, `storeSavePath`, `clearSavePath`, `isWatcherEnabled`, `setWatcherEnabled`): replace `localStorage` with async `prefs-service` calls

**Replacement pattern** (replaces lines 96–118):
```typescript
import { getMaddenSavePath, setMaddenSavePath as prefSetSavePath, clearMaddenSavePath,
         getMaddenWatcherEnabled, setMaddenWatcherEnabled as prefSetWatcher } from './prefs-service';

export async function getStoredSavePath(): Promise<string | null> {
  return getMaddenSavePath();  // reads from PrefsStore synchronously or plugin-store
}

export async function storeSavePath(path: string): Promise<void> {
  await prefSetSavePath(path);
}

export async function clearSavePath(): Promise<void> {
  await clearMaddenSavePath();
}

export async function isWatcherEnabled(): Promise<boolean> {
  return getMaddenWatcherEnabled();
}

export async function setWatcherEnabled(enabled: boolean): Promise<void> {
  await prefSetWatcher(enabled);
}
```

Note: These functions become async. Callers in `MaddenSyncPage.tsx` must `await` them (planner should include those callsite fixes).

---

### `apps/desktop/src/lib/auto-export-service.ts` (modify — service, file-I/O)

**Current file:** `apps/desktop/src/lib/auto-export-service.ts` (full file, lines 1–35 read)

**What changes:**
- Lines 5–17 (`AUTO_EXPORT_KEY`, `isAutoExportEnabled`, `setAutoExportEnabled`): replace `localStorage` with `prefs-service`

**Replacement pattern** (replaces lines 5–17):
```typescript
import { getAutoExportEnabled, setAutoExportEnabled as prefSetAutoExport } from './prefs-service';

export function isAutoExportEnabled(dynastyId: string): boolean {
  return usePrefsStore.getState().autoExportEnabled[dynastyId] ?? false;
}

export async function setAutoExportEnabled(dynastyId: string, enabled: boolean): Promise<void> {
  await prefSetAutoExport(dynastyId, enabled);
}
```

`autoExportIfEnabled` (lines 19–34) is unchanged — it already uses the sync read via `isAutoExportEnabled`.

---

### `apps/desktop/src-tauri/src/lib.rs` (modify — config, request-response)

**Current file:** `apps/desktop/src-tauri/src/lib.rs` (9 lines, fully read)

**What changes:** Add `AppState`, `call_anthropic` command, `tauri_plugin_store` initialization.

**Full replacement pattern** (replaces current 9-line file):
```rust
use tauri::Manager;
use tauri_plugin_store::StoreExt;
use serde_json::Value;

#[derive(Default)]
pub struct AppState;

#[tauri::command]
async fn call_anthropic(
    app: tauri::AppHandle,
    body: Value,
) -> Result<Value, String> {
    // Read API key from plugin-store (never from frontend)
    let store = app.store("dynasty-os.bin").map_err(|e| e.to_string())?;
    let api_key = store
        .get("anthropic-api-key")
        .and_then(|v| v.as_str().map(|s| s.to_string()))
        .ok_or_else(|| "No API key configured".to_string())?;

    let client = reqwest::Client::new();
    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", &api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json: Value = response.json().await.map_err(|e| e.to_string())?;
    Ok(json)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![call_anthropic])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Plugin chain pattern** (from existing `lib.rs` lines 3–7): new plugins are added in the same `.plugin(...)` chain before `.run()`.

---

### `apps/desktop/src-tauri/Cargo.toml` (modify — config)

**Current file:** `apps/desktop/src-tauri/Cargo.toml` (full file, 22 lines read)

**What changes:** Add `reqwest` and `tauri-plugin-store` to `[dependencies]`.

**Additions to `[dependencies]` block** (after line 22):
```toml
reqwest = { version = "0.12", features = ["json"] }
tauri-plugin-store = "2"
```

**Pattern:** Matches existing dep format at lines 17–22 — crate name with version string and optional features array.

---

### `apps/desktop/src/App.tsx` (modify — component, event-driven)

**Current file:** `apps/desktop/src/App.tsx` (full file, lines 1–162 read)

**What changes:**
- Lines 123–128: replace `localStorage.getItem('dynasty-os-onboarding-pending')` with in-memory module variable (D-09)
- Add `prefs-service.loadAll()` call at startup and `prefs-service.migrateApiKey()` migration guard

**Module variable pattern** (D-09 — replaces lines 123–128):
```typescript
// At module scope (outside component):
let _onboardingPending = false;

// Called from LauncherPage after dynasty creation (replaces localStorage write):
export function signalOnboardingPending() {
  _onboardingPending = true;
}

// In App useEffect (replaces lines 123–128):
useEffect(() => {
  if (!activeDynasty) return;
  if (_onboardingPending) {
    _onboardingPending = false;
    setOnboardingOpen(true);
  }
}, [activeDynasty?.id]);
```

**Startup loadAll pattern** (new useEffect, fired once on mount — mirrors `loadDynasties` in `LauncherPage.tsx` line 31):
```typescript
useEffect(() => {
  // Migrate legacy localStorage key if present
  if (localStorage.getItem('dynasty-os-anthropic-api-key')) {
    void prefs.migrateApiKey();
  }
  // Eagerly load all prefs into PrefsStore
  void prefs.loadAll();
}, []);
```

---

### `apps/desktop/src/pages/DashboardPage.tsx` (modify — component, CRUD)

**Current file:** uses `localStorage.getItem/setItem` for checklist (lines 69–120 area)

**What changes:**
- `CHECKLIST_KEY` constant and all `localStorage.getItem/setItem` for checklist (lines 23, 69–120): replace with `prefs-service` async reads/writes via `usePrefsStore`

**Replacement pattern** (replaces localStorage checklist lines):
```typescript
// Read from PrefsStore synchronously (loadAll() has already populated it)
const [checklist, setChecklist] = useState<Record<string, boolean>>(() => {
  if (!activeSeason) return {};
  return usePrefsStore.getState().checklistState[activeSeason.id] ?? {};
});

// Write via prefs-service (async, fire-and-forget for checklist)
function handleCheck(taskId: string) {
  const next = { ...checklist, [taskId]: !checklist[taskId] };
  setChecklist(next);
  void prefsService.setChecklistState(activeSeason!.id, next);  // async, non-blocking
}
```

---

### `apps/desktop/src/pages/LauncherPage.tsx` (modify — component, event-driven)

**Current file:** line 233 sets `localStorage.setItem('dynasty-os-onboarding-pending', 'true')`

**What changes:** Replace localStorage write with call to the module variable signal from App.tsx.

**Replacement pattern** (replaces line 233):
```typescript
import { signalOnboardingPending } from '../App';

// In CreateDynastyModal success callback (replaces localStorage.setItem call):
signalOnboardingPending();
```

---

### `apps/desktop/src/components/TourOverlay.tsx` (modify — component, event-driven)

**Current file:** `STORAGE_KEY = 'dynasty-os-onboarding-v2'` (line 9); `localStorage.setItem(STORAGE_KEY, 'complete')` (line 150)

**What changes:**
- Remove `STORAGE_KEY` constant (line 9)
- Replace `localStorage.setItem(STORAGE_KEY, 'complete')` (line 150) with `prefs-service` async write
- Load initial tour-complete state from `usePrefsStore.getState().tourComplete`

**Replacement pattern:**
```typescript
// Before (line 9):
const STORAGE_KEY = 'dynasty-os-onboarding-v2';

// After — read from PrefsStore synchronously:
const tourComplete = usePrefsStore.getState().tourComplete;

// Before (line 150):
localStorage.setItem(STORAGE_KEY, 'complete');

// After:
void prefsService.setTourComplete(true);
usePrefsStore.getState().setTourComplete(true);  // keep store in sync immediately
```

---

### `apps/desktop/src/components/OnboardingModal.tsx` (modify — component, event-driven)

**Current file:** `STORAGE_KEY = 'dynasty-os-onboarding-v1'` (line 71); `localStorage.setItem(STORAGE_KEY, 'complete')` (lines 83, 90)

**What changes:** Same pattern as TourOverlay — replace STORAGE_KEY + localStorage calls with PrefsStore read + prefs-service async write.

**Replacement pattern** (same shape as TourOverlay above, keyed to `onboardingComplete` field in PrefsStore).

---

### `apps/desktop/src/components/SetupWizard.tsx` (modify — component, event-driven)

**Current file:** `WIZARD_KEY` at line 8; `localStorage.getItem(WIZARD_KEY)` at line 17; `localStorage.setItem(AUTO_OPEN_ADD_PLAYER_KEY, 'true')` at line 117

**What changes:**
- `WIZARD_KEY` storage + reads/writes: replace with `usePrefsStore.getState().setupWizardState[dynastyId]` reads and `prefs-service.setSetupWizardState(dynastyId, state)` async writes
- `AUTO_OPEN_ADD_PLAYER_KEY` localStorage write (line 117): replace with in-memory module variable (D-09)

**Module variable pattern for auto-open-add-player** (D-09 — shared across SetupWizard, QuickEntryHub, RosterPage):
```typescript
// In a shared module (or exported from QuickEntryHub):
export let autoOpenAddPlayer = false;

export function triggerAutoOpenAddPlayer() {
  autoOpenAddPlayer = true;
}
```

---

### `apps/desktop/src/components/QuickEntryHub.tsx` (modify — component, event-driven)

**Current file:** `AUTO_OPEN_ADD_PLAYER_KEY = 'dynasty-os-auto-open-add-player'` (line 10); `localStorage.setItem` at line 94

**What changes:**
- Remove `AUTO_OPEN_ADD_PLAYER_KEY` constant
- Replace `localStorage.setItem(AUTO_OPEN_ADD_PLAYER_KEY, 'true')` with `triggerAutoOpenAddPlayer()` module variable call

---

### `apps/desktop/src/pages/RosterPage.tsx` (modify — component, event-driven)

**Current file:** reads `AUTO_OPEN_ADD_PLAYER_KEY` from QuickEntryHub (line 13), `localStorage.getItem` at line 65, `localStorage.removeItem` at line 67

**What changes:**
- Replace `localStorage.getItem(AUTO_OPEN_ADD_PLAYER_KEY)` check with `autoOpenAddPlayer` module variable read
- Replace `localStorage.removeItem(AUTO_OPEN_ADD_PLAYER_KEY)` with `autoOpenAddPlayer = false` reset

**Pattern** (replaces lines 65–67):
```typescript
import { autoOpenAddPlayer, triggerAutoOpenAddPlayer } from '../components/QuickEntryHub';

useEffect(() => {
  if (autoOpenAddPlayer) {
    autoOpenAddPlayer = false;  // reset immediately
    setAddPlayerOpen(true);
  }
}, []);
```

---

### `apps/desktop/src/pages/SeasonRecapPage.tsx` (modify — component, request-response)

**Current file:** imports `getApiKey, setApiKey` from `legacy-card-service` (line 6); local API key state (lines 63–106 area)

**What changes:**
- Remove `getApiKey, setApiKey` imports (line 6)
- Replace `Boolean(getApiKey())` init (line 64) with `usePrefsStore((s) => s.hasApiKey)`
- Replace `setApiKey(trimmed)` (line 103) with `await prefs.setApiKey(trimmed)` (async)
- The API key input form now drives `prefs-service.setApiKey()` instead of `setApiKey()`

**Pattern** (replaces lines 63–106 API key management):
```typescript
import { usePrefsStore } from '../store/prefs-store';
import * as prefs from '../lib/prefs-service';

// In component:
const hasApiKey = usePrefsStore((s) => s.hasApiKey);

// In save handler (was sync, now async):
async function handleSaveKey() {
  const trimmed = apiKeyInput.trim();
  if (!trimmed) return;
  setApiKeySaving(true);
  await prefs.setApiKey(trimmed);
  setApiKeyInput('');
  setApiKeySaving(false);
}
```

---

### `apps/desktop/src/pages/PlayerProfilePage.tsx` (modify — component, request-response)

**What changes:** Same `getApiKey/setApiKey` removal as SeasonRecapPage. Replace with `usePrefsStore((s) => s.hasApiKey)` reads and `prefs.setApiKey()` async writes.

**Pattern:** Identical to SeasonRecapPage replacement above.

---

### `apps/desktop/src/pages/ScreenshotIngestionPage.tsx` (modify — component, request-response)

**Current file:** imports `getApiKey, setApiKey` (line 7); `getApiKey()` calls at lines 87, 128, 378, 380

**What changes:**
- Remove `getApiKey, setApiKey` imports
- Replace `getApiKey()` boolean guards with `usePrefsStore.getState().hasApiKey`
- Replace `setApiKey(enteredKey.trim())` (line 827) with `await prefs.setApiKey(enteredKey.trim())`

**Pattern:** same as SeasonRecapPage/PlayerProfilePage replacement pattern above.

---

## Shared Patterns

### Zustand Store Creation
**Source:** `apps/desktop/src/store/dynasty-store.ts` (lines 38–121) and `apps/desktop/src/store/season-store.ts` (lines 27–87)
**Apply to:** `prefs-store.ts`
```typescript
// Typed State + Actions split, then merged in create<>()
export const usePrefsStore = create<PrefsState & PrefsActions>((set, get) => ({
  // state fields...
  // action methods that call set()...
}));
```

### Eager Store Loading at App Startup
**Source:** `apps/desktop/src/pages/LauncherPage.tsx` line 31, `apps/desktop/src/store/dynasty-store.ts` `loadDynasties` action
**Apply to:** `App.tsx` startup (call `prefs.loadAll()`)
```typescript
useEffect(() => {
  void prefs.loadAll();
}, []);
```

### Fire-and-Forget Async Pattern
**Source:** `apps/desktop/src/lib/auto-export-service.ts` lines 20–34; `apps/desktop/src/store/dynasty-store.ts` line 60
**Apply to:** `ai-bridge.ts`, all AI service call sites
```typescript
autoExportIfEnabled(dynasty.id, dynasty.name); // fire-and-forget — never awaited
// Same pattern for AI calls:
generateLegacyBlurb(cardData, teamName).catch(() => {}); // never blocks saves
```

### Tauri Plugin Registration
**Source:** `apps/desktop/src-tauri/src/lib.rs` lines 3–7 (existing plugin chain)
**Apply to:** `lib.rs` modification
```rust
tauri::Builder::default()
    .plugin(tauri_plugin_store::Builder::default().build())  // new
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_shell::init())
    .invoke_handler(tauri::generate_handler![call_anthropic])  // new
```

### Never-Throws Service Pattern
**Source:** `apps/desktop/src/lib/legacy-card-service.ts` lines 84–158; `apps/desktop/src/lib/narrative-service.ts` lines 383–413
**Apply to:** `ai-bridge.ts`, all AI service functions
```typescript
// Pattern: return null, never throw; console.warn for diagnostics
try {
  // ... async work
} catch (err) {
  console.warn('[ServiceName] operation failed:', err);
  return null;
}
```

### Capabilities File Permission Entry
**Source:** `apps/desktop/src-tauri/capabilities/default.json` (full file, 21 lines read)
**Apply to:** `default.json` when adding store capability
```json
// Add to "permissions" array if tauri-plugin-store requires it:
"store:allow-load",
"store:allow-get",
"store:allow-set",
"store:allow-delete"
```
Note: tauri-plugin-store v2 may auto-allow these with `core:default` — verify during implementation. The existing pattern is to enumerate each `plugin:allow-action` explicitly (lines 7–21).

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| None | — | — | All files have clear analogs in the codebase |

Note: `ai-bridge.ts` and `prefs-service.ts` are new with no direct codebase analog, but their patterns are synthesized from strong existing analogs (`narrative-service.ts` callClaudeApi helper and `auto-export-service.ts` Tauri plugin usage respectively).

---

## Metadata

**Analog search scope:** `apps/desktop/src/lib/`, `apps/desktop/src/store/`, `apps/desktop/src/pages/`, `apps/desktop/src/components/`, `apps/desktop/src-tauri/`
**Files read:** 22 source files
**Pattern extraction date:** 2026-05-03
