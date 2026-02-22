import type { PlayerSeason } from '@dynasty-os/core-types';

// Stats that should be averaged (weighted by gamesPlayed) rather than summed
const AVERAGED_STATS = new Set(['passerRating', 'puntAverage', 'sacks']);

/**
 * Computes aggregated career stats from all player seasons.
 * Integer stats are summed. Decimal/average stats (passerRating, puntAverage, sacks)
 * are weighted-averaged by gamesPlayed when available, otherwise simple-averaged
 * across seasons that have the stat.
 */
export function computeCareerStats(seasons: PlayerSeason[]): Record<string, number> {
  if (seasons.length === 0) return {};

  // Collect all stat keys that appear across all seasons
  const allKeys = new Set<string>();
  for (const season of seasons) {
    for (const key of Object.keys(season.stats)) {
      allKeys.add(key);
    }
  }

  const result: Record<string, number> = {};

  for (const key of allKeys) {
    if (AVERAGED_STATS.has(key)) {
      // Weighted average by gamesPlayed, or simple average if no gamesPlayed data
      const relevantSeasons = seasons.filter((s) => (s.stats[key] ?? 0) !== 0 || key in s.stats);
      const seasonsWithStat = seasons.filter((s) => key in s.stats && s.stats[key] !== 0);

      if (seasonsWithStat.length === 0) {
        result[key] = 0;
        continue;
      }

      const hasGamesPlayed = seasonsWithStat.some((s) => (s.stats['gamesPlayed'] ?? 0) > 0);

      if (hasGamesPlayed) {
        // Weighted average by gamesPlayed
        let totalWeight = 0;
        let weightedSum = 0;
        for (const season of seasonsWithStat) {
          const games = season.stats['gamesPlayed'] ?? 0;
          const statVal = season.stats[key] ?? 0;
          if (games > 0) {
            weightedSum += statVal * games;
            totalWeight += games;
          } else {
            // Season has stat but no gamesPlayed — count as weight 1
            weightedSum += statVal;
            totalWeight += 1;
          }
        }
        result[key] = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : 0;
      } else {
        // Simple average across seasons that have the stat
        const sum = seasonsWithStat.reduce((acc, s) => acc + (s.stats[key] ?? 0), 0);
        result[key] = Math.round((sum / seasonsWithStat.length) * 10) / 10;
      }
    } else {
      // Sum integer stats across all seasons
      const total = seasons.reduce((acc, s) => acc + (s.stats[key] ?? 0), 0);
      result[key] = total;
    }
  }

  return result;
}

/**
 * Flattens, deduplicates, and sorts all awards from all seasons.
 */
export function computeCareerAwards(seasons: PlayerSeason[]): string[] {
  const allAwards = new Set<string>();
  for (const season of seasons) {
    if (season.awards) {
      for (const award of season.awards) {
        allAwards.add(award.trim());
      }
    }
  }
  return Array.from(allAwards).sort();
}

/**
 * Returns the number of distinct years with logged stats.
 */
export function computeSeasonCount(seasons: PlayerSeason[]): number {
  const distinctYears = new Set(seasons.map((s) => s.year));
  return distinctYears.size;
}
