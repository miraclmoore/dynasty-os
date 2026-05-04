import { db } from '@dynasty-os/db';
import type { Rival } from '@dynasty-os/core-types';
import { generateId } from './uuid';
import { getRivalKeyMoments, setRivalKeyMoments } from './prefs-service';
import type { KeyMoment } from '../store/prefs-store';

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
  await db.rivals.delete(id);
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

// ─── Key Moments (D-08: moved to plugin-store via prefs-service; Phase 21 will move to Dexie) ──

export type { KeyMoment };

export async function getKeyMoments(rivalId: string): Promise<KeyMoment[]> {
  return getRivalKeyMoments(rivalId);
}

export async function addKeyMoment(rivalId: string, moment: KeyMoment): Promise<void> {
  const existing = await getRivalKeyMoments(rivalId);
  const updated = [...existing, moment].sort((a, b) => b.year - a.year);
  await setRivalKeyMoments(rivalId, updated);
}

export async function deleteKeyMoment(rivalId: string, year: number, description: string): Promise<void> {
  const existing = await getRivalKeyMoments(rivalId);
  const filtered = existing.filter((m) => !(m.year === year && m.description === description));
  await setRivalKeyMoments(rivalId, filtered);
}
