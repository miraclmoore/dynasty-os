import { db } from '@dynasty-os/db';
import type { ScoutingNote } from '@dynasty-os/core-types';
import { generateId } from './uuid';

/**
 * Returns all scouting notes for a dynasty, sorted by opponent ascending.
 */
export async function getScoutingNotesByDynasty(dynastyId: string): Promise<ScoutingNote[]> {
  const notes = await db.scoutingNotes.where('dynastyId').equals(dynastyId).toArray();
  return notes.sort((a, b) => a.opponent.localeCompare(b.opponent));
}

/**
 * Returns the scouting note for a specific opponent in a dynasty, or null if none exists.
 */
export async function getScoutingNoteForOpponent(
  dynastyId: string,
  opponent: string
): Promise<ScoutingNote | null> {
  const note = await db.scoutingNotes
    .where('[dynastyId+opponent]')
    .equals([dynastyId, opponent])
    .first();
  return note ?? null;
}

/**
 * Creates or updates the scouting note for an opponent in a dynasty.
 * One note per opponent per dynasty (upsert pattern).
 */
export async function upsertScoutingNote(
  dynastyId: string,
  opponent: string,
  tendencies: string
): Promise<ScoutingNote> {
  const existing = await getScoutingNoteForOpponent(dynastyId, opponent);
  const now = Date.now();

  if (existing) {
    const updated: ScoutingNote = { ...existing, tendencies, updatedAt: now };
    await db.scoutingNotes.update(existing.id, { tendencies, updatedAt: now });
    return updated;
  }

  const newNote: ScoutingNote = {
    id: generateId(),
    dynastyId,
    opponent,
    tendencies,
    createdAt: now,
    updatedAt: now,
  };
  await db.scoutingNotes.add(newNote);
  return newNote;
}

/**
 * Deletes a scouting note by id.
 */
export async function deleteScoutingNote(id: string): Promise<void> {
  await db.scoutingNotes.delete(id);
}
