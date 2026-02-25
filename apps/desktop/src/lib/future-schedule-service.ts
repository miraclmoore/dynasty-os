import { db } from '@dynasty-os/db';
import type { FutureGame } from '@dynasty-os/core-types';
import { generateId } from './uuid';

export async function createFutureGame(
  input: Omit<FutureGame, 'id' | 'createdAt' | 'updatedAt'>
): Promise<FutureGame> {
  const now = Date.now();
  const game: FutureGame = {
    ...input,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  await db.futureGames.add(game);
  return game;
}

export async function getFutureGamesByDynasty(dynastyId: string): Promise<FutureGame[]> {
  const games = await db.futureGames.where('dynastyId').equals(dynastyId).toArray();
  // Sort by year ascending, then opponent ascending
  return games.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.opponent.localeCompare(b.opponent);
  });
}

export async function updateFutureGame(
  id: string,
  updates: Partial<Pick<FutureGame, 'opponent' | 'year' | 'gameType' | 'isHome' | 'week' | 'notes'>>
): Promise<void> {
  await db.futureGames.update(id, { ...updates, updatedAt: Date.now() });
}

export async function deleteFutureGame(id: string): Promise<void> {
  await db.futureGames.delete(id);
}

/**
 * Bowl eligibility projection for CFB dynasties.
 * Eligible if currentWins >= 6 from regular season games.
 * regularGamesRemaining = games where gameType is not 'bowl' or 'playoff'
 */
export function projectBowlEligibility(
  futureGames: FutureGame[],
  currentWins: number
): { eligible: boolean; winsNeeded: number; regularGamesRemaining: number } {
  const regularGamesRemaining = futureGames.filter(
    (g) => g.gameType !== 'bowl' && g.gameType !== 'playoff'
  ).length;
  const winsNeeded = Math.max(0, 6 - currentWins);
  const eligible = currentWins >= 6;
  return { eligible, winsNeeded, regularGamesRemaining };
}
