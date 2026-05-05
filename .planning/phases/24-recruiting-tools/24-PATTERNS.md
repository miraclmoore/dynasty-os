# Phase 24: Recruiting Tools - Pattern Map

**Mapped:** 2026-05-05
**Files analyzed:** 9 new/modified files
**Analogs found:** 9 / 9

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `packages/core-types/src/recruiting.ts` | model | CRUD | `packages/core-types/src/player.ts` | exact (same v2.2 optional-field extension pattern) |
| `apps/desktop/src/lib/recruiting-calculator.ts` | utility | transform | self (export fix only) | exact |
| `apps/desktop/src/lib/recruiting-service.ts` | service | CRUD | self (add `updateRecruit`) | exact (follows `updateRecruitingClass` pattern) |
| `apps/desktop/src/lib/draft-service.ts` | service | CRUD + cross-entity write | `apps/desktop/src/lib/recruiting-service.ts` | role-match |
| `apps/desktop/src/store/recruiting-store.ts` | store | CRUD | `apps/desktop/src/store/player-store.ts` | exact (optimistic update + toast pattern) |
| `apps/desktop/src/components/AddPlayerModal.tsx` | component | request-response | self (add initial-value props) | exact |
| `apps/desktop/src/pages/RecruitingPage.tsx` | component | CRUD + transform | `apps/desktop/src/pages/ScreenshotIngestionPage.tsx` | role-match (Hard Sell banner + combobox patterns) |
| `apps/desktop/src/pages/RosterPage.tsx` | component | CRUD + event-driven | self (add filter toggle + row tint) | exact |
| `apps/desktop/src/pages/DraftTrackerPage.tsx` | component | request-response | `apps/desktop/src/pages/ScreenshotIngestionPage.tsx` | role-match (combobox upgrade) |

---

## Pattern Assignments

### `packages/core-types/src/recruiting.ts` (model, CRUD)

**Analog:** `packages/core-types/src/player.ts`

**Existing v2.2 Phase 21 extension pattern** (player.ts lines 22-27):
```typescript
// v2.2 (Phase 21 DMOD-03): cross-sport development trait selector
devTrait?: 'normal' | 'star' | 'superstar' | 'xfactor';
// v2.2 (Phase 21 DMOD-04): CFB-only deal breaker (one of 14 CFB 26 categories) + redshirt flag
dealBreaker?: string;
isRedshirt?: boolean;
```

**Apply this pattern for `isCommitted` on `Recruit`** (recruiting.ts, after line 35):
```typescript
// v2.2 (Phase 24 TOOL-03): committed status flag for class list + Add to Roster gate
isCommitted?: boolean;
```

Place the comment + field immediately before `createdAt`. No version bump needed — optional field.

---

### `apps/desktop/src/lib/recruiting-calculator.ts` (utility, transform)

**Analog:** self — one-line change only.

**Current declaration** (line 6):
```typescript
const GRADE_POINTS: Record<string, number> = {
```

**Change to export** (line 6 — exact replacement):
```typescript
export const GRADE_POINTS: Record<string, number> = {
```

This unblocks `RecruitingPage.tsx` from importing `Object.keys(GRADE_POINTS)` for the motivation dropdowns. Must be the first change in TOOL-01 plan.

---

### `apps/desktop/src/lib/recruiting-service.ts` (service, CRUD)

**Analog:** `updateRecruitingClass()` already in the same file (lines 39-44).

**Existing `updateRecruitingClass` pattern** (lines 39-44):
```typescript
export async function updateRecruitingClass(
  id: string,
  updates: Partial<Omit<RecruitingClass, 'id' | 'dynastyId' | 'createdAt'>>
): Promise<void> {
  await db.recruitingClasses.update(id, { ...updates, updatedAt: Date.now() });
}
```

**New `updateRecruit` function** — copy this pattern exactly, substituting `Recruit` for `RecruitingClass` and `db.recruits` for `db.recruitingClasses`. Add after `deleteRecruit` (line 74):
```typescript
export async function updateRecruit(
  id: string,
  updates: Partial<Omit<Recruit, 'id' | 'dynastyId' | 'classId' | 'createdAt'>>
): Promise<void> {
  await db.recruits.update(id, { ...updates, updatedAt: Date.now() });
}
```

---

### `apps/desktop/src/lib/draft-service.ts` (service, CRUD + cross-entity write)

**Analog:** `recruiting-service.ts` cross-entity approach; also `player-store.ts` db.players call.

**Current `createDraftPick` core** (lines 5-17 — existing):
```typescript
export async function createDraftPick(
  input: Omit<DraftPick, 'id' | 'createdAt' | 'updatedAt'>
): Promise<DraftPick> {
  const now = Date.now();
  const pick: DraftPick = {
    ...input,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  await db.draftPicks.add(pick);
  return pick;
}
```

**Add side effect immediately after `db.draftPicks.add(pick)` (after line 16)**:
```typescript
await db.draftPicks.add(pick);

// TOOL-04: if a player is linked, mark them as drafted immediately
if (pick.playerId) {
  await db.players.update(pick.playerId, {
    status: 'drafted',
    updatedAt: now,
  });
}
```

The `now` variable is already defined earlier in the function. Import `Player` type is not needed — `db.players.update()` accepts a partial record directly.

---

### `apps/desktop/src/store/recruiting-store.ts` (store, CRUD)

**Analog:** `apps/desktop/src/store/player-store.ts` — optimistic update + useToastStore pattern.

**Existing `addRecruit` store action** (recruiting-store.ts lines 95-105) — base structure to copy:
```typescript
addRecruit: async (input: Omit<Recruit, 'id' | 'createdAt' | 'updatedAt'>) => {
  set({ loading: true, error: null });
  try {
    await svcAddRecruit(input);
    const recruitsForClass = await getRecruitsByClass(input.classId);
    set({ recruitsForClass, loading: false });
  } catch (err) {
    set({ error: String(err), loading: false });
    throw err;
  }
},
```

**Player store optimistic update pattern** (player-store.ts) — use this for `updateRecruit` instead (avoids full reload on toggle):
```typescript
import { useToastStore } from './toast-store';
import { updateRecruit as svcUpdateRecruit } from '../lib/recruiting-service';
```

**New `updateRecruit` store action** — add to `RecruitingActions` interface and implementation:
```typescript
// Interface addition:
updateRecruit: (id: string, updates: Partial<Omit<Recruit, 'id'>>) => Promise<void>;

// Implementation:
updateRecruit: async (id: string, updates: Partial<Omit<Recruit, 'id'>>) => {
  // Optimistic: update local state immediately
  set((state) => ({
    recruitsForClass: state.recruitsForClass.map((r) =>
      r.id === id ? { ...r, ...updates } : r
    ),
  }));
  try {
    await svcUpdateRecruit(id, updates);
  } catch (err) {
    // Revert on error — reload from DB using classId from first recruit
    const { recruitsForClass } = get();
    const classId = recruitsForClass[0]?.classId ?? get().activeClass?.id;
    if (classId) {
      const fresh = await getRecruitsByClass(classId);
      set({ recruitsForClass: fresh });
    }
    useToastStore.getState().error('Could not save recruit. Please try again.');
    throw err;
  }
},
```

**Toast import pattern** (from player-store.ts line 10):
```typescript
import { useToastStore } from './toast-store';
```

---

### `apps/desktop/src/components/AddPlayerModal.tsx` (component, request-response)

**Analog:** self — prop interface extension and `useEffect` reset.

**Current interface** (lines 7-12):
```typescript
interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  dynastyId: string;
  sport: SportType;
}
```

**Extended interface** — add four optional initial-value props:
```typescript
interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  dynastyId: string;
  sport: SportType;
  initialFirstName?: string;
  initialLastName?: string;
  initialPosition?: string;
  initialStars?: number;
}
```

**Existing `resetForm`** (lines 33-46) — already exists, call it in `useEffect`:
```typescript
function resetForm() {
  setFirstName('');
  setLastName('');
  setPosition(sportConfig.positions[0] ?? '');
  // ... other fields
}
```

**Add `useEffect` after `resetForm` definition** — re-initialize state when modal opens with new recruit:
```typescript
useEffect(() => {
  if (isOpen) {
    setFirstName(initialFirstName ?? '');
    setLastName(initialLastName ?? '');
    setPosition(initialPosition ?? sportConfig.positions[0] ?? '');
    setRecruitingStars(initialStars != null ? String(initialStars) : '');
  }
}, [isOpen]);
```

**Caller name-splitting pattern** (in `RecruitingPage.tsx` at the call site, not in the modal):
```typescript
const parts = recruit.name.trim().split(' ');
const lastName = parts.pop() ?? '';
const firstName = parts.join(' ');
// Then pass as props to AddPlayerModal:
// initialFirstName={firstName} initialLastName={lastName}
// initialPosition={recruit.position} initialStars={recruit.stars}
```

---

### `apps/desktop/src/pages/RecruitingPage.tsx` (component, CRUD + transform)

**Analogs:**
- Hard Sell banner: `apps/desktop/src/pages/ScreenshotIngestionPage.tsx` lines 1114-1160
- Combobox: not applicable here (D-02 is an inline toggle, not a combobox)
- Motivation dropdowns: self (lines 506-538, change source from `CFB_DEAL_BREAKER_CATEGORIES` to `GRADE_POINTS`)
- Row badges + toggle: self (lines 586-638, add new columns/cells)
- Toolbar button: follow existing `'Generate Signing Day Grade'` button pattern

**Import additions** (add to existing imports at top of file):
```typescript
import { getHardSellRecommendation, GRADE_POINTS } from '../lib/recruiting-calculator';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import html2canvas from 'html2canvas';
import { useToastStore } from '../store/toast-store';
```

**Hard Sell banner pattern** (ScreenshotIngestionPage.tsx lines 1114-1160 — exact copy):
```typescript
// Compute inline — no save required
const recommendation = getHardSellRecommendation(
  recruitForm.motivation1 || null,
  recruitForm.motivation2 || null,
  recruitForm.motivation3 || null,
);
const isHardSell = recommendation === 'Hard Sell';
```

```tsx
{/* Banner goes immediately below the grid grid-cols-3 gap-2 motivations block */}
{recommendation && (
  <div
    className={`rounded-lg p-4 mb-4 border ${
      isHardSell
        ? 'bg-green-900/20 border-green-600/50'
        : 'bg-amber-900/20 border-amber-600/50'
    }`}
  >
    <p className="text-sm font-semibold text-white">
      Recommendation:{' '}
      <span className={isHardSell ? 'text-green-400' : 'text-amber-400'}>
        {recommendation}
      </span>
    </p>
  </div>
)}
```

**Motivation dropdown fix** — replace `CFB_DEAL_BREAKER_CATEGORIES.map(...)` with `Object.keys(GRADE_POINTS).map(...)` in all three motivation selects (lines 513, 524, 535):
```tsx
// Replace:
{CFB_DEAL_BREAKER_CATEGORIES.map((c) => (
  <option key={c} value={c}>{c}</option>
))}
// With:
{Object.keys(GRADE_POINTS).map((g) => (
  <option key={g} value={g}>{g}</option>
))}
```

**Row Hard Sell badge** — add to recruit row cells after the existing M1/M2/M3 badges (lines 594-612). Badge appears only when all 3 grades are saved:
```tsx
{recruit.motivation1 && recruit.motivation2 && recruit.motivation3 && (() => {
  const rec = getHardSellRecommendation(recruit.motivation1, recruit.motivation2, recruit.motivation3);
  return rec ? (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-semibold ${
      rec === 'Hard Sell'
        ? 'bg-green-900/30 text-green-400 border-green-700'
        : 'bg-amber-900/30 text-amber-400 border-amber-700'
    }`}>
      {rec}
    </span>
  ) : null;
})()}
```

**isCommitted toggle on recruit row** — add toggle button and conditional 'Add to Roster' button as new cells. The toggle calls `updateRecruit`. Pattern follows the existing remove button (lines 627-635):
```tsx
<td className="py-2 text-right">
  <button
    onClick={() => updateRecruit(recruit.id, { isCommitted: !recruit.isCommitted })}
    className={`text-xs px-2 py-0.5 rounded border transition-colors mr-2 ${
      recruit.isCommitted
        ? 'bg-amber-900/40 text-amber-300 border-amber-700 hover:bg-amber-900/60'
        : 'bg-gray-700 text-gray-400 border-gray-600 hover:text-gray-200'
    }`}
    title={recruit.isCommitted ? 'Mark uncommitted' : 'Mark committed'}
  >
    {recruit.isCommitted ? 'Committed' : 'Commit?'}
  </button>
  {recruit.isCommitted && (
    <button
      onClick={() => handleAddToRoster(recruit)}
      className="text-xs px-2 py-0.5 rounded border bg-blue-900/40 text-blue-300 border-blue-700 hover:bg-blue-900/60 transition-colors mr-2"
    >
      Add to Roster
    </button>
  )}
  {/* existing remove button */}
</td>
```

**Class Card export** — add `useRef` for hidden card, `useState` for exporting state. Button placement follows existing `'Generate Signing Day Grade'` button pattern in toolbar. Hidden render target uses `fixed -left-[9999px] top-0` (NOT `display:none`):
```tsx
const cardRef = useRef<HTMLDivElement>(null);
const [exporting, setExporting] = useState(false);

// Export handler — exact LegacyCardExport.tsx chain with html2canvas instead of toPng:
async function handleExportCard() {
  if (!cardRef.current || !activeClass) return;
  setExporting(true);
  try {
    const canvas = await html2canvas(cardRef.current, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
    });
    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const filePath = await save({
      defaultPath: `signing-day-${activeClass.year}.png`,
      filters: [{ name: 'PNG', extensions: ['png'] }],
    });
    if (!filePath) { setExporting(false); return; }
    await writeFile(filePath, bytes);
    useToastStore.getState().success(`Class card saved to ${filePath.split('/').pop()}`);
  } catch (err) {
    console.error('[ClassCard] Export failed:', err);
    useToastStore.getState().error('Export failed. Please try again.');
  } finally {
    setExporting(false);
  }
}
```

**Hidden card DOM target** (place near bottom of component, before closing `</div>`):
```tsx
{/* Hidden Class Card render target — fixed off-screen so html2canvas can capture it */}
<div ref={cardRef} className="fixed -left-[9999px] top-0 w-[640px] h-[360px] bg-slate-900 ...">
  {/* Class Card content */}
</div>
```

**Class Card data calculations** (use inline derived values from `recruitsForClass`):
```typescript
const avgStars = recruitsForClass.length > 0
  ? (recruitsForClass.reduce((sum, r) => sum + r.stars, 0) / recruitsForClass.length).toFixed(2)
  : '—';

const posBreakdown: Record<string, number> = {};
for (const r of recruitsForClass) {
  posBreakdown[r.position] = (posBreakdown[r.position] ?? 0) + 1;
}

const top3 = [...recruitsForClass]
  .sort((a, b) => {
    if (b.stars !== a.stars) return b.stars - a.stars;
    const aRank = a.nationalRank ?? Infinity;
    const bRank = b.nationalRank ?? Infinity;
    return aRank - bRank;
  })
  .slice(0, 3);
```

---

### `apps/desktop/src/pages/RosterPage.tsx` (component, event-driven)

**Analog:** self — follows existing `statusFilter` pattern (lines 79-90).

**Existing filter state pattern** (lines 74-90 — exact pattern to copy for `showAtRisk`):
```typescript
const PAGE_KEY = 'roster';
const _savedFilters = useFilterStore.getState().getFilters(PAGE_KEY);
const [statusFilter, setStatusFilterState] = useState<StatusFilter>(
  (_savedFilters['status'] as StatusFilter) ?? 'active'
);
const setStatusFilter = (val: StatusFilter) => {
  setStatusFilterState(val);
  useFilterStore.getState().setFilter(PAGE_KEY, 'status', val);
};
```

**New `showAtRisk` filter state** — copy this pattern:
```typescript
const [showAtRisk, setShowAtRiskState] = useState<boolean>(
  (_savedFilters['showAtRisk'] as boolean) ?? false
);
const setShowAtRisk = (val: boolean) => {
  setShowAtRiskState(val);
  useFilterStore.getState().setFilter(PAGE_KEY, 'showAtRisk', val);
};
```

**Filter application** — add `showAtRisk` clause to existing `filteredPlayers` filter (lines 107-113):
```typescript
const filteredPlayers = players.filter((p) => {
  const matchesPosition = positionFilter === 'All' || p.position === positionFilter;
  const matchesStatus =
    statusFilter === 'all' ||
    (statusFilter === 'active' && p.status === 'active') ||
    (statusFilter === 'departed' && DEPARTED_STATUSES.includes(p.status));
  const matchesAtRisk = !showAtRisk || Boolean(p.dealBreaker);  // ADD THIS
  return matchesPosition && matchesStatus && matchesAtRisk;      // ADD matchesAtRisk
});
```

**Status filter button group pattern** (lines 219-232 — copy for at-risk toggle):
```tsx
{(['active', 'departed', 'all'] as StatusFilter[]).map((sf) => (
  <button
    key={sf}
    onClick={() => setStatusFilter(sf)}
    className={`px-3 py-1.5 text-sm transition-colors capitalize ${
      statusFilter === sf
        ? 'bg-gray-600 text-white'
        : 'bg-gray-800 text-gray-400 hover:text-gray-200'
    }`}
  >
    {sf}
  </button>
))}
```

**At-risk toggle button** — uses orange active state per UI-SPEC (place in filter toolbar, same row as status filter):
```tsx
<button
  onClick={() => setShowAtRisk(!showAtRisk)}
  className={`px-3 py-1.5 text-sm transition-colors rounded-lg border ${
    showAtRisk
      ? 'bg-orange-900/30 border-orange-700 text-orange-300'
      : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
  }`}
>
  At-Risk
</button>
```

**Existing DB badge** (lines 351-357 — already renders orange, no change needed):
```tsx
{activeDynasty.sport === 'cfb' && player.dealBreaker && (
  <Tooltip content={`Deal Breaker: ${player.dealBreaker}`}>
    <span className="inline-flex items-center px-1.5 py-0.5 rounded border text-xs font-semibold bg-orange-900/40 text-orange-300 border-orange-700">
      DB
    </span>
  </Tooltip>
)}
```

Row tint when `showAtRisk` is active — add conditional class to the `<tr>` (line 329):
```tsx
className={`border-b border-gray-700/50 hover:bg-gray-700/30 cursor-pointer transition-colors ${
  showAtRisk && player.dealBreaker ? 'bg-orange-900/10' : ''
} ${idx === sortedPlayers.length - 1 ? 'border-b-0' : ''}`}
```

---

### `apps/desktop/src/pages/DraftTrackerPage.tsx` (component, request-response)

**Analog:** `apps/desktop/src/pages/ScreenshotIngestionPage.tsx` lines 741-793 (combobox pattern).

**Existing player select to upgrade** (lines 180-192 — current simple `<select>`):
```tsx
<select
  value={form.playerId}
  onChange={(e) => handlePlayerSelect(e.target.value)}
  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
>
  <option value="">— No link —</option>
  {players.map((player) => (
    <option key={player.id} value={player.id}>
      {player.firstName} {player.lastName} ({player.position})
    </option>
  ))}
</select>
```

**Combobox state additions** (add to component state, following ScreenshotIngestionPage lines 174-177):
```typescript
const [playerSearch, setPlayerSearch] = useState('');
const [playerDropdownOpen, setPlayerDropdownOpen] = useState(false);
```

**Filtered players for combobox** (derived from existing `players` array):
```typescript
const filteredPlayers = playerSearch.trim().length >= 1
  ? players.filter((p) => {
      const full = `${p.firstName} ${p.lastName}`.toLowerCase();
      return full.includes(playerSearch.toLowerCase());
    })
  : [];
```

**Combobox replacement** (ScreenshotIngestionPage.tsx lines 741-793 exact pattern, adapted for single-pick context):
```tsx
<div className="relative">
  <input
    type="text"
    value={playerSearch}
    onChange={(e) => {
      setPlayerSearch(e.target.value);
      setPlayerDropdownOpen(true);
      // Clear linked ID when user edits manually
      setForm((f) => ({ ...f, playerId: '' }));
    }}
    onFocus={() => setPlayerDropdownOpen(true)}
    onBlur={() => {
      // 150ms delay so onMouseDown on option fires first
      setTimeout(() => setPlayerDropdownOpen(false), 150);
    }}
    placeholder="Search roster…"
    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
  />
  {playerDropdownOpen && filteredPlayers.length > 0 && (
    <ul className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-600 rounded-lg shadow-xl max-h-48 overflow-y-auto">
      {filteredPlayers.map((p) => (
        <li
          key={p.id}
          onMouseDown={() => {
            // onMouseDown fires before onBlur — critical for WebView
            handlePlayerSelect(p.id);
            setPlayerSearch(`${p.firstName} ${p.lastName}`);
            setPlayerDropdownOpen(false);
          }}
          className="px-3 py-2 text-sm text-white hover:bg-gray-700 cursor-pointer"
        >
          {p.firstName} {p.lastName}
          <span className="ml-2 text-xs text-gray-400">{p.position}</span>
        </li>
      ))}
    </ul>
  )}
</div>
```

The existing `handlePlayerSelect` (lines 79-95) is preserved unchanged — the combobox calls it with `p.id` via `onMouseDown`. No changes to form submission or `addPick` call.

---

## Shared Patterns

### Zustand Store Action Pattern
**Source:** `apps/desktop/src/store/player-store.ts` lines 53-57
**Apply to:** `updateRecruit` store action in `recruiting-store.ts`
```typescript
useToastStore.getState().success('Player added', `${input.firstName} ${input.lastName}`);
// ...
useToastStore.getState().error('Failed to add player', String(err));
```

### Dexie Cross-Entity Update
**Source:** `apps/desktop/src/lib/draft-service.ts` lines 14-17 (add after `db.draftPicks.add`)
**Apply to:** `createDraftPick()` in `draft-service.ts`
```typescript
await db.draftPicks.add(pick);
// Pattern: db.<table>.update(id, { field, updatedAt: now })
```

### FilterStore Persistence Pattern
**Source:** `apps/desktop/src/pages/RosterPage.tsx` lines 74-90
**Apply to:** `showAtRisk` toggle in `RosterPage.tsx`
```typescript
const _savedFilters = useFilterStore.getState().getFilters(PAGE_KEY);
// read: (_savedFilters['key'] as Type) ?? defaultValue
// write: useFilterStore.getState().setFilter(PAGE_KEY, 'key', val);
```

### Tauri PNG Export Chain
**Source:** `apps/desktop/src/components/LegacyCardExport.tsx` lines 22-67 (complete `handleExport`)
**Apply to:** `handleExportCard` in `RecruitingPage.tsx` (TOOL-05)
Chain: `capture → base64 → Uint8Array → save() dialog → writeFile()`
```typescript
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
// NEVER use blob URL / anchor.click() — blocked in Tauri WKWebView
```

### Hard Sell Banner
**Source:** `apps/desktop/src/pages/ScreenshotIngestionPage.tsx` lines 1114-1160
**Apply to:** recruit form in `RecruitingPage.tsx` (TOOL-01 form banner)
The `gradeColor()` helper already exists in `RecruitingPage.tsx` (lines 13-19) but uses letter-based color mapping for AI grades. The Hard Sell banner uses `isHardSell` boolean, so apply the banner Tailwind classes directly (green vs amber) without going through `gradeColor`.

### Combobox with WebView-Safe Blur Handling
**Source:** `apps/desktop/src/pages/ScreenshotIngestionPage.tsx` lines 741-793
**Apply to:** player link field in `DraftTrackerPage.tsx` (TOOL-04)
Critical: `onMouseDown` on list items (not `onClick`), `setTimeout(..., 150)` on `onBlur`. This pair is non-negotiable for WKWebView.

### v2.2 Optional Field Comment Style
**Source:** `packages/core-types/src/player.ts` lines 22-27
**Apply to:** `isCommitted` addition in `packages/core-types/src/recruiting.ts`
Format: `// v2.2 (Phase XX TOOL-YY): description`

---

## No Analog Found

All 9 files have direct analogs or are self-referential modifications. No files require falling back to RESEARCH.md external patterns.

The one external dependency — `html2canvas` — has no codebase analog because it is a new library. The export chain pattern is fully covered by `LegacyCardExport.tsx` (which uses `html-to-image`). The only API difference: `html2canvas(element, opts)` returns `Promise<HTMLCanvasElement>`, then call `.toDataURL('image/png')` to get the base64 string. The remainder of the chain (base64 decode, Uint8Array, `save()`, `writeFile()`) is identical to the analog.

---

## Metadata

**Analog search scope:** `packages/core-types/src/`, `apps/desktop/src/lib/`, `apps/desktop/src/store/`, `apps/desktop/src/pages/`, `apps/desktop/src/components/`
**Files scanned:** 14 (read directly) + grep over 4 large page files
**Pattern extraction date:** 2026-05-05
