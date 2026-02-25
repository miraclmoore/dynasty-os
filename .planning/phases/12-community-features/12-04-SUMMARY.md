---
phase: 12-community-features
plan: "04"
subsystem: tools
tags: [playoff-bracket, trade-calculator, cfb-gated, madden-gated, pure-functions, session-state]
dependency_graph:
  requires: []
  provides: [playoff-simulator-page, trade-calculator-page]
  affects: [navigation-store, App.tsx, CommandPalette]
tech_stack:
  added: []
  patterns: [pure-function-lib, cfb-sport-guard, madden-sport-guard, session-state-only]
key_files:
  created:
    - apps/desktop/src/lib/playoff-bracket.ts
    - apps/desktop/src/lib/trade-calculator.ts
    - apps/desktop/src/pages/PlayoffSimulatorPage.tsx
    - apps/desktop/src/pages/TradeCalculatorPage.tsx
  modified:
    - apps/desktop/src/store/navigation-store.ts
    - apps/desktop/src/App.tsx
    - apps/desktop/src/components/CommandPalette.tsx
decisions:
  - Pure logic in lib/ files (no Zustand) — bracket and trade value are stateless computations
  - PlayoffSimulatorPage guard split into outer (Zustand hook) and inner (PlayoffSimulatorContent) components so React hooks run unconditionally after the sport guard
  - 12-team bye logic: seeds 1-4 enter round 2 with team2=null; play-in results fill team2 in reverse index order (r1-m3 winner -> r2-m0, r1-m0 winner -> r2-m3)
  - Trade Calculator breakdown uses rounded integers for display clarity; agePenalty and contractBonus computed from pre-penalty base to avoid double-penalizing
  - CommandPalette Trade Calculator placed in Navigate group (Madden conditional); Playoff Simulator placed in CFB Program group (CFB conditional) — consistent with existing sport-gating pattern
metrics:
  duration: ~4 min
  completed: 2026-02-24
  tasks_completed: 2
  files_changed: 7
---

# Phase 12 Plan 04: Playoff Simulator + Trade Calculator Summary

**One-liner:** CFB-gated 4/8/12-team bracket simulator with session state and Madden-gated trade value calculator with position/rating/age/contract scoring.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Pure logic libraries — playoff-bracket.ts + trade-calculator.ts | 04d7a59 | playoff-bracket.ts, trade-calculator.ts |
| 2 | PlayoffSimulatorPage + TradeCalculatorPage + navigation registration | 05e9158 | PlayoffSimulatorPage.tsx, TradeCalculatorPage.tsx, navigation-store.ts, App.tsx, CommandPalette.tsx |

## What Was Built

### playoff-bracket.ts
Pure TypeScript library with no DB or side effects:
- `buildBracket(teams)` — creates 4, 8, or 12-team bracket with standard seeding (1 vs lowest, etc.)
- `pickWinner(bracket, matchupId, winner)` — immutable update: sets winner, advances team to correct slot in next round, sets `champion` when final matchup is decided
- 12-team special logic: seeds 1-4 get byes into round 2 (quarterfinals); play-in winners fill team2 slots in reverse seeding order

### trade-calculator.ts
Pure function with no DB or side effects:
- `calculateTradeValue({ position, overallRating, age, contractYearsLeft })` — returns grade + total + breakdown
- Position base values (QB=100 down to K/P=20), rating factor (0-1 scale above 50), age penalty (8%/year over 30), contract bonus (capped at 20%)
- Grade thresholds: Elite ≥100, High ≥70, Average ≥40, Low ≥10, Untradeable <10

### PlayoffSimulatorPage.tsx
- CFB guard: `activeDynasty.sport !== 'cfb'` returns null
- Setup phase: bracket size radio (4/8/12), team name inputs (labeled Seed 1-N), Start button
- Active bracket: horizontal-scrollable round columns with round labels (First Round/Quarterfinals/Semifinals/Championship)
- MatchupCard: BYE slots for null teams, "Click to pick winner" on eligible matchups, green winner highlight
- Champion banner when `bracket.champion` is set
- Reset button returns to setup phase

### TradeCalculatorPage.tsx
- Madden guard: `activeDynasty.sport !== 'madden'` returns null
- Form: position select (all 13 positions), overall rating 50-99, age 20-40, contract years 0-7
- Result panel: grade badge (color-coded: purple/green/yellow/orange/red), text-5xl total score, breakdown table with +/- coloring, grade key
- Two-column grid layout (lg:grid-cols-2)

### Navigation + Routing
- `navigation-store.ts`: added `'playoff-simulator'` and `'trade-calculator'` to Page union; `goToPlayoffSimulator()` and `goToTradeCalculator()` actions
- `App.tsx`: case statements for both pages
- `CommandPalette.tsx`: Playoff Simulator in CFB Program group (CFB-gated); Trade Calculator in Navigate group (Madden-gated)

## Deviations from Plan

None — plan executed exactly as written. The PlayoffSimulatorPage was split into an outer guard component and inner content component (standard React hook rules pattern) but this is an implementation detail, not a deviation.

## Self-Check: PASSED

- FOUND: apps/desktop/src/lib/playoff-bracket.ts
- FOUND: apps/desktop/src/lib/trade-calculator.ts
- FOUND: apps/desktop/src/pages/PlayoffSimulatorPage.tsx
- FOUND: apps/desktop/src/pages/TradeCalculatorPage.tsx
- FOUND commit: 04d7a59 (Task 1)
- FOUND commit: 05e9158 (Task 2)
- Build: exits 0 (✓ built in 2.13s)
