# Stack Research

**Domain:** Desktop app feature additions — Tauri 2 + React 18 + Zustand + Dexie
**Researched:** 2026-02-24
**Confidence:** MEDIUM-HIGH (all libs verified via npm/GitHub/official docs; bundle sizes estimated from available data)

---

## Context: What Already Exists

The v1 stack (Tauri 2.x, React 18, TypeScript, Tailwind 3, Vite 6, Zustand 5, Dexie, html-to-image, Anthropic SDK, tauri-plugin-shell/dialog/fs/notification) is **not re-researched here**. This document covers only what v2.0's 33 new features require **in addition to** the existing stack.

---

## New Stack Additions Required

### Tier 1 — Mandatory New Packages (fill genuine capability gaps)

| Library | Version | Purpose | Why This One |
|---------|---------|---------|--------------|
| `cmdk` | `^1.1.1` | Cmd+K command palette component | Unstyled, headless, React 18 `useSyncExternalStore`, ~6KB gzip; used by shadcn/ui; fuzzy search built-in; no Fuse.js dependency |
| `sonner` | `^2.0.7` | App-wide toast notification system | 2-3KB gzip, opinionated but clean API, React 18+, stacking/queuing built-in, Tailwind-compatible; replaces need for custom toast |
| `zundo` | `^2.3.0` | Last-action undo via Zustand temporal middleware | <700B, wraps existing Zustand store with `temporal` — no new state architecture needed; pause/resume tracking for batch ops |
| `papaparse` | `^5.5.3` | CSV export from any data table | 0 dependencies, browser-only, 46KB minified/13KB gzip, `unparse()` converts JSON→CSV; do not use react-papaparse wrapper (stale, last published 2 years ago) |

### Tier 2 — Tauri Plugin Additions (Rust + JS)

| Plugin | Version | Purpose | Notes |
|--------|---------|---------|-------|
| `@tauri-apps/plugin-global-shortcut` | `^2` | Register Ctrl+K system-wide shortcut to open command palette | Official Tauri v2 plugin; `CommandOrControl+K` fires when app is focused — use in-WebView `keydown` listener for in-focus, plugin for system-wide |

> **Decision note on Global Shortcut vs in-WebView listener:** For Cmd+K command palette, an in-WebView `keydown` event listener (`document.addEventListener('keydown', ...)`) is sufficient when the app window is focused and avoids the Rust plugin overhead. Use `tauri-plugin-global-shortcut` only if the palette needs to open from outside the app (unlikely for this use case). **Recommendation: in-WebView listener only. Do not add the Rust plugin.**

### Tier 3 — Build With Existing Stack (no new packages)

These v2.0 features can be built entirely with the existing stack:

| Feature | How to Build It | Existing Capability Used |
|---------|----------------|--------------------------|
| Toast notification system | `sonner` (Tier 1 above) | — |
| Season timeline scrubber | Custom `<input type="range">` + Tailwind | Native HTML5, zero deps |
| Persistent filters | Zustand slice with `persist` middleware (already used) | Zustand persisted store |
| Auto-suggest season year | Query Dexie for max season year + 1 | Dexie query |
| Recent opponents in Log Game | Dexie query last N unique opponent names | Dexie query |
| Inline player notes | Add `notes: string` field to existing player Dexie schema | Dexie schema migration |
| Season checklist | Zustand persisted slice + Tailwind checklist UI | Zustand + Tailwind |
| Auto-sync/live data export | `tauri-plugin-fs` write hook triggered on Dexie `onWrite` | tauri-plugin-fs (exists) |
| Living Chronicle | Existing Anthropic SDK + Dexie cache pattern | Anthropic SDK (exists) |
| Hot Seat/Pressure Meter | Derived computation in Zustand selector | Zustand selector |
| What If Engine | Existing Anthropic SDK (Sonnet) prompt engineering | Anthropic SDK (exists) |
| Opponent Intelligence Dossiers | Existing Anthropic SDK + existing game log data | Anthropic SDK (exists) |
| Generational Player Arcs | Existing Anthropic SDK + existing player career data | Anthropic SDK (exists) |
| Rival Prophecy | Existing Anthropic SDK + existing rivalry data | Anthropic SDK (exists) |
| The Obituary Room | Existing Anthropic SDK prompt | Anthropic SDK (exists) |
| The Journalist | Existing Anthropic SDK prompt trigger | Anthropic SDK (exists) |
| Cross-Dynasty Intelligence | Existing Anthropic SDK + multi-dynasty Dexie query | Anthropic SDK + Dexie |
| DNA Report | Existing Anthropic SDK prompt engineering | Anthropic SDK (exists) |
| NIL budget ledger | New Dexie table + existing UI patterns | Dexie schema migration |
| Trade value calculator | Derived computation, existing player/contract data | Dexie query + UI |
| Coaching staff lifecycle | New Dexie table + existing UI patterns | Dexie schema migration |
| CFB-to-Madden continuity | New Dexie relation field on player records | Dexie schema migration |
| Historical season record book | Dexie aggregate query + existing UI patterns | Dexie query |
| Rivalry dashboard expansion | Extend existing RIVL tables in Dexie | Dexie (exists) |
| Future schedule builder | New Dexie table + existing UI patterns | Dexie schema migration |
| Recruiting class grade comparison | Dexie query + existing UI patterns | Dexie (exists) |

### Tier 4 — Conditionally Add (evaluate before building)

| Library | Version | Purpose | Add If |
|---------|---------|---------|--------|
| `recharts` | `^3.7.0` | Momentum Heat Map visualization | Already has recharts? If not, evaluate chart approach first. **Alternative:** Custom CSS grid with Tailwind color interpolation is sufficient for a season-week × metric heat map (no library needed if data matrix is small, e.g. 17 weeks × 5 metrics). |

> **Heat Map recommendation:** Build the Momentum Heat Map as a custom CSS grid component first. A 17×5 cell grid with Tailwind `bg-opacity` interpolation requires zero new dependencies. Add recharts only if the team needs line/bar charts elsewhere in v2.0 and wants one chart library for all needs.

| Library | Version | Purpose | Add If |
|---------|---------|---------|--------|
| `@g-loot/react-tournament-brackets` | `^1.0.31` | Playoff bracket UI | **Do not use** — last published 2 years ago, 0 dependents. Build custom SVG/CSS bracket instead (4-team, 8-team, 16-team CFB playoff). Bracket layout is ~100 lines of React + Tailwind flex. |

---

## Text-to-Speech: Broadcast Booth / Audio Mode

**Decision: Use Web Speech API (`window.speechSynthesis`) — no new library or plugin.**

Rationale:
- Windows (Tauri's v1 target platform) uses **WebView2** (Chromium-based). `window.speechSynthesis` is confirmed functional on Windows/WebView2. (Source: Tauri GitHub discussion #8784, confirmed 2025.)
- `tauri-plugin-tts` (brenogonzaga) is Tauri 2.x compatible but was created December 2025 with only 2 commits and 7 stars. **Too immature for production use at v2.0 launch.**
- `window.speechSynthesis.getVoices()` provides Windows SAPI voices (includes Microsoft Neural voices on Win10/11). Adequate for "broadcast booth" narration fragments.
- API: `speechSynthesis.speak(new SpeechSynthesisUtterance(text))` — no install, no bundle cost.

**Caveat:** macOS/Linux TTS varies. Since Dynasty OS v1 targets Windows-only, this is not a concern for v2.0. Flag for v2.1 when macOS ships.

---

## Alternatives Considered

| Our Choice | Alternative | Why Not |
|------------|-------------|---------|
| `cmdk` for command palette | `kbar` (0.1.0-beta.48) | kbar is still in beta after 3+ years, uses Fuse.js dependency, heavier; cmdk is stable at 1.1.1 and is the shadcn/ui standard |
| `cmdk` | `react-cmdk` | react-cmdk last published 3 years ago; abandoned |
| `sonner` for toasts | `react-hot-toast` | Both are viable (react-hot-toast is 3.5KB gzip vs sonner's ~2-3KB); sonner has cleaner stacking behavior and is the current shadcn/ui default for 2025 |
| `sonner` | `react-toastify` | react-toastify is ~7KB, older API, heavier |
| `zundo` for undo | `zustand-travel` (mutativejs) | zustand-travel uses JSON Patch diffing (more powerful but overkill for single-level undo); zundo at <700B is exact fit for "single-level undo" requirement |
| `papaparse` (direct) | `react-papaparse` wrapper | react-papaparse last published 2 years ago; papaparse itself is maintained (v5.5.3, May 2025); use it directly |
| CSS grid heat map | `react-heatmap-grid` | react-heatmap-grid v0.9.1, marginal activity; custom grid avoids a dep with no clear advantage |
| Custom bracket UI | `@g-loot/react-tournament-brackets` | Unmaintained (2 years, 0 dependents); custom flex layout is trivial for fixed bracket sizes |
| Web Speech API | `tauri-plugin-tts` | Plugin created Dec 2025, 2 commits, pre-v1.0; not stable enough for production |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `react-papaparse` | Wrapper around papaparse, last publish 2+ years ago, adds no value | `papaparse` directly |
| `@g-loot/react-tournament-brackets` | 2 years stale, 0 npm dependents | Custom React/Tailwind bracket component |
| `kbar` | Still in beta (0.1.0-beta), Fuse.js dep, heavier than cmdk | `cmdk` |
| `react-cmdk` | Abandoned 3 years ago | `cmdk` |
| `recharts` (speculatively) | 300KB+ package; only needed if building 3+ chart types in v2.0 | Custom CSS grid for heat map; add recharts only if proven needed |
| `tauri-plugin-tts` | 2 commits, created Dec 2025, pre-production quality | `window.speechSynthesis` (Web Speech API, free, no install) |
| `tauri-plugin-global-shortcut` (Rust) | Overkill for in-app palette; requires Cargo.toml + lib.rs changes | In-WebView `keydown` event listener |
| Any animation library (Framer Motion, etc.) | Not required for any v2.0 feature; Tailwind transitions cover all UI needs | Tailwind CSS transitions |
| Any date library (date-fns, dayjs) | Season years are integers, not timestamps; no calendar needed | Native `Date` / `Intl` or integer math |

---

## Installation

```bash
# In apps/desktop (run from repo root with pnpm)
pnpm --filter @dynasty-os/desktop add cmdk sonner zundo papaparse
```

No Rust/Cargo additions required for Tier 1-3 features.

If global shortcut is explicitly needed later:
```bash
pnpm --filter @dynasty-os/desktop add @tauri-apps/plugin-global-shortcut
# Then add to apps/desktop/src-tauri/Cargo.toml:
# tauri-plugin-global-shortcut = "2"
# And register in lib.rs: .plugin(tauri_plugin_global_shortcut::Builder::new().build())
```

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `cmdk@1.1.1` | React 18+, Zustand 5 | Uses `useSyncExternalStore` (React 18 required). Breaking change from v0.x: `Command.List` is now mandatory; `value` prop is case-sensitive. |
| `sonner@2.0.7` | React 18+, Tailwind 3 | Works with `csp: null` in tauri.conf.json (no CSP conflicts). Toaster renders in React root — place in `App.tsx`. |
| `zundo@2.3.0` | Zustand 5.x | Zustand v4.2.0+ or v5 required for TypeScript. Use `temporal` middleware (v1 used `undoMiddleware` — renamed in v2). |
| `papaparse@5.5.3` | TypeScript (via `@types/papaparse`) | Install `@types/papaparse` as dev dep. `Papa.unparse(jsonArray)` returns CSV string; trigger download via `URL.createObjectURL(new Blob([csv]))`. |
| `window.speechSynthesis` | Windows WebView2 (Tauri 2) | Confirmed working on Windows. macOS: works. Linux: requires webkitgtk rebuild (not in v2.0 scope). |

---

## Tauri Security Model Notes

The existing `tauri.conf.json` has `"csp": null` — CSP is disabled. None of the Tier 1 additions conflict with Tauri's WebView security model:

- `cmdk`, `sonner`, `zundo` are pure React components with no external fetches.
- `papaparse` runs entirely in-memory; CSV download uses `Blob` + `URL.createObjectURL` — compatible with Tauri's file system model without requiring `tauri-plugin-fs`.
- `window.speechSynthesis` uses OS SAPI directly via WebView2 — no network call.
- All AI features (Living Chronicle, What If Engine, etc.) use the existing Anthropic SDK pattern, which already works within the current CSP-null config.

---

## Stack Patterns by Feature Group

**For all AI Intelligence Layer features (Living Chronicle, What If Engine, Hot Seat, etc.):**
- No new packages needed
- Pattern: Anthropic SDK call → store result in Dexie with `generatedAt` timestamp → Zustand derived state reads from cache
- Gate every generation behind explicit user trigger or debounced auto-trigger with `>= 30s` cooldown
- Use `claude-haiku-3-5` for speed (blurbs, pressure index), `claude-sonnet-4-5` for long narratives (What If, DNA Report)

**For CSV export:**
- `papaparse.unparse(rows)` → `Blob` → `URL.createObjectURL` → anchor click
- No Tauri file dialog required for download; browser download behavior works in WebView2
- Optional: use `tauri-plugin-dialog` for save-as path (already installed)

**For Undo (zundo):**
- Wrap only the stores that need undo: `game-log-store`, `player-store`, `stat-store`
- Use `temporal.pause()` / `temporal.resume()` around batch operations (e.g., Madden sync) to avoid cluttering undo history
- Single level: call `temporal.undo()` once; do not expose multi-step undo in UI

**For Command Palette (cmdk):**
- Render `<Command>` in a modal overlay controlled by Zustand `ui-store.commandPaletteOpen`
- Register `document.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') ... })` in `App.tsx` `useEffect`
- Actions feed into cmdk from a centralized `command-registry.ts` that pulls from navigation routes + contextual actions

---

## Sources

- `cmdk` GitHub (pacocoursey/cmdk) — version 1.1.1, React 18 required, breaking changes from v0.x confirmed
- `sonner` npm — version 2.0.7, 2762 dependents, ~2-3KB gzip
- `zundo` GitHub (charkour/zundo) — version 2.3.0, <700B, Zustand v5 compatible
- `papaparse` npm — version 5.5.3 (May 2025), 0 dependencies, 2489 npm dependents
- `kbar` npm — version 0.1.0-beta.48, confirmed still beta as of Jan 2025
- Tauri GitHub Discussion #8784 — Web Speech API on Linux (confirms Windows WebView2 works)
- Tauri GitHub Discussion #13460 — Web Speech API (additional confirmation)
- `tauri-plugin-tts` GitHub (brenogonzaga) — created Dec 2025, 2 commits, 7 stars, pre-production
- `@tauri-apps/plugin-global-shortcut` official Tauri v2 docs — confirmed `CommandOrControl+K` registration pattern
- `@g-loot/react-tournament-brackets` npm — version 1.0.31-rc, last published 2 years ago, 0 dependents
- `recharts` npm — version 3.7.0 (latest Jan 2026), confirmed SVG-only rendering
- Tauri v2 official plugin list — no official TTS plugin exists
- LogRocket "React toast libraries compared 2025" — sonner vs react-hot-toast comparison
- LogRocket "Best React chart libraries 2025" — recharts vs alternatives

---

*Stack research for: Dynasty OS v2.0 feature additions*
*Researched: 2026-02-24*
