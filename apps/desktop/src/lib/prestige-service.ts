import { db } from '@dynasty-os/db';
import type { PrestigeRating } from '@dynasty-os/core-types';
import { generateId } from './uuid';

export async function createPrestigeRating(
  input: Omit<PrestigeRating, 'id' | 'createdAt' | 'updatedAt'>
): Promise<PrestigeRating> {
  const now = Date.now();
  const rating: PrestigeRating = {
    ...input,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  await db.prestigeRatings.add(rating);
  return rating;
}

export async function getPrestigeRatingsByDynasty(dynastyId: string): Promise<PrestigeRating[]> {
  const ratings = await db.prestigeRatings.where('dynastyId').equals(dynastyId).toArray();
  return ratings.sort((a, b) => a.year - b.year);
}

export async function updatePrestigeRating(
  id: string,
  updates: Partial<Omit<PrestigeRating, 'id' | 'dynastyId' | 'createdAt'>>
): Promise<void> {
  await db.prestigeRatings.update(id, { ...updates, updatedAt: Date.now() });
}

export async function deletePrestigeRating(id: string): Promise<void> {
  await db.prestigeRatings.delete(id);
}

export function calculatePrestigeTrend(ratings: PrestigeRating[]): {
  trend: 'up' | 'down' | 'stable';
  currentRating: number | null;
  priorAvg: number | null;
} {
  const sorted = [...ratings].sort((a, b) => a.year - b.year);

  if (sorted.length < 2) {
    return {
      trend: 'stable',
      currentRating: sorted[sorted.length - 1]?.rating ?? null,
      priorAvg: null,
    };
  }

  const currentRating = sorted[sorted.length - 1].rating;
  // Up to 3 ratings before the last one
  const priorRatings = sorted.slice(Math.max(0, sorted.length - 4), sorted.length - 1);
  const priorAvg = priorRatings.reduce((sum, r) => sum + r.rating, 0) / priorRatings.length;

  const delta = currentRating - priorAvg;

  let trend: 'up' | 'down' | 'stable';
  if (delta > 5) {
    trend = 'up';
  } else if (delta < -5) {
    trend = 'down';
  } else {
    trend = 'stable';
  }

  return { trend, currentRating, priorAvg };
}
