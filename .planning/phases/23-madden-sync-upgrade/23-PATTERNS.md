# Phase 23: Madden Sync Upgrade — Pattern Map

**Mapped:** 2026-05-04
**Files analyzed:** 5 (4 modified, 1 config)
**Analogs found:** 5 / 5

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `apps/desktop/src-tauri/sidecar/madden-reader.cjs` | sidecar script | batch / transform | itself (existing table extraction blocks) | exact |
| `apps/desktop/src/lib/madden-sync-service.ts` | service | CRUD / transform | itself (existing `commitSyncDiff`) + `nil-service.ts` (compound index query) | exact |
| `apps/desktop/src/pages/MaddenSyncPage.tsx` | component / page | request-response | itself (existing `useEffect` + state pattern) + `auto-export-service.ts` (path API) | exact |
| `apps/desktop/src-tauri/capabilities/default.json` | config | — | itself (existing permissions block) | exact |
| `apps/desktop/src/lib/player-season-service.ts` | service | CRUD | `nil-service.ts` (compound index) + itself (`updatePlayerSeason`) | role-match |

---

## Pattern Assignments

### `apps/desktop/src-tauri/sidecar/madden-reader.cjs` (sidecar, batch/transform)

**Analog:** itself — the existing table-extraction loop pattern used for `SeasonGame`, `Player`, and `DraftPick` tables.

**Core fallback-chain pattern** (lines 95–130, SeasonGame block — authoritative pattern to copy):
```javascript
const scheduleTableNames = ['SeasonGame', 'NFLSchedule', 'ScheduleTable', 'Schedule'];
for (const tableName of scheduleTableNames) {
  try {
    const table = franchise.getTableByName(tableName);
    if (!table) continue;

    await table.readRecords(['HomeScore', 'AwayScore', 'SeasonWeek', 'Week',
      'HomeTeamIndex', 'AwayTeamIndex', 'SeasonType', 'GameType']);

    for (const record of table.records) {
      if (record.isEmpty) continue;
      try {
        // ... field access with ?? null fallback
        result.games.push({ ... });
      } catch (_) { /* skip malformed record */ }
    }
    if (result.games.length > 0) break;
  } catch (_) { /* table not in this version */ }
}
```

**What to copy for PlayerStats block:** Add a fourth extraction block immediately before `respond(result)` (line 191), following the same structure:
- Candidate array: `['PlayerStats', 'SeasonStatLine', 'SeasonStats']`
- `readRecords` call with all candidate field names
- Inner `try/catch` per record (field names may be absent in some versions)
- `result.playerStats = []` added to the initial `result` object at line 87–92
- Break on first table that yields records
- Never throw from the outer catch — log to `process.stderr` so the planner can trace which table name succeeded

**result object initialization** (lines 87–92) — add `playerStats: []`:
```javascript
const result = {
  gameYear: yearFull,
  games: [],
  players: [],
  draftPicks: [],
  playerStats: [],   // NEW — Phase 23
};
```

**Error handling pattern** — the sidecar wraps the entire `extractData` body in one top-level try/catch (lines 82–194). Inner per-record errors use `catch (_) { /* skip malformed record */ }`. Never expose raw error text to stdout — only `fail()` or `respond()` write to stdout.

---

### `apps/desktop/src/lib/madden-sync-service.ts` (service, CRUD/transform)

**Analog:** itself for type definitions and `commitSyncDiff`; `nil-service.ts` for compound-index query pattern.

**Imports pattern** (lines 1–14 — verified):
```typescript
import { Command } from '@tauri-apps/plugin-shell';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { createGame, getGamesBySeason } from './game-service';
import { createPlayer, getPlayersByDynasty } from './player-service';
import { createPlayerSeason, getPlayerSeasonsByDynasty } from './player-season-service';
import { createDraftPick } from './draft-service';
```

**New import to add** — `updatePlayerSeason` must be imported (it already exists in `player-season-service.ts` line 33):
```typescript
import { createPlayerSeason, getPlayerSeasonsByDynasty, updatePlayerSeason } from './player-season-service';
```

**Type definition pattern** (lines 22–62 — existing Raw* interfaces):
```typescript
export interface RawGame {
  week: number | null;
  homeTeam: string | null;
  // ...all fields nullable
}
```
Copy this null-field pattern for the new `RawPlayerStat` interface:
```typescript
export interface RawPlayerStat {
  playerName: string | null;
  playerIndex: number | null;
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
```

**ExtractResult extension** (lines 55–62 — add `playerStats` field):
```typescript
export interface ExtractResult {
  gameYear: number | null;
  games: RawGame[];
  players: RawPlayer[];
  draftPicks: RawDraftPick[];
  playerStats: RawPlayerStat[];  // NEW — Phase 23
  error?: string;
  message?: string;
}
```

**Also update `extractSaveData` fallback return** (lines 192–199) to include `playerStats: []`:
```typescript
return {
  gameYear: null,
  games: [],
  players: [],
  draftPicks: [],
  playerStats: [],  // NEW
  error: 'parse_error',
  message: 'Could not parse extraction output.',
};
```

**commitSyncDiff — existing player loop** (lines 399–420 — copy and extend):
```typescript
// Existing pattern — creates player + PlayerSeason shell with OVR only
for (const p of diff.playersToAdd) {
  const nameParts = (p.name ?? '').split(' ');
  const firstName = nameParts[0] ?? '';
  const lastName = nameParts.slice(1).join(' ') || '';
  const player = await createPlayer({ ... });
  if (player) {
    await createPlayerSeason({
      playerId: player.id,
      dynastyId,
      seasonId,
      year,
      stats: p.overall != null ? { overall: p.overall } : {},
    });
  }
  playersAdded++;
}
```
Phase 23 extends this: pass `stats: mapRawStatsToRecord(matchedStat)` instead of `{ overall: p.overall }`.

**Upsert guard — compound index pattern** from `nil-service.ts` lines 27–31 (exact pattern to copy for existing-player stat update):
```typescript
// From nil-service.ts — compound index query
db.nilEntries
  .where('[dynastyId+playerId]')
  .equals([dynastyId, playerId])
  .toArray();
```
Adapted for PlayerSeason upsert:
```typescript
const existing = await db.playerSeasons
  .where('[playerId+year]')        // compound index verified: schema.ts line 6
  .equals([player.id, year])
  .first();
if (existing) {
  await updatePlayerSeason(existing.id, { stats: mergedStats });
} else {
  await createPlayerSeason({ playerId: player.id, dynastyId, seasonId, year, stats });
}
```

**updatePlayerSeason pattern** from `player-season-service.ts` lines 33–38:
```typescript
export async function updatePlayerSeason(
  id: string,
  updates: Partial<Omit<PlayerSeason, 'id' | 'playerId' | 'dynastyId' | 'createdAt'>>
): Promise<void> {
  await db.playerSeasons.update(id, { ...updates, updatedAt: Date.now() });
}
```
No changes needed to this function — call it as-is.

**Error handling pattern** — all service functions are `async`, never throw, use try/catch with typed fallback returns (see `validateSaveFile` lines 161–177 and `extractSaveData` lines 185–200). The new `mapRawStatsToRecord` helper should follow the same never-throw pattern.

---

### `apps/desktop/src/pages/MaddenSyncPage.tsx` (component/page, request-response)

**Analog:** itself for state management and `useEffect` patterns; `auto-export-service.ts` for `@tauri-apps/api/path` import pattern.

**Existing useEffect pattern** (lines 112–122 — copy this structure for auto-discover):
```typescript
useEffect(() => {
  if (activeDynasty) {
    useSeasonStore.getState().loadSeasons(activeDynasty.id);
  }
  void (async () => {
    const path = await getStoredSavePath();
    if (path) setSavePath(path);
    const watcher = await isWatcherEnabled();
    setWatcherOn(watcher);
  })();
}, [activeDynasty?.id]);
```
The `void (async () => { ... })()` fire-and-forget IIFE is the project's established pattern for non-blocking async work in `useEffect`. Auto-discover must use this same pattern — never `await discoverFranchiseFiles()` directly in the effect body or block mount.

**Path API import pattern** from `auto-export-service.ts` lines 1–2:
```typescript
import { appDataDir } from '@tauri-apps/api/path';
import { writeTextFile, mkdir } from '@tauri-apps/plugin-fs';
```
For auto-discover, extend to:
```typescript
import { documentDir, tempDir, join } from '@tauri-apps/api/path';
import { readDir, exists } from '@tauri-apps/plugin-fs';
```

**New state to add** — follows the existing `useState` block pattern (lines 89–106):
```typescript
const [discoveredFiles, setDiscoveredFiles] = useState<string[]>([]);
```

**Chip button UI pattern** from `LauncherPage.tsx` lines 84–95:
```tsx
{SPORT_CHIPS.map(({ key, label }) => (
  <button
    key={key}
    onClick={() => setSportFilter(sportFilter === key ? null : key)}
    className="px-2.5 py-1 rounded-full text-xs font-medium transition-all ..."
  >
    {label}
  </button>
))}
```
For discovered file chips, adapt to:
```tsx
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
        {filePath.split(/[\\/]/).pop()}
      </button>
    ))}
  </div>
)}
```
Place this block inside the Step 1 section (line 356), above the existing `Browse…` button (line 362).

**handleSelectDiscovered handler** — follows the same shape as `handlePickFile` (lines 174–184):
```typescript
const handlePickFile = async () => {
  const path = await pickSaveFile();
  if (!path) return;
  setSavePath(path);
  await storeSavePath(path);
  setValidation(null);
  setExtracted(null);
  setDiff(null);
  setErrorMsg(null);
  setSyncState('idle');
};
```
`handleSelectDiscovered(filePath: string)` is identical but receives the path directly instead of opening a dialog.

**Error handling pattern** — all async handlers in MaddenSyncPage use early returns and `setErrorMsg` (lines 186–207). `discoverFranchiseFiles` must never throw — it returns `[]` on any error, so mount-time failures are silent and never call `setErrorMsg`.

---

### `apps/desktop/src-tauri/capabilities/default.json` (config)

**Analog:** itself — the existing permissions array format.

**Current permissions block** (lines 6–26 — verified):
```json
"permissions": [
  "core:default",
  "dialog:allow-save",
  "dialog:allow-open",
  "fs:allow-write-text-file",
  "fs:allow-read-text-file",
  "fs:allow-read-file",
  "fs:allow-exists",
  "fs:scope-download",
  "shell:allow-execute",
  "shell:allow-open",
  "fs:allow-watch",
  "fs:allow-mkdir",
  "fs:scope-appdata-recursive",
  "store:default",
  "store:allow-load",
  "store:allow-get",
  "store:allow-set",
  "store:allow-delete",
  "store:allow-entries"
]
```

**Three permissions to add** (append after `fs:scope-appdata-recursive`):
```json
"fs:allow-read-dir",
"fs:scope-document-recursive",
"fs:scope-temp-recursive"
```
All three are confirmed available in `apps/desktop/src-tauri/gen/schemas/acl-manifests.json`. Without `fs:allow-read-dir`, `readDir()` throws a Tauri IPC permission error. Without the scope permissions, `readDir` on Documents/Temp paths fails even with the operation permission.

---

### `apps/desktop/src/lib/player-season-service.ts` (service, CRUD)

**Analog:** itself — no structural changes needed. The existing `updatePlayerSeason` function (lines 33–38) is already sufficient and will be called from `commitSyncDiff`.

**No new exports needed.** The service already exports:
- `createPlayerSeason` (line 5) — used for new players
- `updatePlayerSeason` (line 33) — used for existing players' stat merge
- `getPlayerSeasonsByDynasty` (line 25) — used in `computeSyncDiff` to check existing records

The only change needed is in the **caller** (`madden-sync-service.ts`) — the service file itself is unchanged.

---

## Shared Patterns

### Fire-and-Forget Async in useEffect
**Source:** `apps/desktop/src/pages/MaddenSyncPage.tsx` lines 116–122
**Apply to:** The new auto-discover `useEffect` in `MaddenSyncPage.tsx`
```typescript
void (async () => {
  // async work here — never awaited at effect level
})();
```

### Null-Safe Field Access with ?? null
**Source:** `apps/desktop/src-tauri/sidecar/madden-reader.cjs` lines 107–125 (SeasonGame record extraction)
**Apply to:** PlayerStats record field access in the new sidecar extraction block
```javascript
const homeScore = record.HomeScore ?? null;
const week = record.SeasonWeek ?? record.Week ?? null;
```
Every `record.FieldName` access is guarded with `?? null`. Never assume a field exists.

### Sparse Stats Record Pattern
**Source:** `apps/desktop/src/lib/madden-sync-service.ts` line 418
**Apply to:** `mapRawStatsToRecord` helper in `madden-sync-service.ts`
```typescript
stats: p.overall != null ? { overall: p.overall } : {}
```
`PlayerSeason.stats` is `Record<string, number>` — only store keys with non-null, non-zero values. Zero-value stats are not stored.

### Compound Index Query
**Source:** `apps/desktop/src/lib/nil-service.ts` lines 27–30
**Apply to:** Upsert guard in `commitSyncDiff` (`madden-sync-service.ts`)
```typescript
db.nilEntries
  .where('[dynastyId+playerId]')
  .equals([dynastyId, playerId])
  .toArray();
```

### Service-Level Error Handling (never throw)
**Source:** `apps/desktop/src/lib/madden-sync-service.ts` lines 161–177 (`validateSaveFile`)
**Apply to:** `discoverFranchiseFiles` helper in `MaddenSyncPage.tsx`
```typescript
} catch {
  return {
    valid: false, gameYear: null, yearShort: null, supported: false,
    unsupportedReason: null, error: 'parse_error',
    message: 'Could not parse sidecar response. ...',
  };
}
```
Pattern: outer try/catch returns a typed fallback, never re-throws, never surfaces raw error to UI.

---

## No Analog Found

No files in this phase lack a codebase analog. All patterns are derived from existing source.

---

## Metadata

**Analog search scope:** `apps/desktop/src-tauri/sidecar/`, `apps/desktop/src/lib/`, `apps/desktop/src/pages/`, `apps/desktop/src-tauri/capabilities/`, `packages/db/src/`
**Files scanned:** 10 source files read directly + grep across pages/
**Pattern extraction date:** 2026-05-04
