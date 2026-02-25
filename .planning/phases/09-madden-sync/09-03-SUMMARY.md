# Summary 09-03: Background File Watcher + Navigation Wiring

## Completed: 2026-02-24

## What was built
- `src/lib/madden-watcher.ts` — singleton watcher module
  - `startWatching()` / `stopWatching()` using tauri-plugin-fs `watch()`
  - 2-second debounce to prevent duplicate triggers per Madden save
  - Watches for `modify` events only
- `fs:allow-watch` added to capabilities/default.json
- Watcher `useEffect` in MaddenSyncPage: start/stop on toggle + path change
- Fixed bottom banner on save file modification with Dismiss and Sync Now
- `madden-sync` Page added to navigation-store.ts
- `goToMaddenSync()` action added
- `case 'madden-sync'` added to App.tsx router
- `MaddenSyncPage` imported in App.tsx
- "Sync Franchise Save" button (green-700) added to Dashboard NFL Franchise section (Madden only)

## Key Decisions
- `useEffect` cleanup calls `stopWatching()` on unmount
- Watcher is re-initialized when savePath changes (new file selected)
- Toggle stored in localStorage via `setWatcherEnabled()` in madden-sync-service
