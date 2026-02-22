import { db } from '@dynasty-os/db';
import type { Season } from '@dynasty-os/core-types';

// Stats that should be averaged (weighted by gamesPlayed) rather than summed
// Must stay in sync with career-stats.ts AVERAGED_STATS
const AVERAGED_STATS = new Set(['passerRating', 'puntAverage', 'sacks']);

export interface LeaderboardEntry {
  playerId: string;
  playerName: string; // "firstName lastName"
  position: string;
  value: number;
  year?: number;      // for single-season: which year
  seasonId?: string;  // for single-season: which season
}

export interface HeadToHeadRecord {
  opponent: string;
  wins: number;
  losses: number;
  ties: number;
  totalGames: number;
  winPct: number;
  currentStreak: { type: 'W' | 'L' | 'T'; count: number };
  games: Array<{ year: number; week: number; result: string; score: string }>;
}

/**
 * Returns the top N players by a given stat key for a single season (or all seasons if no seasonId).
 */
export async function getSingleSeasonLeaders(
  dynastyId: string,
  statKey: string,
  limit: number = 10,
  seasonId?: string
): Promise<LeaderboardEntry[]> {
  // Query playerSeasons
  let playerSeasons;
  if (seasonId) {
    playerSeasons = await db.playerSeasons
      .where('seasonId')
      .equals(seasonId)
      .toArray();
  } else {
    playerSeasons = await db.playerSeasons
      .where('dynastyId')
      .equals(dynastyId)
      .toArray();
  }

  // Build entries for those with a non-zero stat value
  const entries: LeaderboardEntry[] = [];

  for (const ps of playerSeasons) {
    const value = ps.stats[statKey];
    if (value === undefined || value === 0) continue;

    // Fetch player for name/position
    const player = await db.players.get(ps.playerId);
    if (!player) continue;

    entries.push({
      playerId: ps.playerId,
      playerName: `${player.firstName} ${player.lastName}`,
      position: player.position,
      value,
      year: ps.year,
      seasonId: ps.seasonId,
    });
  }

  // Sort descending by value, take top N
  entries.sort((a, b) => b.value - a.value);
  return entries.slice(0, limit);
}

/**
 * Returns the top N players by career-aggregated stat.
 * Integer stats are summed. Decimal stats (passerRating, puntAverage, sacks)
 * are weighted-averaged by gamesPlayed — same logic as computeCareerStats in career-stats.ts.
 */
export async function getCareerLeaders(
  dynastyId: string,
  statKey: string,
  limit: number = 10
): Promise<LeaderboardEntry[]> {
  // Fetch all playerSeasons for dynasty
  const allPlayerSeasons = await db.playerSeasons
    .where('dynastyId')
    .equals(dynastyId)
    .toArray();

  // Group by playerId
  const byPlayer = new Map<string, typeof allPlayerSeasons>();
  for (const ps of allPlayerSeasons) {
    const existing = byPlayer.get(ps.playerId) ?? [];
    existing.push(ps);
    byPlayer.set(ps.playerId, existing);
  }

  const entries: LeaderboardEntry[] = [];

  for (const [playerId, seasons] of byPlayer) {
    let careerValue: number;

    if (AVERAGED_STATS.has(statKey)) {
      // Weighted average by gamesPlayed
      const seasonsWithStat = seasons.filter(
        (s) => statKey in s.stats && s.stats[statKey] !== 0
      );
      if (seasonsWithStat.length === 0) continue;

      const hasGamesPlayed = seasonsWithStat.some((s) => (s.stats['gamesPlayed'] ?? 0) > 0);

      if (hasGamesPlayed) {
        let totalWeight = 0;
        let weightedSum = 0;
        for (const season of seasonsWithStat) {
          const games = season.stats['gamesPlayed'] ?? 0;
          const statVal = season.stats[statKey] ?? 0;
          if (games > 0) {
            weightedSum += statVal * games;
            totalWeight += games;
          } else {
            weightedSum += statVal;
            totalWeight += 1;
          }
        }
        careerValue = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : 0;
      } else {
        // Simple average
        const sum = seasonsWithStat.reduce((acc, s) => acc + (s.stats[statKey] ?? 0), 0);
        careerValue = Math.round((sum / seasonsWithStat.length) * 10) / 10;
      }
    } else {
      // Sum integer stats across all seasons
      careerValue = seasons.reduce((acc, s) => acc + (s.stats[statKey] ?? 0), 0);
      if (careerValue === 0) continue;
    }

    const player = await db.players.get(playerId);
    if (!player) continue;

    entries.push({
      playerId,
      playerName: `${player.firstName} ${player.lastName}`,
      position: player.position,
      value: careerValue,
    });
  }

  // Sort descending by career value, take top N
  entries.sort((a, b) => b.value - a.value);
  return entries.slice(0, limit);
}

/**
 * Returns head-to-head records against every opponent, optionally filtered by year range.
 * Opponents are sorted by total games (most-played first).
 */
export async function getHeadToHeadRecords(
  dynastyId: string,
  options?: { startYear?: number; endYear?: number }
): Promise<HeadToHeadRecord[]> {
  // Load all seasons for dynasty → Map<seasonId, year>
  const allSeasons: Season[] = await db.seasons.where('dynastyId').equals(dynastyId).toArray();
  const seasonYearMap = new Map<string, number>();
  for (const season of allSeasons) {
    seasonYearMap.set(season.id, season.year);
  }

  // Filter seasons by year range if provided
  let validSeasonIds: Set<string> | null = null;
  if (options?.startYear !== undefined || options?.endYear !== undefined) {
    validSeasonIds = new Set<string>();
    for (const season of allSeasons) {
      const inRange =
        (options.startYear === undefined || season.year >= options.startYear) &&
        (options.endYear === undefined || season.year <= options.endYear);
      if (inRange) {
        validSeasonIds.add(season.id);
      }
    }
  }

  // Fetch all games for dynasty
  const allGames = await db.games.where('dynastyId').equals(dynastyId).toArray();

  // Filter by season year range if specified
  const filteredGames = validSeasonIds
    ? allGames.filter((g) => validSeasonIds!.has(g.seasonId))
    : allGames;

  // Group games by opponent
  const byOpponent = new Map<
    string,
    Array<{ year: number; week: number; result: 'W' | 'L' | 'T'; teamScore: number; opponentScore: number }>
  >();

  for (const game of filteredGames) {
    const year = seasonYearMap.get(game.seasonId) ?? 0;
    const opponent = game.opponent;

    const existing = byOpponent.get(opponent) ?? [];
    existing.push({
      year,
      week: game.week,
      result: game.result,
      teamScore: game.teamScore,
      opponentScore: game.opponentScore,
    });
    byOpponent.set(opponent, existing);
  }

  const records: HeadToHeadRecord[] = [];

  for (const [opponent, games] of byOpponent) {
    let wins = 0;
    let losses = 0;
    let ties = 0;

    for (const g of games) {
      if (g.result === 'W') wins++;
      else if (g.result === 'L') losses++;
      else ties++;
    }

    const totalGames = games.length;
    const winPct = totalGames > 0 ? Math.round((wins / totalGames) * 1000) / 10 : 0;

    // Current streak: sort by year+week descending, count consecutive same result from top
    const sortedGames = [...games].sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return b.week - a.week;
    });

    let streakType: 'W' | 'L' | 'T' = sortedGames[0].result;
    let streakCount = 0;
    for (const g of sortedGames) {
      if (g.result === streakType) streakCount++;
      else break;
    }

    // Build games array (year, week, result, score)
    const gamesArr = sortedGames.map((g) => ({
      year: g.year,
      week: g.week,
      result: g.result,
      score: `${g.teamScore}-${g.opponentScore}`,
    }));

    records.push({
      opponent,
      wins,
      losses,
      ties,
      totalGames,
      winPct,
      currentStreak: { type: streakType, count: streakCount },
      games: gamesArr,
    });
  }

  // Sort by totalGames descending
  records.sort((a, b) => b.totalGames - a.totalGames);

  return records;
}
