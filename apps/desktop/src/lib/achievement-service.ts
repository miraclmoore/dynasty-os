import { db } from '@dynasty-os/db';
import { MILESTONE_DEFINITIONS } from '@dynasty-os/core-types';
import type { Achievement } from '@dynasty-os/core-types';

/**
 * evaluateAchievements: idempotent — queries current dynasty data, checks each
 * MILESTONE_DEFINITION condition, writes newly-unlocked achievements to DB.
 * Safe to call after any data save event (game logged, season ended, etc.).
 */
export async function evaluateAchievements(dynastyId: string): Promise<void> {
  // Load already-unlocked achievement IDs for this dynasty
  const existing = await db.achievements
    .where('dynastyId').equals(dynastyId)
    .toArray();
  const unlockedIds = new Set(existing.map((a) => a.achievementId));

  // Compute current stats
  const totalWins = await computeTotalWins(dynastyId);
  const totalBowlWins = await computeTotalBowlWins(dynastyId);
  const totalChampionships = await computeTotalChampionships(dynastyId);

  const now = Date.now();

  for (const def of MILESTONE_DEFINITIONS) {
    if (unlockedIds.has(def.achievementId)) continue; // already unlocked

    let currentValue: number;
    if (def.category === 'wins') currentValue = totalWins;
    else if (def.category === 'bowl-wins') currentValue = totalBowlWins;
    else currentValue = totalChampionships;

    if (currentValue >= def.threshold) {
      const achievement: Achievement = {
        id: `${dynastyId}-${def.achievementId}`,
        dynastyId,
        achievementId: def.achievementId,
        category: def.category as Achievement['category'],
        label: def.label,
        description: def.description,
        threshold: def.threshold,
        unlockedAt: now,
      };
      await db.achievements.put(achievement);
    }
  }
}

export async function getAchievementsByDynasty(dynastyId: string): Promise<Achievement[]> {
  return db.achievements.where('dynastyId').equals(dynastyId).toArray();
}

// ------- Private helpers -------

async function computeTotalWins(dynastyId: string): Promise<number> {
  const games = await db.games.where('dynastyId').equals(dynastyId).toArray();
  return games.filter((g) => g.result === 'W').length;
}

async function computeTotalBowlWins(dynastyId: string): Promise<number> {
  // Bowl wins: seasons where bowlResult === 'W' and a bowlGame was played.
  // Season.bowlResult is typed as 'W' | 'L' | undefined.
  const seasons = await db.seasons.where('dynastyId').equals(dynastyId).toArray();
  return seasons.filter((s) => s.bowlGame && s.bowlResult === 'W').length;
}

async function computeTotalChampionships(dynastyId: string): Promise<number> {
  // Championships: seasons where playoffResult contains "champion" (case-insensitive).
  // Season.playoffResult is a free-text string (e.g. "CFP Champion", "National Champion").
  // We check for the word "champion" to cover all common championship notations.
  const seasons = await db.seasons.where('dynastyId').equals(dynastyId).toArray();
  return seasons.filter(
    (s) => s.playoffResult && s.playoffResult.toLowerCase().includes('champion')
  ).length;
}
