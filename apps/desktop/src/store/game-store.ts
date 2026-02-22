import { create } from 'zustand';
import type { Game } from '@dynasty-os/core-types';
import {
  createGame as svcCreate,
  getGamesBySeason,
  updateGame as svcUpdate,
  deleteGame as svcDelete,
} from '../lib/game-service';

interface GameState {
  games: Game[];
  loading: boolean;
  error: string | null;
}

interface GameActions {
  loadGames: (seasonId: string) => Promise<void>;
  logGame: (input: Omit<Game, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Game>;
  updateGame: (id: string, updates: Partial<Omit<Game, 'id' | 'seasonId' | 'dynastyId' | 'createdAt'>>) => Promise<void>;
  deleteGame: (id: string) => Promise<void>;
  clearError: () => void;
}

type GameStore = GameState & GameActions;

export const useGameStore = create<GameStore>((set, get) => ({
  games: [],
  loading: false,
  error: null,

  loadGames: async (seasonId: string) => {
    set({ loading: true, error: null });
    try {
      const games = await getGamesBySeason(seasonId);
      set({ games, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  logGame: async (input: Omit<Game, 'id' | 'createdAt' | 'updatedAt'>) => {
    set({ loading: true, error: null });
    try {
      const game = await svcCreate(input);
      // Reload games for the season; season record was auto-recalculated by service
      const games = await getGamesBySeason(input.seasonId);
      set({ games, loading: false });
      return game;
    } catch (err) {
      set({ error: String(err), loading: false });
      throw err;
    }
  },

  updateGame: async (id: string, updates: Partial<Omit<Game, 'id' | 'seasonId' | 'dynastyId' | 'createdAt'>>) => {
    set({ loading: true, error: null });
    try {
      await svcUpdate(id, updates);
      // Find season from current games state to reload correct season
      const { games } = get();
      const existing = games.find((g) => g.id === id);
      if (existing) {
        const reloaded = await getGamesBySeason(existing.seasonId);
        set({ games: reloaded, loading: false });
      } else {
        set({ loading: false });
      }
    } catch (err) {
      set({ error: String(err), loading: false });
      throw err;
    }
  },

  deleteGame: async (id: string) => {
    set({ loading: true, error: null });
    try {
      // Capture seasonId before delete for reload
      const { games } = get();
      const existing = games.find((g) => g.id === id);
      await svcDelete(id);
      if (existing) {
        const reloaded = await getGamesBySeason(existing.seasonId);
        set({ games: reloaded, loading: false });
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
