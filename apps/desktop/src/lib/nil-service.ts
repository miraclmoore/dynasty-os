import { db } from '@dynasty-os/db';
import type { NilEntry } from '@dynasty-os/core-types';
import { generateId } from './uuid';

export async function createNilEntry(
  input: Omit<NilEntry, 'id' | 'createdAt' | 'updatedAt'>
): Promise<NilEntry> {
  const now = Date.now();
  const entry: NilEntry = {
    ...input,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  await db.nilEntries.add(entry);
  return entry;
}

export async function getNilEntriesByDynasty(dynastyId: string): Promise<NilEntry[]> {
  return db.nilEntries.where('dynastyId').equals(dynastyId).toArray();
}

export async function getNilEntriesByPlayer(
  dynastyId: string,
  playerId: string
): Promise<NilEntry[]> {
  return db.nilEntries
    .where('[dynastyId+playerId]')
    .equals([dynastyId, playerId])
    .toArray();
}

export async function updateNilEntry(
  id: string,
  updates: Partial<Pick<NilEntry, 'amount' | 'brand' | 'year' | 'durationMonths' | 'notes'>>
): Promise<void> {
  await db.nilEntries.update(id, { ...updates, updatedAt: Date.now() });
}

export async function deleteNilEntry(id: string): Promise<void> {
  await db.nilEntries.delete(id);
}

// Pure aggregation functions (no DB calls):

export function computeNilSpendByPosition(
  entries: NilEntry[],
  players: Map<string, { position: string }>
): { position: string; total: number }[] {
  const spendMap = new Map<string, number>();
  for (const entry of entries) {
    const player = players.get(entry.playerId);
    const pos = player?.position ?? 'Unknown';
    spendMap.set(pos, (spendMap.get(pos) ?? 0) + entry.amount);
  }
  return Array.from(spendMap.entries())
    .map(([position, total]) => ({ position, total }))
    .sort((a, b) => b.total - a.total);
}

export function computeNilSpendByYear(entries: NilEntry[]): { year: number; total: number }[] {
  const spendMap = new Map<number, number>();
  for (const entry of entries) {
    spendMap.set(entry.year, (spendMap.get(entry.year) ?? 0) + entry.amount);
  }
  return Array.from(spendMap.entries())
    .map(([year, total]) => ({ year, total }))
    .sort((a, b) => a.year - b.year);
}
