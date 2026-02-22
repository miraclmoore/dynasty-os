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
