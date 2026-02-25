import { db } from '@dynasty-os/db';
import type { CoachingStaff } from '@dynasty-os/core-types';
import { generateId } from './uuid';

export async function createCoach(
  input: Omit<CoachingStaff, 'id' | 'createdAt' | 'updatedAt'>
): Promise<CoachingStaff> {
  const now = Date.now();
  const coach: CoachingStaff = {
    ...input,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  await db.coachingStaff.add(coach);
  return coach;
}

export async function getCoachingStaffByDynasty(dynastyId: string): Promise<CoachingStaff[]> {
  const staff = await db.coachingStaff.where('dynastyId').equals(dynastyId).toArray();
  // Active staff (no fireYear) first, then fired sorted by fireYear desc
  const active = staff.filter((c) => c.fireYear == null);
  const fired = staff
    .filter((c) => c.fireYear != null)
    .sort((a, b) => (b.fireYear ?? 0) - (a.fireYear ?? 0));
  return [...active, ...fired];
}

export async function fireCoach(id: string, fireYear: number): Promise<void> {
  await db.coachingStaff.update(id, { fireYear, updatedAt: Date.now() });
}

export async function updateCoach(
  id: string,
  updates: Partial<Pick<CoachingStaff, 'role' | 'schemeNotes' | 'hireYear'>>
): Promise<void> {
  await db.coachingStaff.update(id, { ...updates, updatedAt: Date.now() });
}

export async function deleteCoach(id: string): Promise<void> {
  await db.coachingStaff.delete(id);
}
