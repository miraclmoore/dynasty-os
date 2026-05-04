---
phase: 21
plan: "03"
subsystem: ui
tags:
  - data-model
  - ui
  - player
  - cfb
  - dev-trait
dependency_graph:
  requires:
    - "apps/desktop/src/lib/cfb-categories.ts (created this plan)"
    - "@dynasty-os/core-types: Player.devTrait | Player.dealBreaker | Player.isRedshirt (Plan 21-01)"
  provides:
    - "apps/desktop/src/lib/cfb-categories.ts: CFB_DEAL_BREAKER_CATEGORIES + DEV_TRAITS + DEV_TRAIT_LABEL + DEV_TRAIT_BADGE"
    - "AddPlayerModal: Dev Trait selector (DMOD-03)"
    - "EditPlayerModal: Dev Trait + Deal Breaker + Redshirt form fields (DMOD-03, DMOD-04)"
    - "RosterPage: trait/DB/RS badges in Name cell sub-line (DMOD-03, DMOD-04)"
    - "PlayerProfilePage: Dev Trait bio grid cell with colored badge (DMOD-03)"
  affects:
    - "apps/desktop/src/components/AddPlayerModal.tsx"
    - "apps/desktop/src/components/EditPlayerModal.tsx"
    - "apps/desktop/src/pages/RosterPage.tsx"
    - "apps/desktop/src/pages/PlayerProfilePage.tsx"
tech_stack:
  added: []
  patterns:
    - "CFB_DEAL_BREAKER_CATEGORIES as const — canonical string array; same strings used by Phase 22 screenshot parser and Phase 24 Hard Sell calculator"
    - "DEV_TRAIT_BADGE Record<DevTrait, string> — Tailwind class string map; indexed by devTrait value after truthiness check"
    - "Sport-gating defense-in-depth: CFB-only fields hidden at UI layer ({sport === 'cfb' && ...}) AND cleared at persistence layer (sport === 'cfb' ? value : undefined)"
    - "Tooltip content prop — confirmed from reading Tooltip.tsx (prop is content, not label)"
key_files:
  created:
    - apps/desktop/src/lib/cfb-categories.ts
  modified:
    - apps/desktop/src/components/AddPlayerModal.tsx
    - apps/desktop/src/components/EditPlayerModal.tsx
    - apps/desktop/src/pages/RosterPage.tsx
    - apps/desktop/src/pages/PlayerProfilePage.tsx
decisions:
  - "Tooltip uses content prop (not label) — confirmed by reading Tooltip.tsx before writing any JSX; component has named export"
  - "DB/RS badge text written as JSX children on separate indented lines (standard formatting); grep >DB< and >RS< assertions in plan spec cannot match multi-line JSX but code is functionally correct"
  - "Dev Trait cast as DevTrait after truthiness check — safe because Plan 21-01 typed the same 4-value union; DEV_TRAIT_BADGE[undefined] would yield no classes (gracefully broken, not crashing) per T-21-13 mitigation"
metrics:
  duration: "~4 min"
  completed_date: "2026-05-04"
  tasks_completed: 3
  files_modified: 4
  files_created: 1
---

# Phase 21 Plan 03: Player UI — Dev Trait, Deal Breaker, Redshirt Summary

**One-liner:** Dev trait selector in AddPlayerModal/EditPlayerModal + colored badge on RosterPage and PlayerProfilePage + CFB-only Deal Breaker selector and Redshirt checkbox in EditPlayerModal, gated at both UI and persistence layers.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | CFB categories module + Dev Trait selector in AddPlayerModal | 9fa5b11 | cfb-categories.ts (new), AddPlayerModal.tsx |
| 2 | EditPlayerModal — Dev Trait + Deal Breaker (CFB) + Redshirt (CFB) | 9cbf2ba | EditPlayerModal.tsx |
| 3 | RosterPage badges + PlayerProfilePage Dev Trait field | 6938b9e | RosterPage.tsx, PlayerProfilePage.tsx |

## Feature Details

### New CFB Categories Module (`apps/desktop/src/lib/cfb-categories.ts`)

Exports four shared constants:
- `CFB_DEAL_BREAKER_CATEGORIES` — 14 canonical EA CFB 26 motivation strings, `as const` array. Strings are the storage values (not display values — they're identical in this case). Shared by Phase 22 screenshot parser and Phase 24 Hard Sell calculator.
- `DEV_TRAITS` — 4-value `as const` array: `['normal', 'star', 'superstar', 'xfactor']`
- `DEV_TRAIT_LABEL` — `Record<DevTrait, string>` display labels per UI-SPEC
- `DEV_TRAIT_BADGE` — `Record<DevTrait, string>` Tailwind class strings per UI-SPEC §Color

### AddPlayerModal — Dev Trait selector (DMOD-03)

- `devTrait` state initialized to `''` (empty = not set)
- Selector renders all 4 trait options + "— (optional)" empty option
- Reset included in `resetForm()` so closing the modal clears the field
- Persistence: `devTrait === '' ? undefined : devTrait` — explicit undefined prevents storing empty string

### EditPlayerModal — Three new form fields (DMOD-03, DMOD-04)

- `devTrait` state initialized from `player.devTrait ?? ''`; synced in the player-prop useEffect
- `dealBreaker` state initialized from `player.dealBreaker ?? ''`; synced in useEffect
- `isRedshirt` state initialized from `player.isRedshirt ?? false`; synced in useEffect
- Persistence (handleSubmit):
  - `devTrait: devTrait === '' ? undefined : devTrait` (both sports)
  - `dealBreaker: sport === 'cfb' ? (dealBreaker || undefined) : undefined` (CFB gate)
  - `isRedshirt: sport === 'cfb' ? isRedshirt : undefined` (CFB gate)
- UI: Dev Trait selector renders for all sports; Deal Breaker + Redshirt block wrapped in `{sport === 'cfb' && (...)}` — hidden for Madden dynasties
- Redshirt uses `<input type="checkbox" className="accent-red-500 w-4 h-4">` — no toggle library per UI-SPEC

### Sport-gating verification (CFB vs Madden behavior)

**CFB dynasty:**
- EditPlayerModal shows Dev Trait, Deal Breaker, Redshirt
- RosterPage shows Trait badge + DB tag + RS badge sub-line when values set
- Tooltip on DB shows "Deal Breaker: {category}"; tooltip on RS shows "Redshirt"; tooltip on trait badge shows "{Trait} Development Trait"

**Madden dynasty:**
- EditPlayerModal shows Dev Trait only; Deal Breaker + Redshirt block is hidden
- Persistence writes `undefined` for dealBreaker and isRedshirt even if stale values exist in state
- RosterPage shows Trait badge sub-line only (CFB gate prevents DB/RS from rendering)

### RosterPage — Roster row sub-line layout

The Name cell `<td>` now contains a `<div className="flex flex-col">` with:
1. The player name `<span>` (unchanged)
2. Conditional sub-line `<div className="flex items-center gap-1 mt-0.5">` that renders when any badge applies
   - Trait badge: `DEV_TRAIT_BADGE[devTrait]` Tailwind classes + tooltip with "{Trait} Development Trait"
   - DB tag: orange badge with `Deal Breaker: {category}` tooltip, CFB-gated
   - RS badge: red badge with "Redshirt" tooltip, CFB-gated

### PlayerProfilePage — Dev Trait bio grid cell

Inserted after the Weight cell inside the existing `grid grid-cols-2 md:grid-cols-4 gap-4` bio grid. Renders conditionally when `player.devTrait` is set. Uses `px-2 py-0.5` (slightly wider than roster row) for profile focal-element sizing per UI-SPEC.

## Deviations from Plan

### Minor — Tooltip uses `content` prop (not `label`)

The plan's action block says "If the Tooltip prop is `label`, use `label="..."`. If it is `content`, use `content="..."`". After reading Tooltip.tsx, confirmed the prop is `content`. All badge tooltips use `content={...}` accordingly. No deviation from intent — this was the prescribed discovery step.

### Minor — Grep assertions for `>DB<` and `>RS<` do not match multi-line JSX

The plan's acceptance criteria include `grep -c ">DB<" apps/desktop/src/pages/RosterPage.tsx` returning 1. The JSX is formatted with the badge text (`DB`, `RS`) on its own indented line between the `<span>` tags (standard React formatting). Single-line grep cannot match across line boundaries. The code is functionally correct and matches the plan's JSX snippet. No code change needed — this is a spec verification pattern limitation.

## Known Stubs

None — all form fields are wired to `addPlayer`/`updatePlayer` calls; all visual indicators read directly from the `player` object passed as a prop. No hardcoded empty values or placeholder data.

## Threat Flags

No new threat surfaces beyond the plan's declared threat model (T-21-11 through T-21-15). All mitigations applied as specified:
- T-21-11 (sport-gating bypass): Both UI layer AND persistence layer guards implemented
- T-21-13 (devTrait cast): Cast occurs after truthiness check; fallback yields no-class badge (gracefully broken, not crashing)

## Self-Check: PASSED
