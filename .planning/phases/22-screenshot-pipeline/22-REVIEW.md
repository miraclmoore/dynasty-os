---
phase: 22-screenshot-pipeline
reviewed: 2026-05-04T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - apps/desktop/src/lib/fuzzy-match.ts
  - apps/desktop/src/lib/recruiting-calculator.ts
  - apps/desktop/src/lib/screenshot-service.ts
  - apps/desktop/src/pages/ScreenshotIngestionPage.tsx
findings:
  critical: 3
  warning: 6
  info: 2
  total: 11
status: issues_found
---

# Phase 22: Code Review Report

**Reviewed:** 2026-05-04T00:00:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

The screenshot pipeline implements a full loop: file selection → Claude Vision API → editable confirmation form → DB persistence. The library files (`fuzzy-match.ts`, `recruiting-calculator.ts`, `screenshot-service.ts`) are compact and largely correct. The bulk of the defects live in `ScreenshotIngestionPage.tsx`, which is a 1374-line component with several silent data-corruption paths, a stale-state accumulation bug on re-parse, and a tie-score logic error that always records a loss.

---

## Critical Issues

### CR-01: Tie-score games are always recorded as losses

**File:** `apps/desktop/src/pages/ScreenshotIngestionPage.tsx:405`

**Issue:** The result derivation `tScore > oScore ? 'W' : 'L'` classifies any non-win (including a tied score) as `'L'`. A user reviewing a screen that shows a 21–21 game will silently write a loss to the database. The core type `GameResult` presumably supports `'T'` or requires a guard, but the logic never reaches it.

**Fix:**
```typescript
const result: GameResult =
  tScore > oScore ? 'W' :
  oScore > tScore ? 'L' :
  'T'; // or handle as needed per GameResult type
```
If `GameResult` does not include `'T'`, add a guard and skip or surface an error for tied scores rather than misclassifying them.

---

### CR-02: `matchedPlayerIds` and `playerSearchTerms` accumulate stale data across re-parses

**File:** `apps/desktop/src/pages/ScreenshotIngestionPage.tsx:282-285`

**Issue:** Inside `handleParse`, the player-stats branch appends to these state arrays using the functional updater form (`(prev) => [...prev, ...newIds]`). When the user re-parses (e.g., hits "Retry" after an error, or parses an additional image batch after viewing the form), the prior match IDs are not cleared before the loop. The merged `playerRows` array is replaced wholesale (line 316), but `matchedPlayerIds` and `playerSearchTerms` retain the old entries, causing index misalignment: `matchedPlayerIds[i]` no longer corresponds to `playerRows[i]`.

**Fix:**
```typescript
// Before the accumulation loop, reset these two arrays:
setMatchedPlayerIds([]);
setPlayerSearchTerms([]);

// Then in the loop, replace the functional-updater form with:
// collect newIds/newTerms into local arrays, set once after the loop
const allMatchedIds: string[] = [];
const allSearchTerms: string[] = [];
// ... push inside loop ...
setMatchedPlayerIds(allMatchedIds);
setPlayerSearchTerms(allSearchTerms);
```
Also, `handleFileOpen` does not clear `matchedPlayerIds` / `playerSearchTerms` when a new file is selected (only `parsedData` and `error` are reset at lines 211–212), so the same misalignment can occur if a user picks new files without refreshing the page.

---

### CR-03: Unsafe JSON cast allows unvalidated API data to write arbitrary stats keys to the database

**File:** `apps/desktop/src/lib/screenshot-service.ts:220-223`

**Issue:** After parsing the Claude response, the code does:
```typescript
const parsed = JSON.parse(jsonText) as Record<string, unknown>;
return { ...parsed, screenType } as ParsedScreenData;
```
This is a type-assertion-only cast — no runtime shape validation. A prompt-injected or malformed Claude response could return an object with extra keys (e.g., `{"stats": {...}, "dynastyId": "...", "screenType": "player-stats"}`) that are spread directly into the returned object and subsequently consumed by `handleSaveStats`. While the Tauri layer controls the actual API key and the threat model is a local app, the parsed data does drive DB writes and should at minimum be structurally validated before return.

**Fix:** Add a minimal runtime shape check before returning. For example, reject results where the required top-level array key (`games`, `players`, `recruits`, `entries`) is missing or is not an array:
```typescript
function isValidParsedShape(screenType: ScreenType, obj: Record<string, unknown>): boolean {
  if (screenType === 'schedule' || screenType === 'nfl-schedule') return Array.isArray(obj.games);
  if (screenType === 'player-stats' || screenType === 'nfl-player-stats') return Array.isArray(obj.players);
  if (screenType === 'recruiting') return Array.isArray(obj.recruits);
  if (screenType === 'depth-chart' || screenType === 'nfl-depth-chart') return Array.isArray(obj.entries);
  if (screenType === 'recruiting-motivations') return Array.isArray(obj.recruits);
  return false;
}

if (!isValidParsedShape(screenType, parsed)) {
  console.warn('[ScreenshotService] Claude response failed shape validation');
  return null;
}
```

---

## Warnings

### WR-01: `initEditableState` is defined but never called — dead code with a latent divergence risk

**File:** `apps/desktop/src/pages/ScreenshotIngestionPage.tsx:334-393`

**Issue:** `initEditableState` is a 60-line function that populates all editable state arrays from a `ParsedScreenData` object. It is never called anywhere. All actual initialization happens inline inside `handleParse`. As logic evolves, this dead function will silently drift from the real initialization path, becoming a maintenance trap (copy-paste edits will miss one of the two paths).

**Fix:** Delete `initEditableState` entirely. If a single-parse initialization path is needed, consolidate the initialization logic into one shared function and call it from `handleParse`.

---

### WR-02: `Array.from(bytes).map(...).join('')` for base64 encoding fails on large images (call stack overflow)

**File:** `apps/desktop/src/pages/ScreenshotIngestionPage.tsx:205-206`

**Issue:**
```typescript
const binary = Array.from(bytes).map((b) => String.fromCharCode(b)).join('');
base64List.push(btoa(binary));
```
`Array.from` on a `Uint8Array` materializes a full JS array before `map`, and `String.fromCharCode` is called per-byte. For a typical 4K screenshot (~4–8 MB), this creates millions of single-char strings in memory before joining. On some platforms/engines this triggers a "Maximum call stack size exceeded" error inside `btoa`. This is the same class of problem that has affected other apps that attempt `btoa(String.fromCharCode(...bytes))` with spread syntax; the array-from variant avoids the spread but not the memory pressure.

**Fix:**
```typescript
// Use Uint8Array-aware approach:
const base64 = btoa(
  Array.from(new Uint8Array(bytes))
    .reduce((acc, byte) => acc + String.fromCharCode(byte), '')
);
// Or, for Tauri, prefer the file-path-based API and let the Rust side handle b64
```
A safer option is to chunk the conversion into segments of 65535 bytes and use `String.fromCharCode.apply`.

---

### WR-03: The markdown fence-stripping regex does not handle multi-line fences correctly

**File:** `apps/desktop/src/lib/screenshot-service.ts:218`

**Issue:**
```typescript
const jsonText = rawText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
```
The `/^.../` anchor only matches the very start of the trimmed string; this is correct for a leading fence. However, `/\s*```$/i` only strips a trailing fence that appears at the very end of the full string. If the model returns something like:
```
```json
{"games": [...]}
```
Some explanation text
```
the trailing `Some explanation text` is not removed, and `JSON.parse` throws, returning `null` silently. This is a known Claude model behavior when the prompt is partially followed. The silent `null` means the user sees the error banner but has no visibility into the raw response.

**Fix:** After trimming fences, verify the remaining string starts with `{` or `[` before attempting to parse. If not, log the raw response for debugging and return `null` with a descriptive message:
```typescript
const jsonText = rawText.trim()
  .replace(/^```(?:json)?\s*/im, '')
  .replace(/\s*```[\s\S]*$/i, ''); // strip trailing fence AND anything after

if (!/^[\[{]/.test(jsonText.trim())) {
  console.warn('[ScreenshotService] Response does not look like JSON:', rawText.slice(0, 200));
  return null;
}
```

---

### WR-04: Re-parsing does not reset stale editable form state from prior parse

**File:** `apps/desktop/src/pages/ScreenshotIngestionPage.tsx:315-322`

**Issue:** The accumulator commit at the end of `handleParse` is conditional:
```typescript
if (mergedGameRows.length > 0) setGameRows(mergedGameRows);
if (mergedPlayerRows.length > 0) setPlayerRows(mergedPlayerRows);
// etc.
```
If the user parses a schedule, the form populates. They then change screen type to `player-stats` and re-parse. Because no player rows are accumulated, `mergedPlayerRows.length === 0` and `setPlayerRows` is never called — `playerRows` still holds the stale game-related data structure from the prior parse. However, `parsedData.screenType` is now `player-stats`, so `renderConfirmationForm` renders the player-stats form reading from the now-mismatched (and empty/stale) `playerRows`. The form renders blank or corrupted.

**Fix:** Always reset all editable state arrays at the start of `handleParse`, before the loop:
```typescript
setGameRows([]);
setPlayerRows([]);
setRecruitRows([]);
setDepthEntries([]);
setMatchedPlayerIds([]);
setPlayerSearchTerms([]);
setClassRank('');
setTotalCommits('');
```

---

### WR-05: `getHardSellRecommendation` returns `'Send the House'` (not `null`) when all grades are unknown/invalid

**File:** `apps/desktop/src/lib/recruiting-calculator.ts:30-31`

**Issue:** `gradeToPoints` returns `0` for any unrecognized grade string (via `?? 0`). If all three grade strings pass the non-null check in `getHardSellRecommendation` (e.g., the model returns `"?"` or `"N/A"` for each) but are not in `GRADE_POINTS`, the total is `0 + 0 + 0 = 0`, which is `< 19`, and the function returns `'Send the House'`. The caller then renders a "Send the House" banner — an actionable recruiting recommendation — based on entirely invalid data.

**Fix:** Add a validation step before summing:
```typescript
export function getHardSellRecommendation(
  grade1: string | null | undefined,
  grade2: string | null | undefined,
  grade3: string | null | undefined,
): HardSellResult {
  if (!grade1 || !grade2 || !grade3) return null;
  const p1 = gradeToPoints(grade1);
  const p2 = gradeToPoints(grade2);
  const p3 = gradeToPoints(grade3);
  // Treat unrecognized grade (0 points) as missing data
  if (p1 === 0 || p2 === 0 || p3 === 0) return null;
  const total = p1 + p2 + p3;
  return total >= 19 ? 'Hard Sell' : 'Send the House';
}
```

---

### WR-06: Character-set similarity allows false matches between short and long names

**File:** `apps/desktop/src/lib/fuzzy-match.ts:36-44`

**Issue:** The fallback similarity tier uses character-set overlap: `|intersection| / max(|setA|, |setB|)`. For a candidate name like `"A.J."`, after normalization to `"aj"`, the character set is `{'a','j'}`. This set is a full subset of nearly any player name containing those letters (e.g., `"Jake Brown"` → `{'j','a','k','e','b','r','o','w','n'}`: intersection `{'a','j'}` → score = 2/9 ≈ 0.22, which is below the 0.4 threshold). However, short parsed names with only 2–3 unique characters can produce surprisingly high scores against slightly different names — for example, `"Bo"` → `{'b','o'}` vs. `"Bob"` → `{'b','o'}` scores 1.0 (exact set match) even though they differ. The threshold of 0.4 is low enough that multi-character common subsets can match incorrect players, leading to silently wrong stat attribution.

**Fix:** The 0.4 threshold is a design parameter and the algorithm is intentionally approximate. However, an additional guard to require a minimum normalized length before the set-overlap path fires would reduce false positives:
```typescript
// If either name is very short after normalization, require exact or substring match
if (na.length <= 2 || nb.length <= 2) return 0;
```
This prevents 1–2 character fragments from reaching the set-overlap path.

---

## Info

### IN-01: `imagePath` / `imageBase64` single-image aliases are redundant state

**File:** `apps/desktop/src/pages/ScreenshotIngestionPage.tsx:140-141`

**Issue:** `imagePath` and `imageBase64` are kept as separate state variables described as "single-image aliases" for the queue. They are never used in `handleParse` (which reads from `imageQueue`), and `imageBase64` appears only in the fallback branch of line 218 (`imageQueue.length > 0 ? imageQueue : (imageBase64 ? [imageBase64] : [])`). Since `handleFileOpen` always populates both `imageQueue` and `imageBase64` together, the fallback is unreachable in normal flow. This is dead state that adds mental overhead.

**Fix:** Remove `imageBase64` and the line-218 fallback. `imagePath` is still used by `renderThumbnail` so it can stay, but should be derived from `imagePaths[0]` rather than maintained as separate state.

---

### IN-02: `console.warn` in screenshot-service is the only error signal when the API call succeeds but shape is wrong

**File:** `apps/desktop/src/lib/screenshot-service.ts:213`

**Issue:** The function contract is "never throws, returns null on failure" which is correct. However, the only observability is `console.warn`. In a Tauri app there is no browser DevTools by default for end users; a silent `null` that surfaces as "Failed to parse screenshot" (the thrown error at line 250 of the page) gives no actionable diagnostic. This is a production observability gap.

**Fix:** Consider storing the last error message in a service-level variable or passing it back as a discriminated result (`{ ok: true, data } | { ok: false, reason: string }`) so the UI can surface specific failure reasons rather than a generic retry message. At minimum, document the current limitation.

---

_Reviewed: 2026-05-04T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
