import { create } from 'zustand';
import type { Rival } from '@dynasty-os/core-types';
import {
  createRival,
  getRivalsByDynasty,
  updateRival,
  deleteRival,
} from '../lib/rivalry-service';

interface RivalryState {
  rivals: Rival[];
  loading: boolean;
}

interface RivalryActions {
  loadRivals: (dynastyId: string) => Promise<void>;
  addRival: (
    input: Omit<Rival, 'id' | 'createdAt' | 'updatedAt'>,
    dynastyId: string
  ) => Promise<void>;
  editRival: (
    id: string,
    updates: Partial<Pick<Rival, 'label' | 'opponent'>>,
    dynastyId: string
  ) => Promise<void>;
  removeRival: (id: string, dynastyId: string) => Promise<void>;
}

type RivalryStore = RivalryState & RivalryActions;

export const useRivalryStore = create<RivalryStore>((set) => ({
  rivals: [],
  loading: false,

  loadRivals: async (dynastyId: string) => {
    set({ loading: true });
    try {
      const rivals = await getRivalsByDynasty(dynastyId);
      set({ rivals, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  addRival: async (input, dynastyId) => {
    set({ loading: true });
    try {
      await createRival(input);
      const rivals = await getRivalsByDynasty(dynastyId);
      set({ rivals, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  editRival: async (id, updates, dynastyId) => {
    set({ loading: true });
    try {
      await updateRival(id, updates);
      const rivals = await getRivalsByDynasty(dynastyId);
      set({ rivals, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  removeRival: async (id, dynastyId) => {
    set({ loading: true });
    try {
      await deleteRival(id);
      const rivals = await getRivalsByDynasty(dynastyId);
      set({ rivals, loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));
