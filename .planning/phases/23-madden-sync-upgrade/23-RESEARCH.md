# Phase 23: Madden Sync Upgrade — Research

**Researched:** 2026-05-04
**Domain:** Madden franchise save file parsing, Tauri filesystem, player season stats
**Confidence:** HIGH (codebase verified), MEDIUM (PlayerStats table names), LOW (save path heuristics)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MSYN-01 | After a Madden sync, player season records contain real stat lines (passing yards, rushing yards, receiving yards, defense stats, etc.) from the `PlayerStats` table — not just an OVR rating | Sidecar must add a `PlayerStats` extraction pass; field names confirmed LOW confidence pending live .frs file test |
| MSYN-02 | On mount, `MaddenSyncPage` auto-detects franchise files in known save locations and shows them as one-click options above the "Browse for file" button | Tauri `@tauri-apps/api/path` `documentDir()`/`tempDir()` + `readDir` from plugin-fs enables directory scanning; two capability additions required |
</phase_requirements>

---

## Summary

Phase 23 upgrades the Madden franchise sync along two axes: (1) the sidecar needs to extract player season stats from the `PlayerStats` table in addition to the current `Player` table (which only yields OVR ratings), and (2) the `MaddenSyncPage` needs to auto-discover `.frs` files in known Windows save directories and display them as one-click options.

**What the current sidecar actually does (verified from source):** The `extract` subcommand in `madden-reader.cjs` reads three tables: `Player` (OVR rating, name, position, jersey number, age), `SeasonGame` (game scores), and `DraftPick` (round/pick). It never touches a stats table. The `commitSyncDiff` function in `madden-sync-service.ts` creates `PlayerSeason` records with only `{ overall: p.overall }` in the `stats` field — no passing yards, rushing yards, or any other stat line.

**The PlayerStats table situation (LOW confidence):** The `madden-franchise` library reads table names dynamically from the binary file's schema; they are not hardcoded in the library. The most likely table name candidates based on community tooling are `PlayerStats` or `SeasonStats` — neither is confirmed by the library's source or official docs. The safest approach is to attempt multiple table name candidates (fallback chain) in the sidecar, the same pattern already used for `SeasonGame` / `NFLSchedule` / `Schedule`. The stat field names (`PassYards`, `RushYards`, `RecYards`, `Sacks`, `Tackles`, `Interceptions`, `PassTD`, `RushTD`, `RecTD`) are also LOW confidence and require a try/catch field access pattern.

**Save file auto-discovery:** The existing `MaddenSyncPage` already shows users the hint path `C:\Users\[Name]\AppData\Local\Temp\Franchise\`. Community tooling confirms Madden 24/25/26 also store franchise files in `Documents\Madden NFL [25|26]\Saves\`. Tauri's `@tauri-apps/api/path` provides `documentDir()` and `tempDir()` — already imported in `auto-export-service.ts`. Directory scanning via `readDir` from `@tauri-apps/plugin-fs` is available. Two new Tauri capability permissions are required: `fs:allow-read-dir` and `fs:scope-document-recursive` (and `fs:scope-temp-recursive` for the Temp path).

**Primary recommendation:** Two-plan phase — Plan 1 adds PlayerStats extraction to the sidecar and updates `commitSyncDiff` to write real stat lines; Plan 2 adds auto-discover to `MaddenSyncPage` and adds the required Tauri capability permissions.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| PlayerStats extraction | Sidecar (Node.js madden-reader.cjs) | — | Stats live in the .frs binary; only the sidecar process can read it via `madden-franchise` |
| Stats writing to DB | Frontend (madden-sync-service.ts) | — | `commitSyncDiff` creates `PlayerSeason` records; already owns this responsibility |
| Save path discovery | Frontend (MaddenSyncPage.tsx) | Tauri path API | Uses `documentDir()`/`tempDir()` + `readDir` at mount time; no Rust command needed |
| Filesystem scanning | Tauri plugin-fs | — | `readDir` with `fs:allow-read-dir` + scope capabilities |

---

## Standard Stack

### Core (all already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `madden-franchise` | 4.1.6 [VERIFIED: package.json] | .frs file parsing | Already installed in sidecar; supports M19–M26 |
| `@tauri-apps/plugin-fs` | 2.4.5 [VERIFIED: package.json] | File system ops | Already installed; `readDir` + `exists` + scopes needed |
| `@tauri-apps/api/path` | 2.10.1 [VERIFIED: package.json] | Resolve OS dirs | Already imported in `auto-export-service.ts`; `documentDir()`, `tempDir()` cover the two known Madden save roots |

### No new packages needed
Both requirements are satisfied with already-installed dependencies plus sidecar modifications and Tauri capability additions.

---

## Architecture Patterns

### System Architecture Diagram

```
MaddenSyncPage.tsx (mount)
  │
  ├── MSYN-02: Auto-discover
  │     ├── documentDir() → Documents/Madden NFL [25|26]/Saves/*.frs
  │     └── tempDir()     → AppData/Local/Temp/Franchise/*.frs
  │           └── readDir() × 3 paths → [{ name, path }] chip list
  │
  └── MSYN-01: Sync flow (existing)
        └── extractSaveData() → runSidecar(['extract', filePath])
              └── madden-reader.cjs extract subcommand
                    ├── Player table       → { name, position, overall }
                    ├── SeasonGame table   → { scores, week }
                    ├── DraftPick table    → { round, pick }
                    └── PlayerStats table  → { playerId?, PassYards, RushYards, ... }  [NEW]
                          └── JSON result: { ...existing, playerStats: RawPlayerStat[] }

commitSyncDiff() / commitSyncDiff() [updated]
  └── For each player in diff.playersToAdd:
        └── createPlayerSeason({ stats: { overall, PassYards, RushYards, ... } })
```

### Recommended Project Structure
No new files needed. All changes are in:
```
apps/desktop/src-tauri/sidecar/
  └── madden-reader.cjs              # Add PlayerStats extraction in extractData()

apps/desktop/src/lib/
  └── madden-sync-service.ts         # Add RawPlayerStat type; update ExtractResult + commitSyncDiff

apps/desktop/src/pages/
  └── MaddenSyncPage.tsx             # Add auto-discover UI above Browse button

apps/desktop/src-tauri/capabilities/
  └── default.json                   # Add fs:allow-read-dir + scope-document + scope-temp
```

### Pattern 1: PlayerStats Fallback Chain in Sidecar

The same multi-name-fallback pattern used for schedule tables should be applied to stats tables. [ASSUMED] table names are `PlayerStats`, `SeasonStatLine`, `SeasonStats`:

```javascript
// Source: madden-reader.cjs (existing pattern for SeasonGame)
const statsTableNames = ['PlayerStats', 'SeasonStatLine', 'SeasonStats'];
for (const tableName of statsTableNames) {
  try {
    const table = franchise.getTableByName(tableName);
    if (!table) continue;
    await table.readRecords([
      'PlayerIdRef', 'PlayerRef',           // reference back to player
      'PassYards', 'PassTD', 'Interceptions',
      'RushYards', 'RushTD', 'Fumbles',
      'RecYards', 'RecTD', 'Receptions',
      'Sacks', 'Tackles', 'TFL',
    ]);
    for (const record of table.records) {
      if (record.isEmpty) continue;
      try {
        result.playerStats.push({
          playerRef: record.PlayerIdRef ?? record.PlayerRef ?? null,
          passYards: record.PassYards ?? null,
          passTD: record.PassTD ?? null,
          interceptions: record.Interceptions ?? null,
          rushYards: record.RushYards ?? null,
          rushTD: record.RushTD ?? null,
          recYards: record.RecYards ?? null,
          recTD: record.RecTD ?? null,
          receptions: record.Receptions ?? null,
          sacks: record.Sacks ?? null,
          tackles: record.Tackles ?? null,
        });
      } catch (_) { /* skip malformed */ }
    }
    if (result.playerStats.length > 0) break;
  } catch (_) { /* table not in this version */ }
}
```

**Important:** The `PlayerRef` field in PlayerStats is likely a binary reference to the Player table row, not a string ID. The matching must be done by player index or by fuzzy-matching name. The safest approach: after extracting both Player table and PlayerStats table, match on array index position if the tables are positionally correlated, or match by player name similarity.

### Pattern 2: Auto-Discover Save Files

```typescript
// In MaddenSyncPage.tsx useEffect on mount
// Source: @tauri-apps/api/path (already imported in auto-export-service.ts)
import { documentDir, tempDir, join } from '@tauri-apps/api/path';
import { readDir, exists } from '@tauri-apps/plugin-fs';

async function discoverFranchiseFiles(): Promise<string[]> {
  const candidates: string[] = [];
  const searchPaths = [
    // Madden 25 / 26 / 27 standard Documents path
    await join(await documentDir(), 'Madden NFL 25', 'saves'),
    await join(await documentDir(), 'Madden NFL 26', 'saves'),
    await join(await documentDir(), 'Madden NFL 27', 'saves'),
    // In-game autosave temp path (shown as hint on existing page)
    await join(await tempDir(), 'Franchise'),
  ];
  for (const dir of searchPaths) {
    try {
      if (!(await exists(dir))) continue;
      const entries = await readDir(dir);
      for (const entry of entries) {
        if (entry.name?.endsWith('.frs')) {
          candidates.push(await join(dir, entry.name));
        }
      }
    } catch { /* dir doesn't exist or not accessible */ }
  }
  return candidates;
}
```

### Pattern 3: Stat Key Mapping to PlayerSeason.stats

`PlayerSeason.stats` is `Record<string, number>` — sparse, lower-case-underscore canonical keys [VERIFIED: player.ts]. Map sidecar field names to canonical keys:

```typescript
// In commitSyncDiff or a new helper
function mapRawStatsToRecord(raw: RawPlayerStat): Record<string, number> {
  const stats: Record<string, number> = {};
  const add = (key: string, val: number | null) => {
    if (val != null && val !== 0) stats[key] = val;
  };
  if (raw.overall != null) add('overall', raw.overall);
  add('pass_yards', raw.passYards);
  add('pass_td', raw.passTD);
  add('interceptions', raw.interceptions);
  add('rush_yards', raw.rushYards);
  add('rush_td', raw.rushTD);
  add('rec_yards', raw.recYards);
  add('rec_td', raw.recTD);
  add('receptions', raw.receptions);
  add('sacks', raw.sacks);
  add('tackles', raw.tackles);
  return stats;
}
```

This follows the existing sparse stats pattern: "PlayerSeason.stats only stores non-zero values" [VERIFIED: STATE.md decisions].

### Pattern 4: Upsert PlayerSeason (not always create)

When stats are extracted for existing players, `commitSyncDiff` should UPDATE existing PlayerSeason records if they already exist for the player+season pair, not create duplicates. The existing `player-season-service.ts` has `updatePlayerSeason(id, updates)`. The commit loop should check for existing records first:

```typescript
// Check for existing PlayerSeason before creating
const existing = await db.playerSeasons
  .where('[playerId+year]')  // compound index verified in schema.ts
  .equals([player.id, year])
  .first();
if (existing) {
  await updatePlayerSeason(existing.id, { stats: mergedStats });
} else {
  await createPlayerSeason({ playerId: player.id, dynastyId, seasonId, year, stats });
}
```

### Anti-Patterns to Avoid

- **Hardcoding field names without try/catch:** PlayerStats field names vary by Madden version. Always wrap individual `record.FieldName` access in try/catch. [ASSUMED]
- **Assuming PlayerStats indexes match Player indexes:** Records may not be positionally correlated. Use a player name or reference field for matching. [ASSUMED]
- **Adding `fs:scope-home-recursive` instead of document + temp:** Home scope is overly broad. Use the more targeted `scope-document-recursive` and `scope-temp-recursive`. [VERIFIED: acl-manifests.json shows both available]
- **Blocking mount on file discovery:** Run `discoverFranchiseFiles()` as a fire-and-forget async call on mount; show discovered files once ready, don't gate render on it.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| .frs binary parsing | Custom parser | `madden-franchise` (already installed) | 700+ regression tests, handles M19–M26 |
| Windows path resolution | String concatenation with hardcoded username | `@tauri-apps/api/path` `documentDir()`, `tempDir()`, `join()` | Returns correct paths on all Windows accounts without user name in code |
| Directory listing | Rust command | `readDir` from `@tauri-apps/plugin-fs` | Already enabled in the frontend; no new Rust code |
| Stat key normalization | Per-field if/else | `mapRawStatsToRecord()` helper function | Centralizes key mapping; easier to extend per stat type |

---

## Common Pitfalls

### Pitfall 1: PlayerStats Table Name Unknown Without Live .frs File
**What goes wrong:** `franchise.getTableByName('PlayerStats')` returns `undefined` on first attempt because the actual table name in the schema is different (e.g., `SeasonStatLine`).
**Why it happens:** Table names are embedded in the .frs binary's schema; `madden-franchise` reads them dynamically, not from a hardcoded list. The library has no documentation on stat table names.
**How to avoid:** Use a multi-candidate fallback array (same pattern as SeasonGame/NFLSchedule). Log which table name succeeded. Accept that no stats are extracted if none of the candidates match — fail gracefully.
**Warning signs:** `result.playerStats.length === 0` after extraction despite a large roster.

### Pitfall 2: PlayerStats-to-Player Linking Ambiguity
**What goes wrong:** PlayerStats records may reference players by a binary reference (row index in the Player table), not by name or a string ID. Mapping `playerStats[i]` to `players[i]` by index works only if both tables are ordered identically.
**Why it happens:** Madden's internal data model uses binary cross-table references, not string foreign keys.
**How to avoid:** For Phase 23, use index-position matching as a first attempt (both tables typically cover the full roster in the same order). If the `PlayerRef` or `PlayerIdRef` field is a reference type, use `record.getReferenceDataByKey('PlayerRef')` to get the row index of the referenced Player record.
**Warning signs:** Stat lines assigned to the wrong player names after sync.

### Pitfall 3: `readDir` Failing on Nonexistent Paths
**What goes wrong:** `readDir('Documents/Madden NFL 25/saves')` throws if the directory doesn't exist, crashing auto-discover.
**Why it happens:** Users who own Madden 26 but not 25 will not have the M25 directory.
**How to avoid:** Always `await exists(dir)` before `readDir(dir)`, and wrap in try/catch. Never throw from `discoverFranchiseFiles()` — return an empty array on any failure.
**Warning signs:** Mount-time errors preventing MaddenSyncPage from rendering.

### Pitfall 4: Missing `fs:allow-read-dir` Capability
**What goes wrong:** Calling `readDir()` from the frontend throws a Tauri permission error even though the fs plugin is installed.
**Why it happens:** Tauri v2 requires explicit per-operation capability grants. The current `default.json` has `fs:allow-read-text-file` and `fs:allow-read-file` but NOT `fs:allow-read-dir`.
**How to avoid:** Add `"fs:allow-read-dir"`, `"fs:scope-document-recursive"`, and `"fs:scope-temp-recursive"` to `default.json`. The scope permissions are also required — without them, the operation permission alone doesn't grant access to paths outside the app data directory.
**Warning signs:** Tauri IPC error mentioning missing permissions in the browser console.

### Pitfall 5: Duplicate PlayerSeason Records on Re-Sync
**What goes wrong:** Every sync creates a new `PlayerSeason` record for each player, producing duplicates.
**Why it happens:** `createPlayerSeason` has no upsert guard; it always inserts.
**How to avoid:** Query `db.playerSeasons.where('[playerId+year]').equals([playerId, year]).first()` before creating. If a record exists, call `updatePlayerSeason` with merged stats. The compound index `[playerId+year]` already exists in the schema [VERIFIED: schema.ts].
**Warning signs:** Multiple PlayerSeason rows for the same player and year in the DB.

---

## Code Examples

### Current Sidecar ExtractResult Shape (verified)
```javascript
// Source: madden-reader.cjs (verified from source)
const result = {
  gameYear: yearFull,
  games: [],      // { week, homeTeam, awayTeam, homeScore, awayScore, gameType }
  players: [],    // { name, position, overall, age, jerseyNumber }
  draftPicks: [], // { round, pick, team }
  // MISSING: playerStats — to be added by Phase 23
};
```

### Updated ExtractResult Shape (Phase 23 target)
```typescript
// Source: to be added in madden-sync-service.ts
export interface RawPlayerStat {
  playerName: string | null;   // for fuzzy-match fallback
  playerIndex: number | null;  // for index-position match
  passYards: number | null;
  passTD: number | null;
  interceptions: number | null;
  rushYards: number | null;
  rushTD: number | null;
  recYards: number | null;
  recTD: number | null;
  receptions: number | null;
  sacks: number | null;
  tackles: number | null;
}

export interface ExtractResult {
  gameYear: number | null;
  games: RawGame[];
  players: RawPlayer[];
  draftPicks: RawDraftPick[];
  playerStats: RawPlayerStat[];  // NEW in Phase 23
  error?: string;
  message?: string;
}
```

### Auto-Discover One-Click Chip UI Pattern
```tsx
// Source: pattern from [Phase 22-02] combobox chip pattern
{discoveredFiles.length > 0 && (
  <div className="flex flex-wrap gap-2">
    <p className="w-full text-xs text-gray-500 uppercase tracking-wider">
      Detected Save Files
    </p>
    {discoveredFiles.map((filePath) => (
      <button
        key={filePath}
        onClick={() => handleSelectDiscovered(filePath)}
        className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-xs text-gray-200 rounded-lg font-mono truncate max-w-xs"
      >
        {filePath.split(/[\\/]/).pop()}  {/* filename only */}
      </button>
    ))}
  </div>
)}
```

---

## Runtime State Inventory

> Omit: This is a feature addition, not a rename/refactor/migration phase. No stored data uses old identifiers that need migration.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual file browse only | Auto-discover + Browse | Phase 23 | Reduces friction for common Madden save locations |
| OVR-only PlayerSeason | Full stat line in PlayerSeason.stats | Phase 23 | Stats show in Records leaderboard (PIPE-01 existing) |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | PlayerStats table name in .frs schema is one of: `PlayerStats`, `SeasonStatLine`, `SeasonStats` | Architecture Patterns (Pattern 1) | No stats extracted; sidecar returns empty `playerStats: []`; graceful degradation — sync still works without stats |
| A2 | PlayerStats field names are `PassYards`, `RushYards`, `RecYards`, `PassTD`, `RushTD`, `RecTD`, `Sacks`, `Tackles`, `Interceptions`, `Receptions` | Pattern 1 code example | Fields return null; mapRawStatsToRecord produces empty record; overall still stored |
| A3 | Player and PlayerStats tables can be matched by array index position (record index = player row in Player table) | Pitfall 2 / Pattern 1 | Stats assigned to wrong player names after sync |
| A4 | Madden 25 saves are in `Documents\Madden NFL 25\saves\` (or `Saves\`) | Pattern 2 auto-discover | That save path not scanned; user falls back to Browse |
| A5 | Madden in-game autosave franchise path is `%TEMP%\Franchise\` | Pattern 2 auto-discover | That save path not scanned; user falls back to Browse |

**Note on A1–A3:** These require a live Madden .frs save file to verify. The sidecar should log which table name and field names successfully yielded data so the developer can confirm or correct on first test run.

---

## Open Questions (RESOLVED)

1. **What is the exact PlayerStats table name in Madden 24/25/26 .frs files?**
   - What we know: The library reads names dynamically from the binary schema; the README and GitHub source do not document table names beyond `Player`, `SeasonGame`, and `DraftPick`
   - What's unclear: Whether the stats table is named `PlayerStats`, `SeasonStatLine`, `SeasonStats`, or something else entirely
   - Recommendation: Implement the fallback chain with debug logging. On first test with a real .frs file, check the log to confirm which name succeeded. If none succeed, the planner must note in the plan that the developer needs to open the file in bep713's Madden Franchise Editor app to inspect available table names.
   - **RESOLVED:** Plan 23-01 Task 1 implements a 4-candidate fallback chain `['PlayerStats', 'Player Stats', 'Stats', 'CareerStats']` with debug logging. The first successful table name is used; logs reveal the correct name on first live test.

2. **Does PlayerStats link back to Player by index position or by a reference field?**
   - What we know: The library supports binary reference fields via `getReferenceDataByKey()`; index-position matching is the simpler path
   - What's unclear: Whether the stat records are ordered 1:1 with Player records
   - Recommendation: Implement index-position matching first; add a fallback to name-based fuzzy match (using the existing `findBestPlayerMatch` pattern from Phase 22)
   - **RESOLVED:** Plan 23-01 Task 1 captures `playerNamesByIndex` from the Player table during extraction, then tags each stat record by name before emitting JSON. The service layer matches by name (case-insensitive), making it robust against ordering changes.

3. **Is `Documents\Madden NFL 25\saves\` the correct path, or is it `Documents\Madden NFL 25\Saves\` (capital S)?**
   - What we know: Windows filesystem is case-insensitive but path strings matter in `readDir`
   - Recommendation: Use `exists()` on both variants, or just try both with the fallback pattern
   - **RESOLVED:** Plan 23-02 Task 2 scans both `saves` and `Saves` capitalizations for the Documents path, and also scans the Temp path. Whichever resolves first with `.frs` files is shown.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@tauri-apps/api/path` | MSYN-02 auto-discover | ✓ | 2.10.1 | — |
| `@tauri-apps/plugin-fs` readDir | MSYN-02 auto-discover | ✓ | 2.4.5 | — |
| `fs:allow-read-dir` capability | MSYN-02 readDir | ✗ (not in default.json) | — | Add to capabilities |
| `fs:scope-document-recursive` | MSYN-02 Documents scan | ✗ (not in default.json) | — | Add to capabilities |
| `fs:scope-temp-recursive` | MSYN-02 Temp scan | ✗ (not in default.json) | — | Add to capabilities |
| `madden-franchise` PlayerStats API | MSYN-01 stats extraction | ✓ (library present) | 4.1.6 | graceful empty-stats fallback |
| Live .frs save file | MSYN-01 table name verification | ✗ (not on dev machine) | — | Fallback chain + logging |

**Missing dependencies with no fallback:**
- None — all can be addressed via code or capability additions.

**Missing dependencies with fallback:**
- `fs:allow-read-dir` + scopes: add to `default.json` — planner must include this in Plan 2
- Live .frs file for verification: sidecar fallback chain covers unknown table names; developer tests with actual Madden installation

---

## Validation Architecture

> `workflow.nyquist_validation` key is absent from `.planning/config.json` — treating as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — Dynasty OS has no automated test infrastructure |
| Config file | None |
| Quick run command | `pnpm --filter @dynasty-os/desktop build` (TypeScript compile check) |
| Full suite command | `pnpm --filter @dynasty-os/desktop build` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MSYN-01 | After sync, PlayerSeason.stats contains non-OVR stat keys | manual-only | n/a — requires live .frs file | ✗ |
| MSYN-02 | Auto-discover shows chips above Browse button when .frs files exist | manual-only | n/a — requires Windows + Madden install | ✗ |
| Both | TypeScript compiles with zero errors | automated | `pnpm --filter @dynasty-os/desktop build` | ✓ (existing) |

### Wave 0 Gaps
- No test infrastructure exists in this project. Manual verification against a live Madden save file is the only available testing approach for MSYN-01 and MSYN-02.
- TypeScript build serves as the minimal automated gate.

---

## Security Domain

> `security_enforcement` is not set to `false` in config — section required.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | yes | Tauri capability scopes restrict readDir to Documents + Temp only, not home-recursive |
| V5 Input Validation | yes | Sidecar returns JSON; `madden-sync-service.ts` already uses typed interfaces with null guards |
| V6 Cryptography | no | — |

### Known Threat Patterns for Tauri + Node.js Sidecar

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal via discovered .frs paths | Tampering | Tauri scope permissions enforce allowlist; `readDir` on scoped paths only returns entries within the scope |
| Malformed .frs file causing sidecar crash | DoS | Sidecar already wraps all extraction in try/catch; `fail()` returns JSON error, never exposes raw errors to user |
| Over-broad filesystem scope | Elevation of privilege | Use `scope-document-recursive` and `scope-temp-recursive` instead of `scope-home-recursive` |

---

## Sources

### Primary (HIGH confidence)
- Codebase: `apps/desktop/src-tauri/sidecar/madden-reader.cjs` — verified current sidecar subcommand structure and table names
- Codebase: `apps/desktop/src/lib/madden-sync-service.ts` — verified ExtractResult, commitSyncDiff, and `{ overall }` only stat write
- Codebase: `packages/core-types/src/player.ts` — verified `PlayerSeason.stats: Record<string, number>`
- Codebase: `packages/db/src/schema.ts` — verified `[playerId+year]` compound index on playerSeasons table
- Codebase: `apps/desktop/src-tauri/capabilities/default.json` — verified current permissions; confirmed `fs:allow-read-dir` is absent
- Codebase: `apps/desktop/src-tauri/gen/schemas/acl-manifests.json` — verified `fs:allow-read-dir`, `fs:scope-document-recursive`, `fs:scope-temp-recursive` are all valid available permissions
- Codebase: `apps/desktop/node_modules/@tauri-apps/api/path.d.ts` — verified `documentDir()`, `tempDir()`, `join()` are exported
- Codebase: `apps/desktop/node_modules/@tauri-apps/plugin-fs/dist-js/index.d.ts` — verified `readDir()`, `exists()` are exported
- Codebase: `apps/desktop/src/lib/auto-export-service.ts` — verified `appDataDir` from `@tauri-apps/api/path` is already imported in the project
- Library: `madden-franchise` README — verified getTableByName() API, record.FieldName access pattern, and supported game years (M19–M26)
- `STATE.md` decisions — verified sparse stats pattern, PlayerSeason.stats sparse Record, Phase 9 sidecar architecture decisions

### Secondary (MEDIUM confidence)
- Multiple sources: Madden NFL 25 save files in `Documents\Madden NFL 25\saves` [minitool.com, updatecrazy.com]
- MaddenSyncPage.tsx existing hint text: `C:\Users\[Name]\AppData\Local\Temp\Franchise\` [verified in source]

### Tertiary (LOW confidence)
- [WebSearch only] PlayerStats table name candidates (`PlayerStats`, `SeasonStatLine`, `SeasonStats`) — not confirmed in any official source; derived from community tool descriptions of "stat tables for each week" (MaddenToCSV tool)
- [WebSearch only] Stat field name candidates (`PassYards`, `RushYards`, etc.) — not confirmed; based on CamelCase convention in Madden schema naming

---

## Metadata

**Confidence breakdown:**
- Sidecar architecture: HIGH — source verified
- PlayerSeason type and DB schema: HIGH — source verified
- Tauri path + fs API: HIGH — source verified
- Tauri capability permissions needed: HIGH — acl-manifests.json verified
- PlayerStats table name: LOW — no live .frs file available; community tooling doesn't expose this
- Stat field names: LOW — no live .frs file; derived from naming conventions
- Madden save file locations (Documents path): MEDIUM — multiple web sources agree

**Research date:** 2026-05-04
**Valid until:** 2026-06-04 (stable domain; madden-franchise 4.1.6 is current; Tauri APIs stable)
