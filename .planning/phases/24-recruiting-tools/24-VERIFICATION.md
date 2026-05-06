---
phase: 24-recruiting-tools
verified: 2026-05-05T17:00:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 3/5
  gaps_closed:
    - "Any CFB roster player with a deal breaker set displays an orange warning tag on the roster row; toggling the 'Show at-risk' filter highlights only those players"
    - "Adding a draft pick with a linked player ID automatically changes that player's status to 'drafted' in the database"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Open RecruitingPage on a CFB dynasty, fill all 3 motivation grade dropdowns in the Add Recruit form"
    expected: "Hard Sell or Send the House banner appears immediately below the motivation grid without saving"
    why_human: "Real-time React state update requires running app"
  - test: "On a CFB dynasty recruit list, click the Committed/Uncommitted toggle on any row"
    expected: "Toggle flips immediately (optimistic update), persists after navigating away and returning"
    why_human: "Dexie write and optimistic revert path require running app"
  - test: "Mark a recruit as committed, then click 'Add to Roster' — verify AddPlayerModal opens pre-filled"
    expected: "Modal opens with recruit's name split into first/last, position, and star rating pre-filled; recruit record unchanged after closing"
    why_human: "Modal interaction and data integrity require running app"
  - test: "On RecruitingPage with a CFB dynasty and at least one saved recruit, click 'Export Class Card'"
    expected: "Tauri save dialog opens with default filename signing-day-{year}.png; saving writes a 640x360 PNG with commit count, avg stars, position breakdown, and top 3 recruits"
    why_human: "Tauri native dialog and filesystem write require running Tauri app"
  - test: "On RosterPage with a CFB dynasty, click 'Show At-Risk' toggle — verify only deal-breaker players remain visible with bg-orange-900/10 row tint"
    expected: "Filter reduces visible roster to players with dealBreaker set; those rows display orange background tint; toggle persists after navigating away"
    why_human: "FilterStore persistence and live row-tinting require running app"
  - test: "On DraftTrackerPage, type a partial player name in the Add Pick combobox, select a player, submit the form — then check db.players.get(pickedPlayerId).status in DevTools"
    expected: "Combobox filters correctly; selecting a player closes dropdown and populates form; submitted pick sets that player's status to 'drafted'"
    why_human: "Dexie write side-effect and combobox WebView interaction require running Tauri app"
---

# Phase 24: Recruiting Tools — Verification Report (Re-verification)

**Phase Goal:** Implement five recruiting/draft coach tools — Hard Sell recommendation, at-risk roster filter, isCommitted toggle + Add-to-Roster shortcut, draft pick player-status side effect, and Signing Day Class Card export — that surface the right action at the right moment during recruiting and draft workflows.
**Verified:** 2026-05-05T17:00:00Z
**Status:** human_needed
**Re-verification:** Yes — after cherry-picking commits 0c993ca (Plan 03), f082e3c (Plan 04 side effect), bdf084b (Plan 04 combobox) to main

## Re-verification Summary

Previous gaps (TOOL-02 and TOOL-04) are now CLOSED. Both commits land on main and all acceptance-criteria greps pass. No regressions found in previously-verified items (TOOL-01, TOOL-03, TOOL-05). Score moves from 3/5 to 5/5.

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A recruit card with all three motivation grades filled shows either "Hard Sell" or "Send the House" based on whether the motivation sum is >= 19 | VERIFIED | `getHardSellRecommendation` has 11 combined occurrences of related symbols in RecruitingPage.tsx; banner rendered with `bg-green-900/20` / `bg-amber-900/20`; row badge with `rec === 'Hard Sell'`; `Object.keys(GRADE_POINTS).map` used in all 3 motivation selects |
| 2 | Any CFB roster player with a deal breaker set displays an orange warning tag on the roster row; toggling the "Show at-risk" filter highlights only those players | VERIFIED | `showAtRisk` present 8 times in RosterPage.tsx (lines 92-355); `matchesAtRisk` at line 121 using `Boolean(p.dealBreaker)`; toggle button labels "Show At-Risk" / "At-Risk Only" at line 256; `bg-orange-900/10` row tint at line 355; FilterStore persistence at line 97; commit 0c993ca on main |
| 3 | Clicking "Add to Roster" on a committed recruit opens AddPlayerModal with the recruit's name, position, and star rating already filled in | VERIFIED | `handleAddToRoster(recruit)` defined and invoked; `addPlayerInitial` and `addPlayerOpen` state present; AddPlayerModal rendered with all 4 pre-fill props (`initialFirstName`, `initialLastName`, `initialPosition`, `initialStars`); AddPlayerModal accepts those 4 optional props with useEffect reset on isOpen transition |
| 4 | Adding a draft pick with a linked player ID automatically changes that player's status to 'drafted' in the database | VERIFIED | `if (pick.playerId)` block at line 20 in draft-service.ts; `db.players.update(pick.playerId, { status: 'drafted', updatedAt: now })` at lines 21-23; TOOL-04 comment at line 18; old `<select value={form.playerId}>` is GONE; `playerSearch` combobox state at line 40; `filteredPlayers` derived value at line 153; 150ms onBlur setTimeout at line 209; onMouseDown handler at line 224; commits f082e3c and bdf084b on main |
| 5 | User can generate a Signing Day Class Card — shareable PNG exportable via OS save dialog (CFB only) | VERIFIED | `html2canvas@1.4.1` in apps/desktop/package.json line 25; `handleExportCard` defined and called on button (line 531); `html2canvas(cardRef.current, ...)` call present; `save()` dialog with `defaultPath: signing-day-${activeClass.year}.png`; `writeFile()` call present; hidden 640x360 off-screen card with `fixed -left-[9999px]`; `Dynasty OS` footer watermark; `cardTop3`, `cardAvgStars`, `cardPosBreakdown` computed inline |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|---------|--------|---------|
| `packages/core-types/src/recruiting.ts` | Recruit.isCommitted optional boolean | VERIFIED | Line 34: `isCommitted?: boolean;` with v2.2 TOOL-03 comment |
| `apps/desktop/src/lib/recruiting-service.ts` | updateRecruit(id, updates) export | VERIFIED | Line 76: `export async function updateRecruit(...)` delegates to `db.recruits.update` |
| `apps/desktop/src/store/recruiting-store.ts` | updateRecruit store action with optimistic update | VERIFIED | `svcUpdateRecruit` imported (line 10, 118); interface method and implementation present; `useToastStore.getState().error` on revert |
| `apps/desktop/src/components/AddPlayerModal.tsx` | Pre-fillable via initial-value props | VERIFIED | Lines 13-16: all 4 optional props; `useEffect` on `[isOpen]` re-applies initial values |
| `apps/desktop/src/lib/recruiting-calculator.ts` | Exported GRADE_POINTS map (13 grade keys) | VERIFIED | Line 6: `export const GRADE_POINTS` |
| `apps/desktop/src/pages/RecruitingPage.tsx` | TOOL-01 banner+badges, TOOL-03 toggle+Add to Roster | VERIFIED | All TOOL-01 and TOOL-03 wiring confirmed present |
| `apps/desktop/src/pages/RosterPage.tsx` | TOOL-02 at-risk filter toggle + row tint | VERIFIED | showAtRisk (8 occurrences), matchesAtRisk, toggle button, bg-orange-900/10 row tint — all confirmed. Commit 0c993ca cherry-picked to main |
| `apps/desktop/src/lib/draft-service.ts` | Side effect: db.players.update(playerId, { status: 'drafted' }) | VERIFIED | `if (pick.playerId)` block at line 20; `status: 'drafted'` at line 22; `updatedAt: now` at line 23. Commit f082e3c on main |
| `apps/desktop/src/pages/DraftTrackerPage.tsx` | Searchable player combobox replacing old select | VERIFIED | `playerSearch` state at line 40; `playerDropdownOpen` at line 41; `filteredPlayers` at line 153; placeholder "Search roster by name…" at line 215; old `<select value={form.playerId}>` absent. Commit bdf084b on main |
| `apps/desktop/package.json` | html2canvas dependency | VERIFIED | Line 25: `"html2canvas": "1.4.1"` |
| `.planning/REQUIREMENTS.md` | TOOL-05 entry + traceability row | VERIFIED | TOOL-05 bullet in §Recruiting Tools; traceability row `TOOL-05 | Phase 24 | Pending`; count updated 40→41 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `recruiting-store.ts` | `recruiting-service.ts` | `import { updateRecruit as svcUpdateRecruit }` | WIRED | Line 10 import + line 118 call confirmed |
| `recruiting-store.ts` | `toast-store.ts` | `useToastStore.getState().error(...)` | WIRED | Line 13 import + line 127 call confirmed |
| `RecruitingPage.tsx` | `recruiting-calculator.ts` | `import { getHardSellRecommendation, GRADE_POINTS }` | WIRED | Both named imports confirmed; GRADE_POINTS used in 3 selects |
| `RecruitingPage.tsx` | `recruiting-store.ts` | `useRecruitingStore().updateRecruit` | WIRED | `updateRecruit(recruit.id, ...)` confirmed |
| `RecruitingPage.tsx` | `AddPlayerModal.tsx` | `initialFirstName/initialLastName/initialPosition/initialStars` props | WIRED | All 4 props passed at line 897 area |
| `RecruitingPage.tsx` | `html2canvas` | `import html2canvas from 'html2canvas'` | WIRED | Import present; `html2canvas(cardRef.current, ...)` called in handler |
| `RecruitingPage.tsx` | `@tauri-apps/plugin-dialog` + `@tauri-apps/plugin-fs` | `save()` + `writeFile()` | WIRED | Both imports present; both called in handleExportCard |
| `RosterPage.tsx` | `filter-store.ts` | `useFilterStore.getState().setFilter(PAGE_KEY, 'showAtRisk', val)` | WIRED | Line 97 confirmed — toggle persists via FilterStore |
| `draft-service.ts` | Dexie players table | `db.players.update(pick.playerId, { status: 'drafted', updatedAt: now })` | WIRED | Lines 20-24 in createDraftPick confirmed |
| `DraftTrackerPage.tsx` | `handlePlayerSelect` handler | onMouseDown on combobox list items | WIRED | `handlePlayerSelect(p.id)` called at line 226 inside onMouseDown handler |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|-------------|--------|-------------------|--------|
| `RecruitingPage.tsx` (Hard Sell banner) | `recruitForm.motivation1/2/3` | Form state (controlled inputs from `<select>`) | Yes — dropdowns drive live state | FLOWING |
| `RecruitingPage.tsx` (row badge) | `recruit.motivation1/2/3` | `recruitsForClass` from Zustand store (Dexie-backed) | Yes | FLOWING |
| `RecruitingPage.tsx` (isCommitted toggle) | `recruit.isCommitted` | `recruitsForClass` from store; persisted via `updateRecruit` | Yes — optimistic + Dexie write | FLOWING |
| `RecruitingPage.tsx` (Class Card) | `recruitsForClass`, `activeClass` | Zustand store (Dexie-backed) | Yes — computed inline from live data | FLOWING |
| `RosterPage.tsx` (at-risk filter) | `showAtRisk` | FilterStore ('roster' key); `matchesAtRisk` = `Boolean(p.dealBreaker)` | Yes — live filter + Dexie-backed player data | FLOWING |
| `draft-service.ts` (player status) | `pick.playerId` → `db.players` | Hard-coded literal `'drafted'` written to Dexie players table | Yes — direct Dexie write | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| GRADE_POINTS exported from calculator | `grep -n "^export const GRADE_POINTS" recruiting-calculator.ts` | 1 match at line 6 | PASS |
| updateRecruit in recruiting-service.ts | `grep -n "export async function updateRecruit"` | 1 match at line 76 | PASS |
| html2canvas in package.json | `grep "html2canvas" apps/desktop/package.json` | `"html2canvas": "1.4.1"` | PASS |
| showAtRisk in RosterPage.tsx | `grep -c "showAtRisk" RosterPage.tsx` | 8 matches | PASS |
| FilterStore persistence wiring | `grep -n "setFilter(PAGE_KEY, 'showAtRisk'"` | Line 97 confirmed | PASS |
| row tint bg-orange-900/10 | `grep -n "bg-orange-900/10" RosterPage.tsx` | Line 355 confirmed | PASS |
| DB badge (bg-orange-900/40) unchanged | `grep -c "bg-orange-900/40 text-orange-300"` | 1 match | PASS |
| player-status side effect in draft-service.ts | `grep -n "db.players.update\|status: 'drafted'"` | Lines 21-22 confirmed | PASS |
| Old select element gone | `grep -n "value={form.playerId}" DraftTrackerPage.tsx` | 0 matches | PASS |
| playerSearch state in DraftTrackerPage | `grep -n "playerSearch" DraftTrackerPage.tsx` | 6+ matches at lines 40, 154, 157, 199, 211, 218 | PASS |
| onMouseDown handler on combobox items | `grep -n "onMouseDown" DraftTrackerPage.tsx` | Line 224 confirmed | PASS |
| 150ms onBlur setTimeout | `grep -nE "setTimeout\(\(\) => setPlayerDropdownOpen\(false\), 150\)"` | Line 209 confirmed | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|------------|------------|-------------|--------|---------|
| TOOL-01 | 24-02 | Hard Sell recommendation when all 3 motivation grades filled | SATISFIED | Banner in form, row badge, GRADE_POINTS dropdowns — all wired in RecruitingPage.tsx on main |
| TOOL-02 | 24-03 | At-risk filter on roster for deal-breaker players | SATISFIED | showAtRisk state, matchesAtRisk filter, toggle button, row tint — all present on main via commit 0c993ca |
| TOOL-03 | 24-01, 24-02 | Add to Roster button on committed recruit with pre-filled AddPlayerModal | SATISFIED | isCommitted type, store action, modal props, toggle, and modal invocation all present on main |
| TOOL-04 | 24-04 | Draft pick automatically sets player status to 'drafted' | SATISFIED | Side effect block in createDraftPick and searchable combobox both present on main via commits f082e3c and bdf084b |
| TOOL-05 | 24-05 | Signing Day Class Card PNG export | SATISFIED | html2canvas installed, export button wired, card render target present, REQUIREMENTS.md updated |

### Anti-Patterns Found

None. All previously-identified blockers are resolved. No new anti-patterns introduced by the cherry-picks.

### Human Verification Required

1. **Hard Sell banner live behavior**
   **Test:** Open RecruitingPage on a CFB dynasty. In the Add Recruit form, set all three motivation grades using the dropdowns.
   **Expected:** A green "Hard Sell" or amber "Send the House" banner appears immediately below the motivation grid without saving.
   **Why human:** Real-time React state update requires running app.

2. **isCommitted toggle persistence**
   **Test:** On a recruit row, click the Committed/Uncommitted toggle button.
   **Expected:** Toggle flips immediately (optimistic update), persists after navigating away and returning.
   **Why human:** Dexie write and optimistic revert path require running app.

3. **Add to Roster modal pre-fill**
   **Test:** Mark a recruit committed, click "Add to Roster".
   **Expected:** AddPlayerModal opens with first name, last name, position, and star rating pre-filled from the recruit's data. After closing, recruit record is unchanged.
   **Why human:** Modal interaction and data integrity require running app.

4. **Export Class Card**
   **Test:** On a CFB dynasty with at least one recruit, click "Export Class Card".
   **Expected:** Tauri save dialog opens; saving writes a PNG with correct card layout and data.
   **Why human:** Tauri native file dialog and filesystem write require running Tauri app.

5. **At-risk filter behavior**
   **Test:** On RosterPage with a CFB dynasty that has at least one player with a dealBreaker set, click "Show At-Risk". Navigate away, then return.
   **Expected:** Only players with a dealBreaker are visible; their rows are tinted with a subtle orange background. Toggle state is restored on return.
   **Why human:** FilterStore persistence and live row-tinting require running app.

6. **Draft pick player-status side effect**
   **Test:** On DraftTrackerPage, type a partial player name in the Add Pick combobox, select a matching player, submit the Add Draft Pick form. Then in DevTools console run `await db.players.get('<pickedPlayerId>')`.
   **Expected:** Combobox filters by name substring; selecting a player closes the dropdown and populates form.playerName and position; after submission, `db.players.get(...).status === 'drafted'` and `updatedAt` is recent.
   **Why human:** Dexie write side-effect and combobox WebView interaction require running Tauri app.

### Gaps Summary

No gaps. All five tools are fully implemented and wired on main branch. The two previously-identified blockers (TOOL-02 at-risk filter and TOOL-04 draft pick player-status + combobox) have been resolved by cherry-picking commits 0c993ca, f082e3c, and bdf084b to main.

Six human verification items remain — these are inherent to Tauri/Dexie runtime behavior and cannot be verified programmatically.

---

_Verified: 2026-05-05T17:00:00Z_
_Re-verified: 2026-05-05T17:00:00Z (after cherry-pick of TOOL-02 and TOOL-04 commits)_
_Verifier: Claude (gsd-verifier)_
