import { db } from '@dynasty-os/db';
import type { PlayerSeason } from '@dynasty-os/core-types';
import { generateId } from './uuid';

export async function createPlayerSeason(
  input: Omit<PlayerSeason, 'id' | 'createdAt' | 'updatedAt'>
): Promise<PlayerSeason> {
  const now = Date.now();
  const playerSeason: PlayerSeason = {
    ...input,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };

  await db.playerSeasons.add(playerSeason);
  return playerSeason;
}

export async function getPlayerSeasonsByPlayer(playerId: string): Promise<PlayerSeason[]> {
  const seasons = await db.playerSeasons.where('playerId').equals(playerId).toArray();
  return seasons.sort((a, b) => a.year - b.year);
}

export async function getPlayerSeasonsByDynasty(dynastyId: string): Promise<PlayerSeason[]> {
  return db.playerSeasons.where('dynastyId').equals(dynastyId).toArray();
}

export async function getPlayerSeasonsBySeason(seasonId: string): Promise<PlayerSeason[]> {
  return db.playerSeasons.where('seasonId').equals(seasonId).toArray();
}

export async function updatePlayerSeason(
  id: string,
  updates: Partial<Omit<PlayerSeason, 'id' | 'playerId' | 'dynastyId' | 'createdAt'>>
): Promise<void> {
  await db.playerSeasons.update(id, { ...updates, updatedAt: Date.now() });
}

export async function deletePlayerSeason(id: string): Promise<void> {
  await db.playerSeasons.delete(id);
}
