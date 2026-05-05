# Phase 24: Recruiting Tools - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

CFB coaches get actionable recruiting decision support: Hard Sell calculator surfaced on the RecruitingPage (real-time and on recruit rows), at-risk player tagging on the roster, one-click recruit→roster promotion gated by a new `isCommitted` flag, automatic player status update when a draft pick is linked to a player, and a Signing Day Class Card exportable as PNG.

This phase operates on existing `Recruit`, `Player`, and `DraftPick` types that Phase 21 already extended with motivation grades, deal breaker, and dev trait fields. The Hard Sell calculator (`recruiting-calculator.ts`) is already implemented — Phase 24 wires it into the RecruitingPage UI.

</domain>

<decisions>
## Implementation Decisions

### Recruit Committed Status (TOOL-03)

- **D-01:** Add `isCommitted?: boolean` to the `Recruit` type in `packages/core-types/src/recruiting.ts`. Same pattern as Phase 21 DMOD-05 additions (`motivation1/2/3`, `visitWeek`). Minimal schema change — no Dexie migration version bump needed (optional field).
- **D-02:** The committed toggle surfaces **inline on the recruit list row** — a small toggle or checkbox directly on the row. `'Add to Roster'` button appears only when `isCommitted = true` on that recruit. No modal required to flip it.
- **D-03:** After `'Add to Roster'` is clicked and `AddPlayerModal` opens with pre-filled name/position/stars, the recruit record is **left unchanged**. The class list retains the recruit as a historical record of who signed. No side effect on the recruit entity after the modal opens.

### Hard Sell Display (TOOL-01)

- **D-04:** `getHardSellRecommendation()` shows **real-time inline in the add/edit form** — a banner appears immediately below the three motivation grade inputs as all 3 are filled. No save required. Uses the same import as `ScreenshotIngestionPage.tsx` already does.
- **D-05:** Motivation grade inputs (`motivation1`, `motivation2`, `motivation3`) are **changed from free-text inputs to dropdowns**. Options are the 13 valid grades: `A+`, `A`, `A-`, `B+`, `B`, `B-`, `C+`, `C`, `C-`, `D+`, `D`, `D-`, `F`. Prevents invalid grades that would cause `getHardSellRecommendation()` to return `null` silently.
- **D-06:** A **compact badge** also appears on each recruit list row for recruits that already have all 3 grades saved — showing `'Hard Sell'` or `'Send the House'` in the appropriate color. Coaches can scan the full class at a glance without re-opening each recruit.

### At-Risk Filter (TOOL-02)

- **D-07 (Claude's discretion):** Orange warning tag on RosterPage rows where `player.dealBreaker` is set, plus a `'Show at-risk'` filter toggle using the existing FilterStore pattern from Phase 11. Tag color: amber/orange consistent with the app's warning color convention. Implementation details left to the planner.

### Signing Day Class Card (TOOL-05)

- **D-08:** Use **`html2canvas`** to render a hidden React component to a canvas, then export as PNG. Tauri's `dialog.save()` from `@tauri-apps/plugin-dialog` opens the OS native save dialog. `html2canvas` is a new dependency.
- **D-09:** **Stats-forward dark card** matching the app's slate theme. Layout: large commit count + avg star rating at the top, position breakdown below (horizontal bar or grouped list), top 3 recruits by star rating listed by name at the bottom. CFB only.
- **D-10:** `'Generate Class Card'` button lives in the **recruiting class header/toolbar**, alongside the existing `'Generate Signing Day Grade'` button. Default filename for the save dialog: `signing-day-{year}.png` where year comes from the active class.

> **Note for planner:** TOOL-05 appears in ROADMAP.md §Phase 24 success criteria (criterion 5) but is NOT listed as a formal requirement in REQUIREMENTS.md. Planner should add `TOOL-05` to REQUIREMENTS.md or flag this discrepancy. The ROADMAP.md goal + success criteria are the authoritative source.

### Draft Pick → Player Status (TOOL-04)

- **D-11:** The player-status side effect lives in **`createDraftPick()` in `apps/desktop/src/lib/draft-service.ts`**. When `input.playerId` is present, immediately after `db.draftPicks.add(pick)`, call `db.players.update(playerId, { status: 'drafted', updatedAt: Date.now() })`. Single atomic operation, no UI coupling.
- **D-12:** **Always override** the player's existing status to `'drafted'` regardless of current value (`active`, `graduated`, `transferred`, etc.). `'drafted'` is definitive — no conditional logic needed.
- **D-13:** Add a **player search/select combobox** to the Add Draft Pick form on `DraftTrackerPage`. Coaches can search by name across the active dynasty's roster and link the pick to an existing `Player`. Without this UI, `playerId` would never be set from normal usage and TOOL-04 would never fire.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` §Recruiting Tools — formal acceptance criteria for TOOL-01, TOOL-02, TOOL-03, TOOL-04
- `.planning/ROADMAP.md` §Phase 24 — goal, success criteria (includes TOOL-05 Signing Day Class Card — not in REQUIREMENTS.md), dependency on Phase 21

### Type Definitions (all need updates or reference)
- `packages/core-types/src/recruiting.ts` — `Recruit` type (add `isCommitted?: boolean`); `RecruitingClass` type
- `packages/core-types/src/player.ts` — `Player` type (`status: PlayerStatus`, `dealBreaker?: string`), `PlayerStatus` union
- `packages/core-types/src/draft.ts` — `DraftPick` type (`playerId?: string` — the nullable FK that triggers TOOL-04)

### Existing Recruiting Logic
- `apps/desktop/src/lib/recruiting-calculator.ts` — `getHardSellRecommendation()` already complete; `GRADE_POINTS` map defines the 13 valid grades for dropdowns
- `apps/desktop/src/lib/recruiting-service.ts` — Recruit CRUD; `addRecruit()`, `getRecruitsByClass()`
- `apps/desktop/src/lib/cfb-categories.ts` — `CFB_DEAL_BREAKER_CATEGORIES` (14 categories for TOOL-02 at-risk display)

### Key Pages & Components
- `apps/desktop/src/pages/RecruitingPage.tsx` — Main surface for Hard Sell display (D-04–D-06) and isCommitted toggle (D-02)
- `apps/desktop/src/pages/DraftTrackerPage.tsx` — Add player-link combobox here (D-13)
- `apps/desktop/src/pages/RosterPage.tsx` — At-risk filter and orange deal-breaker tag (D-07)
- `apps/desktop/src/components/AddPlayerModal.tsx` — Opens pre-filled when 'Add to Roster' clicked (name, position, stars)

### Reference Implementation (Hard Sell)
- `apps/desktop/src/pages/ScreenshotIngestionPage.tsx` — `renderRecruitingMotivationsForm()` (line ~1000+) — already calls `getHardSellRecommendation()` and shows the banner inline; use as reference for the RecruitingPage wiring

### Stores
- `apps/desktop/src/store/recruiting-store.ts` — Zustand store; may need `updateRecruit` action for isCommitted toggle
- `apps/desktop/src/store/draft-store.ts` — Zustand draft store; `addPick` calls `createDraftPick()`
- `apps/desktop/src/store/filter-store.ts` — Existing filter toggle pattern for at-risk filter (TOOL-02)

### Draft Service
- `apps/desktop/src/lib/draft-service.ts` — `createDraftPick()` needs playerId side effect (D-11); `getDraftPicksByDynasty()`, `getPositionBreakdown()` (useful for Class Card)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `recruiting-calculator.ts:getHardSellRecommendation(grade1, grade2, grade3)` — drop-in ready; returns `'Hard Sell' | 'Send the House' | null`. Already imported in `ScreenshotIngestionPage.tsx` — same import pattern for `RecruitingPage.tsx`.
- `recruiting-calculator.ts:GRADE_POINTS` — the 13 valid grade keys (`A+` through `F`); use `Object.keys(GRADE_POINTS)` to populate the motivation grade dropdowns.
- `AddPlayerModal` — already accepts pre-filled props; verify its prop interface accepts `recruitingStars`, `position`, name fields.
- `draft-service.ts:getPositionBreakdown()` — already groups picks by position group; may be adaptable for the Signing Day Class Card's position breakdown.
- FilterStore toggle pattern — used in Phase 11 for multiple filter types; replicate for `showAtRisk` on RosterPage.

### Established Patterns
- Phase 21 type extension pattern: optional fields added to types with a `// v2.2 (Phase XX ...)` comment. Follow for `isCommitted` on `Recruit`.
- Service-layer cross-entity update: `draft-service.ts` should follow the same pattern as `narrative-service.ts` calling `db.players.update()` for cross-entity writes.
- Tauri `dialog.save()` — used in screenshot export; look for existing callers in `src/` to confirm the import path from `@tauri-apps/plugin-dialog`.

### Integration Points
- `RecruitingPage.tsx` imports `getHardSellRecommendation` — confirm this is not already imported; add if not.
- `RecruitingPage.tsx` recruit form: change motivation1/2/3 inputs to `<select>` with grade options; add live Hard Sell banner below the 3 selects.
- `RecruitingPage.tsx` recruit list rows: add isCommitted toggle + conditional 'Add to Roster' button + Hard Sell badge.
- `DraftTrackerPage.tsx` Add Pick form: add player combobox (search by name over `useDynastyStore` roster).
- `draft-service.ts:createDraftPick()`: add `if (pick.playerId) { await db.players.update(pick.playerId, { status: 'drafted', updatedAt: now }); }` after `db.draftPicks.add(pick)`.

</code_context>

<specifics>
## Specific Ideas

- **Signing Day card filename**: `signing-day-{year}.png` — year from the active `RecruitingClass.year` field.
- **Hard Sell banner styling**: Reuse the `gradeColor()` function already in `RecruitingPage.tsx` for banner color logic.
- **Motivation grade dropdown order**: `A+`, `A`, `A-`, `B+`, `B`, `B-`, `C+`, `C`, `C-`, `D+`, `D`, `D-`, `F` — same order as `GRADE_POINTS` in `recruiting-calculator.ts`.
- **html2canvas**: New npm dependency — planner should confirm it works cleanly with Tauri's WebView (no known conflicts as of 2026).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 24-recruiting-tools*
*Context gathered: 2026-05-05*
