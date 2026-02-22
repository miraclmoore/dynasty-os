import { create } from 'zustand';
import type { ScoutingNote } from '@dynasty-os/core-types';
import {
  getScoutingNotesByDynasty,
  upsertScoutingNote,
  deleteScoutingNote,
} from '../lib/scouting-service';

interface ScoutingState {
  notes: ScoutingNote[];
  loading: boolean;
}

interface ScoutingActions {
  loadNotes: (dynastyId: string) => Promise<void>;
  saveNote: (dynastyId: string, opponent: string, tendencies: string) => Promise<void>;
  removeNote: (id: string, dynastyId: string) => Promise<void>;
}

type ScoutingStore = ScoutingState & ScoutingActions;

export const useScoutingStore = create<ScoutingStore>((set) => ({
  notes: [],
  loading: false,

  loadNotes: async (dynastyId: string) => {
    set({ loading: true });
    const notes = await getScoutingNotesByDynasty(dynastyId);
    set({ notes, loading: false });
  },

  saveNote: async (dynastyId: string, opponent: string, tendencies: string) => {
    await upsertScoutingNote(dynastyId, opponent, tendencies);
    const notes = await getScoutingNotesByDynasty(dynastyId);
    set({ notes });
  },

  removeNote: async (id: string, dynastyId: string) => {
    await deleteScoutingNote(id);
    const notes = await getScoutingNotesByDynasty(dynastyId);
    set({ notes });
  },
}));
