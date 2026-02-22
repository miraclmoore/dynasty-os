import { create } from 'zustand';
import type { PrestigeRating } from '@dynasty-os/core-types';
import {
  createPrestigeRating,
  getPrestigeRatingsByDynasty,
  updatePrestigeRating,
  deletePrestigeRating,
} from '../lib/prestige-service';

interface PrestigeState {
  ratings: PrestigeRating[];
  loading: boolean;
}

interface PrestigeActions {
  loadRatings: (dynastyId: string) => Promise<void>;
  addRating: (
    input: Omit<PrestigeRating, 'id' | 'createdAt' | 'updatedAt'>,
    dynastyId: string
  ) => Promise<void>;
  editRating: (
    id: string,
    updates: Partial<Omit<PrestigeRating, 'id' | 'dynastyId' | 'createdAt'>>,
    dynastyId: string
  ) => Promise<void>;
  removeRating: (id: string, dynastyId: string) => Promise<void>;
}

type PrestigeStore = PrestigeState & PrestigeActions;

export const usePrestigeStore = create<PrestigeStore>((set) => ({
  ratings: [],
  loading: false,

  loadRatings: async (dynastyId: string) => {
    set({ loading: true });
    try {
      const ratings = await getPrestigeRatingsByDynasty(dynastyId);
      set({ ratings, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  addRating: async (input, dynastyId) => {
    set({ loading: true });
    try {
      await createPrestigeRating(input);
      const ratings = await getPrestigeRatingsByDynasty(dynastyId);
      set({ ratings, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  editRating: async (id, updates, dynastyId) => {
    set({ loading: true });
    try {
      await updatePrestigeRating(id, updates);
      const ratings = await getPrestigeRatingsByDynasty(dynastyId);
      set({ ratings, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  removeRating: async (id, dynastyId) => {
    set({ loading: true });
    try {
      await deletePrestigeRating(id);
      const ratings = await getPrestigeRatingsByDynasty(dynastyId);
      set({ ratings, loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));
