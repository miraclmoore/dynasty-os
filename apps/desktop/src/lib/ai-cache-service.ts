import { db } from '@dynasty-os/db';
import { generateId } from './uuid';

export type { AiContentType } from '@dynasty-os/core-types';
import type { AiContentType } from '@dynasty-os/core-types';

// ── LRU Eviction Limit ────────────────────────────────────────────────────────

const LRU_LIMIT = 100;

// ── Cache Read ────────────────────────────────────────────────────────────────

/**
 * Retrieves the cached AI content for a given dynasty + cache key.
 * Returns the content string if found, or null if not cached.
 */
export async function getAiCache(
  dynastyId: string,
  cacheKey: string
): Promise<string | null> {
  try {
    const entry = await db.aiCache.where('cacheKey').equals(cacheKey).first();
    if (!entry || entry.dynastyId !== dynastyId) return null;
    return entry.content;
  } catch {
    return null;
  }
}

// ── Cache Write ───────────────────────────────────────────────────────────────

/**
 * Upserts an AI content entry for a given dynasty + cache key.
 * On insert (new entry), runs LRU eviction to keep dynasty entries <= 100.
 * On update (existing entry), only refreshes content and updatedAt.
 */
export async function setAiCache(
  dynastyId: string,
  cacheKey: string,
  contentType: AiContentType,
  content: string
): Promise<void> {
  try {
    const existing = await db.aiCache.where('cacheKey').equals(cacheKey).first();

    if (existing) {
      // Update path — no LRU eviction needed
      await db.aiCache.update(existing.id, { content, updatedAt: Date.now() });
    } else {
      // Insert path — add entry then run LRU eviction
      await db.aiCache.add({
        id: generateId(),
        dynastyId,
        cacheKey,
        contentType,
        content,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // LRU eviction: keep only the 100 most recently created entries per dynasty
      const all = await db.aiCache.where('dynastyId').equals(dynastyId).sortBy('createdAt');
      if (all.length > LRU_LIMIT) {
        const toDelete = all.slice(0, all.length - LRU_LIMIT).map((e) => e.id);
        await db.aiCache.bulkDelete(toDelete);
      }
    }
  } catch (err) {
    console.warn('[AiCacheService] setAiCache failed:', err);
  }
}

// ── Cache Delete ──────────────────────────────────────────────────────────────

/**
 * Deletes a single cache entry by dynastyId + cacheKey.
 */
export async function deleteAiCache(
  dynastyId: string,
  cacheKey: string
): Promise<void> {
  try {
    const entry = await db.aiCache.where('cacheKey').equals(cacheKey).first();
    if (entry && entry.dynastyId === dynastyId) {
      await db.aiCache.delete(entry.id);
    }
  } catch (err) {
    console.warn('[AiCacheService] deleteAiCache failed:', err);
  }
}
