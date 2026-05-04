import { db } from '@dynasty-os/db';
import type { Rival } from '@dynasty-os/core-types';
import { generateId } from './uuid';

export async function createRival(
  input: Omit<Rival, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Rival> {
  const now = Date.now();
  const rival: Rival = {
    ...input,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  await db.rivals.add(rival);
  return rival;
}

export async function getRivalsByDynasty(dynastyId: string): Promise<Rival[]> {
  const rivals = await db.rivals.where('dynastyId').equals(dynastyId).toArray();
  return rivals.sort((a, b) => a.opponent.localeCompare(b.opponent));
}

export async function updateRival(
  id: string,
  updates: Partial<Pick<Rival, 'label' | 'opponent'>>
): Promise<void> {
  await db.rivals.update(id, { ...updates, updatedAt: Date.now() });
}

export async function deleteRival(id: string): Promise<void> {
  await db.transaction('rw', [db.rivals, db.keyMoments], async () => {
    await db.rivals.delete(id);
    // Cascade: remove all key moments for this rival to prevent orphaned rows
    await db.keyMoments.where('rivalId').equals(id).delete();
  });
}

/**
 * Calculates rivalry intensity on a 1-10 scale based on total games played.
 * Returns 0 if no games played. Capped at 10.
 */
export function calculateRivalryIntensity(totalGames: number): number {
  if (totalGames <= 0) return 0;
  return Math.min(10, Math.ceil(totalGames / 2));
}

/**
 * Calculates series momentum from the last 5 games.
 * Returns a value from -1 (full opponent advantage) to +1 (full user advantage).
 * More recent games are weighted higher.
 */
export function calculateSeriesMomentum(
  games: Array<{ result: 'W' | 'L' | 'T'; week?: number }>
): number {
  const recent = games.slice(0, 5);
  if (recent.length === 0) return 0;
  let weighted = 0;
  let totalWeight = 0;
  recent.forEach((g, i) => {
    const weight = 5 - i;
    weighted += (g.result === 'W' ? 1 : g.result === 'L' ? -1 : 0) * weight;
    totalWeight += weight;
  });
  return totalWeight > 0 ? Math.round((weighted / totalWeight) * 100) / 100 : 0;
}

// ─── Key Moments (DMOD-01: Phase 21 — moved from plugin-store to Dexie) ──

import type { KeyMoment } from '@dynasty-os/core-types';
export type { KeyMoment };

/**
 * Returns key moments for a rival, sorted by year descending (most recent first).
 * Scoped to the rival's dynasty via the [dynastyId+rivalId] compound index — never
 * leaks moments across dynasties.
 */
export async function getKeyMoments(rivalId: string): Promise<KeyMoment[]> {
  const moments = await db.keyMoments.where('rivalId').equals(rivalId).toArray();
  return moments.sort((a, b) => b.year - a.year);
}

/**
 * Adds a new key moment for a rival. Caller passes dynastyId explicitly so the
 * row is dynasty-scoped from the start (required for the compound index).
 */
export async function addKeyMoment(
  rivalId: string,
  dynastyId: string,
  moment: { year: number; description: string }
): Promise<KeyMoment> {
  const now = Date.now();
  const row: KeyMoment = {
    id: generateId(),
    dynastyId,
    rivalId,
    year: moment.year,
    description: moment.description,
    createdAt: now,
    updatedAt: now,
  };
  await db.keyMoments.add(row);
  return row;
}

/**
 * Deletes the matching moment by year + description (multiple moments may share
 * the same year; description is the discriminator). Falls back to a no-op when
 * no matching row is found — matches the prior plugin-store behavior.
 */
export async function deleteKeyMoment(
  rivalId: string,
  year: number,
  description: string
): Promise<void> {
  const matches = await db.keyMoments
    .where('rivalId')
    .equals(rivalId)
    .and((m) => m.year === year && m.description === description)
    .toArray();
  if (matches.length > 0) {
    await db.keyMoments.bulkDelete(matches.map((m) => m.id));
  }
}
