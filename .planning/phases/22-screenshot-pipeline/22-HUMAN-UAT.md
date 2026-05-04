---
status: partial
phase: 22-screenshot-pipeline
source: [22-VERIFICATION.md]
started: 2026-05-04T21:00:00Z
updated: 2026-05-04T21:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Player Stats Save to Leaderboard
expected: Parse a player-stats screenshot, match a roster player, click "Save Stats" — stat appears in the Records leaderboard. Parsing a second screenshot for the same player merges stats rather than creating a duplicate PlayerSeason.
result: [pending]

### 2. Depth Chart CSV Copy + Notice Absence
expected: Parse a depth chart screenshot. The grey "Depth charts are not saved to the database in V1." notice is absent. "Copy as CSV" button is visible; clicking it changes label to "Copied!" for ~2 seconds. Pasting clipboard into a text editor shows `Position,Player Name,Depth` as the header row with subsequent lines matching parsed entries.
result: [pending]

### 3. Recruiting Motivations CFB Gating + Hard Sell Banner
expected: "Recruit Pitch Screen" appears in screen type dropdown for a CFB dynasty but NOT for an NFL dynasty. Parsing a screenshot with all 3 grades present shows the Hard Sell or Send the House recommendation banner. Parsing a screenshot with fewer than 3 grades shows no banner.
result: [pending]

### 4. Multi-Image Sequential Parse + Combined Confirm
expected: Selecting 3 images shows "+2 more images selected" and a "Parse 3 Screenshots" button. While parsing, spinner reads "Parsing 1 of 3…" → "Parsing 2 of 3…" → "Parsing 3 of 3…". After all 3 parse, the confirmation form shows all rows merged. Selecting a single image shows "Parsing screenshot…" (no fraction).
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
