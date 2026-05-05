---
phase: 23-madden-sync-upgrade
verified: 2026-05-04T00:00:00Z
status: human_needed
score: 6/6 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Sync a live Madden .frs file and confirm non-OVR stat values appear in a player's season record"
    expected: "At least one player season in the database has a non-zero value for pass_yards, rush_yards, rec_yards, sacks, tackles, interceptions, pass_td, rush_td, rec_td, or receptions after the sync completes"
    why_human: "Requires a real Madden .frs file with a PlayerStats table; cannot verify DB writes without running the app against actual save data"
  - test: "Re-sync the same .frs file a second time and confirm no duplicate PlayerSeason rows appear"
    expected: "A second sync against the same year merges stats into the existing PlayerSeason row; db.playerSeasons has the same number of rows as after the first sync"
    why_human: "Requires live app execution with a real franchise file; IndexedDB state cannot be inspected statically"
  - test: "Sync a .frs file where no PlayerStats table exists; confirm sync completes without error"
    expected: "Sync completes successfully, players are saved with overall-only stats, no error toast appears, playerStats returns []"
    why_human: "Requires a real franchise file known to lack a PlayerStats table (or mocked sidecar output); cannot be verified statically"
  - test: "On macOS/Windows with a Madden installation, open MaddenSyncPage with an active Madden dynasty and confirm the chip row appears"
    expected: "If any .frs files exist in Documents/Madden NFL {26,25,24}/saves or Temp/Madden NFL {year}/, chips labeled with the filename appear above the Browse button"
    why_human: "discoverFranchiseFiles will return [] on macOS dev machines (no Madden save paths); requires Windows + Madden installation to observe actual chips"
  - test: "Click a discovered chip and confirm the file path is selected and the validate/extract flow proceeds normally"
    expected: "savePath state is set to the chip's path, storeSavePath is called, validation/sync state resets to idle, Step 2 Validate button appears"
    why_human: "Requires live Tauri app execution with a real file path from the OS filesystem"
---

# Phase 23: Madden Sync Upgrade Verification Report

**Phase Goal:** After a sync, player season records contain real stat lines from the PlayerStats table, and the sync page auto-discovers franchise files in known save locations.
**Verified:** 2026-05-04T00:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Sidecar 'extract' subcommand returns a playerStats array alongside players, games, and draftPicks | VERIFIED | `madden-reader.cjs` line 92: `playerStats: []` in result init; lines 196–233: full PlayerStats extraction block with 4-name fallback chain; `respond(result)` at line 235 serializes the array |
| 2 | commitSyncDiff writes non-OVR stat keys to PlayerSeason.stats for both newly-added and already-existing players | VERIFIED | `madden-sync-service.ts` lines 454–525: primary player loop calls `mapRawStatsToRecord` and writes via upsert; second pass (lines 491–525) processes already-existing players from `diff.playerStats`; canonical keys `pass_yards`, `rush_yards`, `rec_yards`, `pass_td`, `rush_td`, `rec_td`, `sacks`, `tackles`, `interceptions`, `receptions` confirmed at lines 389–400 |
| 3 | Re-running sync against the same year does not create duplicate PlayerSeason rows | VERIFIED | `madden-sync-service.ts` lines 470–473 and 509–511: `db.playerSeasons.where('[playerId+year]').equals([player.id, year]).first()` — upsert guard present in both loops; merge path (`{ ...(existing.stats ?? {}), ...stats }`) used when row exists |
| 4 | When no recognizable PlayerStats table exists, sync still completes with overall-only stats and no error | VERIFIED | `madden-reader.cjs` line 221: `if (result.playerStats.length > 0) break` — falls through all 4 table names silently; `respond(result)` at line 235 fires with `playerStats: []`; per-record and per-table try/catch prevents any error surfacing |
| 5 | On mount of MaddenSyncPage (sport=madden), app scans known save directories for .frs files and surfaces chip buttons above Browse | VERIFIED | `MaddenSyncPage.tsx` lines 84–128: `discoverFranchiseFiles` scans years [26,25,24] in Documents+Temp; lines 178–184: fire-and-forget useEffect wired to `activeDynasty.sport === 'madden'`; lines 433–451: chip row rendered when `discoveredFiles.length > 0` |
| 6 | The Tauri default capability has fs:allow-read-dir, fs:scope-document-recursive, and fs:scope-temp-recursive | VERIFIED | `default.json` entries 14–16: `"fs:allow-read-dir"`, `"fs:scope-document-recursive"`, `"fs:scope-temp-recursive"` present; `fs:scope-home-recursive` absent; total 22 permissions (19 original + 3 new) |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/desktop/src-tauri/sidecar/madden-reader.cjs` | PlayerStats extraction with multi-name fallback chain | VERIFIED | `playerStats: []` init; `statsTableNames` with 4 candidates; `playerNamesByIndex` Map; index-position match; all 10 stat fields; break-on-success pattern |
| `apps/desktop/src/lib/madden-sync-service.ts` | RawPlayerStat interface, ExtractResult.playerStats, SyncDiff.playerStats, upsert-aware commitSyncDiff | VERIFIED | `RawPlayerStat` interface exported (6 references); `playerStats: RawPlayerStat[]` in both `ExtractResult` and `SyncDiff`; `mapRawStatsToRecord` and `findStatsForPlayer` helpers; `[playerId+year]` compound index upsert; `db` imported from `@dynasty-os/db`; `updatePlayerSeason` imported |
| `apps/desktop/src/pages/MaddenSyncPage.tsx` | discoverFranchiseFiles helper + on-mount useEffect + Detected Save Files chip UI | VERIFIED | `discoverFranchiseFiles` async function at module scope; `MADDEN_YEARS = [26, 25, 24]`; imports from `@tauri-apps/api/path` and `@tauri-apps/plugin-fs`; `discoveredFiles` state; fire-and-forget useEffect; `handleSelectDiscovered` mirrors `handlePickFile`; chip row renders with "Detected Save Files" label; no `throw` outside comments |
| `apps/desktop/src-tauri/capabilities/default.json` | Three new fs permissions for directory scanning | VERIFIED | 22 total permissions; `fs:allow-read-dir`, `fs:scope-document-recursive`, `fs:scope-temp-recursive` present at correct positions; `fs:scope-home-recursive` absent; all 19 prior permissions preserved |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `madden-reader.cjs` | `madden-sync-service.ts` | JSON `respond({...result, playerStats: [...]})` over sidecar stdout | VERIFIED | `respond(result)` at line 235 serializes full result including `playerStats`; `extractSaveData` in service parses stdout and returns as `ExtractResult` |
| `madden-sync-service.ts commitSyncDiff` | `db.playerSeasons` | `createPlayerSeason` / `updatePlayerSeason` via player-season-service | VERIFIED | Both functions called in primary player loop (lines 477–485) and second pass (lines 515–523); 5 total call sites (import + 4 calls) |
| `madden-sync-service.ts commitSyncDiff` | `db.playerSeasons` compound index | `where('[playerId+year]').equals([playerId, year]).first()` | VERIFIED | Exact pattern present at lines 471 and 509; `db` import from `@dynasty-os/db` at line 3 |
| `MaddenSyncPage useEffect on mount` | `discoverFranchiseFiles` | `void (async () => { ... })()` fire-and-forget | VERIFIED | Lines 178–184: fire-and-forget IIFE, sport guard `activeDynasty.sport !== 'madden'` |
| `discoverFranchiseFiles` | Tauri `@tauri-apps/plugin-fs` readDir | `exists()` + `readDir()` per directory | VERIFIED | Lines 110–125: `exists(dir)` checked before `readDir(dir)`; each wrapped in try/catch |
| `discovered chip onClick` | `handleSelectDiscovered` | `onClick={() => handleSelectDiscovered(filePath)}` | VERIFIED | Line 442: chip onClick handler calls `handleSelectDiscovered`; handler at lines 248–256 mirrors `handlePickFile` exactly |
| `default.json permissions` | Tauri capability ACL gate | `fs:allow-read-dir` + `fs:scope-document-recursive` + `fs:scope-temp-recursive` | VERIFIED | All three strings present in permissions array at positions 14–16 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `MaddenSyncPage.tsx` — chip row | `discoveredFiles` | `discoverFranchiseFiles()` → `setDiscoveredFiles(files)` in useEffect | Conditional — depends on Windows filesystem paths existing | FLOWING (on Windows with Madden); [] on dev machine — expected behavior per SUMMARY |
| `madden-sync-service.ts` — `commitSyncDiff` | `diff.playerStats` | Flows from `extracted.playerStats` via `computeSyncDiff` return; `extracted` populated by `extractSaveData` → sidecar stdout | Conditional — depends on `PlayerStats` table existing in .frs file | FLOWING when table present; graceful degradation to `[]` otherwise |

### Behavioral Spot-Checks

Step 7b: SKIPPED — no runnable entry points without Tauri desktop runtime. All behavioral verification routed to human verification (Step 8).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| MSYN-01 | 23-01-PLAN.md | After a Madden sync, player season records contain real stat lines (passing yards, rushing yards, receiving yards, defense stats) from the PlayerStats table — not just an OVR rating | VERIFIED (code) / NEEDS HUMAN (runtime) | Sidecar extracts 10 stat fields; service maps to canonical lower_underscore keys; upsert writes to `PlayerSeason.stats`; requires live .frs to confirm DB write |
| MSYN-02 | 23-02-PLAN.md | On mount, MaddenSyncPage auto-detects franchise files in known save locations and shows them as one-click options above the "Browse for file" button | VERIFIED (code) / NEEDS HUMAN (runtime on Windows) | `discoverFranchiseFiles` scans correct paths; chip UI renders; requires Windows + Madden install to verify chips appear |

Both MSYN-01 and MSYN-02 have complete, substantive, wired implementations. Human verification is needed only to confirm runtime behavior against live Madden data.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | — | — | — |

No TODO/FIXME/placeholder comments found. No empty implementations. No hardcoded empty data flowing to rendering without a real data-fetching path. All stub-like `[]` values are initial states immediately overwritten by sidecar output or async discovery.

### Human Verification Required

#### 1. PlayerStats DB Write — Live .frs File

**Test:** Sync a Madden franchise file that has game stats recorded. Open a player's profile after sync completes.
**Expected:** At least one player season record shows a non-zero value for `pass_yards`, `rush_yards`, `rec_yards`, `sacks`, `tackles`, `interceptions`, `pass_td`, `rush_td`, `rec_td`, or `receptions` — not just OVR.
**Why human:** Requires a real Madden .frs binary containing a recognized `PlayerStats` table (`PlayerStats`, `Player Stats`, `Stats`, or `CareerStats`). The sidecar logs which table name succeeded to stderr — useful for diagnosis.

#### 2. Re-sync Idempotency

**Test:** Sync the same .frs file a second time without advancing the season.
**Expected:** No duplicate PlayerSeason rows appear. The player profile season history shows the same season entry with updated/merged stats.
**Why human:** IndexedDB state can only be inspected in a running Tauri app (DevTools → Application → IndexedDB).

#### 3. Graceful Degradation — Missing PlayerStats Table

**Test:** Sync a .frs file from a Madden version or state where no PlayerStats table exists.
**Expected:** Sync completes normally, no error toast, players are saved with overall-only stats (`stats: { overall: N }`).
**Why human:** Requires a specific .frs file known to lack a recognized stats table, or a test fixture.

#### 4. Auto-Discover Chip Row on Windows + Madden

**Test:** On Windows with Madden NFL 25 or 26 installed, open MaddenSyncPage with an active Madden dynasty. Observe the area above the "Browse..." button.
**Expected:** A "Detected Save Files" label and one or more chip buttons appear, each labeled with an .frs filename (not the full path). Hovering the chip shows the full path as a tooltip.
**Why human:** `discoverFranchiseFiles` relies on `documentDir()` and `tempDir()` returning Windows-specific paths (`C:\Users\...\Documents`, `C:\Users\...\AppData\Local\Temp`). On macOS these paths don't contain Madden save files — zero chips are expected and correct.

#### 5. Chip Click — File Selection Parity with Browse

**Test:** Click a discovered chip. Confirm the sync flow proceeds identically to selecting a file via Browse.
**Expected:** The selected path appears in the file display area, the Clear button appears, syncState resets to idle, and Step 2 (Validate File) becomes visible.
**Why human:** Requires live Tauri app execution; `storeSavePath` writes to `plugin-store` which cannot be inspected statically.

### Gaps Summary

No gaps found. All 6 must-have truths are VERIFIED at code level. All artifacts exist, are substantive (not stubs), and are wired into the data flow. Key links between sidecar → service → DB and MaddenSyncPage → discoverFranchiseFiles → chip UI are confirmed. The 5 human verification items all relate to runtime behavior requiring a live Tauri app on Windows with real Madden save files — these are UAT items, not code deficiencies.

The only discrepancy noted: the plan text for 23-02 stated the permissions array would have "exactly 23 entries" but the documented list contains 22. The actual implementation has 22 entries (19 original + 3 new), which matches the documented list and is the correct and secure implementation. This is a copy error in the plan description, not an implementation defect.

---

_Verified: 2026-05-04T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
