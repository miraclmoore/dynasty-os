import { create } from 'zustand';
import { toast } from 'sonner';
import type { Player } from '@dynasty-os/core-types';
import {
  createPlayer as svcCreate,
  getPlayersByDynasty,
  updatePlayer as svcUpdate,
  deletePlayer as svcDelete,
} from '../lib/player-service';
import { useToastStore } from './toast-store';
import { useUndoStore } from './undo-store';

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
      useToastStore.getState().success('Player added', `${input.firstName} ${input.lastName}`);
      return player;
    } catch (err) {
      set({ error: String(err), loading: false });
      useToastStore.getState().error('Failed to add player', String(err));
      throw err;
    }
  },

  updatePlayer: async (
    id: string,
    updates: Partial<Omit<Player, 'id' | 'dynastyId' | 'createdAt'>>
  ) => {
    set({ loading: true, error: null });
    try {
      // Snapshot existing player for undo before update
      const { players } = get();
      const existing = players.find((p) => p.id === id);
      if (existing) {
        useUndoStore.getState().pushUndo({
          id: crypto.randomUUID(),
          table: 'players',
          operation: 'update',
          recordId: id,
          snapshot: existing as unknown as Record<string, unknown>,
          description: `Edit player ${existing.firstName} ${existing.lastName}`,
          performedAt: Date.now(),
        });
      }
      await svcUpdate(id, updates);
      // Reload using dynastyId from current players state
      const { players: currentPlayers } = get();
      const player = currentPlayers.find((p) => p.id === id) ?? existing;
      if (player) {
        const reloaded = await getPlayersByDynasty(player.dynastyId);
        set({ players: reloaded, loading: false });
      } else {
        set({ loading: false });
      }
      useToastStore.getState().success('Player updated');
    } catch (err) {
      set({ error: String(err), loading: false });
      useToastStore.getState().error('Failed to update player', String(err));
      throw err;
    }
  },

  deletePlayer: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const { players } = get();
      const existing = players.find((p) => p.id === id);
      if (existing) {
        useUndoStore.getState().pushUndo({
          id: crypto.randomUUID(),
          table: 'players',
          operation: 'delete',
          recordId: id,
          snapshot: existing as unknown as Record<string, unknown>,
          description: `Delete player ${existing.firstName} ${existing.lastName}`,
          performedAt: Date.now(),
        });
      }
      await svcDelete(id);
      if (existing) {
        const reloaded = await getPlayersByDynasty(existing.dynastyId);
        set({ players: reloaded, loading: false });
      } else {
        set({ loading: false });
      }
      const dynastyId = existing?.dynastyId;
      toast.success('Player deleted', {
        action: {
          label: 'Undo',
          onClick: async () => {
            await useUndoStore.getState().undo();
            if (dynastyId) await usePlayerStore.getState().loadPlayers(dynastyId);
            toast.success('Player restored');
          },
        },
      });
    } catch (err) {
      set({ error: String(err), loading: false });
      useToastStore.getState().error('Failed to delete player', String(err));
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
