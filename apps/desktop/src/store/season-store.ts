import { create } from 'zustand';
import type { Season } from '@dynasty-os/core-types';
import {
  createSeason as svcCreate,
  getSeasonsByDynasty,
  updateSeason as svcUpdate,
} from '../lib/season-service';

interface SeasonState {
  seasons: Season[];
  activeSeason: Season | null;
  loading: boolean;
  error: string | null;
}

interface SeasonActions {
  loadSeasons: (dynastyId: string) => Promise<void>;
  createSeason: (dynastyId: string, year: number) => Promise<Season>;
  updateSeason: (id: string, updates: Partial<Omit<Season, 'id' | 'dynastyId' | 'createdAt'>>) => Promise<void>;
  setActiveSeason: (season: Season | null) => void;
  clearError: () => void;
}

type SeasonStore = SeasonState & SeasonActions;

export const useSeasonStore = create<SeasonStore>((set, get) => ({
  seasons: [],
  activeSeason: null,
  loading: false,
  error: null,

  loadSeasons: async (dynastyId: string) => {
    set({ loading: true, error: null });
    try {
      const seasons = await getSeasonsByDynasty(dynastyId);
      // Sorted descending by year; first entry is the current/latest season
      const activeSeason = seasons.length > 0 ? seasons[0] : null;
      set({ seasons, activeSeason, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  createSeason: async (dynastyId: string, year: number) => {
    set({ loading: true, error: null });
    try {
      const season = await svcCreate({ dynastyId, year });
      const seasons = await getSeasonsByDynasty(dynastyId);
      set({ seasons, activeSeason: season, loading: false });
      return season;
    } catch (err) {
      set({ error: String(err), loading: false });
      throw err;
    }
  },

  updateSeason: async (id: string, updates: Partial<Omit<Season, 'id' | 'dynastyId' | 'createdAt'>>) => {
    set({ loading: true, error: null });
    try {
      await svcUpdate(id, updates);
      const { seasons } = get();
      // Determine dynastyId from existing seasons list
      const existing = seasons.find((s) => s.id === id);
      if (existing) {
        const reloaded = await getSeasonsByDynasty(existing.dynastyId);
        const activeSeason = reloaded.length > 0 ? reloaded[0] : null;
        set({ seasons: reloaded, activeSeason, loading: false });
      } else {
        set({ loading: false });
      }
    } catch (err) {
      set({ error: String(err), loading: false });
      throw err;
    }
  },

  setActiveSeason: (season: Season | null) => {
    set({ activeSeason: season });
  },

  clearError: () => set({ error: null }),
}));
