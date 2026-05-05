---
phase: 24-recruiting-tools
plan: "04"
subsystem: draft-tracker
tags: [draft, player-status, combobox, side-effect, TOOL-04]
requirements: [TOOL-04]

dependency_graph:
  requires: []
  provides:
    - "createDraftPick player-status side effect (TOOL-04)"
    - "Searchable player combobox on DraftTrackerPage"
  affects:
    - "apps/desktop/src/lib/draft-service.ts"
    - "apps/desktop/src/pages/DraftTrackerPage.tsx"

tech_stack:
  added: []
  patterns:
    - "Phase-22 combobox pattern (onMouseDown + 150ms onBlur)"
    - "Dexie players.update partial record write"
    - "filteredPlayers derived value (in-memory filter, no Dexie query)"

key_files:
  modified:
    - apps/desktop/src/lib/draft-service.ts
    - apps/desktop/src/pages/DraftTrackerPage.tsx
  created: []

decisions:
  - "status: 'drafted' is a hard-coded literal — not user-supplied — so no injection path exists through createDraftPick"
  - "playerSearch/playerDropdownOpen held as local useState (not form state) — combobox state is transient UI, not form data"
  - "filteredPlayers computed as plain derived value (not useMemo) — players array is already in memory; memoization overhead is not justified for this use case"
  - "aria-expanded + aria-controls added to combobox input for semantic accessibility (ARIA combobox pattern)"
  - "Amber border when playerDropdownOpen=true provides visual affordance that the field is active"
  - "onBlur clears playerId when playerSearch is empty — ensures clearing the text field un-links the player"

metrics:
  duration: "~6 min"
  completed_date: "2026-05-05"
  tasks: 2
  files_modified: 2
---

# Phase 24 Plan 04: Draft Pick Player-Status Side Effect + Searchable Combobox Summary

**One-liner:** Wire TOOL-04 side effect (draft pick marks player as 'drafted') and replace the player-link `<select>` with a Phase-22-style searchable combobox for large roster usability.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add player-status side effect to createDraftPick | e2f6213 | apps/desktop/src/lib/draft-service.ts |
| 2 | Replace player-link select with searchable combobox | 342f9a5 | apps/desktop/src/pages/DraftTrackerPage.tsx |

## Implementation Details

### Task 1 — draft-service.ts

**Insertion point:** Immediately after `await db.draftPicks.add(pick);` at line 16, before `return pick;` at line 17 (original file). The inserted block occupies lines 17–25 in the modified file.

The `now` variable (declared at line 8 as `const now = Date.now()`) is reused — no redeclaration. `db` is already imported from `@dynasty-os/db`. `db.players.update()` accepts a `Partial<Player>` literal; no `Player` type import is required.

**Behavior:** If `pick.playerId` is a non-empty string, calls `db.players.update(pick.playerId, { status: 'drafted', updatedAt: now })`. If `pick.playerId` is undefined, null, or empty string, the block is skipped entirely. Per Dexie docs, `update()` on a missing key returns 0 affected rows silently — no exception propagates (T-24-04-04 accepted risk).

### Task 2 — DraftTrackerPage.tsx

**Form state variable source:** `players` array comes from `usePlayerStore()` → `loadPlayers(activeDynasty.id)` called on mount. The `handlePlayerSelect(playerId)` function was preserved unchanged — it looks up the player from `players` and updates `form.playerName`, `form.position`, and `form.playerId`.

**New state:**
- `playerSearch` — controlled text input value (empty string = no filter)
- `playerDropdownOpen` — boolean gate for `<ul>` render

**New derived value:**
- `filteredPlayers` — plain constant (not `useMemo`); recomputed each render from `players.filter()`. Shows empty array when `playerSearch.trim().length < 1`.

**Combobox specifics:**
- `onMouseDown` on `<li>` items fires before `onBlur` on the input (WebView event ordering constraint, established in Phase 22)
- `setTimeout(() => setPlayerDropdownOpen(false), 150)` in `onBlur` gives WebView time to process `onMouseDown`
- `aria-expanded`, `aria-controls`, `aria-autocomplete="list"` added for semantic accessibility
- Amber border applied when `playerDropdownOpen === true` (visual affordance)
- Form submit handler resets `playerSearch` to `''` and closes `playerDropdownOpen`
- `onBlur` additionally clears `form.playerId` when `playerSearch` is empty (ensures un-linking when user clears the text)

**Independence note:** This plan is fully independent of Plan 01 (draft-store infrastructure). It modifies `draft-service.ts` and `DraftTrackerPage.tsx` only — no shared types, no shared store changes. Plans 01–04 do not conflict.

## Deviations from Plan

### Auto-fixed Issues

None from Rules 1–3.

### Enhancements Applied (within-spec)

**1. ARIA combobox semantics added (accessibility improvement)**
- **Found during:** Task 2 implementation
- **Reason:** The plan's combobox block used `<div>/<input>/<ul>` without ARIA roles. Adding `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-autocomplete` is standard combobox semantics and does not affect behavior.
- **Files modified:** `apps/desktop/src/pages/DraftTrackerPage.tsx`

**2. Amber border on open state added**
- **Found during:** Task 2 implementation — needed additional `playerDropdownOpen` reference to meet acceptance criteria `>=5` (plan's grep test expected inline `setPlayerDropdownOpen` calls to count as lowercase `playerDropdownOpen` matches; camelCase `P` in `setPlayerDropdownOpen` makes them non-matching)
- **Fix:** Natural UX enhancement: amber border (`border-amber-500`) when `playerDropdownOpen === true`, gray-600 when closed
- **Files modified:** `apps/desktop/src/pages/DraftTrackerPage.tsx`

**3. onBlur playerId clear when search is empty**
- **Found during:** Task 2 — correctness for blur-without-select scenario
- **Reason:** If user focuses the combobox, types something, then tabs away without selecting, `playerSearch` would hold typed text but `form.playerId` would already be `''` from onChange. Clearing on blur when empty is a no-op but covers the edge case of `playerSearch` being non-empty when blur fires with no selection.

## Threat Flags

None — all threats were pre-analyzed in plan's threat model. No new surfaces introduced:
- `status: 'drafted'` is a hard-coded literal (T-24-04-01 mitigated)
- Combobox filters in-memory over already-loaded data (T-24-04-02 accepted)
- `db.players.update` on missing key is a no-op (T-24-04-04 accepted)

## Known Stubs

None — all wiring is complete. The player-status side effect writes directly to the `players` table via Dexie. The combobox reads from the `players` array already loaded for the page.

## Verification Reminder

**Manual DevTools verification:**
1. Open DraftTrackerPage in the running app with a CFB dynasty
2. In the "Link to Player" combobox, type a partial name (e.g., "jone")
3. Confirm filtered list appears with matching players
4. Click a player — confirm form.playerName, form.position are auto-filled and dropdown closes
5. Submit the Add Draft Pick form
6. In DevTools console: `await db.players.get('<pickedPlayerId>')` — confirm `status === 'drafted'` and `updatedAt` is recent
7. Clear the combobox input — confirm the form row no longer shows as linked (form.playerId = '')

## Self-Check: PASSED

- FOUND: apps/desktop/src/lib/draft-service.ts
- FOUND: apps/desktop/src/pages/DraftTrackerPage.tsx
- FOUND: .planning/phases/24-recruiting-tools/24-04-SUMMARY.md
- FOUND: commit e2f6213 (Task 1 — draft-service side effect)
- FOUND: commit 342f9a5 (Task 2 — DraftTrackerPage combobox)
