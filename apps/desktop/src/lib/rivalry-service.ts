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

// ─── Key Moments ───────────────────────────────────────────────────────────

const KEY_MOMENTS_KEY = (rivalId: string) => `dynasty-os-moments-${rivalId}`;

export interface KeyMoment {
  year: number;
  description: string;
}

export function getKeyMoments(rivalId: string): KeyMoment[] {
  try {
    return JSON.parse(localStorage.getItem(KEY_MOMENTS_KEY(rivalId)) ?? '[]');
  } catch {
    return [];
  }
}

export function addKeyMoment(rivalId: string, moment: KeyMoment): void {
  const existing = getKeyMoments(rivalId);
  const updated = [...existing, moment].sort((a, b) => b.year - a.year);
  localStorage.setItem(KEY_MOMENTS_KEY(rivalId), JSON.stringify(updated));
}

export function deleteKeyMoment(rivalId: string, year: number, description: string): void {
  const existing = getKeyMoments(rivalId).filter(
    (m) => !(m.year === year && m.description === description)
  );
  localStorage.setItem(KEY_MOMENTS_KEY(rivalId), JSON.stringify(existing));
}
