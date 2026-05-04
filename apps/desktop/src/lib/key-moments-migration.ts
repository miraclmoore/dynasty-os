import { db } from '@dynasty-os/db';
import { load } from '@tauri-apps/plugin-store';
import { generateId } from './uuid';
import type { KeyMoment } from '@dynasty-os/core-types';

const STORE_FILE = 'dynasty-os.bin';
const PREFIX = 'rival-moments-';
const MIGRATION_FLAG = 'key-moments-migrated-to-dexie-v7';

interface LegacyKeyMoment {
  year: number;
  description: string;
}

/**
 * One-shot migration: copies key moments from the Tauri plugin-store
 * (rival-moments-{rivalId} keys) into the Dexie keyMoments table created in
 * Phase 21 Plan 01. Runs at most once per install — gated by a flag in the
 * same plugin-store. After successful copy, the legacy plugin-store entries
 * are deleted to reclaim space and to prevent any chance of stale data
 * shadowing the Dexie source of truth.
 *
 * Failure modes:
 * - Plugin-store unavailable: silently no-op (migration retries on next launch)
 * - Rival no longer exists in db.rivals: the moment is skipped (orphaned)
 * - Dexie write fails: aborts mid-migration, flag NOT set, retries next launch
 */
export async function migrateKeyMomentsFromPrefsStore(): Promise<void> {
  try {
    const store = await load(STORE_FILE, { defaults: {}, autoSave: true });

    // Idempotency check — skip if already migrated
    const alreadyMigrated = await store.get<boolean>(MIGRATION_FLAG);
    if (alreadyMigrated === true) return;

    const allEntries = await store.entries();
    const legacyKeys = allEntries.filter(([k]) => k.startsWith(PREFIX));
    if (legacyKeys.length === 0) {
      // Nothing to migrate — set flag so we don't re-check every launch
      await store.set(MIGRATION_FLAG, true);
      return;
    }

    // Build dynastyId lookup from db.rivals (the rival owns the dynasty link)
    const allRivals = await db.rivals.toArray();
    const rivalToDynastyId = new Map<string, string>();
    for (const r of allRivals) rivalToDynastyId.set(r.id, r.dynastyId);

    const now = Date.now();
    const newRows: KeyMoment[] = [];
    const migratedKeys: string[] = [];

    for (const [storeKey, value] of legacyKeys) {
      const rivalId = storeKey.slice(PREFIX.length);
      const dynastyId = rivalToDynastyId.get(rivalId);
      if (!dynastyId) {
        // Orphaned plugin-store entry (rival was deleted) — skip, but mark for cleanup
        migratedKeys.push(storeKey);
        continue;
      }
      if (!Array.isArray(value)) continue;
      for (const m of value as LegacyKeyMoment[]) {
        if (typeof m?.year !== 'number' || typeof m?.description !== 'string') continue;
        newRows.push({
          id: generateId(),
          dynastyId,
          rivalId,
          year: m.year,
          description: m.description,
          createdAt: now,
          updatedAt: now,
        });
      }
      migratedKeys.push(storeKey);
    }

    if (newRows.length > 0) {
      await db.keyMoments.bulkAdd(newRows);
    }

    // Delete legacy plugin-store entries AFTER successful Dexie write
    for (const k of migratedKeys) {
      try { await store.delete(k); } catch {}
    }

    await store.set(MIGRATION_FLAG, true);
    console.info(`[key-moments-migration] migrated ${newRows.length} moments across ${migratedKeys.length} rivals`);
  } catch (err) {
    console.warn('[key-moments-migration] failed; will retry on next launch:', err);
  }
}
