# Dynasty OS — Claude Code Handoff
**Single authoritative spec. Execute tasks in order. Do not skip ahead.**

---

## App Context

Dynasty OS is a **Tauri 2 desktop app** (React 18 + Zustand + Dexie/IndexedDB) for tracking CFB and Madden franchise dynasties. Local-first — all data lives in Dexie on the user's machine.

**Monorepo workspace packages:**
- `@dynasty-os/core-types` — shared TypeScript types
- `@dynasty-os/db` — Dexie schema and table definitions
- `@dynasty-os/sport-configs` — per-sport stat categories, positions, team lists
- `@dynasty-os/ui-components` — shared UI primitives

**Key directories:**
```
src/
  App.tsx                    — root component, page router, command palette
  main.tsx                   — Tauri entry point
  pages/                     — 24 full-page components
  components/                — shared components
  store/                     — 20 Zustand stores
  lib/                       — all business logic / service functions
src-tauri/
  src/main.rs                — Rust backend, Tauri commands
  Cargo.toml
  tauri.conf.json
```

**Compile check:** Run `npm run build` (tsc + vite) after every task group. Zero TypeScript errors required before moving to the next group.

---

## Execution Order

Tasks are grouped into phases. Complete each phase fully before starting the next.

```
Phase 1 — Safety & Foundations      (tasks 1–4)
Phase 2 — Security                  (tasks 5–7)
Phase 3 — Data Model Additions      (tasks 8–12)
Phase 4 — Screenshot → DB Pipeline  (tasks 13–16)
Phase 5 — Madden Sync Upgrade       (tasks 17–18)
Phase 6 — Recruiting Tools          (tasks 19–22)
Phase 7 — AI Queue & Features       (tasks 23–26)
Phase 8 — Data Entry UX             (tasks 27–31)
Phase 9 — Navigation & Routing      (tasks 32–33)
Phase 10 — Polish & Cleanup         (tasks 34–40)
```

---

## Phase 1 — Safety & Foundations

### Task 1 — Add top-level error boundary

**File:** Create `src/components/AppErrorBoundary.tsx`

```tsx
import React from 'react';

interface State { hasError: boolean; error: Error | null }

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8">
        <h1 className="text-2xl font-bold text-red-400 mb-4">Something went wrong</h1>
        <p className="text-gray-400 mb-6 text-sm font-mono max-w-xl text-center break-all">
          {this.state.error?.message}
        </p>
        <button
          onClick={() => this.setState({ hasError: false, error: null })}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
        >
          Try again
        </button>
      </div>
    );
  }
}
```

**File:** `src/main.tsx` — wrap `<App />`:
```tsx
import { AppErrorBoundary } from './components/AppErrorBoundary';
root.render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);
```

**Done when:** A thrown error in `DashboardPage` renders the error UI instead of a blank screen.

---

### Task 2 — Fix undo store type safety

**File:** `src/store/undo-store.ts`

Replace `db as any` access with a typed table map:

```typescript
import { db } from '@dynasty-os/db';

const TABLE_MAP = {
  games: db.games,
  players: db.players,
  coachingStaff: db.coachingStaff,
  futureGames: db.futureGames,
} as const;

export type UndoableTable = keyof typeof TABLE_MAP;

// Update UndoableOperation interface:
export interface UndoableOperation {
  id: string;
  table: UndoableTable;  // was: string
  operation: 'delete' | 'update';
  recordId: string;
  snapshot: Record<string, unknown>;
  description: string;
  performedAt: number;
}

// In the undo() action, replace (db as any)[last.table] with:
const tbl = TABLE_MAP[last.table];
if (!tbl) throw new Error(`Unknown undo table: ${last.table}`);
if (last.operation === 'delete') {
  await tbl.add(last.snapshot as never);
} else {
  await tbl.put(last.snapshot as never);
}
```

Update all `pushUndo` callsites in `game-store.ts`, `player-store.ts`, `coaching-staff-store.ts`, `future-schedule-store.ts` to use `UndoableTable` instead of `string` for the `table` field.

**Done when:** TypeScript compiles with no errors. Any invalid table name in a `pushUndo` call now produces a compile-time error.

---

### Task 3 — Remove dead `zundo` dependency

```bash
npm uninstall zundo
```

Remove `"zundo"` from `package.json`. It is never imported anywhere in the codebase.

**Done when:** `package.json` no longer contains `zundo`. Build passes.

---

### Task 4 — Fix Records leaderboard N+1 DB queries

**File:** `src/lib/records-service.ts`, function `getCareerLeaders()`

The current implementation calls `db.players.get(playerId)` inside a loop — one DB call per player. Replace with a bulk fetch:

```typescript
export async function getCareerLeaders(
  dynastyId: string,
  statKey: string,
  limit: number = 10
): Promise<LeaderboardEntry[]> {
  const allPlayerSeasons = await db.playerSeasons
    .where('dynastyId').equals(dynastyId).toArray();

  // Bulk fetch all players for this dynasty — single DB call
  const allPlayers = await db.players.where('dynastyId').equals(dynastyId).toArray();
  const playerMap = new Map(allPlayers.map((p) => [p.id, p]));

  // ... rest of existing aggregation logic, but replace:
  // const player = await db.players.get(playerId);
  // with:
  // const player = playerMap.get(playerId);
}
```

Apply the same bulk-fetch pattern to `getSingleSeasonLeaders()`.

**Done when:** Both leaderboard functions fetch all players in a single `db.players.where(...)` call, not inside the per-player loop.

---

## Phase 2 — Security

### Task 5 — Route all Anthropic API calls through a Tauri command

**Context:** Four files call `api.anthropic.com` directly from the React renderer with `anthropic-dangerous-direct-browser-access: true`. This is insecure.

**Step 5a — Add Rust command**

`src-tauri/Cargo.toml` — add to `[dependencies]`:
```toml
reqwest = { version = "0.11", features = ["json", "rustls-tls"] }
tokio = { version = "1", features = ["full"] }
```

`src-tauri/src/main.rs` — add command (or create `src-tauri/src/commands/ai.rs`):
```rust
#[tauri::command]
async fn call_anthropic(api_key: String, body: String) -> Result<String, String> {
    let client = reqwest::Client::new();
    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", &api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .body(body)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    response.text().await.map_err(|e| e.to_string())
}
```

Register in `tauri::Builder::default().invoke_handler(tauri::generate_handler![call_anthropic, ...])`.

Add to `src-tauri/tauri.conf.json` capabilities as needed.

**Step 5b — Create TypeScript bridge**

Create `src/lib/ai-bridge.ts`:
```typescript
import { invoke } from '@tauri-apps/api/core';

export async function callAnthropic(apiKey: string, body: object): Promise<unknown> {
  const raw = await invoke<string>('call_anthropic', {
    apiKey,
    body: JSON.stringify(body),
  });
  return JSON.parse(raw);
}
```

**Step 5c — Replace all direct fetch calls**

In these four files, replace every `fetch('https://api.anthropic.com/v1/messages', { ... })` block with a call to `callAnthropic(apiKey, { model, max_tokens, system, messages })`:
- `src/lib/narrative-service.ts`
- `src/lib/legacy-card-service.ts`
- `src/lib/screenshot-service.ts`
- `src/lib/recruiting-service.ts`

Remove all `'anthropic-dangerous-direct-browser-access': 'true'` headers — they no longer apply.

Parse the response: `const data = await callAnthropic(...) as { content: Array<{ text: string }> }`.

**Done when:** No file in `src/` contains the string `api.anthropic.com`. Build passes. AI narrative generation still works end-to-end.

---

### Task 6 — Migrate API key to plugin-store

**Step 6a — Install plugin**

```bash
npm install @tauri-apps/plugin-store
```

Add to `src-tauri/Cargo.toml`:
```toml
tauri-plugin-store = "2"
```

Register in `src-tauri/src/main.rs`:
```rust
.plugin(tauri_plugin_store::Builder::default().build())
```

**Step 6b — Update `legacy-card-service.ts`**

Replace the three `localStorage`-based API key functions:

```typescript
import { Store } from '@tauri-apps/plugin-store';

const _store = new Store('dynasty-os.bin');

export async function getApiKey(): Promise<string | null> {
  return (await _store.get<string>('anthropic-api-key')) ?? null;
}
export async function setApiKey(key: string): Promise<void> {
  await _store.set('anthropic-api-key', key);
  await _store.save();
}
export async function clearApiKey(): Promise<void> {
  await _store.delete('anthropic-api-key');
  await _store.save();
}
```

**Step 6c — Update all callsites**

`getApiKey()` is now async. Update every callsite that calls it (in `narrative-service.ts`, `screenshot-service.ts`, `recruiting-service.ts`, and any UI that calls it directly) to `await getApiKey()`.

**Done when:** Setting an API key in the UI is no longer visible in DevTools → Application → Local Storage.

---

### Task 7 — Migrate remaining localStorage keys to plugin-store

Create `src/lib/prefs-service.ts`:

```typescript
import { Store } from '@tauri-apps/plugin-store';
const _store = new Store('dynasty-os.bin');

export const prefs = {
  get: <T>(key: string): Promise<T | null> => _store.get<T>(key),
  set: async (key: string, value: unknown): Promise<void> => {
    await _store.set(key, value);
    await _store.save();
  },
  delete: async (key: string): Promise<void> => {
    await _store.delete(key);
    await _store.save();
  },
};
```

Find every remaining `localStorage.getItem/setItem/removeItem` call in the codebase and replace with `await prefs.get/set/delete`. Key callsites:

| Current key | Location |
|---|---|
| `dynasty-os-madden-save-path` | `src/lib/madden-sync-service.ts` |
| `dynasty-os-madden-watcher-enabled` | `src/lib/madden-sync-service.ts` |
| `dynasty-os-autoexport-{id}` | `src/lib/auto-export-service.ts` |
| `dynasty-os-onboarding-pending` | `src/App.tsx` |
| `dynasty-os-onboarding-v2` | `src/components/TourOverlay.tsx` |
| `dynasty-os-wizard-{id}` | `src/components/SetupWizard.tsx` |
| `dynasty-os-auto-open-add-player` | `src/components/QuickEntryHub.tsx`, `src/pages/RosterPage.tsx` |
| `dynasty-os-checklist-{id}` | `src/pages/DashboardPage.tsx` |
| `dynasty-os-moments-{rivalId}` | `src/lib/rivalry-service.ts` — **see Task 8** |

Note: `prefs.get/set/delete` are async. Every callsite must be updated to `await` the call or handled in a `useEffect`.

**Done when:** No `localStorage` references remain in `src/` except for any that were intentionally preserved. Build passes.

---

## Phase 3 — Data Model Additions

### Task 8 — Move rivalry key moments from localStorage to Dexie

**Problem:** Key moments are stored in `localStorage` keyed by `rivalId`. They are NOT included in dynasty exports and will be silently lost.

**Step 8a — Add to core types**

In `@dynasty-os/core-types`, add a `KeyMoment` entity:
```typescript
export interface KeyMoment {
  id: string;
  rivalId: string;
  dynastyId: string;
  year: number;
  description: string;
  createdAt: number;
}
```

**Step 8b — Add Dexie table**

In `@dynasty-os/db`, add `keyMoments` table to the Dexie schema with index on `[dynastyId+rivalId]`.

**Step 8c — Update rivalry-service.ts**

Replace all three `localStorage`-based key moment functions (`getKeyMoments`, `addKeyMoment`, `deleteKeyMoment`) with async Dexie-based equivalents.

**Step 8d — Update export/import**

In `src/lib/export-import.ts`, add `keyMoments` to the `DynastyExport` interface and include them in both `exportDynasty()` and `importDynasty()`.

**Step 8e — Update RivalryTrackerPage**

Update all `getKeyMoments`, `addKeyMoment`, `deleteKeyMoment` calls to be async (add `await`, update `useEffect` patterns).

**Done when:** Adding a key moment, exporting the dynasty, importing on a fresh install, and seeing the key moment still present.

---

### Task 9 — Add `bowlOpponent`, `keyEvents` to Season type

**Problem:** `src/lib/timeline-service.ts` accesses `(season as any).bowlOpponent` and `(season as any).keyEvents` — always `null`/`[]` because these fields don't exist on the type.

**Step 9a — Update core types**

In `@dynasty-os/core-types`, add to `Season`:
```typescript
bowlOpponent?: string;
keyEvents?: string[];
```

**Step 9b — Update SeasonEndModal**

In `src/components/SeasonEndModal.tsx`, add two new fields to the form:

1. **Bowl opponent** — text input, shown only when `bowlGame` is filled in:
```tsx
{bowlGame.trim() && (
  <div>
    <label className="block text-sm text-gray-400 mb-1">Bowl Opponent</label>
    <input
      type="text"
      value={bowlOpponent}
      onChange={(e) => setBowlOpponent(e.target.value)}
      placeholder="e.g. Michigan"
      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
    />
  </div>
)}
```

2. **Key events** — textarea for up to 3 bullet points, always shown:
```tsx
<div>
  <label className="block text-sm text-gray-400 mb-1">
    Key moments this season <span className="text-gray-600 text-xs">(one per line, max 3)</span>
  </label>
  <textarea
    value={keyEventsText}
    onChange={(e) => setKeyEventsText(e.target.value)}
    placeholder={"Signed #1 recruiting class\nBeat rival for first time in 5 years"}
    rows={3}
    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm resize-none"
  />
</div>
```

Parse `keyEventsText` into `string[]` on submit: `keyEventsText.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 3)`.

Include `bowlOpponent` and `keyEvents` in the `updateSeason()` call.

**Step 9c — Update timeline-service.ts**

Remove both `(season as any)` casts. Access the fields directly now that they exist on the type.

**Done when:** TypeScript compiles with no `as any` in timeline-service.ts.

---

### Task 10 — Add `devTrait` field to Player

**Step 10a — Update core types**

In `@dynasty-os/core-types`, add to `Player`:
```typescript
devTrait?: 'normal' | 'star' | 'superstar' | 'xfactor';
```

**Step 10b — AddPlayerModal and EditPlayerModal**

Add a dev trait selector (CFB: Normal/Star/Superstar; Madden: same + X-Factor):
```tsx
<select value={devTrait} onChange={(e) => setDevTrait(e.target.value as ...)}>
  <option value="">Unknown</option>
  <option value="normal">Normal</option>
  <option value="star">Star</option>
  <option value="superstar">Superstar</option>
  {sport === 'madden' && <option value="xfactor">X-Factor</option>}
</select>
```

**Step 10c — RosterPage display**

Show dev trait as a small colored badge next to the player's name:
- Normal: gray
- Star: blue  
- Superstar: yellow
- X-Factor: purple

**Step 10d — PlayerProfilePage display**

Show dev trait on the player info header.

**Done when:** Build passes. Dev trait visible on roster and player profile.

---

### Task 11 — Add `dealBreaker` and `redshirt` fields to Player (CFB)

**Step 11a — Update core types**

```typescript
// In Player:
dealBreaker?: string;   // CFB only — one of the 14 CFB 26 deal breaker categories
isRedshirt?: boolean;   // CFB only
```

The 14 CFB 26 deal breaker options:
`'Playing Time' | 'Academic Prestige' | 'Brand Exposure' | 'Conference Prestige' | 'Close to Home' | 'NFL Draft' | 'Tradition' | 'Campus Atmosphere' | 'Winning' | 'Coach Reputation' | 'Facilities' | 'Scheme Fit' | 'Stability' | 'Player Development'`

**Step 11b — EditPlayerModal**

Add deal breaker dropdown (CFB only — guard with `sport === 'cfb'`).
Add redshirt checkbox.

**Step 11c — RosterPage**

- Show deal breaker in a small text tag on each player row (CFB only)
- Show a red "RS" badge for redshirted players

**Done when:** Both fields save and display correctly.

---

### Task 12 — Add motivation fields to Recruit

**Step 12a — Update core types**

In `Recruit`:
```typescript
motivation1?: string;
motivation2?: string;
motivation3?: string;
dealBreakerMotivation?: string;
visitWeek?: number;
```

**Step 12b — Update recruit forms in RecruitingPage**

Add optional fields to the add/edit recruit form. All are optional — existing recruits are unaffected.

**Done when:** Build passes. Motivation fields save correctly on recruits.

---

## Phase 4 — Screenshot → DB Pipeline

### Task 13 — Fix player stats screenshot: write to DB

**This is the highest-impact fix in the entire codebase.**

**File:** `src/pages/ScreenshotIngestionPage.tsx`

**Problem:** `renderPlayerStatsForm()` shows parsed player data but has no save handler — it says "go to the Roster" instead. The data is abandoned.

**Step 13a — Add fuzzy name matching utility**

Create `src/lib/fuzzy-match.ts`:
```typescript
/**
 * Returns a 0–1 similarity score between two strings.
 * Uses a simple token-overlap approach sufficient for player name matching.
 */
export function nameSimilarity(a: string, b: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  // Token overlap
  const ta = new Set(na.split(''));
  const tb = new Set(nb.split(''));
  const intersection = [...ta].filter(c => tb.has(c)).length;
  return intersection / Math.max(ta.size, tb.size);
}

export function findBestPlayerMatch(
  parsedName: string,
  players: Array<{ id: string; firstName: string; lastName: string; position: string }>
): { player: typeof players[0]; score: number } | null {
  const fullNames = players.map(p => ({
    player: p,
    score: nameSimilarity(parsedName, `${p.firstName} ${p.lastName}`),
  }));
  // Also try last name only match
  const lastNames = players.map(p => ({
    player: p,
    score: nameSimilarity(parsedName, p.lastName) * 0.9,
  }));
  const all = [...fullNames, ...lastNames].sort((a, b) => b.score - a.score);
  const best = all[0];
  return best && best.score > 0.6 ? best : null;
}
```

**Step 13b — Add match state to ScreenshotIngestionPage**

Add state for player-to-roster matching:
```typescript
interface PlayerMatch {
  parsedName: string;
  parsedPosition: string;
  parsedStats: Record<string, string>;
  matchedPlayerId: string | null;
  matchScore: number;
  confirmed: boolean;
}
const [playerMatches, setPlayerMatches] = useState<PlayerMatch[]>([]);
```

When `parsedData.screenType === 'player-stats'` or `'nfl-player-stats'`, run matching:
```typescript
// After setPlayerRows(...) in the parse handler:
const activePlayers = usePlayerStore.getState().players;
const matches = playerRows.map(row => {
  const match = findBestPlayerMatch(row.name, activePlayers);
  return {
    parsedName: row.name,
    parsedPosition: row.position,
    parsedStats: row.stats,
    matchedPlayerId: match?.player.id ?? null,
    matchScore: match?.score ?? 0,
    confirmed: (match?.score ?? 0) > 0.85,
  };
});
setPlayerMatches(matches);
```

**Step 13c — Replace renderPlayerStatsForm() with match-and-confirm UI**

Replace the existing "go to Roster" form with:

```tsx
function renderPlayerStatsForm() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-2">Player Stats — Match to Roster</h2>
      {renderThumbnail()}
      <p className="text-sm text-gray-400 mb-4">
        Review each match below. Correct any mismatches, then click Save All Stats.
      </p>
      <div className="flex flex-col gap-3">
        {playerMatches.map((match, i) => (
          <div key={i} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-1">Parsed from screenshot</div>
                <div className="text-white text-sm font-medium">{match.parsedName} ({match.parsedPosition})</div>
              </div>
              <div className="text-gray-500">→</div>
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-1">Matched to roster</div>
                <select
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                  value={match.matchedPlayerId ?? ''}
                  onChange={(e) => {
                    const updated = [...playerMatches];
                    updated[i] = { ...updated[i], matchedPlayerId: e.target.value || null };
                    setPlayerMatches(updated);
                  }}
                >
                  <option value="">— skip this player —</option>
                  {usePlayerStore.getState().players.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} ({p.position})
                    </option>
                  ))}
                </select>
              </div>
              {match.matchScore > 0.85 && (
                <span className="text-green-400 text-xs">✓ auto-matched</span>
              )}
              {match.matchScore > 0.6 && match.matchScore <= 0.85 && (
                <span className="text-yellow-400 text-xs">⚠ review</span>
              )}
              {match.matchScore <= 0.6 && (
                <span className="text-red-400 text-xs">no match</span>
              )}
            </div>
            {/* Stat preview */}
            <div className="grid grid-cols-4 gap-2 text-xs">
              {Object.entries(match.parsedStats).slice(0, 8).map(([k, v]) => (
                <div key={k} className="bg-gray-700 rounded px-2 py-1">
                  <div className="text-gray-400">{k}</div>
                  <div className="text-white font-mono">{v}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={goToDashboard} className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg">
          Cancel
        </button>
        <button
          onClick={handleSavePlayerStats}
          disabled={saving || playerMatches.every(m => !m.matchedPlayerId)}
          className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg"
        >
          {saving ? 'Saving...' : `Save Stats for ${playerMatches.filter(m => m.matchedPlayerId).length} Players`}
        </button>
      </div>
    </div>
  );
}
```

**Step 13d — Add handleSavePlayerStats()**

```typescript
async function handleSavePlayerStats() {
  if (!activeSeason || !activeDynasty) return;
  setSaving(true);
  try {
    for (const match of playerMatches) {
      if (!match.matchedPlayerId) continue;

      // Convert stat strings to numbers
      const stats: Record<string, number> = {};
      for (const [key, val] of Object.entries(match.parsedStats)) {
        const num = parseFloat(val);
        if (!isNaN(num) && num !== 0) {
          // Normalize stat key: "YDS" -> "passingYards" etc via sport config
          const normalizedKey = normalizeStatKey(key, match.parsedPosition);
          stats[normalizedKey] = num;
        }
      }

      // Check if a PlayerSeason already exists for this player+season
      const existing = await db.playerSeasons
        .where('[playerId+seasonId]')
        .equals([match.matchedPlayerId, activeSeason.id])
        .first();

      if (existing) {
        await usePlayerSeasonStore.getState().updatePlayerSeason(existing.id, { stats });
      } else {
        await usePlayerSeasonStore.getState().addPlayerSeason({
          playerId: match.matchedPlayerId,
          dynastyId: activeDynasty.id,
          seasonId: activeSeason.id,
          year: activeSeason.year,
          stats,
        });
      }
    }
    goToDashboard();
  } catch (e) {
    setError(e instanceof Error ? e.message : 'Failed to save stats');
  } finally {
    setSaving(false);
  }
}
```

**Step 13e — Add stat key normalizer**

Create a helper `normalizeStatKey(rawLabel: string, position: string): string` that maps common screenshot label formats to Dynasty OS stat keys. Examples: `"YDS" + QB → "passingYards"`, `"YDS" + RB → "rushingYards"`, `"TD" → appropriate TD key by position`, `"ATT" + QB → "attempts"`, `"INT" → "interceptions"`, `"TKL" → "tackles"`, `"SCK" → "sacks"`. Use a lookup table based on position group.

**Done when:** A player stats screenshot parses, shows the match UI, and clicking "Save Stats" writes records to `db.playerSeasons`. Verify in the Records leaderboard — the saved stats should appear.

---

### Task 14 — Fix depth chart screenshot: add save handler

**File:** `src/pages/ScreenshotIngestionPage.tsx`

Replace the existing "not saved in V1" notice with actual functionality. The depth chart data (position + player name + depth number) can be used to update `player.position` for starters.

For now, implement a simpler version: show a "Copy to clipboard as CSV" button so users can at least use the data. Mark the save-to-DB path as a future enhancement in a TODO comment.

```tsx
// In renderDepthChartForm(), replace the "not saved in V1" notice with:
<div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-4">
  <p className="text-gray-400 text-sm">
    Depth chart data is parsed for reference. Use the copy button to export to a spreadsheet, or verify your roster positions manually.
  </p>
  <button
    onClick={() => {
      const csv = 'Position,Player,Depth\n' +
        depthEntries.map(e => `${e.position},${e.playerName},${e.depth}`).join('\n');
      navigator.clipboard.writeText(csv);
    }}
    className="mt-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded"
  >
    Copy as CSV
  </button>
</div>
// TODO: Future — fuzzy match depth chart entries to roster players and auto-update positions
```

**Done when:** Build passes. The "not saved in V1" text is gone.

---

### Task 15 — Add new screenshot type: recruiting-motivations

**File:** `src/lib/screenshot-service.ts`

Add to `ScreenType`:
```typescript
| 'recruiting-motivations'
```

Add label:
```typescript
'recruiting-motivations': 'Recruit Pitch Screen',
```

Add parsed data shape:
```typescript
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
```

Add OCR prompt:
```typescript
'recruiting-motivations':
  'You are parsing a CFB 26 recruit pitch/motivations screen. Extract the recruit name, their three motivations and each motivation\'s letter grade (A+/A/A-/B+/B/B-/C+/C/C-/D/F), and which motivation is their deal breaker (marked with a star or special indicator). Return ONLY valid JSON: {"recruits": [{"name": string|null, "motivation1": string|null, "motivation1Grade": string|null, "motivation2": string|null, "motivation2Grade": string|null, "motivation3": string|null, "motivation3Grade": string|null, "dealBreaker": string|null}]}. No explanation — JSON only.',
```

Make `recruiting-motivations` available only for CFB dynasties in `ScreenshotIngestionPage`.

When parsed, show the Hard Sell recommendation inline (see Task 19).

**Done when:** CFB users see "Recruit Pitch Screen" as a screenshot type option. Parsing a motivations screenshot returns structured motivation data.

---

### Task 16 — Add screenshot import for multiple images at once

**File:** `src/pages/ScreenshotIngestionPage.tsx`

Change the file picker to allow multiple file selection:
```typescript
const selected = await open({
  filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
  multiple: true,  // was: false
});
```

When multiple files are selected:
- Show a queue of images with their selected `ScreenType` (user picks type per image, or set a default for all)
- Parse them sequentially (not in parallel — avoids rate limits)
- Show a progress indicator: "Parsing 3 of 5..."
- After all are parsed, show the combined confirm UI

This allows a user to screenshot their entire stats screen (may require multiple pages) and import them all at once.

**Done when:** Multiple screenshots can be selected and parsed sequentially.

---

## Phase 5 — Madden Sync Upgrade

### Task 17 — Extract PlayerStats table from Madden sidecar

**Context:** The existing `madden-reader` sidecar reads `SeasonGame`, `Player`, and `DraftPick` tables. The `madden-franchise` npm package also exposes a `PlayerStats` table with full per-season stat lines.

**File:** The sidecar Node.js source (wherever the sidecar script lives — check `src-tauri/binaries/` or a sibling `sidecar/` directory)

Add `PlayerStats` table extraction to the sidecar output:

```javascript
// After extracting players:
const playerStatsTable = franchise.getTableByName('PlayerStats');
await playerStatsTable.readRecords([
  'FirstName', 'LastName', 'Position',
  'PassingYards', 'PassingTDs', 'Interceptions', 'Completions', 'PassAttempts',
  'RushingYards', 'RushingTDs', 'RushAttempts',
  'ReceivingYards', 'ReceivingTDs', 'Receptions',
  'Tackles', 'Sacks', 'DefInterceptions', 'ForcedFumbles', 'PassDeflections',
  'FGMade', 'FGAttempted',
]);

const playerStats = playerStatsTable.records
  .filter(r => r.FirstName || r.LastName)
  .map(r => ({
    name: `${r.FirstName ?? ''} ${r.LastName ?? ''}`.trim(),
    position: r.Position ?? '',
    stats: {
      passingYards: r.PassingYards ?? 0,
      passingTDs: r.PassingTDs ?? 0,
      interceptions: r.Interceptions ?? 0,
      completions: r.Completions ?? 0,
      attempts: r.PassAttempts ?? 0,
      rushingYards: r.RushingYards ?? 0,
      rushingTDs: r.RushingTDs ?? 0,
      rushingAttempts: r.RushAttempts ?? 0,
      receivingYards: r.ReceivingYards ?? 0,
      receivingTDs: r.ReceivingTDs ?? 0,
      receptions: r.Receptions ?? 0,
      tackles: r.Tackles ?? 0,
      sacks: r.Sacks ?? 0,
      defenseInterceptions: r.DefInterceptions ?? 0,
      forcedFumbles: r.ForcedFumbles ?? 0,
      passDeflections: r.PassDeflections ?? 0,
      fgMade: r.FGMade ?? 0,
      fgAttempted: r.FGAttempted ?? 0,
    },
  }))
  .filter(p => Object.values(p.stats).some(v => v !== 0));

// Include in the output JSON:
output.playerStats = playerStats;
```

**File:** `src/lib/madden-sync-service.ts`

Update `ExtractResult` type to include `playerStats`. Update `applyDiff()` to write player stats — fuzzy-match by name to the players created in the same sync, then call `createPlayerSeason` with the full stat object instead of just `{ overall }`.

**Done when:** After a Madden sync, player season records contain real stat lines, not just an OVR rating.

---

### Task 18 — Auto-detect Madden save file path

**File:** `src/lib/madden-sync-service.ts` and `src/pages/MaddenSyncPage.tsx`

Add a function that scans common save locations before falling back to the file picker:

```typescript
export async function detectMaddenSavePaths(): Promise<string[]> {
  const { homeDir } = await import('@tauri-apps/api/path');
  const home = await homeDir();
  const candidateDirs = [
    `${home}\\Documents\\Madden NFL 27\\saves`,
    `${home}\\Documents\\Madden NFL 26\\saves`,
    `${home}\\Documents\\Madden NFL 25\\saves`,
  ];

  const found: string[] = [];
  for (const dir of candidateDirs) {
    try {
      const entries = await readDir(dir);
      const fraFiles = entries
        .filter(e => !e.children && (e.name?.includes('CAREER') || e.name?.endsWith('.fra')))
        .map(e => `${dir}\\${e.name}`);
      found.push(...fraFiles);
    } catch {
      // dir doesn't exist — skip
    }
  }
  return found;
}
```

In `MaddenSyncPage`, on mount, call `detectMaddenSavePaths()` and if results are found, show them as one-click options above the "Browse for file" button.

**Done when:** A user with Madden 26 installed sees their franchise files listed automatically without needing to navigate a file picker.

---

## Phase 6 — Recruiting Tools

### Task 19 — Hard Sell / Send the House calculator

**The Rule of 19:** Each letter grade has a point value (A+=13, A=12, A-=11, B+=10, B=9, B-=8, C+=7, C=6, C-=5, D+=4, D=3, D-=2, F=1). If the sum of a recruit's three motivation grades is ≥19, Hard Sell. If <19, Send the House.

**File:** Create `src/lib/recruiting-calculator.ts`

```typescript
const GRADE_POINTS: Record<string, number> = {
  'A+': 13, 'A': 12, 'A-': 11,
  'B+': 10, 'B': 9,  'B-': 8,
  'C+': 7,  'C': 6,  'C-': 5,
  'D+': 4,  'D': 3,  'D-': 2,
  'F': 1,
};

export function getHardSellRecommendation(
  grade1: string,
  grade2: string,
  grade3: string
): { action: 'hard-sell' | 'send-the-house'; total: number; reason: string } {
  const total = (GRADE_POINTS[grade1] ?? 0) + (GRADE_POINTS[grade2] ?? 0) + (GRADE_POINTS[grade3] ?? 0);
  if (total >= 19) {
    return {
      action: 'hard-sell',
      total,
      reason: `Total ${total} ≥ 19 — Hard Sell for maximum influence boost.`,
    };
  }
  return {
    action: 'send-the-house',
    total,
    reason: `Total ${total} < 19 — Send the House for consistent positive influence.`,
  };
}
```

**Integrate in RecruitingPage:**

On each recruit card (when motivation fields are filled in from Task 12), show the recommendation inline:

```tsx
{recruit.motivation1Grade && recruit.motivation2Grade && recruit.motivation3Grade && (
  <div className={`rounded px-3 py-2 text-sm mt-2 ${rec.action === 'hard-sell' ? 'bg-green-900/30 text-green-300' : 'bg-blue-900/30 text-blue-300'}`}>
    <span className="font-semibold">{rec.action === 'hard-sell' ? '🎯 Hard Sell' : '📤 Send the House'}</span>
    <span className="text-xs ml-2">{rec.reason}</span>
  </div>
)}
```

**Integrate in ScreenshotIngestionPage for recruiting-motivations screen type:**

After parsing a motivations screenshot (Task 15), display the Hard Sell recommendation for each parsed recruit before any save action.

**Done when:** When a recruit has all three motivation grades filled in, the app shows Hard Sell or Send the House recommendation. No external site needed.

---

### Task 20 — Transfer risk indicator on roster

**File:** `src/pages/RosterPage.tsx`

After Task 11 adds `dealBreaker` to players, add a visual indicator for at-risk players.

The transfer risk logic: a player is at risk if they have a deal breaker recorded AND the current season's relevant team grade for that category would be below B-. For simplicity in V1, show the deal breaker as a tag on each player row, and add a filter button "Show at-risk" that highlights players who have a deal breaker set.

```tsx
// On each player row, show deal breaker tag:
{player.dealBreaker && (
  <span className="text-xs bg-orange-900/40 text-orange-300 border border-orange-700/50 rounded px-1.5 py-0.5">
    ⚠ {player.dealBreaker}
  </span>
)}
```

**Done when:** CFB dynasty players with a deal breaker show an orange warning tag on the roster.

---

### Task 21 — "Convert recruit to player" button

**File:** `src/pages/RecruitingPage.tsx`

On each committed recruit card, add an "Add to Roster" button that pre-fills `AddPlayerModal`:

```tsx
<button
  onClick={() => {
    // Store recruit details in state for the modal
    setPrefillPlayer({
      firstName: recruit.name.split(' ')[0] ?? '',
      lastName: recruit.name.split(' ').slice(1).join(' '),
      position: recruit.position,
      recruitingStars: recruit.stars,
    });
    setAddPlayerOpen(true);
  }}
  className="text-xs px-2 py-1 bg-green-800/40 hover:bg-green-700/40 text-green-300 rounded border border-green-700/50"
>
  + Add to Roster
</button>
```

Pass `prefillPlayer` as initial form values to `AddPlayerModal`.

**Done when:** Clicking "Add to Roster" on a committed recruit opens AddPlayerModal with the recruit's name, position, and star rating pre-filled.

---

### Task 22 — Auto-update player status when draft pick is logged

**File:** `src/pages/DraftTrackerPage.tsx` (and/or `src/store/draft-store.ts`)

When a draft pick is added with a linked `playerId`, automatically update that player's status to `'drafted'`:

```typescript
// In the addPick handler, after successfully creating the pick:
if (form.playerId) {
  await usePlayerStore.getState().updatePlayer(form.playerId, {
    status: 'drafted',
  });
}
```

**Done when:** Adding a draft pick linked to a player auto-sets their roster status to Drafted.

---

## Phase 7 — AI Queue & Features

### Task 23 — Wire up the AI job queue

**Problem:** `useAiQueueStore` defines an AI job queue with 12 job types but nothing ever processes them.

**Step 23a — Create processor**

Create `src/lib/ai-queue-processor.ts`:

```typescript
import { useAiQueueStore, type AiJob } from '../store/ai-queue-store';
import { callAnthropic } from './ai-bridge';
import { getApiKey } from './legacy-card-service';

export async function processJob(job: AiJob): Promise<void> {
  useAiQueueStore.getState().updateJobStatus(job.id, 'running');
  try {
    const apiKey = await getApiKey();
    if (!apiKey) throw new Error('No API key configured');
    await dispatchJob(job, apiKey);
    useAiQueueStore.getState().updateJobStatus(job.id, 'done');
  } catch (err) {
    console.warn('[AiQueue] job failed:', err);
    useAiQueueStore.getState().updateJobStatus(job.id, 'failed');
  } finally {
    useAiQueueStore.getState().clearCompleted();
  }
}

async function dispatchJob(job: AiJob, apiKey: string): Promise<void> {
  switch (job.type) {
    case 'legacy-blurb':
    case 'season-narrative':
    case 'recruiting-grade':
    case 'rival-prophecy':
    // Add each job type as its logic is implemented
    default:
      throw new Error(`Job type not yet implemented: ${job.type}`);
  }
}
```

**Step 23b — Create queue worker hook**

Create `src/hooks/useAiQueueWorker.ts`:

```typescript
import { useEffect, useRef } from 'react';
import { useAiQueueStore } from '../store/ai-queue-store';
import { processJob } from '../lib/ai-queue-processor';

export function useAiQueueWorker() {
  const runningRef = useRef(false);

  useEffect(() => {
    const unsub = useAiQueueStore.subscribe(async (state) => {
      if (runningRef.current) return;
      const next = state.pendingAiJobs.find((j) => j.status === 'pending');
      if (!next) return;
      runningRef.current = true;
      await processJob(next);
      runningRef.current = false;
    });
    return unsub;
  }, []);
}
```

**Step 23c — Mount in App.tsx**

```tsx
import { useAiQueueWorker } from './hooks/useAiQueueWorker';
function App() {
  useAiQueueWorker();
  // ...
}
```

**Done when:** Enqueuing a job changes its status from `pending` → `running` → `done/failed`. No jobs silently accumulate forever.

---

### Task 24 — Fix AI blurb auto-generation

**File:** `src/pages/PlayerProfilePage.tsx`

**Problem:** `generateLegacyBlurb` fires automatically on every profile view for every departed player. With 50 graduated players across 10 seasons, this triggers 50 API calls the first time someone navigates the Legends page.

Remove the auto-fire from the `useEffect`. Replace with an explicit "Generate Legacy Blurb" button:

```tsx
// Remove this from the useEffect:
// generateLegacyBlurb(cardData, activeDynasty.teamName).then(...)

// Add a button in the Legacy Card section:
{!legacyBlurb && !isActive && (
  <button
    onClick={handleRegenerateBlurb}
    disabled={blurbLoading}
    className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg"
  >
    {blurbLoading ? 'Generating...' : '✨ Generate AI Blurb'}
  </button>
)}
```

The existing `handleRegenerateBlurb` function already does the generation correctly — just stop triggering it automatically.

**Done when:** Navigating to a player profile does NOT trigger an API call. The "Generate AI Blurb" button triggers it once and caches the result.

---

### Task 25 — Fix narrative-service.ts model and use Haiku for game narratives

**File:** `src/lib/narrative-service.ts`

In `callClaudeApi()`, the model is currently `'claude-sonnet-4-6'`. Update to use different models by context:

```typescript
async function callClaudeApi(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
  quality: 'fast' | 'full' = 'full'
): Promise<string | null> {
  // ...
  body: JSON.stringify({
    model: quality === 'fast'
      ? 'claude-haiku-4-5-20251001'   // game recaps — fast, cheap
      : 'claude-sonnet-4-6',           // season recaps — full quality
    max_tokens: maxTokens,
    // ...
  }),
}
```

Update `generateGameNarrative()` to pass `quality: 'fast'`.
Update `generateSeasonNarrative()` to pass `quality: 'full'` (default).

**Done when:** Game narratives use Haiku, season narratives use Sonnet.

---

### Task 26 — Add weekly game narrative trigger

**File:** `src/components/LogGameModal.tsx` or the save handler in `game-store.ts`

After a game is successfully logged, enqueue a game narrative job if an API key is configured:

```typescript
// After logGame() succeeds:
const apiKey = await getApiKey();
if (apiKey && activeDynasty && activeSeason) {
  useAiQueueStore.getState().enqueueAiJob({
    type: 'game-narrative',  // add this type to AiJob union
    dynastyId: activeDynasty.id,
    payload: { gameId: newGame.id, seasonId: activeSeason.id },
  });
}
```

This generates a short post-game recap automatically in the background after each logged game, available on the game log without the user having to navigate anywhere.

**Done when:** After logging a game, a short narrative appears on the game log entry (once generated).

---

## Phase 8 — Data Entry UX

### Task 27 — Quick Score Entry widget on Dashboard

**File:** Create `src/components/QuickScoreEntry.tsx`

```tsx
export function QuickScoreEntry({ dynastyName, onSave }: { dynastyName: string; onSave: (game: ...) => void }) {
  const [teamScore, setTeamScore] = useState('');
  const [opponentScore, setOpponentScore] = useState('');
  const [opponent, setOpponent] = useState('');
  // Pre-fill opponent from upcoming future schedule if available

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Just finished a game?
      </div>
      <div className="flex items-center gap-2">
        <span className="text-white font-medium text-sm truncate max-w-[100px]">{dynastyName}</span>
        <input
          type="number"
          value={teamScore}
          onChange={e => setTeamScore(e.target.value)}
          placeholder="0"
          className="w-14 text-center bg-gray-700 border border-gray-600 rounded-lg px-2 py-2 text-white text-lg font-bold focus:outline-none focus:border-amber-500"
        />
        <span className="text-gray-500 text-sm">vs</span>
        <input
          type="text"
          value={opponent}
          onChange={e => setOpponent(e.target.value)}
          placeholder="Opponent"
          className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
        />
        <input
          type="number"
          value={opponentScore}
          onChange={e => setOpponentScore(e.target.value)}
          placeholder="0"
          className="w-14 text-center bg-gray-700 border border-gray-600 rounded-lg px-2 py-2 text-white text-lg font-bold focus:outline-none focus:border-amber-500"
        />
        <button
          onClick={handleQuickSave}
          disabled={!teamScore || !opponentScore || !opponent}
          className="px-3 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg whitespace-nowrap"
        >
          Log →
        </button>
      </div>
    </div>
  );
}
```

Add to `DashboardPage` above `QuickEntryHub`. On save, call `useGameStore.getState().logGame(...)` with `week` auto-calculated as next available week, `homeAway: 'home'` as default (user can change in full modal if needed).

**Done when:** The Quick Score widget appears on the dashboard and successfully logs a game in under 5 seconds.

---

### Task 28 — CSV game import

**File:** Create `src/lib/csv-import-service.ts`

```typescript
import Papa from 'papaparse';
import type { GameType, HomeAway } from '@dynasty-os/core-types';

export interface CsvGameRow {
  week: string;
  opponent: string;
  home_away: string;
  team_score: string;
  opp_score: string;
  game_type?: string;
}

export function parseGamesCsv(csvText: string): CsvGameRow[] {
  const result = Papa.parse<CsvGameRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
  });
  return result.data;
}

export const CSV_GAME_TEMPLATE =
  'week,opponent,home_away,team_score,opp_score,game_type\n' +
  '1,Auburn,home,42,14,regular\n' +
  '2,Georgia,away,17,24,conference\n';
```

Add a "Import from CSV" button in `DashboardPage` and/or `GameLog`. When clicked, open a file picker for `.csv` files, parse with `parseGamesCsv`, show a preview table of games to import, confirm, then bulk-write via `createGame()`.

Include a "Download template" link that triggers a download of `CSV_GAME_TEMPLATE`.

**Done when:** A user can drop a CSV of historical game results and have them all written to the current season.

---

### Task 29 — CSV roster import

**File:** Create `src/lib/csv-roster-import-service.ts`

```typescript
export interface CsvPlayerRow {
  first_name: string;
  last_name: string;
  position: string;
  jersey_number?: string;
  stars?: string;
  class_year?: string;
  overall?: string;
  dev_trait?: string;
}

export const CSV_ROSTER_TEMPLATE =
  'first_name,last_name,position,jersey_number,stars,class_year,overall,dev_trait\n' +
  'Jalen,Milroe,QB,4,5,Senior,92,superstar\n';
```

Add "Import Roster" button to `RosterPage`. Parse, preview, then bulk-create players via `addPlayer()`.

**Done when:** A 30-player CSV can be imported and creates all players correctly.

---

### Task 30 — Add screenshot crop guide UI

**File:** `src/pages/ScreenshotIngestionPage.tsx`

When an image is selected but before parsing, show a brief tips panel:

```tsx
<div className="bg-amber-900/20 border border-amber-700/40 rounded-lg p-4 mb-4">
  <div className="text-amber-300 font-medium text-sm mb-2">📸 Tips for best results</div>
  <ul className="text-amber-200/70 text-xs space-y-1">
    <li>• Use a direct console screenshot (PS5: Share button, Xbox: Xbox button → Y)</li>
    <li>• Crop tightly to the stat table or scoreboard — exclude the main menu chrome</li>
    <li>• Avoid screenshots mid-animation or with overlay popups visible</li>
    <li>• Player stats: use the "Stats" tab, not the in-game player card overlay</li>
  </ul>
</div>
```

Show this panel only when `imagePath` is set and `parsedData` is null (i.e., before parsing, not after).

**Done when:** Tips appear after selecting an image, before hitting "Parse".

---

### Task 31 — Add video import for dynasty data extraction

**Context:** Dynasty Central's biggest unique feature is recording a short screen video and extracting all data from it automatically. This is feasible in Tauri.

**Step 31a — Add video file support to ScreenshotIngestionPage**

Extend the file picker to accept `.mp4`, `.mov`, `.webm`:
```typescript
const selected = await open({
  filters: [
    { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] },
    { name: 'Video', extensions: ['mp4', 'mov', 'webm'] },
  ],
  multiple: false,
});
```

**Step 31b — Add frame extraction via sidecar**

Create or extend the sidecar to accept a `--extract-frames <video_path> <output_dir>` command that uses `ffmpeg` (bundled or expected to be available) to extract one frame per second.

In Tauri, call via the existing `Command` shell plugin:
```typescript
import { Command } from '@tauri-apps/plugin-shell';

async function extractFrames(videoPath: string, outputDir: string): Promise<string[]> {
  const cmd = Command.sidecar('binaries/madden-reader', [
    '--extract-frames', videoPath, outputDir,
  ]);
  const output = await cmd.execute();
  const frameList: string[] = JSON.parse(output.stdout);
  return frameList;
}
```

**Step 31c — Deduplicate and batch parse**

After extracting frames, deduplicate visually-similar frames (compare base64 hash of small thumbnail, skip near-duplicates within 2 seconds). Then parse each unique frame with Claude Vision using the most appropriate `ScreenType` (auto-detect from content, or let user specify).

Show progress: "Analyzing frame 4 of 12..."

**Step 31d — Merge results**

Merge parsed data from all frames into a single result set (deduplicating players, combining game rows, etc.) and show the unified review-and-confirm UI.

**Note:** This is a complex task. If `ffmpeg` bundling is complex, a simpler V1 is: accept a video file, extract frames using the browser's `<video>` element + `<canvas>`, send key frames to Claude Vision. This avoids the ffmpeg dependency entirely.

```typescript
// Browser-based frame extraction (no ffmpeg needed):
async function extractFramesFromVideo(file: File): Promise<string[]> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const frames: string[] = [];

    video.src = URL.createObjectURL(file);
    video.addEventListener('loadedmetadata', () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const duration = video.duration;
      const interval = 1.5; // capture every 1.5 seconds
      let currentTime = 0;

      const captureFrame = () => {
        if (currentTime >= duration) {
          resolve(frames);
          return;
        }
        video.currentTime = currentTime;
        currentTime += interval;
      };

      video.addEventListener('seeked', () => {
        ctx.drawImage(video, 0, 0);
        frames.push(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
        captureFrame();
      });

      captureFrame();
    });
  });
}
```

**Done when:** A user can select a video recording of their game menus and the app extracts frames, parses them, and shows a unified confirm UI.

---

## Phase 9 — Navigation & Routing

### Task 32 — Fix CommandPalette missing pages

**File:** `src/components/CommandPalette.tsx`

Add these missing navigation items to the appropriate groups:

General (always shown):
- Rivalry Tracker → `nav.goToRivalryTracker()`
- Record Book → `nav.goToRecordBook()`

CFB only:
- NIL Ledger → `nav.goToNilLedger()`
- Recruiting Comparison → `nav.goToRecruitingComparison()`
- Playoff Simulator → `nav.goToPlayoffSimulator()`

Madden only:
- Trade Calculator → `nav.goToTradeCalculator()`  
  *(this is already present — verify it's gated on sport === 'madden')*

**Done when:** All 24 pages are reachable via `Cmd+K`.

---

### Task 33 — Replace custom SPA router with React Router

**Note:** This is the largest refactor in the list. Do it last in Phase 9 and run a full build + smoke test after.

1. `npm install react-router-dom`

2. Replace the `PageContent` switch in `App.tsx` with `<MemoryRouter>` + `<Routes>`:

```tsx
import { MemoryRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';

const ROUTES = [
  { path: '/', element: <LauncherPage /> },
  { path: '/dashboard', element: <DashboardPage /> },
  { path: '/roster', element: <RosterPage /> },
  { path: '/player/:playerId', element: <PlayerProfilePage /> },
  { path: '/legends', element: <LegendsPage /> },
  { path: '/records', element: <RecordsPage /> },
  { path: '/season-recap/:seasonId', element: <SeasonRecapPage /> },
  { path: '/recruiting', element: <RecruitingPage /> },
  { path: '/transfer-portal', element: <TransferPortalPage /> },
  { path: '/draft-tracker', element: <DraftTrackerPage /> },
  { path: '/prestige-tracker', element: <PrestigeTrackerPage /> },
  { path: '/rivalry-tracker', element: <RivalryTrackerPage /> },
  { path: '/program-timeline', element: <ProgramTimelinePage /> },
  { path: '/scouting-card', element: <ScoutingCardPage /> },
  { path: '/trophy-room', element: <TrophyRoomPage /> },
  { path: '/coaching-resume', element: <CoachingResumePage /> },
  { path: '/screenshot-ingestion', element: <ScreenshotIngestionPage /> },
  { path: '/madden-sync', element: <MaddenSyncPage /> },
  { path: '/coaching-staff', element: <CoachingStaffPage /> },
  { path: '/nil-ledger', element: <NilLedgerPage /> },
  { path: '/future-schedule', element: <FutureSchedulePage /> },
  { path: '/playoff-simulator', element: <PlayoffSimulatorPage /> },
  { path: '/trade-calculator', element: <TradeCalculatorPage /> },
  { path: '/recruiting-comparison', element: <RecruitingComparisonPage /> },
  { path: '/record-book', element: <RecordBookPage /> },
];
```

3. Update `useNavigationStore` — replace all `goToX()` methods with a single `navigate(path: string)` wrapper. Or, better, migrate all callsites to use `useNavigate()` from react-router-dom and delete the navigation store entirely.

4. In `PlayerProfilePage`, replace `pageParams.playerId` with `useParams<{ playerId: string }>().playerId`.

5. In `SeasonRecapPage`, replace `pageParams.seasonId` with `useParams<{ seasonId: string }>().seasonId`.

**Done when:** All pages reachable. TypeScript compiles. `npm run build` passes. Navigation store can be deleted.

---

## Phase 10 — Polish & Cleanup

### Task 34 — Add dev trait to Trade Calculator

**File:** `src/lib/trade-calculator.ts` and `src/pages/TradeCalculatorPage.tsx`

Add `devTrait` as an input to `TradeValueInput`:
```typescript
devTrait?: 'normal' | 'star' | 'superstar' | 'xfactor';
```

Apply a multiplier in `calculateTradeValue()`:
```typescript
const devMultiplier = {
  normal: 1.0,
  star: 1.15,
  superstar: 1.30,
  xfactor: 1.45,
}[input.devTrait ?? 'normal'];

const rawTotal = base * (1 - agePenalty) * (1 + contractBonus) * devMultiplier;
```

Add dev trait selector to the `TradeCalculatorPage` form.

**Done when:** Trade value changes based on selected dev trait.

---

### Task 35 — Add `persist` middleware to filter store

**File:** `src/store/filter-store.ts`

```typescript
import { persist } from 'zustand/middleware';

export const useFilterStore = create(
  persist(
    (set, get) => ({ /* existing implementation unchanged */ }),
    { name: 'dynasty-os-filters' }
  )
);
```

**Done when:** Active filters survive an app restart.

---

### Task 36 — Break up oversized page components

Extract sub-components from the four largest pages. Each extracted component goes in `src/components/`:

- `ScreenshotIngestionPage.tsx` (943 lines) → extract `ScreenshotParseForm`, `PlayerStatsMatchTable`, `RecruitImportTable`
- `PlayerProfilePage.tsx` (778 lines) → extract `PlayerSeasonStatsTable`, `CareerSummaryCard`, `LegacyCardSection`
- `MaddenSyncPage.tsx` (743 lines) → extract `SyncFileSelector`, `SyncDiffPreview`, `SyncHistoryLog`
- `RecruitingPage.tsx` (615 lines) → extract `RecruitingClassSummary`, `RecruitBoard`, `RecruitCard`

Aim for sub-components under 200 lines each.

**Done when:** Build passes. All pages still function identically. No new files exceed 300 lines.

---

### Task 37 — Add TickerBar sport toggle

**File:** `src/components/TickerBar.tsx`

Add a small toggle button (⚡ NFL / 🏈 CFB) that lets users override the default sport for the live ticker, and a hide/show button. Persist preference via `prefs.set('ticker-league', ...)`.

**Done when:** Users can switch the ticker between NFL and CFB scores, and hide it entirely.

---

### Task 38 — Add game version registry

**File:** Create `src/lib/game-version-registry.ts`

```typescript
export interface GameVersionConfig {
  id: string;
  displayName: string;
  sport: 'madden' | 'cfb';
  releaseYear: number;
  pcAvailable: boolean;
  saveFilePaths: string[];
  status: 'supported' | 'beta' | 'coming_soon';
}

export const GAME_VERSION_REGISTRY: GameVersionConfig[] = [
  {
    id: 'madden-25', displayName: 'Madden NFL 25', sport: 'madden',
    releaseYear: 2024, pcAvailable: true,
    saveFilePaths: ['%USERPROFILE%\\Documents\\Madden NFL 25\\saves'],
    status: 'supported',
  },
  {
    id: 'madden-26', displayName: 'Madden NFL 26', sport: 'madden',
    releaseYear: 2025, pcAvailable: true,
    saveFilePaths: ['%USERPROFILE%\\Documents\\Madden NFL 26\\saves'],
    status: 'supported',
  },
  {
    id: 'madden-27', displayName: 'Madden NFL 27', sport: 'madden',
    releaseYear: 2026, pcAvailable: true,
    saveFilePaths: ['%USERPROFILE%\\Documents\\Madden NFL 27\\saves'],
    status: 'coming_soon',
  },
  {
    id: 'cfb-25', displayName: 'EA Sports College Football 25', sport: 'cfb',
    releaseYear: 2024, pcAvailable: false, saveFilePaths: [],
    status: 'supported',
  },
  {
    id: 'cfb-26', displayName: 'EA Sports College Football 26', sport: 'cfb',
    releaseYear: 2025, pcAvailable: false, saveFilePaths: [],
    status: 'supported',
  },
  {
    id: 'cfb-27', displayName: 'EA Sports College Football 27', sport: 'cfb',
    releaseYear: 2026, pcAvailable: false, saveFilePaths: [],
    status: 'coming_soon',
  },
];
```

Use this in `CreateDynastyModal` (show game version picker with status badges) and `MaddenSyncPage` (use `saveFilePaths` for auto-detect in Task 18).

**Done when:** Registry exists. When Madden 27 ships, a developer changes `status: 'coming_soon'` to `'supported'` and bumps the sidecar npm dep — that's the entire update.

---

### Task 39 — Add season key events display to Program Timeline

After Task 9 adds `keyEvents` to the Season model and `SeasonEndModal`, display them on the timeline:

**File:** `src/pages/ProgramTimelinePage.tsx`

For each timeline node that has `keyEvents`, render them as a small bullet list below the season record:

```tsx
{node.keyEvents && node.keyEvents.length > 0 && (
  <ul className="mt-2 space-y-0.5">
    {node.keyEvents.map((event, i) => (
      <li key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
        <span className="text-amber-500 mt-0.5">•</span>
        {event}
      </li>
    ))}
  </ul>
)}
```

**Done when:** Seasons with key events show them on the timeline.

---

### Task 40 — Final build verification

Run the complete test checklist:

- [ ] `npm run build` — zero TypeScript errors
- [ ] No `localStorage.getItem/setItem/removeItem` calls remain in `src/`
- [ ] No `api.anthropic.com` fetch calls remain in `src/`
- [ ] No `db as any` remains in `src/`
- [ ] No `(season as any)` remains in `src/`
- [ ] Setting an API key is not visible in DevTools Application → Local Storage
- [ ] AI narrative generation works end-to-end
- [ ] Madden sync imports a franchise file and writes player stat lines
- [ ] Player stats screenshot → shows match UI → saves stats to `db.playerSeasons`
- [ ] Rivalry key moments appear after export → import cycle
- [ ] Bowl opponent and key events save in SeasonEndModal and appear on Program Timeline
- [ ] All 24 pages reachable via Cmd+K
- [ ] Quick Score widget logs a game correctly
- [ ] Hard Sell calculator shows correct recommendation
- [ ] Dev trait badge visible on roster
- [ ] Transfer risk tags visible on players with deal breakers set
- [ ] CSV game import works with the template file
- [ ] Recruit "Add to Roster" pre-fills AddPlayerModal correctly
- [ ] Draft pick linked to player auto-updates player status to Drafted

---

## Key Files Reference

| Area | Files |
|---|---|
| Tauri backend | `src-tauri/src/main.rs`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json` |
| AI bridge | `src/lib/ai-bridge.ts` (create), `src/lib/legacy-card-service.ts` |
| AI services | `src/lib/narrative-service.ts`, `src/lib/screenshot-service.ts`, `src/lib/recruiting-service.ts` |
| AI queue | `src/store/ai-queue-store.ts`, `src/lib/ai-queue-processor.ts` (create), `src/hooks/useAiQueueWorker.ts` (create) |
| Prefs/store | `src/lib/prefs-service.ts` (create) |
| Core types | `@dynasty-os/core-types` — Player, Season, Recruit, KeyMoment |
| DB schema | `@dynasty-os/db` — add keyMoments table |
| Screenshot pipeline | `src/pages/ScreenshotIngestionPage.tsx`, `src/lib/screenshot-service.ts`, `src/lib/fuzzy-match.ts` (create) |
| Madden sidecar | sidecar Node.js source, `src/lib/madden-sync-service.ts` |
| Recruiting tools | `src/lib/recruiting-calculator.ts` (create), `src/pages/RecruitingPage.tsx` |
| Quick entry | `src/components/QuickScoreEntry.tsx` (create), `src/pages/DashboardPage.tsx` |
| CSV import | `src/lib/csv-import-service.ts` (create), `src/lib/csv-roster-import-service.ts` (create) |
| Export/import | `src/lib/export-import.ts` — add keyMoments |
| Navigation | `src/store/navigation-store.ts`, `src/App.tsx`, `src/components/CommandPalette.tsx` |
| Game version registry | `src/lib/game-version-registry.ts` (create) |

---

*This is the complete handoff. All three prior research documents (dynasty-os-handoff.md, dynasty-os-ingestion-addendum.md, dynasty-os-full-audit-v2.md) are superseded by this file.*
