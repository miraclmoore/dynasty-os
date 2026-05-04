# Phase 22: Screenshot Pipeline — Research

**Researched:** 2026-05-04
**Domain:** Tauri + React screenshot ingestion; fuzzy name matching; Dexie playerSeasons; recruiting motivation parsing
**Confidence:** HIGH (all findings verified directly from codebase)

---

## Summary

Phase 22 extends the existing `ScreenshotIngestionPage.tsx` (943 lines) and `screenshot-service.ts` with four targeted capabilities. Three of four are entirely within the frontend (no new Tauri permissions or backend changes needed). The fourth (`recruiting-motivations` type) requires new types and a prompt in `screenshot-service.ts`.

The handoff doc (`docs/dynasty-os-claude-code-handoff.md`) contains fully-written reference implementations for Tasks 13–16 and Task 19. These are the canonical blueprints; research confirms they are consistent with the current codebase state except for two deviations documented below.

**Primary recommendation:** Follow the handoff doc blueprints exactly, with corrections for (1) the missing `[playerId+seasonId]` compound index and (2) the absence of `usePlayerStore` import in `ScreenshotIngestionPage`. All four PIPE requirements are independently deliverable; plan as four separate tasks.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Fuzzy name matching | Frontend (lib utility) | — | Pure string computation, no I/O |
| PlayerSeason write | Frontend (Dexie via store) | — | Dexie runs client-side in Tauri WebView |
| Records leaderboard feed | Frontend (records-service) | — | Reads from same Dexie `playerSeasons` table |
| Depth chart CSV export | Frontend (clipboard) | — | `navigator.clipboard.writeText` — no new permissions needed |
| Recruiting motivations parse | Frontend (screenshot-service) | Claude API | New screen type + AI prompt only |
| Hard Sell recommendation | Frontend (new lib utility) | — | Pure grade-to-number computation |
| Multi-image queue | Frontend (state machine) | — | Sequential async loop in component |

---

## PIPE-01: Player Stats → Fuzzy Match → DB Save → Records

### Roster Query Function

**Function:** `getPlayersByDynasty(dynastyId: string): Promise<Player[]>`
**Location:** `apps/desktop/src/lib/player-service.ts` line 20
**Store access:** `usePlayerStore.getState().players` — the store is already loaded when the dynasty is active (used by `RosterPage`, `AddPlayerModal`, etc.)

**Player fields available for name matching:**
- `id: string`
- `firstName: string`
- `lastName: string`
- `position: string`
- `dynastyId: string`

The full name for matching is `${p.firstName} ${p.lastName}`. No single `fullName` field exists.

### Fuzzy Matching Approach

**Recommendation:** Hand-rolled token-overlap utility (no external library).

No fuzzy matching library is installed in the project (verified: no `fuse.js`, `string-similarity`, `levenshtein`, or similar in `apps/desktop/package.json`). The handoff doc prescribes a specific zero-dependency utility:

**New file:** `src/lib/fuzzy-match.ts`

```typescript
// [CITED: docs/dynasty-os-claude-code-handoff.md Task 13a]
export function nameSimilarity(a: string, b: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  const ta = new Set(na.split(''));
  const tb = new Set(nb.split(''));
  const intersection = [...ta].filter(c => tb.has(c)).length;
  return intersection / Math.max(ta.size, tb.size);
}

export function findBestPlayerMatch(
  parsedName: string,
  players: Array<{ id: string; firstName: string; lastName: string; position: string }>
): { player: typeof players[0]; score: number } | null {
  // Try full name match + last-name-only match (0.9x penalty)
  // Return best if score > 0.6, else null
}
```

Score thresholds (from handoff doc):
- `score > 0.85` → auto-matched (show green checkmark)
- `0.6 < score <= 0.85` → needs review (show yellow warning)
- `score <= 0.6` → no match (show red indicator)
- `confirmed: score > 0.85` pre-sets auto-confirmed flag

**Rationale for no external library:** The roster is typically 50–85 players. Character-set overlap is fast enough at this scale. External fuzzy libs add bundle weight and maintenance; the handoff doc explicitly chose this approach.

### Match-to-Roster UI Pattern

**Recommended pattern:** Inline dropdown per player row (not a separate modal step).

Each parsed player row shows:
1. Left column: parsed name + position from screenshot
2. Arrow separator
3. Right column: `<select>` dropdown populated from the full roster, pre-selected to the best fuzzy match
4. Match confidence badge (green/yellow/red)
5. Stat preview grid (first 8 stats in a 4-column grid)

This matches the handoff doc Step 13c blueprint exactly and avoids a multi-step modal flow that would complicate PIPE-04's multi-image combined confirm UI.

### Duplicate Detection for handleSavePlayerStats

**Critical finding:** The handoff doc (Step 13d) references `db.playerSeasons.where('[playerId+seasonId]').equals([...])` — but this compound index **does not exist** in the schema.

**Actual schema** (`packages/db/src/schema.ts`):
```
playerSeasons: 'id, playerId, dynastyId, seasonId, year, [playerId+year]'
```

The correct duplicate-check approach is:
```typescript
// Use the existing service function, then filter in memory
const existing = (await getPlayerSeasonsByPlayer(match.matchedPlayerId))
  .find(ps => ps.seasonId === activeSeason.id);
```

Or use a direct Dexie filter (does not require a compound index):
```typescript
const existing = await db.playerSeasons
  .where('playerId').equals(match.matchedPlayerId)
  .and(ps => ps.seasonId === activeSeason.id)
  .first();
```

Either approach is correct. The service function approach is preferred since it stays consistent with the established pattern. **The planner must not use the `[playerId+seasonId]` form from the handoff doc — it will throw a Dexie error.**

### Stat Key Normalization

**New file:** `src/lib/normalize-stat-key.ts` (or inline function in `ScreenshotIngestionPage.tsx`)

The CFB sport config defines the canonical stat keys (`packages/sport-configs/src/cfb.ts` lines 193–219). The screenshot AI returns raw labels like `"YDS"`, `"TD"`, `"ATT"`. A position-aware lookup table must translate these:

| Position group | Raw label | Canonical key |
|---------------|-----------|---------------|
| QB | YDS | `passingYards` |
| QB | ATT | `attempts` |
| QB | CMP | `completions` |
| QB | TD | `passingTDs` |
| QB | INT | `interceptions` |
| QB | RTG | `passerRating` |
| RB/HB/FB | YDS | `rushingYards` |
| RB/HB/FB | ATT | `rushingAttempts` |
| RB/HB/FB | TD | `rushingTDs` |
| WR/TE | YDS | `receivingYards` |
| WR/TE | REC | `receptions` |
| WR/TE | TD | `receivingTDs` |
| DEF | TKL | `tackles` |
| DEF | SCK | `sacks` |
| DEF | INT | `defenseInterceptions` |
| DEF | FF | `forcedFumbles` |
| DEF | PD | `passDeflections` |
| K | FGM | `fgMade` |
| K | FGA | `fgAttempted` |
| P | AVG | `puntAverage` |
| P | NO | `punts` |
| Any | GP | `gamesPlayed` |

**Note:** `"YDS"` is context-dependent on position — this is why position is required as a parameter.

### Import Dependencies for ScreenshotIngestionPage

The component does not currently import `usePlayerStore` or `usePlayerSeasonStore`. These must be added:

```typescript
import { usePlayerStore, usePlayerSeasonStore } from '../store';
import { createPlayerSeason } from '../lib/player-season-service';
import { db } from '@dynasty-os/db';
```

### Data Flow: Screenshot Parse → Leaderboard

```
User selects image(s)
        ↓
handleFileOpen() → readFile() → base64 encoding
        ↓
handleParse() → parseScreenshot('player-stats', base64, context)
        ↓ [Claude Vision API]
PlayerStatsParsedData: { players: [{ name, position, stats }] }
        ↓
initEditableState() → setPlayerRows([])
        ↓ [new: fuzzy match step]
findBestPlayerMatch() against usePlayerStore.getState().players
        ↓
setPlayerMatches([{ parsedName, parsedPosition, parsedStats, matchedPlayerId, matchScore }])
        ↓
renderPlayerStatsForm() → match-to-roster UI with dropdowns
        ↓ [user reviews, corrects mismatches]
handleSavePlayerStats()
        ↓ [per matched player]
normalizeStatKey(rawLabel, position) → canonical key
        ↓
check for existing PlayerSeason (playerId + seasonId)
        ↓ [upsert]
createPlayerSeason() OR updatePlayerSeason() → db.playerSeasons
        ↓
RecordsPage → getSingleSeasonLeaders(dynastyId, statKey, 10, seasonId)
        ↓
db.playerSeasons.where('seasonId').equals(seasonId).toArray()
        ↓ [bulkGet players by id]
LeaderboardEntry[] → RecordsLeaderboard component
```

**Key insight on leaderboard feed:** `getSingleSeasonLeaders` and `getCareerLeaders` in `records-service.ts` query `db.playerSeasons` directly — no additional wiring needed. Stats written via `createPlayerSeason` appear immediately in the leaderboard on next query. The stat key must match exactly (e.g., `"passingYards"` not `"YDS"`).

---

## PIPE-02: Depth Chart CSV Export

### Current State

`renderDepthChartForm()` (lines 674–759) shows:
- Editable table with `position`, `playerName`, `depth` inputs
- "Return to Dashboard" button only
- "Depth charts are not saved to the database in V1" notice (line 684–687)

### Required Changes

**Replace the gray notice box** (lines 681–685) with:
1. Updated explanatory text (remove "not saved in V1")
2. "Copy as CSV" button using `navigator.clipboard.writeText`

**CSV format** (Position, Player, Depth column order — confirmed from handoff doc Task 14):
```
Position,Player,Depth
QB,Trevor Lawrence,1
QB,Backup Smith,2
...
```

**Implementation:**
```typescript
// [CITED: docs/dynasty-os-claude-code-handoff.md Task 14]
const csv = 'Position,Player,Depth\n' +
  depthEntries.map(e => `${e.position},${e.playerName},${e.depth}`).join('\n');
navigator.clipboard.writeText(csv);
```

**Clipboard availability:** `navigator.clipboard.writeText` is available in Tauri WebView (Chromium-based). No new capability permissions are required. Confirmed that no clipboard-specific Tauri plugin is in use elsewhere, and no clipboard capability is listed in `default.json` — but this is fine because `navigator.clipboard` operates through the web platform API directly in Tauri v2 (no plugin needed for writeText on the renderer side).

**Toast feedback:** Should show a sonner toast "Copied to clipboard" after successful write. Pattern: `import { toast } from 'sonner'` (already available in the app, not in this page yet).

**TODO comment:** Add `// TODO: Future — fuzzy match depth chart entries to roster players and auto-update positions` as prescribed in handoff doc.

---

## PIPE-03: Recruiting Motivations Screen Type

### New Types Required

**In `screenshot-service.ts`:**

```typescript
// Add to ScreenType union:
| 'recruiting-motivations'

// Add to SCREEN_TYPE_LABELS:
'recruiting-motivations': 'Recruit Pitch Screen',

// New parsed data shape:
export interface RecruitingMotivationsParsedData {
  screenType: 'recruiting-motivations';
  recruits: Array<{
    name?: string;
    motivation1?: string;
    motivation1Grade?: string;
    motivation2?: string;
    motivation2Grade?: string;
    motivation3?: string;
    motivation3Grade?: string;
    dealBreaker?: string;
  }>;
}

// Add to ParsedScreenData union:
| RecruitingMotivationsParsedData
```

**CFB-only gating** (lines 102–104 of `ScreenshotIngestionPage.tsx`):
```typescript
const CFB_SCREEN_TYPES: ScreenType[] = [
  'schedule', 'player-stats', 'recruiting', 'depth-chart',
  'recruiting-motivations'  // ADD HERE
];
```

### AI Prompt

```typescript
// [CITED: docs/dynasty-os-claude-code-handoff.md Task 15]
'recruiting-motivations':
  'You are parsing a CFB 26 recruit pitch/motivations screen. Extract the recruit name, their three motivations and each motivation\'s letter grade (A+/A/A-/B+/B/B-/C+/C/C-/D/F), and which motivation is their deal breaker (marked with a star or special indicator). Return ONLY valid JSON: {"recruits": [{"name": string|null, "motivation1": string|null, "motivation1Grade": string|null, "motivation2": string|null, "motivation2Grade": string|null, "motivation3": string|null, "motivation3Grade": string|null, "dealBreaker": string|null}]}. No explanation — JSON only.',
```

### Grade System (CFB 26)

The grade system uses letter grades with `+`/`-` modifiers. Point values (from handoff doc Task 19, cross-referenced with REQUIREMENTS.md TOOL-01):

| Grade | Points | Grade | Points | Grade | Points |
|-------|--------|-------|--------|-------|--------|
| A+    | 13     | B+    | 10     | C+    | 7      |
| A     | 12     | B     | 9      | C     | 6      |
| A-    | 11     | B-    | 8      | C-    | 5      |
|       |        | D+    | 4      | F     | 1      |
|       |        | D     | 3      |       |        |
|       |        | D-    | 2      |       |        |

**Rule of 19:** `sum(grade1Points + grade2Points + grade3Points) >= 19` → Hard Sell; `< 19` → Send the House.

**Note:** This is a numeric threshold on a letter-grade system specific to the EA Sports CFB game series. It is NOT the A=10/B=7/C=4 simplified system. The full `A+` through `F` scale is required. [CITED: docs/dynasty-os-claude-code-handoff.md lines 963–994]

### Hard Sell Calculator

**New file:** `src/lib/recruiting-calculator.ts`

```typescript
// [CITED: docs/dynasty-os-claude-code-handoff.md Task 19]
const GRADE_POINTS: Record<string, number> = {
  'A+': 13, 'A': 12, 'A-': 11,
  'B+': 10, 'B': 9,  'B-': 8,
  'C+': 7,  'C': 6,  'C-': 5,
  'D+': 4,  'D': 3,  'D-': 2,
  'F': 1,
};

export function getHardSellRecommendation(
  grade1: string, grade2: string, grade3: string
): { action: 'hard-sell' | 'send-the-house'; total: number; reason: string }
```

**Phase 22 scope for this function:** Only used inline in `ScreenshotIngestionPage` after parsing a `recruiting-motivations` screenshot. The full RecruitingPage integration (Phase 24 TOOL-01) reuses this same function — creating it now avoids duplication later.

### Data Storage Decision for PIPE-03

PIPE-03 says "parsing returns structured motivation grades and deal breaker; Hard Sell recommendation is shown inline." It does **not** say "save to database." The `Recruit` type (Phase 21) has `motivation1`, `motivation2`, `motivation3`, `dealBreakerMotivation` string fields but **no grade fields** (`motivation1Grade` etc. do not exist on `Recruit`).

**Conclusion:** The `recruiting-motivations` parse result is **display-only in Phase 22**. The form shows parsed data + Hard Sell recommendation inline. There is no "Save" action — only a "Done" / "Return to Dashboard" button. Saving motivation grades to existing recruit records is out of scope for this phase (would require matching by name to the `recruits` table, which is a separate PIPE-01-style matching problem not mentioned in PIPE-03).

**The `Recruit` type does not need modification in Phase 22.** Grade fields are transient parsed data on `RecruitingMotivationsParsedData` only.

### Render Function for Motivations

New `renderRecruitingMotivationsForm()` function in `ScreenshotIngestionPage`. For each parsed recruit:
- Show name + motivation/grade pairs (motivation1 / motivation1Grade, etc.)
- Show deal breaker category
- Show Hard Sell recommendation badge (if all 3 grades present)

Must also add `'recruiting-motivations'` case to `renderConfirmationForm()` (line 761–778) and to `initEditableState()`.

---

## PIPE-04: Multi-Image Sequential Ingestion

### State Architecture

The current single-image flow uses one `imagePath`, one `imageBase64`, one `parsedData`. Multi-image needs a queue approach.

**Recommended state shape:**

```typescript
interface QueuedImage {
  path: string;
  base64: string;
  parsedData: ParsedScreenData | null;
  error: string | null;
}

// Replace current single-image state with:
const [imageQueue, setImageQueue] = useState<QueuedImage[]>([]);
const [currentParseIndex, setCurrentParseIndex] = useState<number>(0);
const [parseProgress, setParseProgress] = useState<{ current: number; total: number } | null>(null);
// parsedData and imagePath become derived from imageQueue[currentParseIndex]
```

**Alternatively (simpler):** Keep the existing single-image state variables but add a `pendingPaths: string[]` queue and a `batchResults: ParsedScreenData[]` accumulator. This minimizes diff size.

**Planner decision point:** The simpler queue approach (pending paths array + results accumulator) is lower risk given the component is already at 943 lines and POLS-03 (Phase 28) will refactor it. **Recommend the simpler approach.**

### File Picker Change

**Line 111:** `multiple: false` → `multiple: true`

**Return type change:** With `multiple: true`, Tauri `open()` returns `string[] | null` instead of `string | null`. The existing check `typeof selected !== 'string'` must change to an array check.

```typescript
// [CITED: docs/dynasty-os-claude-code-handoff.md Task 16]
const selected = await open({
  filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
  multiple: true,
});
// selected is now string[] | null
if (!selected || !Array.isArray(selected) || selected.length === 0) return;
```

### Sequential Parse Loop

```typescript
// Parse sequentially (not parallel) to avoid Claude API rate limits
for (let i = 0; i < paths.length; i++) {
  setParseProgress({ current: i + 1, total: paths.length });
  const bytes = await readFile(paths[i]);
  // ... base64 encoding ...
  const result = await parseScreenshot(screenType, base64, context);
  // accumulate results
}
setParseProgress(null);
```

**Progress indicator text:** "Parsing 3 of 5..." (from PIPE-04 requirement verbatim).

### Combined Confirm UI

After all images are parsed, show the combined confirm forms **in sequence** or **tabbed**. Given the heterogeneity (different screen types could theoretically be in one batch, though the UI currently requires choosing one screen type for all), the simplest implementation is: all parsed results are the same screen type, and the confirm UI shows all player rows / recruit rows / depth entries from all images combined in one scrollable list.

**Recommended:** Stack all parsed rows from all images into the existing `playerRows`, `depthEntries`, etc. arrays. The save handler already iterates these arrays. No structural changes to the save path needed.

**Edge case:** If screen type is the same for all images in a batch (which is the only supported mode — one screen type selector for the whole session), the arrays can simply be concatenated.

### State Machine Summary

```
IDLE
  ↓ user selects screen type
SCREEN_TYPE_SELECTED
  ↓ user picks file(s)
FILES_LOADED (paths[] in state)
  ↓ user clicks "Parse"
PARSING (parseProgress: { current, total })
  ↓ loop completes
CONFIRMING (combined rows in state)
  ↓ user edits + clicks Save
SAVING
  ↓ success
IDLE (navigate to dashboard)
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV generation for depth chart | Custom serializer | Inline template literal | Single table, fixed 3 columns — no library needed |
| Fuzzy name matching | `fuse.js` or `string-similarity` npm | `src/lib/fuzzy-match.ts` (hand-rolled) | 50–85 name roster; zero-dep; prescribed by handoff doc |
| Hard Sell calculation | Ad-hoc grade parsing | `src/lib/recruiting-calculator.ts` | Canonical grade table from handoff doc; reused in Phase 24 |
| Multi-image state | Redux-style reducer | Simple `useState` arrays | Component complexity is Phase 28's problem (POLS-03) |
| Clipboard write | Tauri clipboard plugin | `navigator.clipboard.writeText` | Already works in Tauri WebView; no new permissions needed |

---

## Common Pitfalls

### Pitfall 1: [playerId+seasonId] compound index does not exist

**What goes wrong:** `db.playerSeasons.where('[playerId+seasonId]').equals([...])` throws a Dexie "No index found" error at runtime.
**Why it happens:** The handoff doc Task 13d references this index but the schema (`packages/db/src/schema.ts`) only defines `[playerId+year]`.
**How to avoid:** Use `db.playerSeasons.where('playerId').equals(id).and(ps => ps.seasonId === seasonId).first()` or fetch by player and filter in memory.
**Warning signs:** TypeScript will not catch this — only a runtime error will surface.

### Pitfall 2: `open()` return type changes with `multiple: true`

**What goes wrong:** `typeof selected !== 'string'` guard no longer works — an empty array passes the check.
**Why it happens:** `multiple: false` returns `string | null`; `multiple: true` returns `string[] | null`.
**How to avoid:** Change guard to `!selected || !Array.isArray(selected) || selected.length === 0`.
**Warning signs:** TypeScript will flag `typeof selected !== 'string'` as always true if strict null types are on.

### Pitfall 3: Raw AI stat labels written directly to playerSeasons

**What goes wrong:** `db.playerSeasons` record has `{ "YDS": 3200 }` instead of `{ "passingYards": 3200 }` — the leaderboard never shows the stat because `getSingleSeasonLeaders` queries by canonical key.
**Why it happens:** Forgetting `normalizeStatKey()` before writing.
**How to avoid:** Always pass raw labels through `normalizeStatKey(label, position)` before building the stats object.
**Warning signs:** Records leaderboard shows no results for a player after save.

### Pitfall 4: `recruiting-motivations` appearing for NFL dynasties

**What goes wrong:** NFL users see "Recruit Pitch Screen" in the screen type dropdown.
**Why it happens:** Forgetting to add the type only to `CFB_SCREEN_TYPES` array (line 103).
**How to avoid:** Add to `CFB_SCREEN_TYPES` only; do not add to `NFL_SCREEN_TYPES`.

### Pitfall 5: Hard Sell fires with partial grades

**What goes wrong:** Hard Sell recommendation shows with only 1 or 2 grades filled.
**Why it happens:** Not gating the recommendation on all three grades being present.
**How to avoid:** Only call `getHardSellRecommendation` when `motivation1Grade && motivation2Grade && motivation3Grade` are all truthy.

### Pitfall 6: ScreenshotIngestionPage exceeds 943 lines further — acceptable for Phase 22

**What goes wrong:** (Not a bug, but a risk) The component grows to ~1,200+ lines with all four PIPE additions.
**Why it happens:** All four requirements add state and render functions to this one file.
**How to avoid:** POLS-03 (Phase 28) is explicitly scoped to extract sub-components. **Do not extract sub-components in Phase 22** — it's out of scope and would add scope risk. Accept the growth; add a `// TODO: POLS-03 — extract to sub-component` comment where appropriate.

---

## Key Files and Touch Points

| File | Lines | Action |
|------|-------|--------|
| `apps/desktop/src/lib/screenshot-service.ts` | ~200 | Add `recruiting-motivations` to `ScreenType`, `SCREEN_TYPE_LABELS`, parsed data types, `SCREEN_TYPE_PROMPTS`, `ParsedScreenData` union |
| `apps/desktop/src/pages/ScreenshotIngestionPage.tsx` | 943 | All four PIPE requirements touch this file |
| `apps/desktop/src/lib/fuzzy-match.ts` | NEW | `nameSimilarity()` + `findBestPlayerMatch()` |
| `apps/desktop/src/lib/recruiting-calculator.ts` | NEW | `GRADE_POINTS` + `getHardSellRecommendation()` |
| `apps/desktop/src/lib/normalize-stat-key.ts` | NEW (or inline) | Position-aware raw label → canonical key mapping |

### ScreenshotIngestionPage.tsx Specific Touch Points

| Line(s) | Change |
|---------|--------|
| 2 | `import { open } from '@tauri-apps/plugin-dialog'` — no change needed |
| 9 | Add `import { usePlayerStore, usePlayerSeasonStore } from '../store'` |
| 10 | Add `import { createPlayerSeason, getPlayerSeasonsByPlayer } from '../lib/player-season-service'` |
| Add after existing imports | `import { findBestPlayerMatch } from '../lib/fuzzy-match'` |
| Add after existing imports | `import { getHardSellRecommendation } from '../lib/recruiting-calculator'` |
| Add after existing imports | `import { normalizeStatKey } from '../lib/normalize-stat-key'` |
| Add after existing imports | `import type { RecruitingMotivationsParsedData } from '../lib/screenshot-service'` |
| 81 | Add `const [playerMatches, setPlayerMatches] = useState<PlayerMatch[]>([])` |
| 81 | Add multi-image queue state (see PIPE-04 section) |
| 103 | Add `'recruiting-motivations'` to `CFB_SCREEN_TYPES` |
| 108–123 | Replace `handleFileOpen()` with multi-file version |
| 155–201 | Add `recruiting-motivations` case to `initEditableState()` |
| 168–178 | After `setPlayerRows(...)` — trigger fuzzy match and `setPlayerMatches(...)` |
| 434–524 | Replace `renderPlayerStatsForm()` with match-to-roster UI |
| 674–758 | Modify `renderDepthChartForm()`: replace notice, add "Copy as CSV" button |
| 761–778 | Add `'recruiting-motivations'` case to `renderConfirmationForm()` |
| 868–931 | Update pre-parse UI to handle multi-image selection |
| New function | `handleSavePlayerStats()` |
| New function | `renderRecruitingMotivationsForm()` |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `navigator.clipboard.writeText` works in Tauri v2 WebView without an explicit plugin | PIPE-02 | Depth chart copy button silently fails; would need `@tauri-apps/plugin-clipboard-manager` |
| A2 | The screen type selector forces one type for all images in a multi-image session (no per-image type selection) | PIPE-04 | Combined confirm UI would need per-image type routing; significant additional complexity |
| A3 | Motivation grades are display-only in Phase 22 (not written to `recruits` table) | PIPE-03 | If grades must be saved, `Recruit` type needs `motivation1Grade/2Grade/3Grade` fields and a schema migration |

---

## Open Questions

1. **Clipboard in Tauri WebView**
   - What we know: `navigator.clipboard.writeText` is standard in Chromium; Tauri v2 uses WebKit/WebView2.
   - What's unclear: Whether Tauri's WebView context grants clipboard write access without a permission prompt. No `clipboard` permission in `default.json`.
   - Recommendation: Implement using `navigator.clipboard.writeText`. If it fails in testing, fall back to `document.execCommand('copy')` or add `@tauri-apps/plugin-clipboard-manager`. The `toast` failure path should surface any error clearly.

2. **Screen type per image vs. one type for all images**
   - What we know: PIPE-04 says "images are parsed sequentially" with one progress indicator — implies a batch with shared context.
   - What's unclear: Whether a user should be able to select different screen types per image.
   - Recommendation: Ship with one screen type for the entire batch. This matches the handoff doc Task 16 description exactly and avoids per-image type UI.

3. **Motivation grade save vs. display-only**
   - What we know: `Recruit` type has no grade fields; PIPE-03 says "show inline"; TOOL-01 (Phase 24) is where grades show on recruit cards.
   - What's unclear: Whether Phase 22 should let users link a parsed pitch screen back to an existing `Recruit` record and persist the grades.
   - Recommendation: Display-only for Phase 22. The linking problem is equivalent to PIPE-01's fuzzy match complexity and is not called out in PIPE-03.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 22 is entirely frontend code changes. No new Tauri plugins, CLI tools, databases, or external services are introduced. Existing Tauri permissions (`dialog:allow-open`, `fs:allow-read-file`) already cover multi-file selection and reading.

---

## Validation Architecture

No test framework is configured in this project (verified: no `vitest.config.*`, no `jest.config.*`, no `__tests__/` directory, no `test` script in `apps/desktop/package.json`). Per `workflow.nyquist_validation` absence in `.planning/config.json`, validation defaults to enabled — but with no test infrastructure and no framework to install (the project does not use tests), Wave 0 gaps cannot be filled with automated tests.

**All Phase 22 requirements must be validated manually:**

| Req | Behavior | Validation Method |
|-----|----------|------------------|
| PIPE-01 | Parse player stats screenshot → fuzzy match UI → Save Stats → record in `db.playerSeasons` → appears in Records leaderboard | Manual: run app, parse a screenshot, verify leaderboard |
| PIPE-02 | Depth chart parse → "Copy as CSV" copies correctly formatted CSV; "not saved in V1" text gone | Manual: run app, parse screenshot, click button, paste into text editor |
| PIPE-03 | "Recruit Pitch Screen" appears in CFB dynasty type selector; parse returns grades; Hard Sell recommendation shows | Manual: CFB dynasty → parse motivations screenshot |
| PIPE-04 | File picker accepts multiple files; "Parsing X of Y" shows; combined confirm UI appears | Manual: select 2–5 screenshots, observe progress, confirm combined |

---

## Security Domain

PIPE requirements involve file reads (existing Tauri permission) and clipboard write (browser API). No new security surface:
- No new network calls beyond existing Claude API path
- No new file write paths
- No authentication or session data involved
- `navigator.clipboard.writeText` operates on user-selected data (depth chart rows the user just reviewed) — no injection risk

Security enforcement is not applicable to this phase beyond maintaining existing patterns.

---

## Sources

### Primary (HIGH confidence)

- `apps/desktop/src/lib/screenshot-service.ts` — ScreenType union, parsed data types, AI prompts (full file read)
- `apps/desktop/src/pages/ScreenshotIngestionPage.tsx` — current UI state, file picker, render functions (full 943-line file read)
- `apps/desktop/src/lib/player-service.ts` — `getPlayersByDynasty()` signature (full file read)
- `apps/desktop/src/lib/player-season-service.ts` — `createPlayerSeason()`, duplicate-check options (full file read)
- `apps/desktop/src/lib/records-service.ts` — `getSingleSeasonLeaders()`, `getCareerLeaders()` data flow (full file read)
- `apps/desktop/src/store/player-store.ts` — `usePlayerStore` interface, `.players` array (full file read)
- `apps/desktop/src/store/player-season-store.ts` — `usePlayerSeasonStore` interface (full file read)
- `packages/db/src/schema.ts` — `playerSeasons` indexes confirmed; `[playerId+seasonId]` confirmed absent
- `packages/core-types/src/player.ts` — `Player` and `PlayerSeason` interfaces
- `packages/core-types/src/recruiting.ts` — `Recruit` interface, motivation fields, grade fields absent
- `packages/sport-configs/src/cfb.ts` — canonical stat keys (lines 193–219)
- `apps/desktop/src/lib/cfb-categories.ts` — `CFB_DEAL_BREAKER_CATEGORIES` (14 categories)
- `apps/desktop/src/store/index.ts` — store exports confirmed
- `apps/desktop/src-tauri/capabilities/default.json` — Tauri permissions confirmed
- `apps/desktop/package.json` — no fuzzy matching library installed

### Secondary (MEDIUM confidence)

- `docs/dynasty-os-claude-code-handoff.md` Tasks 13–16, 19 — reference implementations for all four PIPE requirements and the Hard Sell calculator. Cross-verified against current codebase state. One deviation found (compound index).

### Tertiary (LOW confidence)

- `[ASSUMED]` — `navigator.clipboard.writeText` works without explicit Tauri clipboard plugin in the Tauri v2 WebView context (A1 in Assumptions Log)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all files read directly; no new dependencies required
- Architecture patterns: HIGH — handoff doc blueprints cross-verified against live codebase
- Pitfalls: HIGH — compound index deviation confirmed by schema read; others derived from code
- Fuzzy match approach: HIGH — prescribed by handoff doc, verified no external library exists

**Research date:** 2026-05-04
**Valid until:** 2026-06-04 (stable codebase; no fast-moving dependencies)
