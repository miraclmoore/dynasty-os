---
status: partial
phase: 21-data-model
source: [21-VERIFICATION.md]
started: 2026-05-04T00:00:00Z
updated: 2026-05-04T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Key moment export/import round-trip
expected: Add a key moment in Rivalry Tracker, export the dynasty, import on a fresh DB, confirm the moment appears in Rivalry Tracker after import
result: [pending]

### 2. SeasonEndModal sport-gating
expected: "Bowl / Playoff Opponent" field appears in CFB dynasties; field is absent in Madden dynasties
result: [pending]

### 3. Dev trait colored badge rendering
expected: Superstar player shows purple badge with "Superstar Development Trait" tooltip on RosterPage and PlayerProfilePage; Normal/Star/X-Factor show correct colors
result: [pending]

### 4. CFB DB/RS badges on roster
expected: Orange DB badge + red RS badge appear on CFB roster rows for players with dealBreaker/isRedshirt set; badges absent on Madden roster rows
result: [pending]

### 5. Recruit motivation pills
expected: M1/M2/M3 blue pills + orange DB pill + plain "Week N" text render correctly on recruit rows; no sub-line for recruits with no motivations set
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
