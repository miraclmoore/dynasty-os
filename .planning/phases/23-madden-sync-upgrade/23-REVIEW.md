---
phase: 23-madden-sync-upgrade
reviewed: 2026-05-04T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - apps/desktop/src-tauri/sidecar/madden-reader.cjs
  - apps/desktop/src/lib/madden-sync-service.ts
  - apps/desktop/src/pages/MaddenSyncPage.tsx
  - apps/desktop/src-tauri/capabilities/default.json
findings:
  critical: 3
  warning: 5
  info: 3
  total: 11
status: issues_found
---

# Phase 23: Code Review Report

**Reviewed:** 2026-05-04
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Phase 23 implements the Madden franchise save file sync pipeline: a Node.js sidecar (`madden-reader.cjs`) that reads `.frs` files via the `madden-franchise` library, a TypeScript service layer (`madden-sync-service.ts`) that orchestrates extraction and DB writes, and a React page (`MaddenSyncPage.tsx`) that drives the multi-step UX.

Three blockers were found. Two are logic bugs that produce incorrect data in the database on every sync run: (1) the `resolveGameType` function maps bowl games to `'playoff'` even though `'bowl'` is a valid `GameType` value, causing bowl games to be permanently mislabeled; (2) the draft pick deduplication is absent, causing every sync to re-insert all draft picks from the save file. The third blocker is a concurrent sync race condition — the file watcher's "Sync Now" banner button calls `handleExtract` without checking `syncState`, meaning it can fire a second extraction while a save or confirm operation is in progress.

Additionally, there is a subtle team-matching logic flaw that causes all games to be incorrectly assigned to the home team whenever the raw save contains a null `homeTeam` value, a `playersAdded` counter that inflates when `createPlayer` throws, and an `npm install` in the `update` subcommand that will silently fail inside a read-only macOS app bundle.

---

## Critical Issues

### CR-01: Bowl Games Permanently Stored as Playoff Type

**File:** `apps/desktop/src/lib/madden-sync-service.ts:270`
**Issue:** `resolveGameType` maps any game whose raw type string contains `"bowl"` or `"super"` to `'playoff'`. However, `GameType` in `@dynasty-os/core-types` includes `'bowl'` as a distinct value (`'regular' | 'conference' | 'bowl' | 'playoff' | 'exhibition'`). Every bowl game synced from Madden — including the Super Bowl — is written to the DB as `'playoff'`, discarding the correct type. This is a data accuracy defect that corrupts historical records on every sync.

**Fix:**
```typescript
function resolveGameType(raw: string | null): GameType {
  if (!raw) return 'regular';
  const lower = raw.toLowerCase();
  if (lower.includes('playoff') || lower.includes('post')) return 'playoff';
  if (lower.includes('super')) return 'playoff';        // Super Bowl is playoff
  if (lower.includes('bowl')) return 'bowl';            // other bowl games
  if (lower.includes('exhibition') || lower.includes('preseason')) return 'exhibition';
  return 'regular';
}
```

---

### CR-02: Draft Picks Are Never Deduplicated — Duplicate Inserts on Every Sync

**File:** `apps/desktop/src/lib/madden-sync-service.ts:361-365`
**Issue:** The `computeSyncDiff` function for draft picks only skips entries where both `round` and `pick` are `null`. It does not query existing draft picks for the season, so `draftPicksToAdd` always contains the full set of picks from the save file. On every sync, `commitSyncDiff` calls `createDraftPick` for every pick, unconditionally inserting duplicates into the DB. The comment on line 360 says "dedupe by round+pick if same season already has entries" but that logic is never implemented.

**Fix:**
```typescript
// In computeSyncDiff, after fetching existingSeasons:
import { getDraftPicksBySeason } from './draft-service';

const existingDraftPicks = await getDraftPicksBySeason(seasonId);
const existingPickKeys = new Set(
  existingDraftPicks.map((dp) => `${dp.round}-${dp.pickNumber ?? ''}`)
);

for (const dp of extracted.draftPicks) {
  if (dp.round === null && dp.pick === null) { draftPicksSkipped++; continue; }
  const key = `${dp.round}-${dp.pick ?? ''}`;
  if (existingPickKeys.has(key)) { draftPicksSkipped++; continue; }
  draftPicksToAdd.push(dp);
}
```

---

### CR-03: Watcher "Sync Now" Triggers Concurrent Sync Without State Guard

**File:** `apps/desktop/src/pages/MaddenSyncPage.tsx:389-395`
**Issue:** The file watcher modification banner renders unconditionally based on `watcherPrompt` state and its "Sync Now" button calls `handleExtract()` directly. `handleExtract` only checks `!savePath || !activeSeason` before proceeding — it does not check `syncState`. If the banner appears while a sync is already in progress (e.g., `syncState === 'saving'` or `'confirming'`), a second concurrent extraction is launched. Two concurrent calls to `commitSyncDiff` will attempt simultaneous writes to the same season, producing duplicate game records and incorrect player season data.

**Fix:**
```tsx
onClick={() => {
  setWatcherPrompt(false);
  // Only allow re-sync from a terminal state
  if (syncState === 'idle' || syncState === 'validated' || syncState === 'done') {
    handleExtract();
  }
}}
```

---

## Warnings

### WR-01: Null HomeTeam Matches Every Game as Home Due to Empty-String Substring Logic

**File:** `apps/desktop/src/lib/madden-sync-service.ts:321`
**Issue:** The team-matching condition is `homeTeamLower.includes(teamLower) || teamLower.includes(homeTeamLower)`. When `g.homeTeam` is `null`, `homeTeamLower` becomes `''`. The expression `teamLower.includes('')` is always `true` (every string contains the empty string), so the first branch matches regardless of whether the team is actually at home. Any game with a null `homeTeam` field will be incorrectly classified as a home game, wrong score side, and wrong opponent.

**Fix:**
```typescript
// Guard against empty strings in the matching logic
if (
  homeTeamLower.length > 0 &&
  (homeTeamLower.includes(teamLower) || teamLower.includes(homeTeamLower))
) {
  // home branch
} else if (
  awayTeamLower.length > 0 &&
  (awayTeamLower.includes(teamLower) || teamLower.includes(awayTeamLower))
) {
  // away branch
} else {
  gamesSkipped++;
  continue;
}
```

---

### WR-02: `npm install` in `update` Subcommand Fails Silently in Packaged macOS App

**File:** `apps/desktop/src-tauri/sidecar/madden-reader.cjs:258`
**Issue:** `updatePackage()` runs `execSync('npm install madden-franchise@latest', { cwd: __dirname, ... })`. In a packaged Tauri application on macOS, `__dirname` resolves inside the read-only `.app` bundle. `npm install` will fail with a permissions or ENOENT error, but the error is only surfaced as a `fail('update_error', ...)` response — the UI shows "Update failed" with no actionable context. The feature is silently broken in production on macOS and should either be documented as unsupported in production builds or write to a user-writable path.

**Fix:**
Either gate the `update` subcommand behind a development check, or document explicitly that it only works in dev mode. If it should work in production, the sidecar directory must be placed in a user-writable location (e.g., `$APPDATA` on Windows, `~/Library/Application Support` on macOS) and `__dirname` replaced with that path.

---

### WR-03: `playersAdded` Counter Increments Even When `createPlayer` Throws

**File:** `apps/desktop/src/lib/madden-sync-service.ts:487`
**Issue:** `playersAdded++` is placed outside and after the `if (player)` block, meaning it runs regardless of whether `createPlayer` succeeds. Since `createPlayer` returns `Promise<Player>` (never null) but can throw on DB error, any unhandled exception from `createPlayer` will propagate up and abort the whole `commitSyncDiff` loop — but if individual player creates were wrapped in try/catch to make them resilient, the counter would overcount. More practically, the `if (player)` check at line 467 is dead code since `createPlayer` never returns a falsy value — it either returns `Player` or throws. The counter should be inside that guard for correctness.

**Fix:**
```typescript
const player = await createPlayer({ ... });
// createPlayer always returns Player or throws — no null check needed
const matchedStat = findStatsForPlayer(fullName, diff.playerStats);
// ... season creation ...
playersAdded++;
```
Remove the `if (player)` dead-code guard, or move `playersAdded++` inside it if the intent is to count only successfully created players.

---

### WR-04: Version Comparison Uses String Equality Instead of Semver

**File:** `apps/desktop/src/lib/madden-sync-service.ts:242`
**Issue:** `updateAvailable: installed !== latest` compares version strings with strict equality. This works correctly when both strings are clean semver (e.g., `"4.1.6"` vs `"4.2.0"`), but fails if either string has a leading `v` prefix, build metadata, or pre-release suffix (e.g., `"4.1.6"` vs `"4.1.7-beta.1"`). The result could be `updateAvailable: true` for a pre-release that is actually older, triggering an unwanted update prompt.

**Fix:**
Either strip `v` prefixes before comparison, or use a lightweight semver comparison (`semver.lt(installed, latest)` from the `semver` package that is already a transitive dependency via npm).

---

### WR-05: `startWatching` Called Without `await` in `useEffect` — Cleanup Race on Fast Unmount

**File:** `apps/desktop/src/pages/MaddenSyncPage.tsx:189`
**Issue:** The watcher effect calls `startWatching(savePath, ...)` without `await`. `startWatching` is `async` and calls `stopWatching()` internally before registering a new watcher. If the component unmounts or the effect re-runs before `startWatching` resolves, the cleanup function (`stopWatching()` in the return) fires before the new watcher is registered, leaving an orphaned watcher that is never cleaned up.

**Fix:**
```typescript
useEffect(() => {
  if (!watcherOn || !savePath) {
    void stopWatching();
    return;
  }
  let cancelled = false;
  void startWatching(savePath, () => {
    if (!cancelled) setWatcherPrompt(true);
  });
  return () => {
    cancelled = true;
    void stopWatching();
  };
}, [watcherOn, savePath]);
```

---

## Info

### IN-01: `0-0 Score` Filter in Sidecar vs Truthy Check in Service Are Inconsistent

**File:** `apps/desktop/src-tauri/sidecar/madden-reader.cjs:116-117` and `apps/desktop/src/lib/madden-sync-service.ts:303`
**Issue:** The sidecar filters out games where both scores are `0` (allowing games where only one score is `0`). The service-layer filter `!g.homeScore || !g.awayScore` is a truthy check that also skips any game where one team scored `0`. A real game where one team scores `0` (e.g., a shutout 14–0) would be correctly included by the sidecar but then dropped by the service layer's truthy check. While 0-score games are rare in practice, the logic is inconsistent.

**Fix:**
```typescript
// Use explicit null check consistent with the sidecar's intent
if (g.homeScore === null || g.awayScore === null || g.week === null) {
  gamesSkipped++;
  continue;
}
```

---

### IN-02: `supported` Is Hardcoded `true` — `unsupported` UI State Is Unreachable

**File:** `apps/desktop/src-tauri/sidecar/madden-reader.cjs:68-69`
**Issue:** The `validate` subcommand always returns `{ supported: true, unsupportedReason: null }`. There is no logic to detect or signal an unsupported Madden version. The `unsupported` sync state and its entire UI section in `MaddenSyncPage.tsx` (lines 510–559) are currently dead code. This is not a bug per se, but it documents that version detection is a known stub.

**Fix:** Either implement version range detection in `validateFile` (e.g., reject `gameYear < 2019 || gameYear > 2026`) or add a comment acknowledging the stub so it is not mistaken for functional code.

---

### IN-03: `shell:allow-execute` Capability Is Overly Broad

**File:** `apps/desktop/src-tauri/capabilities/default.json:15`
**Issue:** The `shell:allow-execute` permission grants the frontend the ability to spawn arbitrary executables via the Tauri shell plugin, not just the registered sidecar. The narrower `shell:allow-sidecar` (or specifying individual command names in the allowlist) would limit the attack surface if an XSS or malicious web content were ever injected into the webview.

**Fix:** Replace `"shell:allow-execute"` with `"shell:allow-sidecar"` if only sidecar invocation is needed, and verify no other use of `Command.create()` (non-sidecar) exists in the codebase before removing `allow-execute`.

---

_Reviewed: 2026-05-04_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
