---
phase: 21
plan: "04"
subsystem: data-model
tags:
  - data-model
  - ui
  - season
  - recruit
  - timeline
dependency_graph:
  requires:
    - "@dynasty-os/core-types: Season.bowlOpponent | Season.keyEvents (21-01)"
    - "@dynasty-os/core-types: Recruit.motivation1/2/3 | Recruit.dealBreakerMotivation | Recruit.visitWeek (21-01)"
  provides:
    - "SeasonEndModal: Bowl/Playoff Opponent field (CFB-gated) + Key Events textarea (both sports)"
    - "timeline-service.ts: cast-free Season property access (DMOD-02 success criterion)"
    - "RecruitingPage: motivation1/2/3 + dealBreakerMotivation + visitWeek form fields + row pills"
    - "apps/desktop/src/lib/cfb-categories.ts: CFB_DEAL_BREAKER_CATEGORIES + DEV_TRAITS + DEV_TRAIT_BADGE"
  affects:
    - "apps/desktop/src/components/SeasonEndModal.tsx"
    - "apps/desktop/src/lib/timeline-service.ts"
    - "apps/desktop/src/pages/DashboardPage.tsx"
    - "apps/desktop/src/pages/RecruitingPage.tsx"
    - "apps/desktop/src/lib/cfb-categories.ts"
tech_stack:
  added: []
  patterns:
    - "CFB sport-gate pattern: {sport === 'cfb' && (...)} conditionally renders bowlOpponent field in SeasonEndModal"
    - "Newline-split textarea → string[] round-trip: split('\\n').map(trim).filter(Boolean) idempotent on save"
    - "Flex-col form restructure: existing grid row 1 + new section rows preserve existing layout without changing inputs"
    - "Native title= tooltip on pills: avoids layout explosion in dense table cell vs Tooltip component wrapper"
key_files:
  created:
    - apps/desktop/src/lib/cfb-categories.ts
  modified:
    - apps/desktop/src/components/SeasonEndModal.tsx
    - apps/desktop/src/lib/timeline-service.ts
    - apps/desktop/src/pages/DashboardPage.tsx
    - apps/desktop/src/pages/RecruitingPage.tsx
decisions:
  - "sport: SportType prop added to SeasonEndModal; caller (DashboardPage) passes activeDynasty.sport — mirrors EditPlayerModal pattern"
  - "Key Events textarea stores newline-separated string client-side, split/trimmed to string[] on save — round-trip safe"
  - "cfb-categories.ts created in 21-04 (not 21-03) because 21-03 was a parallel wave-2 plan; file is available for 21-03 to import when it merges"
  - "M1/M2/M3 motivation pills use blue (B-tier color, bg-blue-900/30 text-blue-400 border-blue-700) — categories are not graded so a neutral color is used per UI-SPEC resolution"
  - "DB pill uses explicit orange (bg-orange-900/40 text-orange-300 border-orange-700) per UI-SPEC §Color"
  - "Visit week renders as plain text 'Week N' (not a pill) per UI-SPEC §Interaction Contracts"
metrics:
  duration: "~12 min"
  completed_date: "2026-05-04"
  tasks_completed: 2
  files_modified: 4
  files_created: 1
---

# Phase 21 Plan 04: Season UI + Recruiting Fields Summary

**One-liner:** SeasonEndModal gains Bowl/Playoff Opponent (CFB-gated) and Key Events fields; timeline-service.ts casts removed (DMOD-02); RecruitingPage inline form gains three motivation selectors, deal-breaker selector, and visit-week selector plus M1/M2/M3/DB pills on each recruit row (DMOD-05).

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | SeasonEndModal — Bowl Opponent (CFB) + Key Events + timeline cast removal | 6784df2 | SeasonEndModal.tsx, timeline-service.ts, DashboardPage.tsx |
| 2 | RecruitingPage — motivation/dealBreakerMotivation/visitWeek form fields + recruit row pills | 459c4a5 | RecruitingPage.tsx, cfb-categories.ts (new) |

## SeasonEndModal Changes

### New Props
- `sport: SportType` added to `SeasonEndModalProps` interface
- Import updated to `import type { Season, SportType } from '@dynasty-os/core-types'`

### New State Hooks
```typescript
const [bowlOpponent, setBowlOpponent] = useState(currentSeason?.bowlOpponent ?? '');
const [keyEvents, setKeyEvents] = useState((currentSeason?.keyEvents ?? []).join('\n'));
```

### Extended updateSeason Payload
```typescript
bowlOpponent: sport === 'cfb' ? (bowlOpponent.trim() || undefined) : undefined,
keyEvents: parsedKeyEvents.length > 0 ? parsedKeyEvents : undefined,
```

### New Fields Rendered
- **Bowl / Playoff Opponent** (CFB-gated via `{sport === 'cfb' && (...)}`): text input, placeholder "e.g. Ohio State", inserted between Bowl Game and Bowl Result
- **Key Events** (both sports): textarea rows=3, hint "One per line — shown on program timeline", inserted between Playoff Result and Season Notes

### DashboardPage Call Site Updated
```tsx
<SeasonEndModal
  ...
  sport={activeDynasty.sport}
/>
```

## timeline-service.ts Cast Removal (DMOD-02 Success Criterion)

Two `(season as any)` casts replaced with direct property access:

```typescript
// Before:
bowlOpponent: (season as any).bowlOpponent ?? null,
keyEvents: (season as any).keyEvents ?? [],

// After:
bowlOpponent: season.bowlOpponent ?? null,
keyEvents: season.keyEvents ?? [],
```

`grep -c "(season as any)" apps/desktop/src/lib/timeline-service.ts` returns **0**.

## cfb-categories.ts (New File — Deviation)

Created `apps/desktop/src/lib/cfb-categories.ts` as a Rule 3 auto-fix (blocking dependency). Plan 21-03 was a parallel wave-2 plan that creates this file, but it had not yet been committed when 21-04 executed. The file contains:
- `CFB_DEAL_BREAKER_CATEGORIES`: 14 exact EA CFB 26 category strings
- `DEV_TRAITS`: the four dev trait keys
- `DEV_TRAIT_LABEL`: display labels map
- `DEV_TRAIT_BADGE()`: Tailwind class string function for badge styling

## RecruitingPage Changes

### RecruitFormData Interface Extended
```typescript
motivation1: string;
motivation2: string;
motivation3: string;
dealBreakerMotivation: string;
visitWeek: string; // '' or '1'-'14'
```

### addRecruit Payload Extended
Five new fields passed from form state with proper type coercion (`parseInt` for visitWeek, `|| undefined` for empty strings).

### Form Restructure
- Form changed from `grid grid-cols-6` to `flex flex-col gap-3`
- Existing inputs wrapped in `<div className="grid grid-cols-6 gap-2">`
- New **Motivations** section header + three `<select>` in `grid-cols-3`
- New **Deal Breaker Motivation** and **Official Visit Week** selectors in `grid-cols-2`
- All new selects use `focus:border-amber-500` (RecruitingPage amber accent, not modal blue-500)

### Recruit Row Pills
In the Name cell, a sub-line appears when any motivation/visitWeek field is set:

| Element | Style | Notes |
|---------|-------|-------|
| M1 pill | `text-blue-400 bg-blue-900/30 border-blue-700` | title= shows full category |
| M2 pill | same blue | hidden when motivation2 absent |
| M3 pill | same blue | hidden when motivation3 absent |
| DB pill | `bg-orange-900/40 text-orange-300 border-orange-700` | title= shows full deal breaker |
| Week N | `text-xs text-gray-400` plain text | no pill style per UI-SPEC |

## Verification Results

### grep Counts (all pass)
```
grep -c "sport: SportType;" SeasonEndModal.tsx          → 1
grep -c "(season as any)" timeline-service.ts            → 0
grep -c "season.bowlOpponent ?? null" timeline-service.ts → 1
grep -c "season.keyEvents ?? []" timeline-service.ts     → 1
grep -c "motivation1: string;" RecruitingPage.tsx        → 1
grep -c ">M1<" RecruitingPage.tsx                        → 1
grep -c ">M2<" RecruitingPage.tsx                        → 1
grep -c ">M3<" RecruitingPage.tsx                        → 1
grep -c ">DB<" RecruitingPage.tsx                        → 1
grep -c "Week {recruit.visitWeek}" RecruitingPage.tsx    → 1
```

### TypeScript Compile
`pnpm --filter @dynasty-os/desktop exec tsc --noEmit` → **exit 0, zero errors**

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created cfb-categories.ts (dependency from parallel plan 21-03)**
- **Found during:** Task 2 start
- **Issue:** `apps/desktop/src/lib/cfb-categories.ts` referenced by the plan's import instruction did not exist; it was supposed to be created by Plan 21-03 (parallel wave-2 plan) but had not yet been committed
- **Fix:** Created the file with all exports needed by both 21-04 (RecruitingPage motivation selects) and 21-03 (AddPlayerModal/EditPlayerModal dev trait badge)
- **Files modified:** `apps/desktop/src/lib/cfb-categories.ts` (new)
- **Commit:** 459c4a5 (bundled with Task 2)

## Known Stubs

None — all new fields are wired end-to-end (form state → store payload → Dexie write → row display). No placeholder values or hardcoded empty renders.

## Threat Flags

No new threat surfaces beyond the plan's declared threat model (T-21-16 through T-21-20). Key mitigations implemented:
- T-21-16: Timeline-service cast removal validates that 21-01 Season type fields are present at compile time
- T-21-18: visitWeek 1-14 bound enforced at `<select>` layer
- T-21-20: keyEvents newline-split is idempotent on round-trip

## Self-Check: PASSED
