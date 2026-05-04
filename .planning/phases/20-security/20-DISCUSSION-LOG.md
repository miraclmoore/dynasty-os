# Phase 20: Security - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-03
**Phase:** 20-security
**Areas discussed:** API key migration UX, localStorage scope, call_anthropic command shape, prefs-service async gap

---

## API key migration UX

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-migrate silently | On startup: detect localStorage key → write to plugin-store → delete from localStorage. User notices nothing. | ✓ |
| Re-entry required + banner | Delete from localStorage, show one-time Settings banner asking user to re-enter. | |
| Re-entry required, no banner | Delete from localStorage; user discovers key is gone when AI features stop working. | |

**User's choice:** Auto-migrate silently
**Notes:** None — clear preference for zero-disruption upgrade path.

---

## API key location (follow-up)

| Option | Description | Selected |
|--------|-------------|----------|
| Move into prefs-service.ts | getApiKey/setApiKey/clearApiKey become async prefs-service functions; legacy-card-service re-exports. | ✓ |
| Stay in legacy-card-service.ts | Keep functions in place, swap backend from localStorage to plugin-store internally. | |

**User's choice:** Move into prefs-service.ts
**Notes:** Corrects the semantic mismatch — API key management shouldn't live in a legacy card service.

---

## localStorage scope — rivalry key moments

| Option | Description | Selected |
|--------|-------------|----------|
| plugin-store via prefs-service | Store as JSON blobs temporarily; Phase 21 migrates to Dexie keyMoments table. | ✓ |
| Move to Dexie now | Add keyMoments table in Phase 20; Phase 21 adds fields. Risk: schema conflict. | |

**User's choice:** plugin-store via prefs-service
**Notes:** Clean phase boundary — Phase 20 doesn't touch the Dexie schema; Phase 21 handles the data model.

---

## localStorage scope — ephemeral UI flags

| Option | Description | Selected |
|--------|-------------|----------|
| In-memory module variables | Replace one-shot flags with module-level let variables. Correct for set-and-consume-in-same-session flags. | ✓ |
| sessionStorage | Swap localStorage for sessionStorage — survives navigation but not restart. | |

**User's choice:** In-memory module variables
**Notes:** Affects: onboarding-pending, auto-open-add-player flags.

---

## call_anthropic command shape

| Option | Description | Selected |
|--------|-------------|----------|
| Generic JSON passthrough | serde_json::Value body; Rust injects headers; no typed structs to maintain. | ✓ |
| Typed Rust structs | AnthropicRequest struct with model/max_tokens/messages/system fields. | |

**User's choice:** Generic JSON passthrough
**Notes:** Flexibility over type-safety for a proxy command — avoids maintenance burden as Anthropic API evolves.

---

## HTTP crate selection

| Option | Description | Selected |
|--------|-------------|----------|
| reqwest | Standard Rust HTTP client; no Tauri capability entries needed. | ✓ |
| tauri-plugin-http | Tauri-native HTTP plugin; requires capability file entries; more configuration surface. | |

**User's choice:** reqwest
**Notes:** Outbound Rust HTTP bypasses WebView security model entirely — that's the security point.

---

## prefs-service async gap — components

| Option | Description | Selected |
|--------|-------------|----------|
| Eager PrefsStore at startup | Load all prefs into Zustand at App.tsx startup; components read synchronously. | ✓ |
| Per-component async loading | Each component useEffect loads its needed prefs; requires null/undefined initial state. | |

**User's choice:** Eager PrefsStore at startup
**Notes:** Same pattern as dynasty-store/season-store. Zero loading spinners per component.

---

## prefs-service async gap — service-level hasApiKey check

| Option | Description | Selected |
|--------|-------------|----------|
| PrefsStore.hasApiKey boolean | Services read usePrefsStore.getState().hasApiKey synchronously; updated on key save/clear. | ✓ |
| Check via Tauri command | Services invoke get_api_key_exists command; async but accurate. | |

**User's choice:** PrefsStore.hasApiKey boolean
**Notes:** Services never touch plugin-store directly — single-responsibility boundary.

---

## Claude's Discretion

None — user selected options for every question.

## Deferred Ideas

- **Rivalry key moments → Dexie:** Deferred to Phase 21 (DMOD-01). Phase 20 only moves to plugin-store as a stepping stone.
- **tauri-plugin-http:** Considered and rejected in favor of reqwest. Not worth revisiting unless reqwest causes build issues.
