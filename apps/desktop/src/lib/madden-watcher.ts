import { watch } from '@tauri-apps/plugin-fs';
import type { UnwatchFn } from '@tauri-apps/plugin-fs';

// ── Singleton watcher state ───────────────────────────────────────────────────

let activeUnwatch: UnwatchFn | null = null;
let watchedPath: string | null = null;

export type WatchCallback = (path: string) => void;

/**
 * Start watching a save file path for modifications.
 * Calls `onModify` whenever the file changes on disk.
 * Replaces any previously active watcher.
 * Never throws — errors are swallowed silently.
 */
export async function startWatching(filePath: string, onModify: WatchCallback): Promise<void> {
  await stopWatching();

  try {
    const unwatch = await watch(
      filePath,
      (event) => {
        // Emit on any modification event
        const kind = event.type as { modify?: unknown };
        if (kind?.modify !== undefined) {
          onModify(filePath);
        }
      },
      { delayMs: 2000 } // 2s debounce — avoids multiple triggers per save
    );
    activeUnwatch = unwatch;
    watchedPath = filePath;
  } catch (err) {
    console.warn('[MaddenWatcher] Failed to start file watcher:', err);
  }
}

/**
 * Stop the active watcher, if any.
 */
export async function stopWatching(): Promise<void> {
  if (activeUnwatch) {
    try {
      activeUnwatch();
    } catch {
      // ignore
    }
    activeUnwatch = null;
    watchedPath = null;
  }
}

/**
 * Returns the currently watched file path, or null.
 */
export function getWatchedPath(): string | null {
  return watchedPath;
}

/**
 * Returns true if a watcher is currently active.
 */
export function isWatching(): boolean {
  return activeUnwatch !== null;
}
