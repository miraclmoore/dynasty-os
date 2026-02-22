import { create } from 'zustand';
import type { PlayerSeason } from '@dynasty-os/core-types';
import {
  createPlayerSeason as svcCreate,
  getPlayerSeasonsByPlayer,
  updatePlayerSeason as svcUpdate,
  deletePlayerSeason as svcDelete,
} from '../lib/player-season-service';

interface PlayerSeasonState {
  playerSeasons: PlayerSeason[];
  loading: boolean;
  error: string | null;
}

interface PlayerSeasonActions {
  loadPlayerSeasons: (playerId: string) => Promise<void>;
  addPlayerSeason: (input: Omit<PlayerSeason, 'id' | 'createdAt' | 'updatedAt'>) => Promise<PlayerSeason>;
  updatePlayerSeason: (
    id: string,
    updates: Partial<Omit<PlayerSeason, 'id' | 'playerId' | 'dynastyId' | 'createdAt'>>
  ) => Promise<void>;
  deletePlayerSeason: (id: string) => Promise<void>;
  clearError: () => void;
}

type PlayerSeasonStore = PlayerSeasonState & PlayerSeasonActions;

export const usePlayerSeasonStore = create<PlayerSeasonStore>((set, get) => ({
  playerSeasons: [],
  loading: false,
  error: null,

  loadPlayerSeasons: async (playerId: string) => {
    set({ loading: true, error: null });
    try {
      const playerSeasons = await getPlayerSeasonsByPlayer(playerId);
      set({ playerSeasons, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  addPlayerSeason: async (input: Omit<PlayerSeason, 'id' | 'createdAt' | 'updatedAt'>) => {
    set({ loading: true, error: null });
    try {
      const playerSeason = await svcCreate(input);
      // Reload after mutation
      const playerSeasons = await getPlayerSeasonsByPlayer(input.playerId);
      set({ playerSeasons, loading: false });
      return playerSeason;
    } catch (err) {
      set({ error: String(err), loading: false });
      throw err;
    }
  },

  updatePlayerSeason: async (
    id: string,
    updates: Partial<Omit<PlayerSeason, 'id' | 'playerId' | 'dynastyId' | 'createdAt'>>
  ) => {
    set({ loading: true, error: null });
    try {
      await svcUpdate(id, updates);
      // Reload after mutation using playerId from current state
      const { playerSeasons } = get();
      const existing = playerSeasons.find((ps) => ps.id === id);
      if (existing) {
        const reloaded = await getPlayerSeasonsByPlayer(existing.playerId);
        set({ playerSeasons: reloaded, loading: false });
      } else {
        set({ loading: false });
      }
    } catch (err) {
      set({ error: String(err), loading: false });
      throw err;
    }
  },

  deletePlayerSeason: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const { playerSeasons } = get();
      const existing = playerSeasons.find((ps) => ps.id === id);
      await svcDelete(id);
      if (existing) {
        const reloaded = await getPlayerSeasonsByPlayer(existing.playerId);
        set({ playerSeasons: reloaded, loading: false });
      } else {
        set({ loading: false });
      }
    } catch (err) {
      set({ error: String(err), loading: false });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
