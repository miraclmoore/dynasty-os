# Phase 10: Infrastructure Foundation - Research

**Researched:** 2026-02-24
**Domain:** Dexie IndexedDB schema migration, Zustand middleware, npm package integration, localStorage migration
**Confidence:** HIGH

## Summary

Phase 10 is a pure infrastructure phase — no user-facing features ship, but every subsequent phase (11–13) depends on what gets built here. The five work streams are: (1) Dexie DB version bump from v5 to v6 adding 5 new tables, (2) migration of all AI content from localStorage to the new `aiCache` Dexie table, (3) an async AI job queue in Zustand that keeps saves under 200ms, (4) installing 4 npm packages (`cmdk`, `sonner`, `zundo`, `papaparse`), and (5) scaffolding three global Zustand stores (`ToastStore`, `FilterStore`, `UndoStore`) wired into `App.tsx`.

The codebase currently uses Dexie `^4.0.10` (not v6 — the "v6" language in STATE.md refers to the sixth schema version, i.e. `this.version(6).stores(...)`, not a Dexie library major version). The DB currently sits at schema version 5 (5 prior version() calls: 1, 4, 5 are declared). The next migration must declare `this.version(6)` with the 5 new tables. The Dexie v4 multi-version migration pattern is fully confirmed and straightforward.

The `narrative-service.ts` and `legacy-card-service.ts` (via `PlayerProfilePage.tsx` and `LegendsPage.tsx`) are the two LocalStorage caching paths that must be migrated. The legacy blurb (`legacy-blurb-{playerId}`) and season narrative (`dynasty-os-narrative-{seasonId}`) must both move to `aiCache`. The Madden save path and watcher settings in `localStorage` are NOT AI content — those should stay in localStorage or migrate separately; Phase 10 success criterion 2 is specific to "AI content caching."

All 4 npm packages have confirmed stable versions that match the STATE.md pinned versions: `cmdk@1.1.1`, `sonner@2.0.7`, `zundo@2.3.0`, `papaparse@5.5.3`. All are compatible with the current stack (React 18, Zustand v5, TypeScript 5.7).

**Primary recommendation:** Execute Phase 10 in 4 sequential sub-tasks: (1) DB migration + core-types additions, (2) aiCache service layer + localStorage migration, (3) npm installs + store scaffolds, (4) App.tsx wiring. Never combine DB migration with aiCache migration in one task — the table must exist before the migration service uses it.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Dexie | ^4.0.10 (already installed) | IndexedDB ORM — schema migration to version 6 | Already the project ORM; version() + stores() API is the standard migration path |
| Zustand | ^5.0.3 (already installed) | Global state — ToastStore, FilterStore, UndoStore scaffolds | Already the project state library |
| zundo | 2.3.0 | Undo/redo middleware for Zustand | <700 bytes, confirmed Zustand v5 compatible, used by UndoStore |
| sonner | 2.0.7 | Toast notification system | Most downloaded React toast library (8M+ weekly downloads), used by ToastStore |
| cmdk | 1.1.1 | Command palette component | Unstyled, composable, Dialog-native — QOL-04 command palette dependency |
| papaparse | 5.5.3 | CSV serialization | Fastest browser CSV parser, unparse() API — QOL-05 CSV export dependency |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/papaparse | latest | TypeScript types for papaparse | Install alongside papaparse as devDependency |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| sonner | react-hot-toast | sonner is simpler API, no hook required, 2.0.7 is current |
| zundo | custom history array | zundo has 0-config partialize, limit, multi-step undo — don't hand-roll |
| papaparse | custom CSV serializer | papaparse handles edge cases (quotes, newlines in values) — don't hand-roll |
| cmdk | radix Command | cmdk IS the standard; Radix doesn't have a command menu primitive |

**Installation:**
```bash
# Run from apps/desktop (pnpm workspace)
pnpm add cmdk@1.1.1 sonner@2.0.7 zundo@2.3.0 papaparse@5.5.3
pnpm add -D @types/papaparse
```

## Architecture Patterns

### Recommended Project Structure
```
packages/db/src/
├── schema.ts          # Add 5 new table defs + DB_VERSION bump to 6
├── dynasty-db.ts      # Add version(6).stores(SCHEMA_V6), db.on('versionchange')
└── index.ts           # No change needed

packages/core-types/src/
├── coaching-staff.ts  # New: CoachingStaff type
├── nil-entry.ts       # New: NilEntry type
├── future-game.ts     # New: FutureGame type
├── player-link.ts     # New: PlayerLink type
├── ai-cache.ts        # New: AiCacheEntry type
├── player.ts          # Add birthYear?: number field
└── index.ts           # Export all new types

apps/desktop/src/
├── lib/
│   └── ai-cache-service.ts   # New: get/set/delete for aiCache table (replaces localStorage AI functions)
├── store/
│   ├── toast-store.ts        # New: ToastStore scaffold (wraps sonner toast())
│   ├── filter-store.ts       # New: FilterStore scaffold (persistent session filters map)
│   ├── undo-store.ts         # New: UndoStore scaffold (DB-level op descriptor queue)
│   └── index.ts              # Export new stores
└── App.tsx                   # Wire Toaster from sonner, import stores, keyboard listener for cmdk
```

### Pattern 1: Dexie Multi-Version Migration
**What:** Add `this.version(6).stores(SCHEMA_V6)` with the 5 new tables. Previous versions (1, 4, 5) must remain declared. No upgrade() function needed since we're only adding new tables (no data transformation on existing tables required).
**When to use:** Every time a new table is added to the schema.
**Example:**
```typescript
// Source: https://dexie.org/docs/Dexie/Dexie.version()
// packages/db/src/dynasty-db.ts

// Define V6 schema (includes all prior tables + 5 new ones)
const SCHEMA_V6 = {
  ...SCHEMA, // all existing tables unchanged
  coachingStaff: 'id, dynastyId, role, hireYear, [dynastyId+role]',
  nilEntries: 'id, dynastyId, playerId, year, [dynastyId+playerId]',
  futureGames: 'id, dynastyId, year, [dynastyId+year]',
  playerLinks: 'id, dynastyId, playerId, [dynastyId+playerId]',
  aiCache: 'id, dynastyId, cacheKey, contentType, createdAt, [dynastyId+contentType]',
};

export class DynastyDB extends Dexie {
  // ... existing table declarations ...
  coachingStaff!: Table<CoachingStaff, string>;
  nilEntries!: Table<NilEntry, string>;
  futureGames!: Table<FutureGame, string>;
  playerLinks!: Table<PlayerLink, string>;
  aiCache!: Table<AiCacheEntry, string>;

  constructor() {
    super(DB_NAME);
    this.version(1).stores(SCHEMA);
    this.version(4).stores(SCHEMA);
    this.version(5).stores(SCHEMA);
    this.version(6).stores(SCHEMA_V6); // ADD THIS

    // Multi-tab versionchange handler — prevents deadlock
    this.on('versionchange', () => {
      this.close();
      window.location.reload();
    });
  }
}
```

### Pattern 2: aiCache Service Layer
**What:** A service module that wraps Dexie aiCache table operations, providing the same interface as the localStorage functions it replaces. LRU eviction at 100 entries per dynasty.
**When to use:** All AI content (legacy blurbs, season narratives) must go through this service. API key storage stays in localStorage — that is a user credential, not AI content.
**Example:**
```typescript
// apps/desktop/src/lib/ai-cache-service.ts

export type AiContentType = 'legacy-blurb' | 'season-narrative' | 'recruiting-grade';

export interface AiCacheEntry {
  id: string;           // uuid
  dynastyId: string;
  cacheKey: string;     // e.g., "legacy-blurb-{playerId}"
  contentType: AiContentType;
  content: string;      // JSON-serialized or plain text
  createdAt: number;
  updatedAt: number;
}

const LRU_LIMIT = 100;

export async function getAiCache(dynastyId: string, cacheKey: string): Promise<string | null> {
  const entry = await db.aiCache
    .where('[dynastyId+contentType]') // use compound index or where cacheKey
    .equals([dynastyId, cacheKey])
    .first();
  return entry?.content ?? null;
}

export async function setAiCache(
  dynastyId: string,
  cacheKey: string,
  contentType: AiContentType,
  content: string
): Promise<void> {
  // Upsert
  const existing = await db.aiCache.where('cacheKey').equals(cacheKey).first();
  if (existing) {
    await db.aiCache.update(existing.id, { content, updatedAt: Date.now() });
  } else {
    await db.aiCache.add({ id: uuid(), dynastyId, cacheKey, contentType, content, createdAt: Date.now(), updatedAt: Date.now() });
    // LRU eviction: keep only 100 entries per dynasty
    await evictLruEntries(dynastyId);
  }
}

async function evictLruEntries(dynastyId: string): Promise<void> {
  const entries = await db.aiCache.where('dynastyId').equals(dynastyId).sortBy('createdAt');
  if (entries.length > LRU_LIMIT) {
    const toDelete = entries.slice(0, entries.length - LRU_LIMIT);
    await db.aiCache.bulkDelete(toDelete.map((e) => e.id));
  }
}
```

### Pattern 3: Async AI Job Queue (pendingAiJobs Zustand)
**What:** A Zustand slice that holds pending AI job descriptors. AI calls are fire-and-forget from the job queue — the save() path returns immediately, the job runs in the background and populates aiCache when done.
**When to use:** Any AI feature that triggers on a user save action (game logged, player departed, season ended). Ensures saves are always under 200ms.
**Example:**
```typescript
// Conceptual structure — not using zundo (undo is separate)
// apps/desktop/src/store/... (or inline in dynasty-store as a slice)

interface AiJob {
  id: string;
  type: 'legacy-blurb' | 'season-narrative' | 'recruiting-grade';
  payload: Record<string, unknown>;
  dynastyId: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  enqueuedAt: number;
}

// In a pendingAiJobs slice of a store:
// - enqueueAiJob(job): adds to queue, triggers runNextJob() as fire-and-forget
// - runNextJob(): takes first pending job, sets status='running', calls AI service,
//   writes result to aiCache, sets status='done'
// Save path: enqueueAiJob() then return immediately — never await AI
```

### Pattern 4: ToastStore (wraps sonner)
**What:** Thin Zustand store that wraps sonner's `toast()` imperative API, providing typed convenience methods. Phase 10 is scaffold only — just install sonner and create the store. Phase 11 wires it to actual operations.
**When to use:** Any write operation result reporting (Phase 11+).
**Example:**
```typescript
// apps/desktop/src/store/toast-store.ts
import { toast } from 'sonner';

interface ToastActions {
  success: (message: string, description?: string) => void;
  error: (message: string, description?: string) => void;
  info: (message: string) => void;
}

export const useToastStore = create<ToastActions>(() => ({
  success: (message, description) => toast.success(message, { description }),
  error: (message, description) => toast.error(message, { description }),
  info: (message) => toast(message),
}));
```

In App.tsx, add `<Toaster richColors position="bottom-right" />` from sonner.

### Pattern 5: FilterStore
**What:** A simple Zustand store holding a `filters: Record<string, Record<string, unknown>>` map keyed by page name. Filters persist across navigation within the session (not persisted to disk — session memory only).
**When to use:** Phase 11 QOL-03. Phase 10 scaffolds the empty store.
**Example:**
```typescript
// apps/desktop/src/store/filter-store.ts
interface FilterState {
  filters: Record<string, Record<string, unknown>>;
}
interface FilterActions {
  setFilter: (page: string, key: string, value: unknown) => void;
  getFilters: (page: string) => Record<string, unknown>;
  clearFilters: (page: string) => void;
}
```

### Pattern 6: UndoStore (wraps zundo pattern)
**What:** A Zustand store holding a stack of DB-level operation descriptors (not Zustand snapshots). The undo action reverses the described DB operation. Phase 10 scaffolds the type and empty store — Phase 11 wires to actual operations.
**When to use:** Destructive operations (delete, edit) for games, players, stats (Phase 11 QOL-02).
**Example:**
```typescript
// apps/desktop/src/store/undo-store.ts
// Uses DB-level op descriptor (STATE.md decision), NOT zundo middleware
// zundo is installed in Phase 10 for Phase 11's use, but UndoStore itself
// uses a manual stack because undo reverses DB operations, not Zustand state.

export interface UndoableOperation {
  id: string;
  table: string;              // e.g. 'games', 'players', 'playerSeasons'
  operation: 'delete' | 'update';
  recordId: string;
  snapshot: Record<string, unknown>; // the record state before mutation
  description: string;        // human-readable e.g. "Delete game vs. Alabama"
  performedAt: number;
}

interface UndoState {
  history: UndoableOperation[];
}
interface UndoActions {
  pushUndo: (op: UndoableOperation) => void;
  undo: () => Promise<void>;  // reverses last op in history
  clearHistory: () => void;
}
```

**Note:** `zundo` is installed in Phase 10 but is NOT used for the UndoStore. The STATE.md decision is to use a DB-level operation descriptor approach (not Zustand snapshot) to prevent DB/store inconsistency. `zundo` is installed now because Phase 11 may leverage it for simpler UI state undo. Install it, make it importable, do not wire it yet.

### Anti-Patterns to Avoid
- **Combining DB migration + aiCache migration in one plan wave:** The `aiCache` table must exist in Dexie before the migration service can write to it. Sequence: DB version bump first, then ai-cache-service, then update narrative-service and legacy-card-service to use it.
- **Writing `this.version(6).stores(SCHEMA)` with the old schema:** Dexie will interpret this as "remove all new tables." The V6 schema definition must include ALL prior tables plus the 5 new ones.
- **Skipping the `db.on('versionchange')` handler:** Without it, Dexie has a default implementation but in Tauri WebView (single tab), it's still correct practice to close and reload to ensure clean schema state.
- **Putting API key in aiCache:** The API key is a user credential stored in localStorage — leave it there. aiCache is for AI-generated content only.
- **Installing packages in monorepo root instead of apps/desktop:** These 4 packages are runtime dependencies of the frontend app. Install them in `apps/desktop`, not the workspace root.
- **Using `zundo` temporal middleware on every store:** zundo wraps a full Zustand store with snapshot history. That is not what Phase 10 needs. Phase 10 installs zundo for future use; the UndoStore pattern is DB-descriptor-based, not snapshot-based.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV serialization | Custom CSV string builder | `papaparse.unparse()` | Edge cases: quoted commas, newlines in field values, encoding — papaparse handles all of these |
| Toast notifications | Custom React state + Portal | `sonner` | sonner works imperatively (no hook), fires from service layer outside React tree, handles duration/dismiss/types |
| Command palette search/filter | Custom fuzzy search | `cmdk` built-in filter | cmdk's filter is case-insensitive, handles partial matches, auto-sorts by relevance |
| Undo stack management | Custom history array with snapshot | `UndoableOperation[]` DB-descriptor pattern | Snapshot approach causes DB/store divergence on side effects; descriptor approach is explicit and reversible |
| LRU cache eviction | Custom cache with complex bookkeeping | Simple `sortBy('createdAt').slice()` on Dexie | The data set (100 entries per dynasty) is small — simple sort-and-slice is sufficient and readable |

**Key insight:** All 4 packages solve problems that look simple but have real edge cases (CSV quoting, toast stacking, fuzzy search ranking, undo with async side effects). The investment in installing them now pays off in every phase that follows.

## Common Pitfalls

### Pitfall 1: Dexie VersionError on Existing Databases
**What goes wrong:** If a user has an existing database at version 5 and the code declares version(6) without keeping versions 1, 4, and 5 declared, Dexie throws a `VersionError` on open.
**Why it happens:** Dexie requires all version declarations to be present so it can construct the upgrade path from any prior version. Removing old version() declarations breaks the migration chain.
**How to avoid:** Keep `this.version(1).stores(SCHEMA)`, `this.version(4).stores(SCHEMA)`, `this.version(5).stores(SCHEMA)` exactly as they are. Add `this.version(6).stores(SCHEMA_V6)` after them.
**Warning signs:** `UnhandledPromiseRejection: VersionError` on app startup for any user with an existing database.

### Pitfall 2: Schema V6 Missing Existing Tables
**What goes wrong:** If `SCHEMA_V6` is defined as only the 5 new tables (e.g., `{ coachingStaff: '...', nilEntries: '...' }`), Dexie will drop all existing tables during the upgrade.
**Why it happens:** In `version(N).stores(schema)`, only tables listed in `schema` are created; others are dropped. The schema must be the complete desired state.
**How to avoid:** Use spread: `const SCHEMA_V6 = { ...SCHEMA, coachingStaff: '...', ... }` to include all prior tables.
**Warning signs:** App crashes on startup with missing table errors; all existing data appears gone.

### Pitfall 3: localStorage aiCache Migration Race Condition
**What goes wrong:** If `narrative-service.ts` and `legacy-card-service.ts` are updated to use `aiCache` before the DB migration runs (or if both the old and new code run in the same session), some content may be written twice or read from the wrong location.
**Why it happens:** The migration is a one-time event at DB open time. If the service layer switches to Dexie before the user's DB has been upgraded, the aiCache table doesn't exist yet.
**How to avoid:** The DB migration is guaranteed to run at startup before any service code can access the table (Dexie won't call `.open()` successfully until all migrations are complete). The race condition only exists if you try to read aiCache during the migration callback — don't do that.
**Warning signs:** `Table 'aiCache' not part of database schema` error.

### Pitfall 4: sonner `<Toaster />` Missing from React Tree
**What goes wrong:** `toast()` calls fire but nothing renders — toasts are silently dropped.
**Why it happens:** `sonner` renders toasts into a portal managed by the `<Toaster />` component. If it's not mounted, there's nowhere to render.
**How to avoid:** Add `<Toaster />` to `App.tsx` at the root level, outside all conditional rendering.
**Warning signs:** `toast()` calls succeed (no error), but nothing appears on screen.

### Pitfall 5: zundo with Zustand v5 setState Signature
**What goes wrong:** TypeScript errors when using `temporal` middleware with Zustand v5.
**Why it happens:** Zustand v5 made `setState` more strict. zundo 2.3.0 addresses this, but older zundo versions (<2.2.0) have type incompatibilities.
**How to avoid:** Install exactly `zundo@2.3.0` which explicitly supports Zustand v5's stricter setState type.
**Warning signs:** TypeScript errors referencing `setState` type mismatch when wrapping stores with `temporal`.

### Pitfall 6: cmdk Keyboard Shortcut Swallowed by Tauri WebView
**What goes wrong:** Ctrl+K / Cmd+K doesn't open the command palette on cold launch.
**Why it happens:** Tauri's WebView (WKWebView on macOS, WebView2 on Windows) captures keyboard focus on cold launch before React can register event listeners. This is the documented STATE.md decision: "Ctrl+K autofocus fix: autofocus document.body via hidden input on App.tsx mount."
**How to avoid:** In Phase 10, wire the keydown listener in App.tsx. Add a hidden `<input autoFocus />` on mount to force focus into the document, then immediately `.blur()` it. This ensures keyboard events reach document-level listeners.
**Warning signs:** Cmd+K does nothing on first launch; works fine after clicking anywhere in the app.

## Code Examples

Verified patterns from official sources:

### Dexie Version Upgrade (adding tables only)
```typescript
// Source: https://dexie.org/docs/Dexie/Dexie.version()
// No .upgrade() needed when only adding tables (no data transformation)
this.version(5).stores(SCHEMA);        // existing — keep as-is
this.version(6).stores(SCHEMA_V6);     // new — adds 5 tables
```

### Dexie versionchange Handler
```typescript
// Source: https://dexie.org/docs/Dexie/Dexie.on.versionchange
this.on('versionchange', () => {
  this.close();
  window.location.reload();
});
```

### sonner Setup
```typescript
// Source: https://github.com/emilkowalski/sonner (v2.0.7)
// In App.tsx:
import { Toaster } from 'sonner';
// Inside return:
<Toaster richColors position="bottom-right" />

// From anywhere in the app:
import { toast } from 'sonner';
toast.success('Game saved');
toast.error('Failed to save', { description: 'Check your connection' });
toast.loading('Generating narrative...');
```

### cmdk Dialog Pattern (Cmd+K)
```typescript
// Source: https://github.com/pacocoursey/cmdk
import { Command } from 'cmdk';
const [open, setOpen] = useState(false);

useEffect(() => {
  const down = (e: KeyboardEvent) => {
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setOpen((prev) => !prev);
    }
  };
  document.addEventListener('keydown', down);
  return () => document.removeEventListener('keydown', down);
}, []);

// JSX:
<Command.Dialog open={open} onOpenChange={setOpen} label="Command Menu">
  <Command.Input placeholder="Type a command..." />
  <Command.List>
    <Command.Empty>No results found.</Command.Empty>
    <Command.Group heading="Navigation">
      <Command.Item onSelect={() => { navigate('dashboard'); setOpen(false); }}>
        Dashboard
      </Command.Item>
    </Command.Group>
  </Command.List>
</Command.Dialog>
```

### zundo Temporal Middleware
```typescript
// Source: https://github.com/charkour/zundo (v2.3.0)
import { create } from 'zustand';
import { temporal } from 'zundo';

const useStore = create<State>()(
  temporal(
    (set) => ({ /* state */ }),
    {
      limit: 20,                    // max 20 undo steps
      partialize: (state) => ({     // only track specific fields
        bears: state.bears,
      }),
    }
  )
);

const { undo, redo, clear } = useStore.temporal.getState();
```

### papaparse unparse
```typescript
// Source: https://www.papaparse.com/
import Papa from 'papaparse';

const csv = Papa.unparse(arrayOfObjects);
// Returns a CSV string with headers from object keys
// Handles quoted strings, commas in values, etc.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| localStorage for AI content | Dexie aiCache table | Phase 10 | IndexedDB has no 5MB quota; content survives localStorage clears; LRU eviction is possible |
| Fire-and-forget AI in service layer (no queue) | Explicit pendingAiJobs queue in Zustand | Phase 10 | Makes AI job state inspectable and debuggable; save operations are explicitly decoupled from AI latency |
| Zustand v4 temporal/setState | Zustand v5 + zundo@2.3.0 | zundo 2.3.0 (2024) | v5 setState type strictness is now supported in zundo 2.3.0 |
| Dexie v5 schema | Dexie v6 schema (new tables) | Phase 10 | Enables COMM-01 (coachingStaff), COMM-04 (nilEntries), COMM-05 (futureGames), COMM-02 (playerLinks), and all AI caching |

**Deprecated/outdated:**
- `localStorage.setItem('dynasty-os-narrative-{seasonId}', ...)`: After Phase 10, all writes to this key are replaced by `setAiCache()`. The migration does NOT need to read old localStorage values and copy them — cached narratives will simply be regenerated on next request (acceptable; they are AI-generated, not user data).
- `localStorage.getItem('legacy-blurb-{playerId}')`: Same pattern — Phase 10 redirects reads/writes to `aiCache`. Old localStorage entries orphan silently.

## Open Questions

1. **Does the aiCache migration need to read and copy existing localStorage entries?**
   - What we know: Narratives and legacy blurbs in localStorage are AI-generated content. They are not user data — users can always regenerate them.
   - What's unclear: Whether users would notice missing cached content after the migration.
   - Recommendation: Skip the data copy. Document in Phase 10 plan that cached AI content will be re-generated on first request after the migration. This avoids complex one-time migration code for non-critical content.

2. **Should the 5 new core types be fully typed in Phase 10 or just stubbed?**
   - What we know: Phases 12 and 13 will heavily use `CoachingStaff`, `NilEntry`, `FutureGame`, `PlayerLink`, and `AiCacheEntry`. Phase 10 plan says "core-types additions."
   - What's unclear: Whether to define the full type shapes now (all fields) or minimal scaffolds.
   - Recommendation: Define complete type shapes in Phase 10. The schema index definitions commit to the indexed fields anyway, so the types should match. Getting types wrong now creates TypeScript churn in Phases 12–13.

3. **Does `Player.birthYear` need to be added in Phase 10?**
   - What we know: STATE.md records: "Player.birthYear added in Phase 10 core-types — nullable/optional; required by Trade Value Calculator age multiplier." Trade Value Calculator is COMM-06 (Phase 12).
   - What's unclear: Whether adding `birthYear?: number` to the Player type requires a schema migration (it does NOT — `stats: Record<string, number>` is flexible, and `birthYear` is a top-level Player field not currently indexed).
   - Recommendation: Yes, add `birthYear?: number` to the `Player` interface in Phase 10. No schema migration required — Dexie only indexes declared fields; unindexed fields are stored as-is in the object.

4. **Is `pendingAiJobs` a standalone store or a slice of an existing store?**
   - What we know: The phase goal says "async AI job queue (pendingAiJobs) in Zustand." It's a queue, not directly related to dynasty data.
   - What's unclear: Whether it belongs in its own store file or inside `dynasty-store.ts`.
   - Recommendation: Create a standalone `ai-queue-store.ts`. Keeping it separate follows the existing pattern (one concern per store file) and makes it easier for Phase 13 AI features to import without pulling in dynasty-store.

## Scope Boundary (What Phase 10 Does NOT Build)

Phase 10 installs and scaffolds. It does NOT:
- Implement toast notifications on actual operations (Phase 11, QOL-01)
- Implement undo on actual operations (Phase 11, QOL-02)
- Implement the command palette UI (Phase 11, QOL-04)
- Implement CSV export (Phase 11, QOL-05)
- Use the 5 new Dexie tables for real features (Phases 12-13)
- Use aiCache for Phase 13 AI features (Phase 13 AI services will call aiCache; Phase 10 just creates the table and migrates the 2 existing uses)

The stores are callable but the only Phase 10 "wire" into App.tsx is:
- `<Toaster />` mounted (so future `toast()` calls work)
- The Cmd+K keydown listener stub (so the keyboard shortcut is registered)

## Sources

### Primary (HIGH confidence)
- https://dexie.org/docs/Dexie/Dexie.version() — Dexie version() API, multi-version upgrade pattern
- https://dexie.org/docs/Dexie/Dexie.on.versionchange — versionchange handler
- https://github.com/emilkowalski/sonner — sonner v2.0.7 README, Toaster + toast() API
- https://sonner.emilkowal.ski/getting-started — sonner official docs
- https://github.com/pacocoursey/cmdk — cmdk component API, Dialog usage, filtering
- https://github.com/charkour/zundo — zundo temporal middleware, v2.3.0, Zustand v5 compatibility
- Codebase read: `packages/db/src/dynasty-db.ts` — confirmed current DB_VERSION=5, version() call pattern
- Codebase read: `packages/db/src/schema.ts` — confirmed current schema, all 13 existing tables
- Codebase read: `apps/desktop/src/lib/narrative-service.ts` — confirmed localStorage write pattern (lines 182, 292)
- Codebase read: `apps/desktop/src/lib/legacy-card-service.ts` — confirmed API key in localStorage (separate from AI content)
- Codebase read: `apps/desktop/package.json` — confirmed current deps (no cmdk/sonner/zundo/papaparse yet)
- Codebase read: `.planning/STATE.md` — confirmed v2.0 infrastructure decisions

### Secondary (MEDIUM confidence)
- https://www.papaparse.com/ — papaparse unparse() API (basic summary only; full docs confirm array-of-objects → CSV string)
- WebSearch: "Dexie.js version upgrade existing database new tables 2025" — confirmed multi-version pattern, no upgrade() needed for table-only additions
- WebSearch: "zundo 2.3.0 zustand v5 compatibility TypeScript" — confirmed v5 support

### Tertiary (LOW confidence)
- None — all claims verified against official sources or codebase.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all 4 packages confirmed on npm, versions match STATE.md pinned versions, APIs verified via GitHub READMEs
- Architecture: HIGH — Dexie migration pattern verified against official docs; store patterns derived directly from existing codebase conventions
- Pitfalls: HIGH — VersionError and missing-table pitfalls verified against Dexie docs; sonner missing Toaster verified against sonner docs; Tauri keyboard swallow documented in STATE.md decision

**Research date:** 2026-02-24
**Valid until:** 2026-03-24 (30 days — all packages are stable; Dexie v4 API is mature)
