---
status: partial
phase: 23-madden-sync-upgrade
source: [23-VERIFICATION.md]
started: 2026-05-04T00:00:00Z
updated: 2026-05-04T00:00:00Z
---

## Current Test

[awaiting human testing — requires Windows + live Madden .frs save file]

## Tests

### 1. Live PlayerStats DB write
expected: Sync a real .frs file. Open a player's profile and confirm at least one non-OVR stat key (pass_yards, rush_yards, rec_yards, sacks, tackles, interceptions, pass_td, rush_td, rec_td, or receptions) has a non-zero value in the season stats column.
result: [pending]

### 2. Re-sync idempotency
expected: Sync the same .frs file a second time. No duplicate PlayerSeason rows appear for any player — the existing row is updated, not duplicated.
result: [pending]

### 3. Graceful degradation (no PlayerStats table)
expected: Sync a .frs file where the PlayerStats table doesn't exist (or none of the 4 fallback table names match). Sync completes without any error toast. Players are saved with overall-only stats — no crash, no empty screen.
result: [pending]

### 4. Auto-discover chip row on Windows
expected: With at least one .frs file present in Documents/Madden NFL 25/saves/, Documents/Madden NFL 26/saves/, or %TEMP%/Franchise/, open MaddenSyncPage and confirm a "Detected Save Files" chip row appears above the Browse button.
result: [pending]

### 5. Chip click parity with Browse flow
expected: Clicking a chip in the auto-discovered list selects the path and advances the sync flow identically to manually browsing for and selecting the same file.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
