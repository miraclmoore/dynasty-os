# Summary 09-01: Sidecar Infrastructure + Save File Adapter

## Completed: 2026-02-24

## What was built
- `src-tauri/sidecar/madden-reader.cjs` — Node.js sidecar script (~200 lines)
  - `validate` subcommand: opens .frs file, returns version info + supported flag
  - `extract` subcommand: reads SeasonGame/Player/DraftPick tables, returns typed JSON
  - Defensive table name fallback loop (multiple Madden version aliases tried)
- `src-tauri/binaries/madden-reader-aarch64-apple-darwin` — shell wrapper (dev mode)
- `src-tauri/binaries/madden-reader-x86_64-apple-darwin` — shell wrapper (x86 fallback)
- `tauri-plugin-shell` added to Cargo.toml + lib.rs
- `bundle.externalBin` configured in tauri.conf.json
- `shell:allow-execute` + `shell:allow-open` + `fs:allow-watch` in capabilities
- `@tauri-apps/plugin-shell` installed in desktop package.json
- `src/lib/madden-sync-service.ts` — full service layer with all sync operations
- `MaddenSyncPage.tsx` — file picker, validation, unsupported fallback UI

## Key Decisions
- Shell wrapper approach for dev: forwards to node script, production uses pkg binary
- `computeSyncDiff` dedupes by week (games) and name (players) before commit
- Team identification in game mapping: substring match on dynasty.teamName vs homeTeam/awayTeam
