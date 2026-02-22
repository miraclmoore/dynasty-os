import { create } from 'zustand';
import type { DraftPick } from '@dynasty-os/core-types';
import {
  createDraftPick,
  getDraftPicksByDynasty,
  deleteDraftPick,
} from '../lib/draft-service';

interface DraftState {
  picks: DraftPick[];
  loading: boolean;
}

interface DraftActions {
  loadPicks: (dynastyId: string) => Promise<void>;
  addPick: (
    input: Omit<DraftPick, 'id' | 'createdAt' | 'updatedAt'>,
    dynastyId: string
  ) => Promise<void>;
  removePick: (id: string, dynastyId: string) => Promise<void>;
}

type DraftStore = DraftState & DraftActions;

export const useDraftStore = create<DraftStore>((set) => ({
  picks: [],
  loading: false,

  loadPicks: async (dynastyId: string) => {
    set({ loading: true });
    try {
      const picks = await getDraftPicksByDynasty(dynastyId);
      set({ picks, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  addPick: async (input: Omit<DraftPick, 'id' | 'createdAt' | 'updatedAt'>, dynastyId: string) => {
    set({ loading: true });
    try {
      await createDraftPick(input);
      const picks = await getDraftPicksByDynasty(dynastyId);
      set({ picks, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  removePick: async (id: string, dynastyId: string) => {
    set({ loading: true });
    try {
      await deleteDraftPick(id);
      const picks = await getDraftPicksByDynasty(dynastyId);
      set({ picks, loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));
