import { create } from 'zustand';
import { toast } from 'sonner';
import type { Game } from '@dynasty-os/core-types';
import {
  createGame as svcCreate,
  getGamesBySeason,
  updateGame as svcUpdate,
  deleteGame as svcDelete,
} from '../lib/game-service';
import { useToastStore } from './toast-store';
import { useUndoStore, type UndoableOperation } from './undo-store';

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
      useToastStore.getState().success('Game logged', `vs ${input.opponent}`);
      return game;
    } catch (err) {
      set({ error: String(err), loading: false });
      useToastStore.getState().error('Failed to log game', String(err));
      throw err;
    }
  },

  updateGame: async (id: string, updates: Partial<Omit<Game, 'id' | 'seasonId' | 'dynastyId' | 'createdAt'>>) => {
    set({ loading: true, error: null });
    try {
      // Snapshot existing game for undo before update
      const { games } = get();
      const existing = games.find((g) => g.id === id);
      if (existing) {
        const op: UndoableOperation = {
          id: crypto.randomUUID(),
          table: 'games',
          operation: 'update',
          recordId: id,
          snapshot: existing as unknown as Record<string, unknown>,
          description: `Edit game vs ${existing.opponent}`,
          performedAt: Date.now(),
        };
        useUndoStore.getState().pushUndo(op);
      }
      await svcUpdate(id, updates);
      // Find season from current games state to reload correct season
      const { games: currentGames } = get();
      const game = currentGames.find((g) => g.id === id) ?? existing;
      if (game) {
        const reloaded = await getGamesBySeason(game.seasonId);
        set({ games: reloaded, loading: false });
      } else {
        set({ loading: false });
      }
      useToastStore.getState().success('Game updated');
    } catch (err) {
      set({ error: String(err), loading: false });
      useToastStore.getState().error('Failed to update game', String(err));
      throw err;
    }
  },

  deleteGame: async (id: string) => {
    set({ loading: true, error: null });
    try {
      // Capture existing game before delete for undo snapshot
      const { games } = get();
      const existing = games.find((g) => g.id === id);
      if (existing) {
        const op: UndoableOperation = {
          id: crypto.randomUUID(),
          table: 'games',
          operation: 'delete',
          recordId: id,
          snapshot: existing as unknown as Record<string, unknown>,
          description: `Delete game vs ${existing.opponent}`,
          performedAt: Date.now(),
        };
        useUndoStore.getState().pushUndo(op);
      }
      await svcDelete(id);
      if (existing) {
        const reloaded = await getGamesBySeason(existing.seasonId);
        set({ games: reloaded, loading: false });
      } else {
        set({ loading: false });
      }
      const seasonId = existing?.seasonId;
      toast.success('Game deleted', {
        action: {
          label: 'Undo',
          onClick: async () => {
            await useUndoStore.getState().undo();
            if (seasonId) await useGameStore.getState().loadGames(seasonId);
            toast.success('Game restored');
          },
        },
      });
    } catch (err) {
      set({ error: String(err), loading: false });
      useToastStore.getState().error('Failed to delete game', String(err));
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
