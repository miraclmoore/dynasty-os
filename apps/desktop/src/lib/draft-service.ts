import { db } from '@dynasty-os/db';
import type { DraftPick } from '@dynasty-os/core-types';
import { generateId } from './uuid';

export async function createDraftPick(
  input: Omit<DraftPick, 'id' | 'createdAt' | 'updatedAt'>
): Promise<DraftPick> {
  const now = Date.now();
  const pick: DraftPick = {
    ...input,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };

  await db.draftPicks.add(pick);
  return pick;
}

export async function getDraftPicksByDynasty(dynastyId: string): Promise<DraftPick[]> {
  const picks = await db.draftPicks.where('dynastyId').equals(dynastyId).toArray();
  return picks.sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    if (a.round !== b.round) return a.round - b.round;
    return (a.pickNumber ?? 999) - (b.pickNumber ?? 999);
  });
}

export async function getDraftPicksBySeason(seasonId: string): Promise<DraftPick[]> {
  const picks = await db.draftPicks.where('seasonId').equals(seasonId).toArray();
  return picks.sort((a, b) => {
    if (a.round !== b.round) return a.round - b.round;
    return (a.pickNumber ?? 999) - (b.pickNumber ?? 999);
  });
}

export async function deleteDraftPick(id: string): Promise<void> {
  await db.draftPicks.delete(id);
}

const POSITION_GROUPS: Record<string, string[]> = {
  QB: ['QB'],
  RB: ['RB', 'FB'],
  'WR/TE': ['WR', 'TE'],
  OL: ['OT', 'OG', 'C', 'OL'],
  DL: ['DE', 'DT', 'DL', 'NT'],
  LB: ['LB', 'ILB', 'OLB', 'MLB'],
  DB: ['CB', 'S', 'FS', 'SS', 'DB'],
  'K/P': ['K', 'P'],
};

export function getPositionBreakdown(picks: DraftPick[]): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const pick of picks) {
    const posUpper = pick.position.toUpperCase();
    let matched = false;

    for (const [group, positions] of Object.entries(POSITION_GROUPS)) {
      if (positions.includes(posUpper)) {
        counts[group] = (counts[group] ?? 0) + 1;
        matched = true;
        break;
      }
    }

    if (!matched) {
      counts['Other'] = (counts['Other'] ?? 0) + 1;
    }
  }

  return counts;
}
