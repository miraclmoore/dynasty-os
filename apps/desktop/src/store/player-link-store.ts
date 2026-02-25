import { create } from 'zustand';
import type { PlayerLink } from '@dynasty-os/core-types';
import {
  createPlayerLink,
  getPlayerLinkByPlayer,
  deletePlayerLink,
} from '../lib/player-link-service';
import { useToastStore } from './toast-store';

interface PlayerLinkState {
  link: PlayerLink | null;
  loading: boolean;
}

interface PlayerLinkActions {
  loadLink: (dynastyId: string, playerId: string) => Promise<void>;
  setLink: (input: Omit<PlayerLink, 'id' | 'createdAt' | 'updatedAt'>, dynastyId: string, playerId: string) => Promise<void>;
  removeLink: (dynastyId: string, playerId: string) => Promise<void>;
}

type PlayerLinkStore = PlayerLinkState & PlayerLinkActions;

export const usePlayerLinkStore = create<PlayerLinkStore>((set, get) => ({
  link: null,
  loading: false,

  loadLink: async (dynastyId: string, playerId: string) => {
    set({ loading: true });
    try {
      const link = await getPlayerLinkByPlayer(dynastyId, playerId);
      set({ link: link ?? null, loading: false });
    } catch (err) {
      set({ loading: false });
      useToastStore.getState().error('Failed to load player link', String(err));
    }
  },

  setLink: async (input, dynastyId, playerId) => {
    set({ loading: true });
    try {
      // Remove existing link if present before creating new one
      const { link } = get();
      if (link) {
        await deletePlayerLink(link.id);
      }
      await createPlayerLink(input);
      const updated = await getPlayerLinkByPlayer(dynastyId, playerId);
      set({ link: updated ?? null, loading: false });
      useToastStore.getState().success('Career link saved');
    } catch (err) {
      set({ loading: false });
      useToastStore.getState().error('Failed to save career link', String(err));
    }
  },

  removeLink: async (dynastyId, playerId) => {
    set({ loading: true });
    try {
      const { link } = get();
      if (link) {
        await deletePlayerLink(link.id);
      }
      const updated = await getPlayerLinkByPlayer(dynastyId, playerId);
      set({ link: updated ?? null, loading: false });
      useToastStore.getState().success('Career link removed');
    } catch (err) {
      set({ loading: false });
      useToastStore.getState().error('Failed to remove career link', String(err));
    }
  },
}));
