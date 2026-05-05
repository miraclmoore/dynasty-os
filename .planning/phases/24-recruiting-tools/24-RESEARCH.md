# Phase 24: Recruiting Tools - Research

**Researched:** 2026-05-05
**Domain:** React/TypeScript UI wiring, Zustand state management, Dexie service layer, Tauri PNG export
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** Add `isCommitted?: boolean` to `Recruit` type in `packages/core-types/src/recruiting.ts`. Same pattern as Phase 21 DMOD-05 additions. No Dexie migration version bump needed (optional field).

**D-02:** isCommitted toggle surfaces inline on the recruit list row as a `<button>`. `'Add to Roster'` button appears only when `isCommitted = true`.

**D-03:** After 'Add to Roster' opens AddPlayerModal, the recruit record is left unchanged. The class list retains the recruit as a historical record. No side effect on the recruit entity after the modal opens.

**D-04:** `getHardSellRecommendation()` shows real-time inline in the add/edit form — a banner appears immediately below the three motivation grade inputs as all 3 are filled. No save required.

**D-05:** Motivation grade inputs changed from free-text inputs to dropdowns. Options are the 13 valid grades (`A+` through `F`) from `GRADE_POINTS`. Prevents invalid grades.

**D-06:** A compact badge also appears on each recruit list row for recruits with all 3 grades saved — showing `'Hard Sell'` or `'Send the House'` in the appropriate color.

**D-07 (Claude's Discretion):** Orange warning tag on RosterPage rows where `player.dealBreaker` is set (already exists), plus a `'Show at-risk'` filter toggle using the existing FilterStore pattern from Phase 11. Implementation details left to planner.

**D-08:** Use `html2canvas` to render a hidden React component to a canvas, then export as PNG. Tauri's `dialog.save()` from `@tauri-apps/plugin-dialog` opens the OS native save dialog. `html2canvas` is a new dependency.

**D-09:** Stats-forward dark card matching the app's slate theme. 640x360 (16:9). Commit count + avg star rating at top, position breakdown below, top 3 recruits at bottom. CFB only.

**D-10:** `'Generate Class Card'` button lives in the recruiting class header/toolbar alongside the existing `'Generate Signing Day Grade'` button. Default filename: `signing-day-{year}.png`.

**D-11:** Player-status side effect lives in `createDraftPick()` in `apps/desktop/src/lib/draft-service.ts`. When `input.playerId` is present, after `db.draftPicks.add(pick)`, call `db.players.update(playerId, { status: 'drafted', updatedAt: Date.now() })`.

**D-12:** Always override player's existing status to `'drafted'` regardless of current value. No conditional logic.

**D-13:** Add a player search/select combobox to the Add Draft Pick form on `DraftTrackerPage`. The existing `<select>` (lines 180-192) is upgraded to a searchable combobox.

### Claude's Discretion

- D-07 implementation details: how the at-risk filter toggle is positioned in the filter bar, how the row tint is applied.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TOOL-01 | Hard Sell or Send the House recommendation shown when a recruit has all 3 motivation grades filled; also inline after parsing a recruiting-motivations screenshot (already done in ScreenshotIngestionPage) | `getHardSellRecommendation()` is complete in `recruiting-calculator.ts`; wiring into `RecruitingPage.tsx` form and row badges is the task |
| TOOL-02 | CFB roster players with `dealBreaker` display orange warning tag on roster row; "Show at-risk" filter highlights all players with a deal breaker | DB badge already exists in `RosterPage.tsx` lines 351-354; filter toggle needs to be added using FilterStore pattern |
| TOOL-03 | Committed recruit card has "Add to Roster" button opening `AddPlayerModal` with recruit's name, position, and star rating pre-filled | `AddPlayerModal` exists; needs optional initial-value props added; `isCommitted` field needs to be added to type and store |
| TOOL-04 | Adding a draft pick with linked `playerId` automatically updates player status to `'drafted'` | `createDraftPick()` in `draft-service.ts` needs one `if (pick.playerId)` block; `DraftPick.playerId` already exists as optional FK |
| TOOL-05 | Signing Day Class Card — shareable PNG exportable via OS save dialog (CFB only); commit count, avg star rating, position breakdown, top recruit callouts | `html2canvas` (new dep); Tauri `save()` + `writeFile()` pattern from `LegacyCardExport.tsx`; `getPositionBreakdown()` in `draft-service.ts` adaptable for recruit data |
</phase_requirements>

---

## Summary

Phase 24 is a UI wiring and service extension phase — not a new domain problem. All the hard computational logic already exists: `getHardSellRecommendation()` is complete and already used in `ScreenshotIngestionPage.tsx` lines 1114-1159. The `DraftPick.playerId` FK already exists. The `Player.dealBreaker` field and the orange DB badge on RosterPage already exist. The Tauri PNG export chain (`toPng` → base64 → `save()` → `writeFile()`) is already battle-tested in `LegacyCardExport.tsx`.

The primary work is: (1) wiring existing logic into new UI surfaces on three pages, (2) adding `isCommitted` to the `Recruit` type plus service and store support for toggling it, (3) one service-layer side effect in `createDraftPick()`, (4) upgrading one `<select>` to a combobox, and (5) a new hidden render target + `html2canvas` export for the Class Card.

The key risk is `html2canvas` — the project currently uses `html-to-image` (v1.11.13, already installed) for `LegacyCardExport.tsx`. The CONTEXT.md specifies `html2canvas` per D-08. The planner should note that `html-to-image` is already available and has the identical API chain (`toPng` → base64). However D-08 is a locked decision so `html2canvas` it is. The planner should install `html2canvas` and use its `html2canvas(element).then(canvas => canvas.toDataURL('image/png'))` pattern instead of `toPng()`.

**Primary recommendation:** Decompose into 5 plans, one per requirement (TOOL-01 through TOOL-05), in dependency order: TOOL-03 first (adds `isCommitted` type that TOOL-01 rows need), then TOOL-01, TOOL-02, TOOL-04, TOOL-05.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Hard Sell recommendation (TOOL-01) | Frontend (React component state) | Service (recruiting-calculator.ts) | Pure synchronous computation; drives UI only |
| isCommitted toggle (TOOL-03) | Frontend (Zustand store) | Database (Dexie recruits table) | Persistent per-recruit boolean; Zustand optimistic update pattern |
| At-risk filter (TOOL-02) | Frontend (FilterStore) | — | In-memory filter; DB badge already exists |
| Draft pick → player status (TOOL-04) | Service (draft-service.ts) | Database (Dexie players table) | Cross-entity write belongs in service layer per established pattern |
| Class Card PNG export (TOOL-05) | Frontend (React + html2canvas) | Tauri (plugin-dialog + plugin-fs) | DOM-to-canvas capture is browser-side; file I/O is Tauri-side |

---

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react` | 18.3.1 | Component rendering | Project standard |
| `zustand` | 4.x | State management | Established store pattern |
| `dexie` | 4.3.x | IndexedDB ORM | Established DB layer |
| `@tauri-apps/plugin-dialog` | project version | OS save dialog | Blob URL blocked in WKWebView — must use Tauri dialog |
| `@tauri-apps/plugin-fs` | project version | File write | Required for `writeFile()` |
| `html-to-image` | 1.11.13 | DOM → PNG (LegacyCard) | Already installed; used in LegacyCardExport |

### New Dependency (TOOL-05)
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `html2canvas` | 1.4.1 | DOM → canvas → PNG (Class Card) | Locked by D-08; install in `apps/desktop` |

[VERIFIED: npm registry — html2canvas 1.4.1, last modified 2025-11-13]

**Note on html-to-image vs html2canvas:** The project already has `html-to-image` installed and working in `LegacyCardExport.tsx`. The CONTEXT.md D-08 explicitly chooses `html2canvas`. The APIs differ slightly:
- `html-to-image`: `toPng(element, options)` returns `Promise<string>` (data URL directly)
- `html2canvas`: `html2canvas(element, options)` returns `Promise<HTMLCanvasElement>`; then call `canvas.toDataURL('image/png')` → base64 string

[CITED: https://html2canvas.hertzen.com/documentation.html]

**Installation:**
```bash
pnpm --filter @dynasty-os/desktop add html2canvas
```

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `sonner` | 2.0.7 | Toast notifications | useToastStore wraps this; use for success/error feedback |

---

## Architecture Patterns

### System Architecture Diagram

```
User interaction on RecruitingPage
           │
           ▼
    React component state
    (form state, recruit row state)
           │
           ├──────── getHardSellRecommendation() ────► banner/badge (sync, no save)
           │         (recruiting-calculator.ts)
           │
           ├──────── isCommitted toggle ─────────────► useRecruitingStore.updateRecruit()
           │                                          └─► db.recruits.update()
           │
           └──────── "Add to Roster" click ──────────► AddPlayerModal (pre-filled props)
                                                       └─► usePlayerStore.addPlayer()

User interaction on RosterPage
           │
           ▼
    useFilterStore.setFilter('roster', 'showAtRisk', true)
           │
           └──────── filter over players array ──────► highlight rows with player.dealBreaker

User interaction on DraftTrackerPage
           │
           ▼
    combobox input → substring match over players[]
           │
           └──────── form.playerId set ─────────────► addPick() → createDraftPick()
                                                       └─► if (playerId): db.players.update()

"Export Class Card" click on RecruitingPage
           │
           ▼
    html2canvas(hiddenCardRef.current)
           │
           ▼
    canvas.toDataURL('image/png') → base64 → Uint8Array
           │
           ▼
    dialog.save({ defaultPath: 'signing-day-{year}.png' })
           │
           ▼
    writeFile(path, bytes)
```

### Recommended Project Structure (no changes to project structure — all files exist)

Files modified:
```
packages/core-types/src/
└── recruiting.ts          # Add isCommitted?: boolean to Recruit type

apps/desktop/src/
├── lib/
│   ├── recruiting-service.ts    # Add updateRecruit() function
│   ├── recruiting-calculator.ts # Export GRADE_POINTS (currently unexported)
│   └── draft-service.ts         # Add player status side effect in createDraftPick()
├── store/
│   └── recruiting-store.ts      # Add updateRecruit action
└── pages/
    ├── RecruitingPage.tsx        # TOOL-01 (banner + badges) + TOOL-03 (isCommitted + Add to Roster) + TOOL-05 (Class Card)
    ├── RosterPage.tsx            # TOOL-02 (at-risk filter toggle + row tint)
    ├── DraftTrackerPage.tsx      # TOOL-04 (combobox upgrade)
└── components/
    └── AddPlayerModal.tsx        # Add optional initial-value props
```

### Pattern 1: updateRecruit Service + Store Action

The `recruiting-service.ts` has `updateRecruitingClass()` but no `updateRecruit()` for individual `Recruit` records. This needs to be added for the `isCommitted` toggle (D-02).

**Service layer:**
```typescript
// Source: pattern from existing updateRecruitingClass() in recruiting-service.ts
export async function updateRecruit(
  id: string,
  updates: Partial<Omit<Recruit, 'id' | 'dynastyId' | 'classId' | 'createdAt'>>
): Promise<void> {
  await db.recruits.update(id, { ...updates, updatedAt: Date.now() });
}
```

**Store action:**
```typescript
// Source: pattern from existing addRecruit action in recruiting-store.ts
updateRecruit: async (id: string, updates: Partial<Omit<Recruit, 'id'>>) => {
  // optimistic: update local state immediately
  set((state) => ({
    recruitsForClass: state.recruitsForClass.map((r) =>
      r.id === id ? { ...r, ...updates } : r
    ),
  }));
  try {
    await svcUpdateRecruit(id, updates);
  } catch (err) {
    // revert on error — reload from DB
    const { recruitsForClass } = get();
    if (recruitsForClass[0]?.classId) {
      const fresh = await getRecruitsByClass(recruitsForClass[0].classId);
      set({ recruitsForClass: fresh });
    }
    useToastStore.getState().error('Could not save recruit. Check your connection and try again.');
    throw err;
  }
},
```

### Pattern 2: GRADE_POINTS Must Be Exported

`GRADE_POINTS` is currently declared as `const GRADE_POINTS` (not exported) in `recruiting-calculator.ts`. The motivation grade dropdowns need `Object.keys(GRADE_POINTS)` to populate. The fix is to add `export` to the declaration:

```typescript
// Source: recruiting-calculator.ts line 6 — change const to export const
export const GRADE_POINTS: Record<string, number> = {
  'A+': 13, 'A': 12, 'A-': 11,
  'B+': 10, 'B': 9,  'B-': 8,
  'C+': 7,  'C': 6,  'C-': 5,
  'D+': 4,  'D': 3,  'D-': 2,
  'F': 1,
};
```

Grade dropdown order (matches CONTEXT.md D-05): `A+, A, A-, B+, B, B-, C+, C, C-, D+, D, D-, F`

### Pattern 3: Hard Sell Banner (reuse ScreenshotIngestionPage pattern exactly)

The reference implementation is at `ScreenshotIngestionPage.tsx` lines 1144-1160. The exact classes:

```typescript
// Source: ScreenshotIngestionPage.tsx lines 1145-1160 [VERIFIED by codebase read]
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

The `RecruitingPage.tsx` form already has the 3 motivation selects in a `grid grid-cols-3 gap-2`. The banner goes immediately below that grid, above the deal breaker / visit week row.

### Pattern 4: FilterStore Toggle (reuse RosterPage status filter pattern)

The existing status filter buttons in `RosterPage.tsx` (lines 218-232) use:
```
className={`px-3 py-1.5 text-sm transition-colors capitalize ${
  statusFilter === sf
    ? 'bg-gray-600 text-white'
    : 'bg-gray-800 text-gray-400 hover:text-gray-200'
}`}
```

The at-risk toggle follows the same structure but uses orange active state per UI-SPEC Component 7:
- Off: `px-3 py-2 text-sm bg-gray-800 border border-gray-700 text-gray-400 rounded-lg hover:text-gray-200 transition-colors`
- On: `px-3 py-2 text-sm bg-orange-900/30 border border-orange-700 text-orange-300 rounded-lg`

FilterStore setter pattern (existing established pattern):
```typescript
// Source: RosterPage.tsx lines 83-89 [VERIFIED by codebase read]
const [showAtRisk, setShowAtRiskState] = useState<boolean>(
  (_savedFilters['showAtRisk'] as boolean) ?? false
);
const setShowAtRisk = (val: boolean) => {
  setShowAtRiskState(val);
  useFilterStore.getState().setFilter(PAGE_KEY, 'showAtRisk', val);
};
```

### Pattern 5: Player Status Side Effect in createDraftPick

```typescript
// Source: draft-service.ts — add after db.draftPicks.add(pick) [VERIFIED: D-11, D-12]
await db.draftPicks.add(pick);

// TOOL-04: if a player is linked, mark them as drafted
if (pick.playerId) {
  await db.players.update(pick.playerId, {
    status: 'drafted',
    updatedAt: now,
  });
}
```

The `now` variable is already defined earlier in `createDraftPick()` (`const now = Date.now()`).

### Pattern 6: html2canvas Class Card Export

The existing `LegacyCardExport.tsx` uses `toPng` from `html-to-image`. The html2canvas equivalent:

```typescript
// Source: html2canvas documentation [CITED: https://html2canvas.hertzen.com/documentation.html]
import html2canvas from 'html2canvas';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';

async function handleExportCard() {
  if (!cardRef.current) return;
  setExporting(true);
  try {
    const canvas = await html2canvas(cardRef.current, {
      backgroundColor: null, // preserve card background
      scale: 2,              // 2x for crisp 1280x720 actual pixels
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

**Hidden render target positioning:** Use `fixed -left-[9999px] top-0` (NOT `display:none` — html2canvas cannot capture hidden elements). [CITED: html2canvas docs]

### Pattern 7: Combobox (reuse Phase 22 pattern from ScreenshotIngestionPage)

The Phase 22 combobox in `ScreenshotIngestionPage.tsx` lines 741-793 is the reference. Key details:
- State: `[searchTerm, setSearchTerm]` (text input value) + `[openDropdown, setOpenDropdown]` (boolean)
- Filter: case-insensitive substring on `${player.firstName} ${player.lastName}`
- onBlur: `setTimeout(() => setOpenDropdown(false), 150)` — critical for WebView
- onMouseDown on items (not onClick) — fires before onBlur

### Pattern 8: AddPlayerModal Pre-fill Props

`AddPlayerModal` currently uses only internal `useState` for all fields. To pre-fill from a recruit, add optional initial-value props:

```typescript
// Source: AddPlayerModal.tsx — add to interface [VERIFIED by codebase read]
interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  dynastyId: string;
  sport: SportType;
  initialFirstName?: string;   // new
  initialLastName?: string;    // new
  initialPosition?: string;    // new
  initialStars?: number;       // new
}
```

And initialize state from props:
```typescript
const [firstName, setFirstName] = useState(initialFirstName ?? '');
const [lastName, setLastName] = useState(initialLastName ?? '');
// etc.
```

**Name splitting per CONTEXT.md / UI-SPEC:**
```typescript
const parts = recruit.name.trim().split(' ');
const lastName = parts.pop() ?? '';
const firstName = parts.join(' ');
```

### Pattern 9: Class Card Average Stars Calculation

The `RecruitingClass` type has `fiveStars`, `fourStars`, `threeStars` counts but no average stars field. The Class Card needs avg star rating. Calculate it from `recruitsForClass` array (already loaded in store):

```typescript
const avgStars = recruitsForClass.length > 0
  ? (recruitsForClass.reduce((sum, r) => sum + r.stars, 0) / recruitsForClass.length).toFixed(2)
  : '—';
```

Position breakdown for the card uses `getPositionBreakdown()` from `draft-service.ts` — but that function operates on `DraftPick[]`. For recruits, build an equivalent from `recruitsForClass`:

```typescript
const posBreakdown: Record<string, number> = {};
for (const r of recruitsForClass) {
  posBreakdown[r.position] = (posBreakdown[r.position] ?? 0) + 1;
}
```

Top 3 recruits by stars desc (then nationalRank asc for tiebreaking — null last):
```typescript
const top3 = [...recruitsForClass]
  .sort((a, b) => {
    if (b.stars !== a.stars) return b.stars - a.stars;
    const aRank = a.nationalRank ?? Infinity;
    const bRank = b.nationalRank ?? Infinity;
    return aRank - bRank;
  })
  .slice(0, 3);
```

### Anti-Patterns to Avoid

- **`display:none` for the hidden Class Card render target:** html2canvas cannot capture elements with `display:none`. Use `fixed -left-[9999px] top-0` to keep them rendered off-screen.
- **`onClick` on combobox list items:** Must use `onMouseDown` so it fires before the input's `onBlur` dismisses the list. This is the established Phase 22 pattern.
- **Blob URL file downloads:** Blocked in Tauri WKWebView/WebView2. Always use `save()` dialog + `writeFile()`.
- **Passing `isCommitted` updates through the store's `addRecruit` action:** Add a separate `updateRecruit` store action instead of re-using `addRecruit` for updates.
- **Calling `Object.keys(GRADE_POINTS)` before exporting it:** `GRADE_POINTS` is currently `const` (not exported). The plan MUST include making it `export const` first.
- **Importing `html2canvas` before installing it:** `npm/pnpm install html2canvas` must be the first task in TOOL-05 plan.
- **Skipping the `usePrefsStore` / `hasApiKey` check in the Class Card flow:** The card export has no AI dependency — do NOT gate it on `hasApiKey`. Only `generateGrade` (AI feature) is gated.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Grade point lookup | Custom grade map | `GRADE_POINTS` in `recruiting-calculator.ts` | Already correct and complete; 13 valid grades |
| Hard Sell calculation | Custom sum comparison | `getHardSellRecommendation()` | Already handles null/zero guard logic |
| DOM → PNG | Custom canvas API | `html2canvas` | Cross-browser canvas capture with WebView quirks handled |
| Toast notifications | Custom UI | `useToastStore.success/error()` | Already wired to sonner; project standard |
| File save dialog | Custom modal | Tauri `dialog.save()` + `plugin-fs writeFile()` | Blob URL downloads are blocked in WKWebView |
| Filter state persistence | Custom localStorage | `useFilterStore.setFilter()` | Already persists via Zustand; wrapping pattern established |

**Key insight:** Every computational primitive for this phase already exists in the codebase. The work is wiring, not building.

---

## Common Pitfalls

### Pitfall 1: GRADE_POINTS Not Exported
**What goes wrong:** `RecruitingPage.tsx` tries to import `GRADE_POINTS` from `recruiting-calculator.ts` but gets a TypeScript compile error because it is declared as `const`, not `export const`.
**Why it happens:** The original implementation only needed `GRADE_POINTS` internally within the file.
**How to avoid:** Make `GRADE_POINTS` the first change in TOOL-01 plan — `export const GRADE_POINTS`.
**Warning signs:** TypeScript error "Module has no exported member 'GRADE_POINTS'".

### Pitfall 2: Motivation Selects Already Use Wrong Source
**What goes wrong:** The current motivation selects in `RecruitingPage.tsx` (lines 506-539) are populated with `CFB_DEAL_BREAKER_CATEGORIES` (14 deal-breaker category strings). Phase 24 changes them to grade values from `GRADE_POINTS`. Two different sources — easy to confuse.
**Why it happens:** Phase 21 DMOD-05 added motivation fields but reused the deal-breaker category options as a placeholder.
**How to avoid:** Replace all three motivation selects' `{CFB_DEAL_BREAKER_CATEGORIES.map(...)}` with `{Object.keys(GRADE_POINTS).map(...)}`.

### Pitfall 3: html2canvas `display:none` Capture Failure
**What goes wrong:** The hidden Class Card renders but exports as blank PNG.
**Why it happens:** html2canvas captures the computed styles — `display:none` means nothing to render.
**How to avoid:** Use `fixed -left-[9999px] top-0` (off-screen, still rendered). Do NOT use `hidden` class or `style={{ display: 'none' }}`.

### Pitfall 4: AddPlayerModal State Not Reset Between Opens
**What goes wrong:** After clicking "Add to Roster" for recruit A, then recruit B, the modal still shows recruit A's pre-filled values because `useState` initializes once.
**Why it happens:** React initializes `useState` once; subsequent prop changes don't re-initialize state.
**How to avoid:** The modal already has a `resetForm()` function. Add a `useEffect` that calls `resetForm()` and re-applies initial values when the `isOpen` prop changes from `false` to `true`:
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

### Pitfall 5: Dexie `players.update()` Requires Exact Primary Key Type
**What goes wrong:** `db.players.update(pick.playerId, ...)` silently does nothing if `playerId` doesn't match a player ID in the table.
**Why it happens:** Dexie `update()` returns the number of records updated (0 if no match); it does not throw.
**How to avoid:** No special handling needed per D-12 ("Always override regardless of current value") — a miss means the player ID was never linked correctly, which is a data entry issue, not a code bug. The side effect is fire-and-forget by design.

### Pitfall 6: isCommitted Toggle Revert on Error — classId Available?
**What goes wrong:** The `updateRecruit` store action tries to revert by calling `getRecruitsByClass()` but needs the classId to do so.
**Why it happens:** The store only has `recruitsForClass` (array), not a direct `activeClassId`.
**How to avoid:** Get `classId` from `recruitsForClass[0]?.classId` — all recruits in the list belong to the same class. Or use `activeClass?.id` from store state.

### Pitfall 7: html2canvas Google Font Rendering Issue
**What goes wrong:** Bebas Neue / Oswald fonts in the Class Card render as fallback system font in the exported PNG.
**Why it happens:** html2canvas does not automatically load Google Fonts declared in `<style>` or `<link>` tags — it captures what's rendered, which depends on fonts being loaded.
**How to avoid:** Fonts loaded via Google Fonts CDN in `index.css` should already be loaded in the WebView. The card is rendered in the same WebView context, so fonts should be available if they've been used elsewhere in the page during the session. If fonts fail to load in the export, the fallback to `system-ui` is acceptable per the UI-SPEC typography table.

---

## Code Examples

### Verified Pattern: Hard Sell Banner Wiring
```typescript
// Source: ScreenshotIngestionPage.tsx lines 1114-1119 [VERIFIED by codebase read]
// In RecruitingPage form component:
import { getHardSellRecommendation } from '../lib/recruiting-calculator';

const recommendation = getHardSellRecommendation(
  recruitForm.motivation1 || null,
  recruitForm.motivation2 || null,
  recruitForm.motivation3 || null
);
const isHardSell = recommendation === 'Hard Sell';
```

### Verified Pattern: Draft Pick Player Link Already Exists in DraftTrackerPage
```typescript
// Source: DraftTrackerPage.tsx lines 79-95 [VERIFIED by codebase read]
// The existing handlePlayerSelect already auto-fills playerName and position.
// Phase 24 replaces the <select> (lines 180-192) with a combobox but
// preserves the same handlePlayerSelect logic.
const handlePlayerSelect = (playerId: string) => {
  if (!playerId) {
    setForm((f) => ({ ...f, playerId: '' }));
    return;
  }
  const player = players.find((p) => p.id === playerId);
  if (player) {
    setForm((f) => ({
      ...f,
      playerId,
      playerName: `${player.firstName} ${player.lastName}`,
      position: player.position,
    }));
  }
};
```

### Verified Pattern: Tauri PNG Export Chain
```typescript
// Source: LegacyCardExport.tsx lines 28-61 [VERIFIED by codebase read]
// The chain: capture → base64 → Uint8Array → save() dialog → writeFile()
// html2canvas variant (TOOL-05 uses html2canvas per D-08):
const canvas = await html2canvas(cardRef.current, { backgroundColor: null, scale: 2 });
const dataUrl = canvas.toDataURL('image/png');
// ... identical base64 → Uint8Array → save() → writeFile() chain
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Motivation selects use CFB_DEAL_BREAKER_CATEGORIES | Use GRADE_POINTS keys (A+ through F) | Phase 24 TOOL-01 | Enables valid Hard Sell computation |
| No isCommitted field on Recruit | `isCommitted?: boolean` | Phase 24 TOOL-03 | Enables class list historical tracking + Add to Roster gate |
| Player link select is `<select>` | Searchable combobox | Phase 24 TOOL-04 | Handles 50+ player rosters without scroll degradation |
| Draft picks don't auto-update player status | `createDraftPick()` side effect | Phase 24 TOOL-04 | Automatic status sync reduces manual RosterPage updates |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | html2canvas 1.4.1 works correctly with Tauri WKWebView for off-screen element capture | Standard Stack / Code Examples | Export produces blank or corrupt PNG; fallback is to use `html-to-image` (already installed, same chain) |
| A2 | Google Fonts (Bebas Neue) loaded in index.css will be available in the WebView when html2canvas captures the Class Card | Common Pitfalls #7 | Card exports with fallback font; cosmetic degradation only |
| A3 | `db.players.update()` with a non-existent `playerId` silently no-ops (Dexie behavior) | Pitfall #5 | If Dexie throws on missing key, `createDraftPick()` would fail; test by checking Dexie docs |

**If this table is empty:** N/A — three items logged above.

---

## Open Questions

1. **Should `updateRecruit` in the store use optimistic update or pessimistic?**
   - What we know: CONTEXT.md says "optimistic: update local state immediately, persist async; on error: revert toggle and show toast"
   - What's clear: Optimistic per D-02 interaction contract.
   - Recommendation: Implement optimistic with revert as specified.

2. **Does TOOL-05 need to appear in REQUIREMENTS.md?**
   - What we know: CONTEXT.md explicitly notes "TOOL-05 appears in ROADMAP.md but is NOT listed as a formal requirement in REQUIREMENTS.md. Planner should add TOOL-05 to REQUIREMENTS.md or flag this discrepancy."
   - Recommendation: Planner should add TOOL-05 to REQUIREMENTS.md in Wave 0 of the TOOL-05 plan.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `html-to-image` | LegacyCardExport (existing) | Yes | 1.11.13 | — |
| `html2canvas` | TOOL-05 Class Card | No (not installed) | needs install | `html-to-image` (but D-08 locks html2canvas) |
| `@tauri-apps/plugin-dialog` | TOOL-05 file save | Yes | project version | — |
| `@tauri-apps/plugin-fs` | TOOL-05 file write | Yes | project version | — |
| `sonner` | Toast notifications | Yes | 2.0.7 | — |

**Missing dependencies with no fallback:**
- `html2canvas`: Must install before TOOL-05 plan executes. Install command: `pnpm --filter @dynasty-os/desktop add html2canvas`

**Missing dependencies with fallback:**
- None (html2canvas is locked by D-08 — no fallback needed)

---

## Validation Architecture

No automated test infrastructure exists in this project. All test files found are in `node_modules` (third-party packages only). No `jest.config.*`, `vitest.config.*`, `pytest.ini`, or `__tests__/` directories found in project source.

**Validation strategy for Phase 24:** Manual verification against success criteria at phase gate.

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TOOL-01 | Recruit with all 3 grades shows Hard Sell/Send the House banner in form; badge on row | manual | `npm run build` (TypeScript compile) | N/A |
| TOOL-02 | At-risk filter toggle highlights deal-breaker rows with orange tint | manual | `npm run build` | N/A |
| TOOL-03 | isCommitted toggle + Add to Roster opens pre-filled AddPlayerModal | manual | `npm run build` | N/A |
| TOOL-04 | Draft pick with playerId auto-updates player status to 'drafted' | manual | `npm run build` | N/A |
| TOOL-05 | Export Class Card saves PNG with correct content | manual | `npm run build` | N/A |

**Phase gate:** `npm run build` (TypeScript zero-errors) + manual walkthrough of all 5 success criteria before `/gsd-verify-work`.

**Wave 0 Gaps:** None — no test infrastructure to create. Verification is manual per project convention.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No auth changes |
| V3 Session Management | No | No session changes |
| V4 Access Control | No | CFB guard already exists on RecruitingPage/DraftTrackerPage |
| V5 Input Validation | Yes | Motivation grades constrained to dropdown (A+ through F); player name split is display-only |
| V6 Cryptography | No | PNG export uses no encryption |

### Known Threat Patterns for this Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via recruit name in Class Card | Tampering | React renders recruit names as text nodes (not innerHTML); html2canvas captures DOM, not raw HTML strings — no sanitization needed |
| Path traversal in file save | Tampering | Tauri `dialog.save()` forces OS-native dialog; user controls the path, not the app code |

---

## Sources

### Primary (HIGH confidence)
- Codebase read — `recruiting-calculator.ts`, `recruiting-service.ts`, `draft-service.ts`, `draft-store.ts`, `recruiting-store.ts`, `filter-store.ts`, `toast-store.ts`, `AddPlayerModal.tsx`, `LegacyCardExport.tsx`, `RosterPage.tsx`, `DraftTrackerPage.tsx`, `RecruitingPage.tsx`, `ScreenshotIngestionPage.tsx`, `core-types/recruiting.ts`, `core-types/player.ts`, `core-types/draft.ts`, `tailwind.config.ts`, `index.css`
- npm registry — html2canvas 1.4.1, html-to-image 1.11.13 [VERIFIED: npm view]

### Secondary (MEDIUM confidence)
- CONTEXT.md — all decisions D-01 through D-13 [read directly]
- UI-SPEC.md (24-UI-SPEC.md) — component inventory, color, copy, interaction contracts [read directly]

### Tertiary (LOW confidence)
- html2canvas WKWebView/WebView2 compatibility — assumed compatible based on same-category-as-html-to-image assumption [ASSUMED: A1]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in package.json or npm registry
- Architecture: HIGH — all source files read directly; patterns verified against live code
- Pitfalls: HIGH — derived from direct code inspection (GRADE_POINTS not exported, motivation select source wrong, etc.)

**Research date:** 2026-05-05
**Valid until:** 2026-06-05 (stable library stack; html2canvas version pinnable)
