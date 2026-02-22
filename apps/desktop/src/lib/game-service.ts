import { db } from '@dynasty-os/db';
import type { Game } from '@dynasty-os/core-types';
import { generateId } from './uuid';
import { updateSeason } from './season-service';

export async function createGame(input: Omit<Game, 'id' | 'createdAt' | 'updatedAt'>): Promise<Game> {
  const now = Date.now();
  const game: Game = {
    ...input,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };

  await db.games.add(game);
  await recalculateSeasonRecord(input.seasonId);
  return game;
}

export async function getGamesBySeason(seasonId: string): Promise<Game[]> {
  const games = await db.games.where('seasonId').equals(seasonId).toArray();
  return games.sort((a, b) => a.week - b.week);
}

export async function getRecentGames(dynastyId: string, limit: number): Promise<Game[]> {
  const games = await db.games.where('dynastyId').equals(dynastyId).toArray();
  return games.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
}

export async function updateGame(
  id: string,
  updates: Partial<Omit<Game, 'id' | 'seasonId' | 'dynastyId' | 'createdAt'>>
): Promise<void> {
  await db.games.update(id, { ...updates, updatedAt: Date.now() });
  const game = await db.games.get(id);
  if (game) {
    await recalculateSeasonRecord(game.seasonId);
  }
}

export async function deleteGame(id: string): Promise<void> {
  const game = await db.games.get(id);
  await db.games.delete(id);
  if (game) {
    await recalculateSeasonRecord(game.seasonId);
  }
}

export async function recalculateSeasonRecord(seasonId: string): Promise<void> {
  const games = await getGamesBySeason(seasonId);

  const wins = games.filter((g) => g.result === 'W').length;
  const losses = games.filter((g) => g.result === 'L').length;

  const confGames = games.filter((g) => g.gameType === 'conference');
  const confWins = confGames.filter((g) => g.result === 'W').length;
  const confLosses = confGames.filter((g) => g.result === 'L').length;

  await updateSeason(seasonId, { wins, losses, confWins, confLosses });
}
