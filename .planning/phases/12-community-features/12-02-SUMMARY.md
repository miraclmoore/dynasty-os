---
phase: 12-community-features
plan: "02"
subsystem: ui
tags: [recharts, nil, cfb, dexie, zustand, bar-chart, tailwind]

# Dependency graph
requires:
  - phase: 10-infrastructure-foundation
    provides: nilEntries Dexie table + NilEntry core-type scaffolded in Phase 10 schema
  - phase: 12-01
    provides: coaching-staff service/store pattern used as template for nil-service/nil-store
provides:
  - NIL deal logging with player picker, brand, amount, year, and optional duration
  - recharts@^3.7.0 installed (first of 3 confirmed chart uses — NIL, recruiting comparison, rivalry dashboard)
  - nil-service.ts with CRUD + pure aggregation (computeNilSpendByPosition, computeNilSpendByYear)
  - nil-store.ts with Zustand store (loadEntries, addEntry, removeEntry with undo)
  - NilLedgerPage.tsx with deal log table + recharts BarCharts (CFB-only guard)
  - navigation-store.ts nil-ledger + goToNilLedger
  - CommandPalette CFB-gated NIL Ledger entry
affects: [12-05-recruiting-comparison, 12-07-rivalry-dashboard]

# Tech tracking
tech-stack:
  added: [recharts@^3.7.0]
  patterns:
    - coaching-staff-service/store pattern followed exactly for nil-service/nil-store
    - CFB sport guard at component top (activeDynasty.sport !== 'cfb' returns null)
    - Pure aggregation functions in service layer (computeNilSpendByPosition, computeNilSpendByYear) — no DB calls, usable as recharts BarChart data
    - recharts Tooltip formatter types accept number | undefined in v3 — guard with nullish coalesce

key-files:
  created:
    - apps/desktop/src/lib/nil-service.ts
    - apps/desktop/src/store/nil-store.ts
    - apps/desktop/src/pages/NilLedgerPage.tsx
  modified:
    - apps/desktop/src/store/navigation-store.ts
    - apps/desktop/src/App.tsx
    - apps/desktop/src/components/CommandPalette.tsx
    - apps/desktop/package.json (recharts added)
    - pnpm-lock.yaml

key-decisions:
  - "NilEntry actual type fields: year (not startYear), playerName stored on entry, durationMonths optional (not endYear) — plan estimated fields; actual core-types used"
  - "recharts Tooltip formatter value typed as number | undefined in v3 — guard required to satisfy TypeScript strict mode"
  - "NIL Ledger uses year single field (not startYear/endYear range) matching actual DB schema"
  - "Player picker filters out players with departureYear set — active roster only for NIL deals"

patterns-established:
  - "recharts BarChart pattern: ResponsiveContainer width=100% height=200 > BarChart > XAxis/YAxis/Tooltip/Bar — reuse for recruiting comparison and rivalry dashboard"
  - "computeNilSpendByPosition uses Map<string,number> accumulator, returns sorted array — recharts-ready"

requirements-completed: [COMM-04]

# Metrics
duration: 3min
completed: 2026-02-25
---

# Phase 12 Plan 02: NIL Ledger Summary

**NIL deal tracking for CFB dynasties with recharts BarCharts (spend by position and year), player picker from active roster, and undoable delete — recharts installed as shared dependency**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-25T06:17:15Z
- **Completed:** 2026-02-25T06:20:17Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- NIL deal logging: player picker (active roster only), brand, amount, year, optional duration and notes
- recharts@^3.7.0 installed (COMM-04 was the first of 3 confirmed chart uses; recharts decision gate satisfied)
- NilLedgerPage renders only for CFB dynasties (Madden returns null immediately)
- Recharts BarCharts: "Spend by Position" and "Spend by Year" with amber fill (#d97706), hidden when no deals
- Deal log table with per-row delete (undoable via undo-store + toast action)
- nil-service pure aggregation functions are recharts-ready (sorted arrays, correct dataKey shape)
- Navigation registration: nil-ledger page, goToNilLedger action, CFB Program group in CommandPalette

## Task Commits

Each task was committed atomically:

1. **Task 1: Install recharts + NIL service + NIL store** - `f36d432` (feat)
2. **Task 2: NilLedgerPage + navigation registration** - `c0f4a04` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `apps/desktop/src/lib/nil-service.ts` - Dexie CRUD + pure aggregation for nilEntries table
- `apps/desktop/src/store/nil-store.ts` - Zustand store with undo/toast on removeEntry
- `apps/desktop/src/pages/NilLedgerPage.tsx` - CFB-only page with form, table, recharts BarCharts
- `apps/desktop/src/store/navigation-store.ts` - Added nil-ledger Page union + goToNilLedger action
- `apps/desktop/src/App.tsx` - Added case 'nil-ledger' + NilLedgerPage import
- `apps/desktop/src/components/CommandPalette.tsx` - Added CFB-gated NIL Ledger entry to CFB Program group
- `apps/desktop/package.json` - recharts@^3.7.0 added
- `pnpm-lock.yaml` - Updated after recharts install

## Decisions Made
- **NilEntry actual type shape:** The plan estimated `startYear`/`endYear` fields but the actual `NilEntry` type (core-types/src/nil-entry.ts) uses `year` (single field) and `durationMonths` (optional). Service and page were written to match the actual type, not the plan's estimate. The DB schema uses `year` as an indexed field.
- **recharts Tooltip formatter types:** recharts v3 Tooltip's `formatter` prop types the `value` parameter as `number | undefined`. The initial code passed `value: number` which failed TypeScript strict check. Fixed by guarding with `value != null ? formatDollars(value) : '$0'`.
- **Player picker filters active roster:** Players with `departureYear` set are filtered out of the NIL deal form picker — only active roster members are valid NIL deal recipients.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed recharts Tooltip formatter TypeScript type error**
- **Found during:** Task 2 (NilLedgerPage build verification)
- **Issue:** recharts v3 Tooltip formatter types `value` as `number | undefined`, but initial code typed it as `number` — TypeScript strict mode error TS2322
- **Fix:** Added null guard: `(value: number | undefined) => [value != null ? formatDollars(value) : '$0', 'Total']`
- **Files modified:** apps/desktop/src/pages/NilLedgerPage.tsx
- **Verification:** Build passes with `✓ built in 2.11s`
- **Committed in:** c0f4a04 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - type mismatch bug)
**Impact on plan:** Fix required for build to pass. No scope creep.

## Issues Encountered
- NilEntry actual type differed from plan's estimated fields (startYear/endYear vs year/durationMonths). Adapted service and page to match actual type — this is not a deviation, it's the plan's stated instruction to "verify the actual type shape before writing service."

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- recharts is now installed and the BarChart pattern is established — 12-05 (recruiting comparison) and 12-07 (rivalry dashboard) can reuse immediately
- NilLedgerPage is CFB-only and fully integrated into navigation and command palette
- computeNilSpendByPosition and computeNilSpendByYear patterns usable as reference for other aggregation functions

---
*Phase: 12-community-features*
*Completed: 2026-02-25*
