# Phase 11: QOL Wins - Research

**Researched:** 2026-02-25
**Domain:** React UX patterns — toasts, undo, filter persistence, command palette, CSV export, player notes, dashboard checklist, timeline scrubber
**Confidence:** HIGH

## Summary

Phase 11 delivers ten quality-of-life improvements across the Dynasty OS desktop app. All four infrastructure packages required for this phase were installed in Phase 10 (`cmdk@1.1.1`, `sonner@2.0.7`, `zundo@2.3.0`, `papaparse@5.5.3`) and all four global stores were scaffolded (`useToastStore`, `useUndoStore`, `useFilterStore`, and the Cmd+K listener stub in App.tsx). Phase 11 is primarily wiring work — connecting the existing scaffolding to actual UI and service-layer call sites.

The most complex requirements are QOL-04 (command palette via `cmdk`) and QOL-05 (CSV export via `papaparse` + Tauri file dialog). The rest are moderate-complexity UI wiring: attaching `useToastStore.success()` to write operations, wiring `useUndoStore.pushUndo()` to delete/edit paths, reading `useFilterStore.getFilters()` on mount and calling `setFilter()` on change, and building two new UI components (season checklist for QOL-09, timeline scrubber for QOL-10). QOL-06/07/08 are targeted enhancements to existing modals and player records.

**Primary recommendation:** Treat this as four work streams: (1) toast + undo wiring into existing stores/services, (2) filter persistence wiring across all pages with filters, (3) command palette component using `cmdk`, and (4) new features (CSV export, QOL-06 year auto-suggest, QOL-07 recent opponents, QOL-08 player notes UI, QOL-09 checklist, QOL-10 scrubber).

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| sonner | 2.0.7 | Toast notifications | Already wired — `Toaster` mounted in App.tsx, `useToastStore` wraps it |
| cmdk | 1.1.1 | Command palette | Installed Phase 10, Cmd+K listener stub already in App.tsx |
| papaparse | 5.5.3 | CSV generation from JS objects | Industry-standard; `Papa.unparse()` converts arrays-of-objects to CSV string |
| zundo | 2.3.0 | Installed but intentionally unused | DB-level undo chosen instead (STATE.md decision Phase 10-04) |
| zustand | ^5.0.3 | All global stores | Already project-wide pattern |
| @tauri-apps/plugin-dialog | ^2.6.0 | OS save dialog for file export | Already used in LegacyCardExport.tsx and export-import.ts |
| @tauri-apps/plugin-fs | ^2.4.5 | Write CSV to disk | Already used; `writeTextFile` available and permitted |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react (hooks) | ^18.3.1 | `useState`, `useEffect`, `useMemo` for local component state | Throughout QOL-06/07/08/09/10 |
| Tailwind CSS | ^3.4.17 | All styling | Component styling per project convention |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `cmdk` Command.Dialog | Custom modal + fuzzy filter | cmdk handles accessibility, keyboard nav, and fuzzy filter automatically — never hand-roll |
| `papaparse` | Manual CSV string building | Papa handles quoting, escaping, headers correctly per RFC 4180 |
| DB-level undo (UndoStore) | zundo Zustand middleware | DB-level chosen (STATE.md): prevents DB/store inconsistency when side effects (season recalc, achievement eval) run post-save |

**Installation:** All packages already installed. No new npm installs required for Phase 11.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── components/
│   └── CommandPalette.tsx    # QOL-04: new cmdk-based dialog component
├── pages/
│   ├── DashboardPage.tsx     # QOL-09: add SeasonChecklist widget
│   └── ProgramTimelinePage.tsx  # QOL-10: add horizontal scrubber
├── store/
│   ├── toast-store.ts        # Already complete — wire call sites
│   ├── undo-store.ts         # Already complete — wire call sites
│   └── filter-store.ts       # Already complete — wire pages
└── lib/
    └── csv-export.ts         # QOL-05: new utility wrapping papaparse + Tauri dialog
```

### Pattern 1: Toast Wiring (QOL-01)

**What:** Call `useToastStore.getState().success()` or `.error()` after every write operation in Zustand stores and modals. The `useToastStore` wraps `sonner`'s `toast()` — no direct `toast()` imports needed in feature components (STATE.md Phase 10-04 decision).

**When to use:** After every `logGame`, `updateGame`, `deleteGame`, `addPlayer`, `updatePlayer`, `deletePlayer`, `updateSeason`, `logPlayerSeason` call resolves.

**Write operations inventory** (sites needing toast wiring):
- `useGameStore.logGame()` → success: "Game logged"
- `useGameStore.updateGame()` → success: "Game updated"
- `useGameStore.deleteGame()` → success: "Game deleted"
- `useSeasonStore.createSeason()` → success: "Season started"
- `useSeasonStore.updateSeason()` → success: "Season data saved"
- `usePlayerStore.addPlayer()` → success: "Player added"
- `usePlayerStore.updatePlayer()` → success: "Player updated"
- `usePlayerStore.deletePlayer()` → success: "Player deleted"
- `usePlayerSeasonStore.logPlayerSeason()` → success: "Season stats saved"

**Pattern (inside Zustand store action):**
```typescript
// Source: STATE.md decision [Phase 10-04]: useToastStore wraps sonner toast() calls
import { useToastStore } from './toast-store';

logGame: async (input) => {
  try {
    const game = await svcCreate(input);
    useToastStore.getState().success('Game logged', `vs ${input.opponent}`);
    return game;
  } catch (err) {
    useToastStore.getState().error('Failed to log game', String(err));
    throw err;
  }
}
```

**Important:** Call `useToastStore.getState()` (not the hook) inside Zustand actions since hooks cannot be called outside components.

### Pattern 2: Undo Wiring (QOL-02)

**What:** Before any delete or destructive update, snapshot the record and push to `useUndoStore`. The store already has the `pushUndo(op: UndoableOperation)` and `undo()` methods that write back to Dexie via `db[table].add()` or `db[table].put()`.

**When to use:** `deleteGame`, `deletePlayer`, `updateGame` (edit), `updatePlayer` (edit), `logPlayerSeason` deletions.

**Constraint (from STATE.md):** Undo stores DB-level operation descriptors. After `undo()` is called, the calling component MUST reload its store (e.g., `loadGames(seasonId)`) since undo writes directly to Dexie without updating Zustand in-memory state.

```typescript
// Source: undo-store.ts (Phase 10-04 scaffold)
import { useUndoStore, type UndoableOperation } from '../store/undo-store';
import { generateId } from '../lib/uuid';

// Before deleting:
const snapshot = await db.games.get(id);
if (snapshot) {
  const op: UndoableOperation = {
    id: generateId(),
    table: 'games',
    operation: 'delete',
    recordId: id,
    snapshot: snapshot as Record<string, unknown>,
    description: `Delete game vs ${snapshot.opponent}`,
    performedAt: Date.now(),
  };
  useUndoStore.getState().pushUndo(op);
}
await svcDelete(id);
```

**Undo trigger UI:** A persistent keyboard shortcut (Cmd+Z / Ctrl+Z) registered in App.tsx, or a "Undo" button that appears in the toast after a destructive action. The toast approach is cleaner UX and aligns with sonner's action pattern.

**Sonner action button in toast:**
```typescript
// Source: sonner docs — toast with action button
toast.success('Game deleted', {
  action: {
    label: 'Undo',
    onClick: async () => {
      await useUndoStore.getState().undo();
      // reload affected store
      await useGameStore.getState().loadGames(seasonId);
      toast.success('Game restored');
    }
  }
});
```

### Pattern 3: Filter Persistence (QOL-03)

**What:** Pages with filters read initial values from `useFilterStore.getFilters(pageName)` on mount and write back via `setFilter(pageName, key, value)` on change. The `useFilterStore` is in-memory Zustand (session-scoped, not localStorage persisted), which satisfies QOL-03 ("within the same app session").

**Pages with filters that need wiring:**
- `RosterPage` — `positionFilter`, `statusFilter`
- `LegendsPage` — position filter, era filter (if any)
- `RecordsPage` — season selector, stat category
- `RecruitingPage` — year/class selector (if filterable)
- `DraftTrackerPage` — year selector
- `TransferPortalPage` — season selector

**Mount pattern:**
```typescript
// Source: filter-store.ts (Phase 10-04 scaffold)
import { useFilterStore } from '../store/filter-store';

const PAGE_KEY = 'roster';

function RosterPage() {
  const savedFilters = useFilterStore.getState().getFilters(PAGE_KEY);

  const [positionFilter, setPositionFilterState] = useState<string>(
    (savedFilters['position'] as string) ?? 'All'
  );
  const [statusFilter, setStatusFilterState] = useState<StatusFilter>(
    (savedFilters['status'] as StatusFilter) ?? 'active'
  );

  const setPositionFilter = (val: string) => {
    setPositionFilterState(val);
    useFilterStore.getState().setFilter(PAGE_KEY, 'position', val);
  };
  const setStatusFilter = (val: StatusFilter) => {
    setStatusFilterState(val);
    useFilterStore.getState().setFilter(PAGE_KEY, 'status', val);
  };
  // ...
}
```

### Pattern 4: Command Palette (QOL-04)

**What:** A full-screen modal dialog using `cmdk`'s `Command.Dialog` component, toggled by the existing Cmd+K listener in App.tsx. The App.tsx stub already has `e.preventDefault()` and a comment placeholder.

**cmdk API (from local node_modules README — HIGH confidence):**
- `Command.Dialog` — renders in a Radix UI Dialog portal, accepts `open` and `onOpenChange` props
- `Command.Input` — text input with built-in fuzzy filtering; accepts `value` and `onValueChange`
- `Command.List` — scrollable results container
- `Command.Group` — labeled group of items; `heading` prop
- `Command.Item` — single result; `onSelect` callback; must have unique `value` prop
- `Command.Empty` — shown when no items match
- Filtering is automatic by default (cmdk matches `Command.Item value` against input)

**Implementation approach:**
1. Create `CommandPalette.tsx` component with its own `open` state (or expose toggle via a small store/context)
2. Wire App.tsx Cmd+K handler to toggle the palette open state
3. Build item registry: all 18 navigation pages from `navigation-store.ts` Page type + quick actions ("Log Game", "End Season")
4. `onSelect` calls the appropriate `useNavigationStore.getState().goToXxx()` method

**App.tsx wiring change:**
```typescript
// The stub in App.tsx already exists — replace the comment with:
// setCommandPaletteOpen((open) => !open)
```

**Item structure:**
```typescript
interface CommandItem {
  value: string;      // unique id for cmdk filtering
  label: string;      // display text
  group: 'Navigate' | 'Actions' | 'CFB' | 'NFL';
  keywords?: string[];  // aliases for fuzzy search
  action: () => void;
}
```

**cmdk styling:** Unstyled by default — must provide Tailwind classes. The component uses `[cmdk-root]`, `[cmdk-input]`, `[cmdk-list]`, `[cmdk-item]`, `[cmdk-group-heading]` data attributes for CSS targeting. Use `data-[selected=true]:bg-gray-700` pattern for selected state since cmdk uses `data-selected` attribute.

### Pattern 5: CSV Export (QOL-05)

**What:** Any data table gets an "Export CSV" button. `Papa.unparse(data)` generates a CSV string from an array of plain objects. Then `writeTextFile(filePath, csv)` via Tauri saves it. The save dialog (`save()` from plugin-dialog) is already permitted in `capabilities/default.json`.

**File write permission check:** `capabilities/default.json` currently has `fs:allow-write-text-file` — this covers `writeTextFile()`. No new Tauri permissions needed.

```typescript
// Source: export-import.ts pattern + papaparse docs
import Papa from 'papaparse';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

export async function exportTableToCsv(
  data: Record<string, unknown>[],
  filename: string
): Promise<void> {
  const csv = Papa.unparse(data); // generates RFC 4180 compliant CSV with headers
  const filePath = await save({
    defaultPath: filename,
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  });
  if (!filePath) return; // user cancelled — not an error
  await writeTextFile(filePath, csv);
}
```

**Pages needing CSV export buttons:**
- `RosterPage` — players table
- `RecordsPage` — leaderboard tables
- `GameLog` component — game results
- `RecruitingPage` — recruiting class
- `DraftTrackerPage` — draft picks

**Shared pattern:** Each page calls `exportTableToCsv(rowsAsObjects, 'filename.csv')`. Row shaping is done in the page before passing to the utility.

### Pattern 6: QOL-06 — Season Year Auto-Suggest

**What:** When creating a new season (the "Start [Year] Season" button on DashboardPage), pre-fill the year input with `max(existing seasons' years) + 1`. Currently `handleCreateFirstSeason` hardcodes `activeDynasty.currentYear`. This needs to be updated to suggest `activeSeason.year + 1` if seasons exist.

**Location:** `DashboardPage.tsx` `handleCreateFirstSeason`. The `seasons` array is already in scope (sorted descending), so `seasons[0].year + 1` gives the suggestion.

**Scope:** This is a one-line change + an optional confirmation step if a year-input modal is needed for non-first seasons. Currently `handleCreateFirstSeason` is only shown when `seasons.length === 0`. For the QOL-06 auto-suggest, the "new season" flow when seasons already exist (triggered by some separate "New Season" button) should default to `activeSeason.year + 1`.

### Pattern 7: QOL-07 — Recent Opponents Quick-Select

**What:** In `LogGameModal`, show the last N unique opponents from `useGameStore.games` as quick-select chips above the `TeamSelect` input. Clicking a chip sets `opponent` state and bypasses team search.

**Data already available:** `games` prop is already in `LogGameModal` from `useGameStore`. Extract unique opponents: `[...new Set(games.map(g => g.opponent))].slice(0, 5)`.

**Implementation:** Add a row of clickable badges above the `TeamSelect` field. Clicking sets `setOpponent(teamName)` directly.

### Pattern 8: QOL-08 — Player Notes Field

**What:** The `Player` type already has `notes?: string` (added in Phase 10 per `packages/core-types/src/player.ts`). QOL-08 requires a UI for adding/editing this field.

**Locations:**
- `EditPlayerModal` — add a textarea for `notes`
- `PlayerProfilePage` — display notes section when non-empty

No schema or type changes needed. `updatePlayer(id, { notes })` already works via the player service.

### Pattern 9: QOL-09 — Dashboard Season Checklist

**What:** A new widget on `DashboardPage` showing annual tasks with completion state. Tasks are stored as local Zustand state (session-scoped) or in a simple `seasonChecklist` field on the Season record if persistence is needed.

**Suggested tasks for checklist:**
1. Log all games for the season
2. Record season end data (bowl/playoff/ranking)
3. Generate season recap narrative
4. Log recruiting class (CFB only)
5. Log NFL draft class (CFB only)
6. Update player stats for the season
7. Log transfer portal activity (CFB only)

**State approach:** Store completion as `Record<string, boolean>` keyed by task ID in a `seasonChecklistStore` or as a localStorage entry keyed by `seasonId`. Season-scoped localStorage (`dynasty-os-checklist-{seasonId}`) is the lowest-friction approach consistent with the existing localStorage pattern for narrative cache.

### Pattern 10: QOL-10 — Timeline Scrubber

**What:** A horizontal scrubber added to `ProgramTimelinePage` that lets the user jump to any dynasty year. The `nodes` array already contains all seasons sorted by year.

**Implementation:** A horizontal scrollable track with one clickable pip per year. Clicking a pip scrolls the timeline list to that year's node using `scrollIntoView()`. Year labels shown on hover or below each pip.

**No new data needed:** All data is in the existing `nodes: TimelineNode[]` array fetched by `getTimelineNodes()`.

### Anti-Patterns to Avoid

- **Direct `toast()` calls in components:** Use `useToastStore.getState().success()` instead — keeps sonner as an implementation detail, testable, and consistent per STATE.md.
- **Importing `useToastStore` as a hook inside Zustand actions:** Use `.getState()` — hooks can only be called in React components.
- **Using zundo for undo:** zundo is installed but the project chose DB-level undo (STATE.md Phase 10-04). Do not use zundo middleware.
- **Blob URL downloads for CSV:** Tauri WebView blocks `anchor.click()` blob downloads (STATE.md decision). Always use `save()` + `writeTextFile()`.
- **Storing filter state in URL params:** Navigation uses a page-state store, not URL routing. Use `useFilterStore` for all filter persistence.
- **cmdk `Command.Item` without unique `value` prop:** cmdk requires each item to have a unique `value` for filtering to work correctly (per cmdk README FAQ).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Command palette fuzzy filtering | Custom search/filter algorithm | `cmdk` built-in filtering | cmdk handles case-insensitive, fuzzy, keyword aliasing automatically |
| CSV formatting | Template literals with comma joins | `Papa.unparse()` | Manual CSV breaks on values containing commas, quotes, or newlines |
| Toast stacking/deduplication | Custom toast queue | sonner | sonner handles stacking, animations, dismiss, and action buttons |
| Undo snapshot storage | Custom history array | `useUndoStore` (already built) | Already implemented in Phase 10 with correct DB-level restore |
| Accessible dialog for palette | Custom modal | `cmdk Command.Dialog` (uses Radix Dialog) | Handles focus trap, ARIA, keyboard navigation, Escape key |

**Key insight:** All the hard infrastructure is in place from Phase 10. Phase 11 is UI wiring and component authoring against already-proven patterns.

## Common Pitfalls

### Pitfall 1: Toast in Zustand Action Requires `.getState()`

**What goes wrong:** Developer writes `useToastStore((s) => s.success)('message')` inside a Zustand action — this is a hook call and throws an error outside React tree.

**Why it happens:** Forgetting that Zustand actions run outside the React render cycle.

**How to avoid:** Always use `useToastStore.getState().success(...)` inside Zustand store actions, service functions, and event handlers outside components.

**Warning signs:** "Invalid hook call" error in console.

### Pitfall 2: Undo Requires Store Reload After `undo()`

**What goes wrong:** After `useUndoStore.getState().undo()` restores a record to Dexie, the page still shows the deleted/edited state because Zustand in-memory state was not refreshed.

**Why it happens:** `useUndoStore.undo()` writes directly to Dexie but does not call `loadGames()`, `loadPlayers()`, etc.

**How to avoid:** After calling `undo()`, always reload the affected Zustand store. The undo action in the toast `onClick` must chain a `loadGames(seasonId)` or `loadPlayers(dynastyId)` call.

**Warning signs:** UI doesn't reflect restored data after undo, even though DB has the record.

### Pitfall 3: cmdk Item Value Must Be Unique

**What goes wrong:** Two navigation items have the same `value` prop (e.g., both "records" and "career records" map to `value="records"`). cmdk's filtering algorithm produces wrong results.

**Why it happens:** Developers use display labels or page keys without ensuring global uniqueness.

**How to avoid:** Use unique IDs like `"nav-roster"`, `"nav-records"`, `"action-log-game"` as `value` props. Display text is separate from the `value`.

### Pitfall 4: CSV Permission Scope — Binary vs Text

**What goes wrong:** Using `writeFile()` (binary write) instead of `writeTextFile()` for CSV. Both are in the plugin-fs package but only `fs:allow-write-text-file` is in `capabilities/default.json`.

**Why it happens:** Confusing the two write functions. LegacyCardExport uses `writeFile()` (binary for PNG) — that's a different permission scope (`fs:allow-write-file` is NOT listed in capabilities).

**How to avoid:** For CSV, always use `writeTextFile(filePath, csvString)` — it is already permitted. Do not add new Tauri permissions for CSV export.

**Warning signs:** Tauri IPC error "permission denied" when trying to write CSV.

### Pitfall 5: Filter Store — Stale Initial Value on Dynasty Switch

**What goes wrong:** A user switches dynasties. The filter store still has the previous dynasty's filter selections (e.g., a position that doesn't exist in the new sport). The roster page tries to filter by an invalid position.

**Why it happens:** `useFilterStore` is session-scoped and doesn't react to dynasty changes.

**How to avoid:** In the `useDynastyStore` dynasty-switch action, call `useFilterStore.getState().clearAll()` to reset filters when the active dynasty changes.

### Pitfall 6: `cmdk` Dialog and Tauri WebView Focus

**What goes wrong:** The command palette input doesn't receive focus on open in Tauri's WebView (same cold-launch issue that motivated the hidden input in App.tsx).

**Why it happens:** WebView2 and WKWebView have focus management quirks.

**How to avoid:** Use `Command.Dialog`'s `onOpenChange` to call `input.focus()` imperatively after the dialog opens. The cmdk `Command.Input` component forwards refs. Alternatively, use the `autoFocus` prop on `Command.Input` — but test this in Tauri explicitly.

## Code Examples

Verified patterns from official sources and existing codebase:

### Toast after write operation (in Zustand store action)

```typescript
// Source: STATE.md [Phase 10-04] + useToastStore scaffold in toast-store.ts
// Call pattern for any Zustand store action
logGame: async (input) => {
  set({ loading: true, error: null });
  try {
    const game = await svcCreate(input);
    const games = await getGamesBySeason(input.seasonId);
    set({ games, loading: false });
    useToastStore.getState().success('Game logged', `vs ${input.opponent}`);
    return game;
  } catch (err) {
    useToastStore.getState().error('Failed to log game', String(err));
    set({ error: String(err), loading: false });
    throw err;
  }
},
```

### Undo push + toast action button pattern

```typescript
// Source: undo-store.ts scaffold + sonner docs action button pattern
import { useUndoStore } from '../store/undo-store';
import { useToastStore } from '../store/toast-store';

// Before calling svcDelete inside deleteGame store action:
const { games } = get();
const existing = games.find((g) => g.id === id);
if (existing) {
  useUndoStore.getState().pushUndo({
    id: generateId(),
    table: 'games',
    operation: 'delete',
    recordId: id,
    snapshot: existing as Record<string, unknown>,
    description: `Delete game vs ${existing.opponent}`,
    performedAt: Date.now(),
  });
}
await svcDelete(id);
// Then show toast with undo action:
const seasonId = existing?.seasonId;
toast.success('Game deleted', {
  action: {
    label: 'Undo',
    onClick: async () => {
      await useUndoStore.getState().undo();
      if (seasonId) await useGameStore.getState().loadGames(seasonId);
      toast.success('Game restored');
    },
  },
});
```

### Filter persistence mount pattern

```typescript
// Source: filter-store.ts scaffold (Phase 10-04)
const PAGE_KEY = 'roster';
const savedFilters = useFilterStore.getState().getFilters(PAGE_KEY);
const [positionFilter, setPositionFilterState] = useState<string>(
  (savedFilters['position'] as string) ?? 'All'
);
// On change:
const setPositionFilter = (val: string) => {
  setPositionFilterState(val);
  useFilterStore.getState().setFilter(PAGE_KEY, 'position', val);
};
```

### cmdk Command Palette component skeleton

```typescript
// Source: cmdk README (node_modules/cmdk/README.md) — HIGH confidence
import { Command } from 'cmdk';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const nav = useNavigationStore.getState();
  return (
    <Command.Dialog open={open} onOpenChange={onOpenChange} label="Command Palette">
      <Command.Input placeholder="Type a command or search..." />
      <Command.List>
        <Command.Empty>No results found.</Command.Empty>
        <Command.Group heading="Navigate">
          <Command.Item value="nav-dashboard" onSelect={() => { nav.goToDashboard(); onOpenChange(false); }}>
            Dashboard
          </Command.Item>
          <Command.Item value="nav-roster" onSelect={() => { nav.goToRoster(); onOpenChange(false); }}>
            Roster
          </Command.Item>
          {/* ... all pages from navigation-store.ts Page type ... */}
        </Command.Group>
        <Command.Group heading="Actions">
          <Command.Item value="action-log-game" keywords={['game', 'log', 'result']} onSelect={...}>
            Log Game
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
```

### CSV export utility

```typescript
// Source: export-import.ts pattern + papaparse docs (Papa.unparse)
import Papa from 'papaparse';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

export async function exportTableToCsv(
  rows: Record<string, unknown>[],
  filename: string
): Promise<void> {
  if (rows.length === 0) return;
  const csv = Papa.unparse(rows); // headers inferred from first row keys
  const filePath = await save({
    defaultPath: filename,
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  });
  if (!filePath) return;
  await writeTextFile(filePath, csv);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| window.confirm() for deletes (RosterPage) | Toast with Undo action | Phase 11 | More recoverable — no blocking modal |
| Filters reset on every navigation | useFilterStore in-memory persistence | Phase 11 | Filters survive navigation within session |
| No command shortcut | cmdk Command.Dialog via Cmd+K | Phase 11 | Power-user navigation from any screen |
| No CSV export | papaparse + Tauri dialog | Phase 11 | Coaches can use data in Excel/Sheets |

**Deprecated/outdated in this phase:**
- `window.confirm()` in RosterPage `handleDelete`: Replace with toast-based undo pattern (no blocking confirm dialog).

## Open Questions

1. **Season Checklist Persistence (QOL-09)**
   - What we know: `Season` has a `notes?: string` field. No explicit `checklist` field exists.
   - What's unclear: Should checklist completion state persist across app restarts (localStorage) or only within session (Zustand)?
   - Recommendation: Use localStorage keyed by `dynasty-os-checklist-{seasonId}` (consistent with `legacy-blurb-{playerId}` pattern from STATE.md). Simple `Record<string, boolean>` JSON. No Dexie schema change needed.

2. **Command Palette State Management (QOL-04)**
   - What we know: App.tsx has the Cmd+K listener stub. The `open` state must live somewhere accessible from App.tsx to render `<CommandPalette open={...} />`.
   - What's unclear: Should `open` be React `useState` in App.tsx (prop-drilled) or a small Zustand store atom?
   - Recommendation: Simple `useState` in App.tsx is sufficient — the palette is mounted at the app root, not deep in the component tree. No prop drilling needed.

3. **Which pages need CSV export (QOL-05)?**
   - What we know: "Any data table" per the requirement.
   - What's unclear: Exact list of pages.
   - Recommendation: Prioritize pages with the most coach-useful tabular data: GameLog (game results), RosterPage (player list), RecordsPage (leaderboards). Can extend to others as time allows.

4. **Undo for PlayerSeason edits (LogPlayerSeasonModal)**
   - What we know: `useUndoStore` supports `update` operation type via `db[table].put(snapshot)`.
   - What's unclear: PlayerSeason edits overwrite the entire stats record — snapshot must capture the full prior record including sparse stats.
   - Recommendation: Before calling `svcUpdate`, fetch the current record with `db.playerSeasons.get(id)` and snapshot it. This is the same pattern as game/player undo.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| QOL-01 | User receives a toast notification confirming every successful write operation (game log, player edit, stat entry) | Pattern 1 — `useToastStore.getState().success()` in Zustand store actions; sonner already mounted in App.tsx |
| QOL-02 | User can undo the last single destructive action (delete or edit) for games, players, and season stats | Pattern 2 — `useUndoStore.pushUndo()` before delete/update; sonner action button in toast triggers `undo()` + store reload |
| QOL-03 | All list and table filter selections persist across navigation within the same app session | Pattern 3 — `useFilterStore.setFilter(page, key, val)` on change; `getFilters(page)` on mount for initial values |
| QOL-04 | User can open a command palette (Ctrl+K / Cmd+K) to navigate to any page or trigger quick actions from any screen | Pattern 4 — `CommandPalette.tsx` using `cmdk` `Command.Dialog`; wire App.tsx Cmd+K stub to open state |
| QOL-05 | User can export any data table to a CSV file via the OS file save dialog | Pattern 5 — `lib/csv-export.ts` utility: `Papa.unparse(rows)` → `save()` dialog → `writeTextFile()`; no new permissions needed |
| QOL-06 | New season year input auto-suggests previous season year + 1 | Pattern 6 — `DashboardPage.handleCreateFirstSeason`: use `seasons[0].year + 1` when seasons exist; `activeDynasty.currentYear` for first season |
| QOL-07 | Log Game modal shows recently-used opponents as quick-select options | Pattern 7 — `LogGameModal`: derive unique recent opponents from `games` array; render as clickable chips above `TeamSelect` |
| QOL-08 | User can add and edit a free-text note on any player record | Pattern 8 — `Player.notes?: string` already in core-types; add textarea to `EditPlayerModal`; display in `PlayerProfilePage` |
| QOL-09 | Dashboard season checklist tracks which annual tasks are complete for the active season | Pattern 9 — new checklist widget in `DashboardPage`; completion state in localStorage keyed by `dynasty-os-checklist-{seasonId}` |
| QOL-10 | Program Timeline includes a horizontal season scrubber for jumping to any dynasty year directly | Pattern 10 — horizontal scrubber component in `ProgramTimelinePage`; uses existing `nodes` array; `scrollIntoView()` for year jump |
</phase_requirements>

## Sources

### Primary (HIGH confidence)

- Local: `apps/desktop/node_modules/cmdk/README.md` — cmdk 1.1.1 full API, Dialog/Input/List/Group/Item/Empty components, styling attributes, FAQ
- Local: `apps/desktop/node_modules/sonner/README.md` — sonner 2.0.7 usage, toast action buttons
- Local: `apps/desktop/node_modules/papaparse/README.md` — Papa.unparse() JSON-to-CSV API
- Local: `apps/desktop/src/store/toast-store.ts` — confirmed scaffold from Phase 10
- Local: `apps/desktop/src/store/undo-store.ts` — confirmed DB-level undo scaffold from Phase 10
- Local: `apps/desktop/src/store/filter-store.ts` — confirmed filter persistence scaffold from Phase 10
- Local: `apps/desktop/src/App.tsx` — confirmed Cmd+K listener stub and `Toaster` mount
- Local: `apps/desktop/src/components/LegacyCardExport.tsx` — confirmed `save()` + `writeFile()` Tauri pattern
- Local: `apps/desktop/src/lib/export-import.ts` — confirmed `save()` + `writeTextFile()` Tauri pattern
- Local: `apps/desktop/src-tauri/capabilities/default.json` — confirmed `fs:allow-write-text-file` permission exists (no new perms needed for CSV)
- Local: `packages/core-types/src/player.ts` — confirmed `Player.notes?: string` field already in type
- Local: `apps/desktop/src/store/navigation-store.ts` — all 18 page destinations for command palette item registry
- Local: `.planning/STATE.md` — confirmed Phase 10 decisions: useToastStore wraps sonner, DB-level undo, filter store, Cmd+K stub

### Secondary (MEDIUM confidence)

- None required — all libraries verified from local node_modules READMEs

### Tertiary (LOW confidence)

- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages installed and verified from local node_modules; existing usage patterns in codebase
- Architecture: HIGH — patterns derived from existing code (LegacyCardExport, export-import.ts, Phase 10 scaffolds) and local library READMEs
- Pitfalls: HIGH — derived from STATE.md documented decisions and concrete code inspection (capabilities.json, store patterns)

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (stable libraries; cmdk/sonner/papaparse APIs are stable)
