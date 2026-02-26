import { db } from '@dynasty-os/db';
import type { Dynasty, SportType } from '@dynasty-os/core-types';
import { generateId } from './uuid';

export interface CreateDynastyInput {
  sport: SportType;
  teamName: string;
  coachName: string;
  startYear: number;
  gameVersion: string;
  name?: string;
}

export async function createDynasty(input: CreateDynastyInput): Promise<Dynasty> {
  const now = Date.now();
  const dynasty: Dynasty = {
    id: generateId(),
    name: input.name ?? `${input.teamName} Dynasty`,
    sport: input.sport,
    teamName: input.teamName,
    coachName: input.coachName,
    startYear: input.startYear,
    currentYear: input.startYear,
    gameVersion: input.gameVersion,
    createdAt: now,
    updatedAt: now,
  };

  await db.dynasties.add(dynasty);
  return dynasty;
}

export async function getDynasties(): Promise<Dynasty[]> {
  const all = await db.dynasties.toArray();
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getDynasty(id: string): Promise<Dynasty | undefined> {
  return db.dynasties.get(id);
}

export async function updateDynasty(
  id: string,
  updates: Partial<Omit<Dynasty, 'id' | 'createdAt'>>
): Promise<void> {
  await db.dynasties.update(id, { ...updates, updatedAt: Date.now() });
}

export async function deleteDynasty(id: string): Promise<void> {
  await db.transaction('rw', [
    db.dynasties, db.seasons, db.games, db.players, db.playerSeasons,
    db.recruitingClasses, db.recruits, db.transferPortalEntries,
    db.draftPicks, db.prestigeRatings, db.rivals, db.scoutingNotes,
    db.achievements, db.coachingStaff, db.nilEntries, db.futureGames,
    db.playerLinks, db.aiCache,
  ], async () => {
    // Get all seasons for this dynasty
    const seasons = await db.seasons.where('dynastyId').equals(id).toArray();
    const seasonIds = seasons.map((s) => s.id);

    // Get all players for this dynasty
    const players = await db.players.where('dynastyId').equals(id).toArray();
    const playerIds = players.map((p) => p.id);

    // Delete playerSeasons
    if (playerIds.length > 0) {
      await db.playerSeasons.where('playerId').anyOf(playerIds).delete();
    }
    // Also delete by dynastyId to catch any orphans
    await db.playerSeasons.where('dynastyId').equals(id).delete();

    // Delete games for each season
    if (seasonIds.length > 0) {
      await db.games.where('seasonId').anyOf(seasonIds).delete();
    }
    // Also delete by dynastyId
    await db.games.where('dynastyId').equals(id).delete();

    // Delete child tables by dynastyId
    await db.recruits.where('dynastyId').equals(id).delete();
    await db.recruitingClasses.where('dynastyId').equals(id).delete();
    await db.transferPortalEntries.where('dynastyId').equals(id).delete();
    await db.draftPicks.where('dynastyId').equals(id).delete();
    await db.prestigeRatings.where('dynastyId').equals(id).delete();
    await db.rivals.where('dynastyId').equals(id).delete();
    await db.scoutingNotes.where('dynastyId').equals(id).delete();
    await db.achievements.where('dynastyId').equals(id).delete();
    await db.coachingStaff.where('dynastyId').equals(id).delete();
    await db.nilEntries.where('dynastyId').equals(id).delete();
    await db.futureGames.where('dynastyId').equals(id).delete();
    await db.playerLinks.where('dynastyId').equals(id).delete();
    await db.aiCache.where('dynastyId').equals(id).delete();

    // Delete seasons
    await db.seasons.where('dynastyId').equals(id).delete();

    // Delete players
    await db.players.where('dynastyId').equals(id).delete();

    // Delete the dynasty itself
    await db.dynasties.delete(id);
  });
}
