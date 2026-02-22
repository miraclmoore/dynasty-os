import { db } from '@dynasty-os/db';
import type { Player } from '@dynasty-os/core-types';
import { generateId } from './uuid';

export async function createPlayer(
  input: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Player> {
  const now = Date.now();
  const player: Player = {
    ...input,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };

  await db.players.add(player);
  return player;
}

export async function getPlayersByDynasty(dynastyId: string): Promise<Player[]> {
  const players = await db.players.where('dynastyId').equals(dynastyId).toArray();
  return players.sort((a, b) => a.lastName.localeCompare(b.lastName));
}

export async function getPlayer(id: string): Promise<Player | undefined> {
  return db.players.get(id);
}

export async function updatePlayer(
  id: string,
  updates: Partial<Omit<Player, 'id' | 'dynastyId' | 'createdAt'>>
): Promise<void> {
  await db.players.update(id, { ...updates, updatedAt: Date.now() });
}

export async function deletePlayer(id: string): Promise<void> {
  // Cascade delete all playerSeasons for this player
  await db.playerSeasons.where('playerId').equals(id).delete();
  await db.players.delete(id);
}
