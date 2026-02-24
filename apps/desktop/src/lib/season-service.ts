import { db } from '@dynasty-os/db';
import type { Season } from '@dynasty-os/core-types';
import { generateId } from './uuid';
import { evaluateAchievements } from './achievement-service';

export async function createSeason(input: { dynastyId: string; year: number }): Promise<Season> {
  const now = Date.now();
  const season: Season = {
    id: generateId(),
    dynastyId: input.dynastyId,
    year: input.year,
    wins: 0,
    losses: 0,
    confWins: 0,
    confLosses: 0,
    createdAt: now,
    updatedAt: now,
  };

  await db.seasons.add(season);
  return season;
}

export async function getSeasonsByDynasty(dynastyId: string): Promise<Season[]> {
  const seasons = await db.seasons.where('dynastyId').equals(dynastyId).toArray();
  return seasons.sort((a, b) => b.year - a.year);
}

export async function getSeason(id: string): Promise<Season | undefined> {
  return db.seasons.get(id);
}

export async function getCurrentSeason(dynastyId: string): Promise<Season | undefined> {
  const seasons = await getSeasonsByDynasty(dynastyId);
  if (seasons.length === 0) return undefined;
  // getSeasonsByDynasty returns sorted descending by year, so first is highest
  return seasons[0];
}

export async function updateSeason(
  id: string,
  updates: Partial<Omit<Season, 'id' | 'dynastyId' | 'createdAt'>>
): Promise<void> {
  await db.seasons.update(id, { ...updates, updatedAt: Date.now() });
  // Evaluate achievements after season data changes (bowl results, playoff results)
  // Need dynastyId — fetch from the stored season record
  const updated = await db.seasons.get(id);
  if (updated) {
    evaluateAchievements(updated.dynastyId).catch(() => {});
  }
}
