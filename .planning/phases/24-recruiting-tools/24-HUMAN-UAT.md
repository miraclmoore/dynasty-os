---
status: partial
phase: 24-recruiting-tools
source: [24-VERIFICATION.md]
started: 2026-05-05T17:00:00Z
updated: 2026-05-05T17:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Hard Sell banner appears on motivation grade selection
expected: Fill all 3 motivation grade dropdowns on a CFB recruit — Hard Sell or Send the House banner appears immediately below the motivation grid without saving
result: [pending]

### 2. isCommitted toggle persists after navigation
expected: Clicking Committed/Uncommitted toggle flips immediately (optimistic update) and persists after navigating away and returning
result: [pending]

### 3. Add to Roster opens AddPlayerModal pre-filled
expected: Marking a recruit as committed then clicking Add to Roster opens AddPlayerModal with first name, last name, position, and star rating pre-filled; recruit record unchanged after closing
result: [pending]

### 4. Export Class Card writes PNG via Tauri save dialog
expected: Clicking Export Class Card opens Tauri native save dialog with default filename signing-day-{year}.png; saving writes a 640x360 PNG with commit count, avg stars, position breakdown, and top 3 recruits
result: [pending]

### 5. At-Risk filter toggle shows orange-tinted rows and persists
expected: Clicking Show At-Risk on RosterPage reduces list to deal-breaker players with bg-orange-900/10 row tint; toggle state persists after navigating away
result: [pending]

### 6. Draft pick combobox + player status side effect
expected: Searching by partial name in DraftTrackerPage combobox filters correctly; selecting a player closes dropdown and fills form; after submit, db.players.get(pickedPlayerId).status === 'drafted'
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
