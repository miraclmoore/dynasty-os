---
phase: 22-screenshot-pipeline
verified: 2026-05-04T00:00:00Z
status: human_needed
score: 4/4
overrides_applied: 0
human_verification:
  - test: "Parse a player-stats screenshot with a matched player, click 'Save Stats,' then open the Records leaderboard"
    expected: "At least one new PlayerSeason record exists in db.playerSeasons and the stat appears in the Records leaderboard"
    why_human: "Cannot confirm IndexedDB write or leaderboard read path without running the app against real data"
  - test: "After parsing a depth chart screenshot, click 'Copy as CSV,' then paste into a text editor"
    expected: "First line is 'Position,Player Name,Depth'; subsequent lines match parsed entries; no 'not saved in V1' notice visible on screen"
    why_human: "Clipboard write and visual absence of notice require a live session to confirm"
  - test: "Open the ingestion page with a CFB dynasty, select 'Recruit Pitch Screen' from the dropdown, parse a screenshot with all 3 motivation grades populated"
    expected: "Recommendation banner shows 'Hard Sell' or 'Send the House'; when fewer than 3 grades parse, no banner appears; screen type does not appear for an NFL dynasty"
    why_human: "CFB/NFL gating, partial-parse guard, and banner display require a live run to confirm"
  - test: "Select 3 image files in the file picker, click 'Parse 3 Screenshots,' and observe the loading spinner and combined confirm UI"
    expected: "Spinner reads 'Parsing 1 of 3…', then 'Parsing 2 of 3…', then 'Parsing 3 of 3…'; confirmation form shows merged rows from all 3 images; single-image flow still shows 'Parsing screenshot…'"
    why_human: "Sequential async parse loop, progress counter, and merged state require a live session to observe"
---

# Phase 22: Screenshot Pipeline — Verification Report

**Phase Goal:** Player stats screenshots are parsed, fuzzy-matched to the roster, and saved to the database; depth chart screenshots export as CSV; the recruiting-motivations screen type is selectable; and multiple images can be ingested in one session.
**Verified:** 2026-05-04T00:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | After parsing a player stats screenshot and clicking "Save Stats," at least one new record appears in `db.playerSeasons` and the stat shows up in the Records leaderboard | VERIFIED (code) | `handleSaveStats` queries `db.playerSeasons`, calls `createPlayerSeason`/`updatePlayerSeason` with normalized stat keys, navigates to dashboard on success. `player-season-service.ts` performs a real `db.playerSeasons.add()`. Stats appear in leaderboard data path via existing `getSingleSeasonLeaders()`. Live confirmation is a human item. |
| 2 | After parsing a depth chart screenshot, a "Copy as CSV" button is visible and copies correctly formatted CSV to the clipboard; the "not saved in V1" notice is removed | VERIFIED (code) | `handleCopyDepthChartCsv()` builds RFC 4180-lite CSV and calls `navigator.clipboard.writeText(csv)`. Button renders `{depthCsvCopied ? 'Copied!' : 'Copy as CSV'}` with 2-second reset. Grep confirms "not saved in V1" text is absent from the file. Live confirmation is a human item. |
| 3 | Selecting "recruiting-motivations" as the screen type in the CFB ingestion flow parses motivation grades and deal breaker and shows a Hard Sell recommendation inline | VERIFIED (code) | `'recruiting-motivations'` in `ScreenType` union, `SCREEN_TYPE_LABELS`, `SCREEN_TYPE_PROMPTS`, and `CFB_SCREEN_TYPES`. Absent from `NFL_SCREEN_TYPES`. `renderRecruitingMotivationsForm()` calls `getHardSellRecommendation()` and renders the banner only when `recommendation` is non-null (guarding partial parse). Live run is a human item. |
| 4 | Selecting multiple image files processes them sequentially with a "Parsing X of Y" progress indicator and shows a combined confirm UI after all images are parsed | VERIFIED (code) | `open({ multiple: true })` called. State includes `imageQueue`, `imagePaths`, `currentImageIndex`. Loading text: `imageQueue.length > 1 ? 'Parsing ${currentImageIndex + 1} of ${imageQueue.length}…' : 'Parsing screenshot…'`. Loop merges into `mergedGameRows`/`mergedPlayerRows`/`mergedRecruitRows`/`mergedDepthEntries`. Single-image path unchanged. Live confirmation is a human item. |

**Score:** 4/4 truths have code-level verification. All 4 require live human confirmation for the behavioral aspect.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/desktop/src/lib/fuzzy-match.ts` | Exports `nameSimilarity` and `findBestPlayerMatch` | VERIFIED | File exists, 71 lines, both functions exported with correct signatures and threshold logic |
| `apps/desktop/src/lib/recruiting-calculator.ts` | Exports `getHardSellRecommendation`, `gradeToPoints`, `HardSellResult` | VERIFIED | File exists, 32 lines, all exports present, GRADE_POINTS has A+=13 down to F=1 |
| `apps/desktop/src/lib/screenshot-service.ts` | `ScreenType` union includes `'recruiting-motivations'`; `RecruitingMotivationsParsedData` exported; `ParsedScreenData` union updated; prompt uses 14 categories | VERIFIED | All 4 additions confirmed. Prompt uses `CFB_DEAL_BREAKER_CATEGORIES.join(', ')` (14 items). |
| `apps/desktop/src/pages/ScreenshotIngestionPage.tsx` | Fuzzy match combobox, Save Stats handler, depth chart CSV, motivations form, multi-image queue | VERIFIED | All changes present. 1373 lines. Imports `findBestPlayerMatch`, `getHardSellRecommendation`, `createPlayerSeason`, `updatePlayerSeason`, `db`. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `ScreenshotIngestionPage` | `fuzzy-match.ts` | `import { findBestPlayerMatch }` | WIRED | Line 14 import; called in `initEditableState` and `handleParse` player-stats branch |
| `ScreenshotIngestionPage` | `player-season-service.ts` | `import { createPlayerSeason, updatePlayerSeason }` | WIRED | Line 12 import; called in `handleSaveStats` |
| `ScreenshotIngestionPage` | `db.playerSeasons` | `import { db } from '@dynasty-os/db'` | WIRED | Line 13 import; used in `handleSaveStats` for upsert logic |
| `ScreenshotIngestionPage` | `recruiting-calculator.ts` | `import { getHardSellRecommendation }` | WIRED | Line 25 import; called in `renderRecruitingMotivationsForm()` |
| `screenshot-service.ts` | `cfb-categories.ts` | `import { CFB_DEAL_BREAKER_CATEGORIES }` | WIRED | Line 3 import; interpolated into `'recruiting-motivations'` prompt string |
| `handleSaveStats` | `goToDashboard()` | direct call after loop | WIRED | Line 508 — called on success path |
| `renderDepthChartForm` | `handleCopyDepthChartCsv` | `onClick={() => { void handleCopyDepthChartCsv(); }}` | WIRED | Line 1064; button renders `depthCsvCopied` state |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `handleSaveStats` | `matchedPlayerIds[i]` | Populated by `findBestPlayerMatch` in `initEditableState` / `handleParse` loop | Yes — calls `nameSimilarity` against loaded roster | FLOWING |
| `handleSaveStats` → `createPlayerSeason` | `stats` Record | Built from `playerRows[i].stats` via `normalizeStatKey()` + `parseFloat()`; NaN and 0 filtered | Yes — real parsed values from Vision API | FLOWING |
| `handleSaveStats` → `updatePlayerSeason` | `existing.stats` | `db.playerSeasons.where('playerId').equals(playerId).filter(...).first()` | Yes — real DB query before merge | FLOWING |
| `renderRecruitingMotivationsForm` | `recommendation` | `getHardSellRecommendation(grade1, grade2, grade3)` from `parsedData` | Yes — computed from Vision API parse result | FLOWING |
| `handleCopyDepthChartCsv` | `depthEntries` | Set from `mergedDepthEntries` after parse loop | Yes — from `DepthChartParsedData.entries` from Vision API | FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED (no runnable entry points — Tauri desktop app requires full build and device, not testable with static commands)

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PIPE-01 | 22-02 | Player stats screenshot → fuzzy match → DB save → leaderboard | SATISFIED (code) | `handleSaveStats` + `createPlayerSeason` + `db.playerSeasons`. Live DB write confirmed by human verification item 1. |
| PIPE-02 | 22-03 | Depth chart screenshot → "Copy as CSV" button; "not saved in V1" notice removed | SATISFIED (code) | `handleCopyDepthChartCsv()` + `navigator.clipboard.writeText()`. Notice absence grep-confirmed. Live copy confirmed by human item 2. |
| PIPE-03 | 22-04 | `recruiting-motivations` screen type — CFB only, motivation grades, Hard Sell inline | SATISFIED (code) | All enum/union/label/prompt additions present. `renderRecruitingMotivationsForm()` wired. Live gating confirmed by human item 3. |
| PIPE-04 | 22-05 | Multi-image ingestion — sequential parse, "Parsing X of Y," combined confirm UI | SATISFIED (code) | `open({ multiple: true })`, `imageQueue` state, sequential loop, merged state arrays, progress text. Live behavior confirmed by human item 4. |

No orphaned requirements — REQUIREMENTS.md maps exactly PIPE-01 through PIPE-04 to Phase 22.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `fuzzy-match.ts` | 58 | `return null` | Info | Guard clause — correct behavior when no candidate or empty roster; not a stub |
| `recruiting-calculator.ts` | 29 | `return null` | Info | Guard clause — correct partial-parse protection; `HardSellResult` includes `null` by design |

No blockers. The `return null` patterns are typed guard clauses, not stub implementations — both functions have substantive logic beyond the guards.

### Human Verification Required

All four items below need a live run in the Tauri desktop app:

#### 1. Player Stats Save → Leaderboard

**Test:** With an active CFB or NFL dynasty and at least one player on the roster, navigate to Parse Screenshot. Select "Player Stats," pick any image, parse it. In the combobox for one player row, manually select a roster player if not auto-matched. Click "Save Stats."
**Expected:** App navigates to the dashboard. In the Record Book / Records leaderboard, at least one stat for the matched player is visible.
**Why human:** IndexedDB write (Dexie `playerSeasons.add()`) and leaderboard query chain require the running app.

#### 2. Depth Chart CSV Copy + Notice Absence

**Test:** Navigate to Parse Screenshot. Select "Depth Chart," pick any image, parse it. Verify the grey "Depth charts are not saved to the database in V1." notice is absent. Click "Copy as CSV."
**Expected:** Button label changes to "Copied!" for ~2 seconds. Pasting into a text editor shows `Position,Player Name,Depth` as the first line; subsequent lines match parsed depth chart rows.
**Why human:** Clipboard write and visual UI state require a running browser context.

#### 3. Recruiting Motivations CFB Gating + Hard Sell Banner

**Test:** (a) With a CFB dynasty, open the ingestion page — confirm "Recruit Pitch Screen" appears in the dropdown. (b) With an NFL dynasty, open the ingestion page — confirm "Recruit Pitch Screen" does NOT appear. (c) With a CFB dynasty, parse a screenshot that yields all 3 motivation grades — confirm the banner shows "Hard Sell" or "Send the House." (d) Parse a screenshot with fewer than 3 grades — confirm no banner appears.
**Expected:** Sport-gated visibility; conditional banner.
**Why human:** Runtime sport detection and dynamic parse results require a live run.

#### 4. Multi-Image Sequential Parse + Combined Confirm UI

**Test:** Click "Choose Image File(s)," select 3 images of the same screen type. Observe the parse button label reads "Parse 3 Screenshots." Click it. Watch the loading spinner text.
**Expected:** Spinner shows "Parsing 1 of 3…", "Parsing 2 of 3…", "Parsing 3 of 3…" sequentially. After all 3 parse, the confirmation form shows merged rows from all 3 images (e.g., all players from 3 player-stats screenshots in one form). Repeat with 1 image — spinner shows "Parsing screenshot…" (no progress fraction).
**Why human:** Async sequential loop, React state updates, and combined confirm UI require a running session.

### Gaps Summary

No gaps found. All four PIPE requirements have substantive, wired, data-flowing implementations that match the PLAN frontmatter specifications. TypeScript compiles with zero errors (`npx tsc --noEmit` exit code 0).

The four human verification items are behavioral confirmation tests — the code logic is complete; the tests simply cannot be automated without running the Tauri app.

---

_Verified: 2026-05-04T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
