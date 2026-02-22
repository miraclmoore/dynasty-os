import { create } from 'zustand';
import type { Player } from '@dynasty-os/core-types';
import {
  createPlayer as svcCreate,
  getPlayersByDynasty,
  updatePlayer as svcUpdate,
  deletePlayer as svcDelete,
} from '../lib/player-service';

interface PlayerState {
  players: Player[];
  loading: boolean;
  error: string | null;
}

interface PlayerActions {
  loadPlayers: (dynastyId: string) => Promise<void>;
  addPlayer: (input: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Player>;
  updatePlayer: (
    id: string,
    updates: Partial<Omit<Player, 'id' | 'dynastyId' | 'createdAt'>>
  ) => Promise<void>;
  deletePlayer: (id: string) => Promise<void>;
  clearError: () => void;
}

type PlayerStore = PlayerState & PlayerActions;

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  players: [],
  loading: false,
  error: null,

  loadPlayers: async (dynastyId: string) => {
    set({ loading: true, error: null });
    try {
      const players = await getPlayersByDynasty(dynastyId);
      set({ players, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  addPlayer: async (input: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>) => {
    set({ loading: true, error: null });
    try {
      const player = await svcCreate(input);
      const players = await getPlayersByDynasty(input.dynastyId);
      set({ players, loading: false });
      return player;
    } catch (err) {
      set({ error: String(err), loading: false });
      throw err;
    }
  },

  updatePlayer: async (
    id: string,
    updates: Partial<Omit<Player, 'id' | 'dynastyId' | 'createdAt'>>
  ) => {
    set({ loading: true, error: null });
    try {
      await svcUpdate(id, updates);
      // Reload using dynastyId from current players state
      const { players } = get();
      const existing = players.find((p) => p.id === id);
      if (existing) {
        const reloaded = await getPlayersByDynasty(existing.dynastyId);
        set({ players: reloaded, loading: false });
      } else {
        set({ loading: false });
      }
    } catch (err) {
      set({ error: String(err), loading: false });
      throw err;
    }
  },

  deletePlayer: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const { players } = get();
      const existing = players.find((p) => p.id === id);
      await svcDelete(id);
      if (existing) {
        const reloaded = await getPlayersByDynasty(existing.dynastyId);
        set({ players: reloaded, loading: false });
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
