# Phase 22: Screenshot Pipeline - Pattern Map

**Mapped:** 2026-05-04
**Files analyzed:** 7 (primary files to be modified or created)
**Analogs found:** 7 / 7

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `apps/desktop/src/pages/ScreenshotIngestionPage.tsx` | component (page, primary edit target) | request-response + CRUD | itself — extend existing file | exact |
| `apps/desktop/src/lib/screenshot-service.ts` | service | request-response | itself — extend existing file | exact |
| `apps/desktop/src/lib/player-season-service.ts` | service | CRUD | itself — already has full CRUD | exact |
| `apps/desktop/src/lib/csv-export.ts` | utility | file-I/O | itself — already exists and is called from RecordsPage | exact |
| `apps/desktop/src/store/player-season-store.ts` | store | CRUD | itself — already has addPlayerSeason | exact |

New files to be created:

| New File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| (inline component) `FuzzyMatchRow` inside ScreenshotIngestionPage | component | request-response | `apps/desktop/src/components/TeamSelect.tsx` | role-match |
| (extended parse branch) `recruiting-motivations` in screenshot-service | service extension | request-response | `apps/desktop/src/lib/screenshot-service.ts` lines 113-134 | exact |

---

## Pattern Assignments

### PIPE-01: Fuzzy match-to-roster UI for player-stats

**Task:** Replace the current read-only player name field in `renderPlayerStatsForm()` with a combobox that lets the user pick a matching roster player. On confirm, call `usePlayerSeasonStore.getState().addPlayerSeason(...)` for each matched row.

**Where to insert:** `ScreenshotIngestionPage.tsx`

#### Roster lookup — how players are already loaded in analogous pages

Pattern from `apps/desktop/src/pages/RosterPage.tsx` lines 1-14 and 92-95:
```typescript
import { usePlayerStore } from '../store/player-store';

// Inside component:
useEffect(() => {
  if (!activeDynasty) return;
  usePlayerStore.getState().loadPlayers(activeDynasty.id);
}, [activeDynasty?.id]);

const { players, loading } = usePlayerStore();
```
`ScreenshotIngestionPage` already imports `useDynastyStore` and `useSeasonStore`. Add `usePlayerStore` the same way. Players are already in the store after `loadPlayers` — no additional service call needed.

#### Fuzzy/substring name matching — closest analog

Pattern from `apps/desktop/src/components/TeamSelect.tsx` lines 28-32:
```typescript
const filtered = query.trim()
  ? config.teams.filter((t) =>
      t.name.toLowerCase().includes(query.toLowerCase())
    )
  : config.teams;
```
For player matching, adapt this to:
```typescript
// Inside renderPlayerStatsForm, per-row:
const matchedPlayers = players.filter((p) =>
  `${p.firstName} ${p.lastName}`.toLowerCase().includes(row.name.toLowerCase())
);
```
There is no external fuzzy library in use. The codebase convention is `String.toLowerCase().includes()` substring matching. Do not introduce a new dependency.

#### Combobox / typeahead dropdown — exact analog

Pattern from `apps/desktop/src/components/TeamSelect.tsx` lines 56-98:
```typescript
<div ref={containerRef} className="relative">
  <input
    type="text"
    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500"
    value={query}
    onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
    onFocus={() => setOpen(true)}
    onBlur={handleBlur}
  />
  {open && (
    <div className="absolute z-50 mt-1 w-full bg-gray-800 border border-gray-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
      {filtered.map((item) => (
        <button
          key={item.id}
          type="button"
          className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors"
          onMouseDown={() => handleSelect(item)}
        >
          {item.name}
        </button>
      ))}
    </div>
  )}
</div>
```
`handleBlur` uses `setTimeout(() => setOpen(false), 150)` so the click on a dropdown option registers before the input loses focus. Copy this timing exactly.

#### Writing playerSeasons — exact store call

Pattern from `apps/desktop/src/components/LogPlayerSeasonModal.tsx` lines 107-119:
```typescript
await usePlayerSeasonStore.getState().addPlayerSeason({
  playerId: player.id,
  dynastyId,
  seasonId: selectedSeason.id,
  year: selectedSeason.year,
  stats,
  awards: awards.length > 0 ? awards : undefined,
  overallRating: overallRating !== '' ? parseInt(overallRating, 10) : undefined,
  notes: notes.trim() || undefined,
});
```
Stats shape is `Record<string, number>` (see `PlayerSeason` in `packages/core-types/src/player.ts` line 36). The parsed screenshot gives stats as `Record<string, string>` — convert each value with `parseFloat(val)`, skip `NaN` and `0` (same guard as `LogPlayerSeasonModal.tsx` lines 92-98):
```typescript
const stats: Record<string, number> = {};
for (const [key, rawVal] of Object.entries(row.stats)) {
  if (rawVal === '' || rawVal === undefined) continue;
  const num = parseFloat(rawVal);
  if (!isNaN(num) && num !== 0) stats[key] = num;
}
```

#### Sequential async save with loading state — exact analog

Pattern from `ScreenshotIngestionPage.tsx` lines 206-234 (`handleSaveSchedule`):
```typescript
async function handleSavePlayerSeasons() {
  if (!activeSeason || !activeDynasty) return;
  setSaving(true);
  try {
    for (const row of playerRows) {
      if (!row.matchedPlayerId) continue;  // skip unmatched rows
      await usePlayerSeasonStore.getState().addPlayerSeason({ ... });
    }
    goToDashboard();
  } catch (e) {
    setError(e instanceof Error ? e.message : 'Failed to save player seasons');
  } finally {
    setSaving(false);
  }
}
```
Use `for...of` with sequential `await` (not `Promise.all`) — this is the established pattern for multi-row saves throughout this file. The `saving` boolean gates the submit button with `disabled={saving}` and swaps label to `'Saving...'` (lines 424-428).

#### New editable row interface — extend existing interface

Extend `EditablePlayerRow` (line 35-38) to add a matched player reference:
```typescript
interface EditablePlayerRow {
  name: string;
  position: string;
  stats: Record<string, string>;
  matchedPlayerId: string | null;   // ADD: null = not yet matched
  matchedPlayerName: string | null; // ADD: display name for matched player
}
```

---

### PIPE-02: CSV export for depth charts

**Task:** Add an export button to `renderDepthChartForm()`. Depth charts are currently display-only (not saved to DB — see line 684 comment). CSV export is the primary value-add for this screen type.

**Where to insert:** `ScreenshotIngestionPage.tsx` — at top of file add import; in `renderDepthChartForm()` add export button.

#### Import pattern

Pattern from `apps/desktop/src/pages/RosterPage.tsx` line 12:
```typescript
import { exportTableToCsv } from '../lib/csv-export';
```

#### Export handler pattern

Pattern from `apps/desktop/src/pages/RosterPage.tsx` lines 133-143:
```typescript
async function handleExportCsv() {
  const rows = sortedPlayers.map((p) => ({
    firstName: p.firstName,
    lastName: p.lastName,
    position: p.position,
    ...
  }));
  await exportTableToCsv(rows, 'roster.csv');
}
```
For depth chart:
```typescript
async function handleExportDepthChart() {
  const rows = depthEntries.map((e) => ({
    position: e.position,
    playerName: e.playerName,
    depth: e.depth,
  }));
  await exportTableToCsv(rows, `depth-chart-${activeSeason?.year ?? 'unknown'}.csv`);
}
```

#### Export button placement

Pattern from `apps/desktop/src/pages/RecordsPage.tsx` lines 207-216 — a standalone async button adjacent to the discard/confirm row:
```typescript
<button
  onClick={() => void handleExportDepthChart()}
  className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg"
>
  Export CSV
</button>
```
Place in the button row at `renderDepthChartForm()` lines 749-756, alongside the existing "Return to Dashboard" button.

#### csv-export.ts internals (do not modify this file)

`apps/desktop/src/lib/csv-export.ts` lines 11-23 — already complete. It uses `papaparse` + Tauri `save` dialog + `writeTextFile`. No changes needed. Only call site code is new.

---

### PIPE-03: `recruiting-motivations` screenshot type

**Task:** Add a new `ScreenType` value `'recruiting-motivations'` to `screenshot-service.ts` and a matching parse/display branch in `ScreenshotIngestionPage.tsx`.

#### Adding a new ScreenType — exact pattern

Pattern from `apps/desktop/src/lib/screenshot-service.ts` lines 6-23:
```typescript
export type ScreenType =
  | 'schedule'
  | 'player-stats'
  | 'recruiting'
  | 'depth-chart'
  | 'nfl-schedule'
  | 'nfl-player-stats'
  | 'nfl-depth-chart'
  | 'recruiting-motivations';   // ADD

export const SCREEN_TYPE_LABELS: Record<ScreenType, string> = {
  ...existing,
  'recruiting-motivations': 'Recruiting Motivations',  // ADD
};
```

#### Adding a new parsed data shape — exact pattern

Pattern from `apps/desktop/src/lib/screenshot-service.ts` lines 49-60 (`RecruitingParsedData`):
```typescript
export interface RecruitingMotivationsParsedData {
  screenType: 'recruiting-motivations';
  recruits: Array<{
    name?: string;
    position?: string;
    motivation1?: string;
    motivation2?: string;
    motivation3?: string;
    dealBreakerMotivation?: string;
  }>;
}
```
Add to the `ParsedScreenData` union (line 102-109).

#### Vision prompt — exact pattern

Pattern from `apps/desktop/src/lib/screenshot-service.ts` lines 113-134 (`SCREEN_TYPE_PROMPTS`):
```typescript
'recruiting-motivations':
  'You are parsing a CFB 25 recruiting screen showing recruit motivation tags. For each visible recruit, extract their name, position, and up to 3 motivation labels plus any deal breaker motivation label. Valid motivation values are: Academics, Campus Lifestyle, Closer to Home, Coach Reputation, Conference Prestige, Distance From Home, Financial Aid, NFL Draft Potential, Playing Time, Program Prestige, Scheme Fit, Stability, Team Culture, Weather. Team context: {teamName} ({season} season). Return ONLY valid JSON matching: {"recruits": [{"name": string|null, "position": string|null, "motivation1": string|null, "motivation2": string|null, "motivation3": string|null, "dealBreakerMotivation": string|null}]}. No explanation — JSON only.',
```
The 14 valid motivation strings come from `apps/desktop/src/lib/cfb-categories.ts` `CFB_DEAL_BREAKER_CATEGORIES` (lines 10-25). Embed them verbatim in the prompt as the enum guard.

#### Parsed data → editable state — exact pattern

Pattern from `ScreenshotIngestionPage.tsx` lines 155-202 (`initEditableState`):
```typescript
// Add new branch:
} else if (data.screenType === 'recruiting-motivations') {
  const d = data as RecruitingMotivationsParsedData;
  setMotivationRows(
    (d.recruits ?? []).map((r) => ({
      name: r.name ?? '',
      position: r.position ?? '',
      motivation1: r.motivation1 ?? '',
      motivation2: r.motivation2 ?? '',
      motivation3: r.motivation3 ?? '',
      dealBreakerMotivation: r.dealBreakerMotivation ?? '',
      matchedRecruitId: null,
    }))
  );
}
```

#### Motivation dropdown rendering — exact analog

Pattern from `apps/desktop/src/pages/RecruitingPage.tsx` lines 506-538:
```typescript
import { CFB_DEAL_BREAKER_CATEGORIES } from '../lib/cfb-categories';

<select
  value={row.motivation1}
  onChange={(e) => updateMotivationRow(i, 'motivation1', e.target.value)}
  className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
>
  <option value="">Motivation 1 — (optional)</option>
  {CFB_DEAL_BREAKER_CATEGORIES.map((c) => (
    <option key={c} value={c}>{c}</option>
  ))}
</select>
```
Render 3 motivation selects + 1 deal breaker select per recruit row, same as `RecruitingPage.tsx` lines 504-553.

#### Hard Sell recommendation display

Show a computed badge per row. Hard Sell fires when the recruit's `dealBreakerMotivation` matches a category the coaching staff can pitch. For Phase 22, display the `dealBreakerMotivation` value as an amber badge (no computation yet — just display the raw value). Badge pattern from `apps/desktop/src/pages/RosterPage.tsx` lines 35-42:
```typescript
// Amber badge for deal breaker motivation:
<span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-900/40 text-amber-300 border border-amber-700">
  Deal Breaker: {row.dealBreakerMotivation}
</span>
```

#### Save handler — write motivations back to Recruit records

The `recruiting-motivations` screen captures motivation fields for recruits that already exist (or need to be matched). Write path: `addRecruit` from `apps/desktop/src/lib/recruiting-service.ts` already accepts `motivation1/2/3` and `dealBreakerMotivation` (per `Recruit` type in `packages/core-types/src/recruiting.ts` lines 27-31). If matching to an existing recruit is too complex for Phase 22, save as a separate confirmation step that logs motivations only — same "display-only + note" pattern as depth charts.

---

### PIPE-04: Multi-image ingestion

**Task:** Allow selecting multiple images and processing them sequentially, one per screen-type assignment.

#### Current single-file open — baseline

`ScreenshotIngestionPage.tsx` lines 108-123:
```typescript
async function handleFileOpen() {
  const selected = await open({
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
    multiple: false,
  });
  if (!selected || typeof selected !== 'string') return;
  setImagePath(selected);
  const bytes = await readFile(selected);
  const binary = Array.from(bytes).map((b) => String.fromCharCode(b)).join('');
  const base64 = btoa(binary);
  setImageBase64(base64);
  setParsedData(null);
  setError(null);
}
```

#### Multi-file open — change `multiple: false` to `multiple: true`

`open()` with `multiple: true` returns `string[]` instead of `string`. The codebase does not yet have a multi-file open pattern — introduce it by changing the return type guard:
```typescript
async function handleFilesOpen() {
  const selected = await open({
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
    multiple: true,
  });
  if (!selected) return;
  const paths = Array.isArray(selected) ? selected : [selected];
  setImagePaths(paths);
  // Load base64 for the first image (or store all, process sequentially)
}
```
State changes: `imagePath: string | null` becomes `imagePaths: string[]` and current index is tracked with `currentImageIndex: number`.

#### Sequential processing pattern — exact analog

Pattern from `ScreenshotIngestionPage.tsx` lines 206-234 (`handleSaveSchedule`) — same `for...of` + sequential `await` pattern applies:
```typescript
async function handleParseAll() {
  setSaving(true);
  for (const path of imagePaths) {
    setCurrentImagePath(path);
    // load bytes for this path, parse, accumulate results
  }
  setSaving(false);
}
```
Loading indicator: the existing amber spinner at lines 848-853 (`border-amber-500 border-t-transparent rounded-full animate-spin`) with `"Parsing screenshot..."` label. For multi-image, show `"Parsing image N of M..."`.

---

## Shared Patterns

### Loading / saving state guard
**Source:** `apps/desktop/src/pages/ScreenshotIngestionPage.tsx` lines 86-90, 133-152, 208-234
**Apply to:** All new async handlers

```typescript
const [loading, setLoading] = useState(false);
const [saving, setSaving] = useState(false);
const [error, setError] = useState<string | null>(null);

// Pattern: set flag, try/catch, always clear flag in finally
setSaving(true);
try {
  // ... await work ...
} catch (e) {
  setError(e instanceof Error ? e.message : 'Failed to ...');
} finally {
  setSaving(false);
}
```

### Error display
**Source:** `apps/desktop/src/pages/ScreenshotIngestionPage.tsx` lines 856-866
**Apply to:** All new form sections with save buttons
```typescript
{error && !loading && (
  <div className="bg-red-900/20 border border-red-600/50 rounded-lg p-4 flex items-center justify-between">
    <p className="text-red-400 text-sm">{error}</p>
    <button onClick={handleParse} className="bg-gray-700 hover:bg-gray-600 px-3 py-1.5 text-sm rounded text-white">
      Retry
    </button>
  </div>
)}
```

### Editable table row mutation
**Source:** `apps/desktop/src/pages/ScreenshotIngestionPage.tsx` lines 314-398 (schedule form rows)
**Apply to:** Any new editable row arrays
```typescript
// Immutable update pattern (used consistently throughout the page):
onChange={(e) => {
  const updated = [...rowArray];
  updated[i] = { ...updated[i], fieldName: e.target.value };
  setRowArray(updated);
}}

// Delete row:
onClick={() => setRowArray(rowArray.filter((_, idx) => idx !== i))}
```

### Input + button styling constants
**Source:** `apps/desktop/src/pages/ScreenshotIngestionPage.tsx` lines 55-57
**Apply to:** All new inputs in this file
```typescript
const AMBER_INPUT = 'bg-amber-900/20 border-amber-600/50';
const BASE_INPUT = 'w-full rounded-lg px-3 py-2 text-white text-sm border focus:outline-none focus:ring-1 focus:ring-amber-500';
```
Primary action buttons: `px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-lg disabled:opacity-50`
Secondary/cancel buttons: `px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg`

### CSV export call site
**Source:** `apps/desktop/src/pages/RecordsPage.tsx` lines 207-226; `apps/desktop/src/pages/RosterPage.tsx` lines 133-143
**Apply to:** Depth chart export button handler
```typescript
import { exportTableToCsv } from '../lib/csv-export';

async function handleExport() {
  const rows = data.map((item) => ({ ...flatFields }));
  await exportTableToCsv(rows, 'filename.csv');
}

// Button: no disabled needed — export is always available when data exists
<button onClick={() => void handleExport()} className="px-4 py-2.5 bg-gray-700 ...">
  Export CSV
</button>
```

### Motivation category selects
**Source:** `apps/desktop/src/pages/RecruitingPage.tsx` lines 502-553
**Apply to:** `recruiting-motivations` screen type form
```typescript
import { CFB_DEAL_BREAKER_CATEGORIES } from '../lib/cfb-categories';

// Three motivation selects + one deal breaker select, all using same option list:
{CFB_DEAL_BREAKER_CATEGORIES.map((c) => (
  <option key={c} value={c}>{c}</option>
))}
```

### Store action call — playerSeason write
**Source:** `apps/desktop/src/components/LogPlayerSeasonModal.tsx` lines 107-119
**Apply to:** PIPE-01 fuzzy-match save handler
```typescript
await usePlayerSeasonStore.getState().addPlayerSeason({
  playerId: matchedPlayer.id,
  dynastyId: activeDynasty.id,
  seasonId: activeSeason.id,
  year: activeSeason.year,
  stats,  // Record<string, number> — floats, no zeros, no NaN
});
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (none) | — | — | All Phase 22 features have direct codebase analogs |

The closest gap is the fuzzy player-name combobox inside a table row — `TeamSelect.tsx` provides the combobox shell but is a standalone component for team names. The adaptation to inline per-row usage inside `renderPlayerStatsForm()` is novel, but the parts (filter logic, dropdown markup, `onBlur` delay) all come directly from `TeamSelect.tsx`.

---

## Key Decisions for Planner

1. **No fuzzy library.** The codebase uses `String.toLowerCase().includes()` substring matching exclusively. Do not add `fuse.js` or `fastest-levenshtein`.

2. **Player lookup source.** Players come from `usePlayerStore` (already loads via `loadPlayers(dynastyId)`). Call `usePlayerStore.getState().loadPlayers(activeDynasty.id)` in a `useEffect` on mount, identical to `RosterPage.tsx` line 94. Players are then available as `usePlayerStore((s) => s.players)`.

3. **`recruiting-motivations` is CFB-only.** Add it only to `CFB_SCREEN_TYPES` array (`ScreenshotIngestionPage.tsx` line 103), not to `NFL_SCREEN_TYPES`.

4. **Clipboard copy — not used in this codebase.** No existing pattern found for `navigator.clipboard.writeText`. The CSV export via `exportTableToCsv` (Tauri save dialog) is the export convention used everywhere.

5. **Multi-image state lift.** Lifting from `imagePath: string | null` to `imagePaths: string[]` + `currentIndex: number` is the only state-shape change needed. The parse and confirm flow remains per-image, iterating over the array.

6. **`PlayerSeason.stats` is `Record<string, number>`.** Parsed screenshot stats arrive as `Record<string, string>`. Always convert with `parseFloat`, drop zeros and NaN (see `LogPlayerSeasonModal.tsx` lines 92-98 for the exact guard).

---

## Metadata

**Analog search scope:** `apps/desktop/src/`, `packages/core-types/src/`
**Files scanned:** 14 source files read; ~10 grep passes
**Pattern extraction date:** 2026-05-04
