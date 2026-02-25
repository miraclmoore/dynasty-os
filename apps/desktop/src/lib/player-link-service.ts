import { db } from '@dynasty-os/db';
import type { PlayerLink } from '@dynasty-os/core-types';
import { generateId } from './uuid';

export async function createPlayerLink(
  input: Omit<PlayerLink, 'id' | 'createdAt' | 'updatedAt'>
): Promise<PlayerLink> {
  const now = Date.now();
  const link: PlayerLink = {
    ...input,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  await db.playerLinks.add(link);
  return link;
}

export async function getPlayerLinkByPlayer(
  dynastyId: string,
  playerId: string
): Promise<PlayerLink | undefined> {
  return db.playerLinks
    .where('[dynastyId+playerId]')
    .equals([dynastyId, playerId])
    .first();
}

export async function deletePlayerLink(id: string): Promise<void> {
  await db.playerLinks.delete(id);
}
