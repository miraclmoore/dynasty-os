---
phase: 12-community-features
plan: "05"
subsystem: frontend-pages
tags: [recruiting, record-book, recharts, cfb-gated, direct-db]
dependency_graph:
  requires:
    - 12-01 (navigation-store pattern)
    - 12-02 (recharts BarChart pattern established)
  provides:
    - RecruitingComparisonPage (CFB-gated multi-season class comparison)
    - RecordBookPage (sport-agnostic dynasty history)
  affects:
    - CommandPalette (2 new entries)
    - App.tsx (2 new routes)
    - navigation-store (2 new pages + actions)
tech_stack:
  added: []
  patterns:
    - recharts ResponsiveContainer > BarChart > Bar (grade score conversion, letter → numeric)
    - direct db queries on mount (CoachingResumePage pattern — no store needed)
    - CFB sport guard (activeDynasty.sport !== 'cfb')
    - window.print() + no-print class (ProgramTimelinePage pattern)
key_files:
  created:
    - apps/desktop/src/pages/RecruitingComparisonPage.tsx
    - apps/desktop/src/pages/RecordBookPage.tsx
  modified:
    - apps/desktop/src/store/navigation-store.ts
    - apps/desktop/src/App.tsx
    - apps/desktop/src/components/CommandPalette.tsx
decisions:
  - "[Phase 12-05]: gradeToScore map (A+=100, A=95, A-=90, B+=85, ...) converts RecruitingClass.aiGrade letter grades to numeric for recharts BarChart — chart requires number, letter shown in custom tooltip"
  - "[Phase 12-05]: RecordBookPage top performer computed by summing all PlayerSeason.stats Record values — sport-agnostic, no position-specific stat key needed, works for any sport"
  - "[Phase 12-05]: Recruiting comparison season selector caps at 4 seasons with disabled state for overflow — prevents chart crowding while maximizing comparison utility"
  - "[Phase 12-05]: buildRecordBook is a pure local function in RecordBookPage (not extracted to service) — page-specific aggregation, matches CoachingResumePage pattern"
metrics:
  duration: 2 min
  completed_date: "2026-02-25"
  tasks: 2
  files_created: 2
  files_modified: 3
requirements:
  - COMM-07
  - COMM-09
---

# Phase 12 Plan 05: Recruiting Comparison + Record Book Summary

**One-liner:** CFB-gated multi-season recruiting class comparison with recharts BarChart grade conversion, plus sport-agnostic Record Book using direct Dexie queries for full dynasty history.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | RecruitingComparisonPage — CFB-gated multi-season class comparison | 8f2caca | RecruitingComparisonPage.tsx, navigation-store.ts, App.tsx, CommandPalette.tsx |
| 2 | RecordBookPage — historical season record book | feef5a2 | RecordBookPage.tsx |

## What Was Built

### Task 1: RecruitingComparisonPage

`apps/desktop/src/pages/RecruitingComparisonPage.tsx` (222 lines)

- CFB sport guard: returns `null` if `activeDynasty.sport !== 'cfb'`
- Loads `useRecruitingStore.loadClasses()` on mount when classes array is empty
- Season selector: toggle buttons for each class year (max 4 selected, disabled state when at cap)
- Bar chart: `ResponsiveContainer > BarChart` with custom `gradeToScore` map (A+=100 down to F=30) converting letter grades to numeric; custom tooltip shows letter grade + score
- Season cards: grid layout (1/2/3/4 columns based on count), each showing year, grade badge, 5/4/3-star counts, total commits, class rank, AI analysis snippet
- Empty state when no classes logged with link to Recruiting page
- Navigation: `goToRecruitingComparison()` added to navigation-store; `case 'recruiting-comparison'` in App.tsx; CFB Program group entry in CommandPalette

### Task 2: RecordBookPage

`apps/desktop/src/pages/RecordBookPage.tsx` (251 lines)

- Sport-agnostic: no sport guard, works for CFB and Madden alike
- Parallel Dexie queries on mount: `Promise.all([db.seasons, db.games, db.playerSeasons, db.players])`
- `buildRecordBook()` pure function: sorts seasons chronologically (oldest first), computes top performer by summing all PlayerSeason.stats values across playerSeasons for that season
- Season cards: year header with CHAMPION badge (amber, case-insensitive includes check), overall W-L, conference W-L, final ranking, bowl game + result (W=green/L=red), playoff result (amber if championship), top performer stat line, tagline in amber italic
- Print-friendly: `window.print()` button, `no-print` class on header nav, `@media print` inline style element, `pageBreakInside: 'avoid'` per card
- Navigation: `goToRecordBook()` added to navigation-store; `case 'record-book'` in App.tsx; Navigate group entry in CommandPalette (sport-agnostic)

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

### Files Created
- `apps/desktop/src/pages/RecruitingComparisonPage.tsx` — FOUND
- `apps/desktop/src/pages/RecordBookPage.tsx` — FOUND

### Files Modified
- `apps/desktop/src/store/navigation-store.ts` — FOUND (recruiting-comparison + record-book + go actions)
- `apps/desktop/src/App.tsx` — FOUND (both switch cases)
- `apps/desktop/src/components/CommandPalette.tsx` — FOUND (both entries)

### Commits
- 8f2caca: feat(12-05): RecruitingComparisonPage — CFB-gated multi-season class comparison
- feef5a2: feat(12-05): RecordBookPage — full dynasty history from direct db queries

### Build
- `pnpm --filter @dynasty-os/desktop build` exits 0 — PASSED

## Self-Check: PASSED
