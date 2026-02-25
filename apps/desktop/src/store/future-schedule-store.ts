import { create } from 'zustand';
import { toast } from 'sonner';
import type { FutureGame } from '@dynasty-os/core-types';
import {
  createFutureGame,
  getFutureGamesByDynasty,
  deleteFutureGame,
} from '../lib/future-schedule-service';
import { useToastStore } from './toast-store';
import { useUndoStore, type UndoableOperation } from './undo-store';

interface FutureScheduleState {
  games: FutureGame[];
  loading: boolean;
}

interface FutureScheduleActions {
  loadGames: (dynastyId: string) => Promise<void>;
  addGame: (input: Omit<FutureGame, 'id' | 'createdAt' | 'updatedAt'>, dynastyId: string) => Promise<void>;
  removeGame: (id: string, dynastyId: string) => Promise<void>;
}

type FutureScheduleStore = FutureScheduleState & FutureScheduleActions;

export const useFutureScheduleStore = create<FutureScheduleStore>((set, get) => ({
  games: [],
  loading: false,

  loadGames: async (dynastyId: string) => {
    set({ loading: true });
    try {
      const games = await getFutureGamesByDynasty(dynastyId);
      set({ games, loading: false });
    } catch (err) {
      set({ loading: false });
      useToastStore.getState().error('Failed to load future schedule', String(err));
    }
  },

  addGame: async (input, dynastyId) => {
    set({ loading: true });
    try {
      await createFutureGame(input);
      const games = await getFutureGamesByDynasty(dynastyId);
      set({ games, loading: false });
      useToastStore.getState().success('Game scheduled', `${input.opponent} — ${input.year}`);
    } catch (err) {
      set({ loading: false });
      useToastStore.getState().error('Failed to schedule game', String(err));
    }
  },

  removeGame: async (id, dynastyId) => {
    set({ loading: true });
    try {
      const { games } = get();
      const existing = games.find((g) => g.id === id);
      if (existing) {
        const op: UndoableOperation = {
          id: crypto.randomUUID(),
          table: 'futureGames',
          operation: 'delete',
          recordId: id,
          snapshot: existing as unknown as Record<string, unknown>,
          description: `Delete scheduled game vs ${existing.opponent} (${existing.year})`,
          performedAt: Date.now(),
        };
        useUndoStore.getState().pushUndo(op);
      }
      await deleteFutureGame(id);
      const updated = await getFutureGamesByDynasty(dynastyId);
      set({ games: updated, loading: false });
      toast.success('Game removed', {
        action: {
          label: 'Undo',
          onClick: async () => {
            await useUndoStore.getState().undo();
            await useFutureScheduleStore.getState().loadGames(dynastyId);
            toast.success('Game restored');
          },
        },
      });
    } catch (err) {
      set({ loading: false });
      useToastStore.getState().error('Failed to remove game', String(err));
    }
  },
}));
