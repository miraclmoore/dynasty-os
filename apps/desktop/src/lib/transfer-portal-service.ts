import { db } from '@dynasty-os/db';
import type { TransferPortalEntry } from '@dynasty-os/core-types';
import { generateId } from './uuid';

export async function createTransferPortalEntry(
  input: Omit<TransferPortalEntry, 'id' | 'createdAt' | 'updatedAt'>
): Promise<TransferPortalEntry> {
  const now = Date.now();
  const entry: TransferPortalEntry = {
    ...input,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };

  await db.transferPortalEntries.add(entry);
  return entry;
}

export async function getTransferPortalEntriesBySeason(
  seasonId: string
): Promise<TransferPortalEntry[]> {
  return db.transferPortalEntries.where('seasonId').equals(seasonId).toArray();
}

export async function getTransferPortalEntriesByDynasty(
  dynastyId: string
): Promise<TransferPortalEntry[]> {
  return db.transferPortalEntries.where('dynastyId').equals(dynastyId).toArray();
}

export async function deleteTransferPortalEntry(id: string): Promise<void> {
  await db.transferPortalEntries.delete(id);
}

export interface NetImpactResult {
  arrivals: TransferPortalEntry[];
  departures: TransferPortalEntry[];
  arrivalStars: number;
  departureCount: number;
  netImpactScore: number;
  netImpactLabel: string;
}

export function calculateNetImpact(entries: TransferPortalEntry[]): NetImpactResult {
  const arrivals = entries.filter((e) => e.type === 'arrival');
  const departures = entries.filter((e) => e.type === 'departure');

  const arrivalStars = arrivals.reduce((sum, e) => sum + (e.stars ?? 0), 0);
  const departureCount = departures.length;
  const netImpactScore = arrivalStars - departureCount * 2.5;

  let netImpactLabel: string;
  if (netImpactScore > 5) {
    netImpactLabel = 'Strong Gain';
  } else if (netImpactScore > 0) {
    netImpactLabel = 'Net Positive';
  } else if (netImpactScore === 0) {
    netImpactLabel = 'Even';
  } else if (netImpactScore > -5) {
    netImpactLabel = 'Net Negative';
  } else {
    netImpactLabel = 'Significant Loss';
  }

  return {
    arrivals,
    departures,
    arrivalStars,
    departureCount,
    netImpactScore,
    netImpactLabel,
  };
}
