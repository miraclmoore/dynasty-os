import { create } from 'zustand';
import type { TransferPortalEntry } from '@dynasty-os/core-types';
import {
  createTransferPortalEntry,
  getTransferPortalEntriesBySeason,
  deleteTransferPortalEntry,
} from '../lib/transfer-portal-service';

interface TransferPortalState {
  entries: TransferPortalEntry[];
  loading: boolean;
}

interface TransferPortalActions {
  loadEntries: (seasonId: string) => Promise<void>;
  addEntry: (input: Omit<TransferPortalEntry, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  removeEntry: (id: string, seasonId: string) => Promise<void>;
}

type TransferPortalStore = TransferPortalState & TransferPortalActions;

export const useTransferPortalStore = create<TransferPortalStore>((set) => ({
  entries: [],
  loading: false,

  loadEntries: async (seasonId: string) => {
    set({ loading: true });
    try {
      const entries = await getTransferPortalEntriesBySeason(seasonId);
      set({ entries, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  addEntry: async (input: Omit<TransferPortalEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    set({ loading: true });
    try {
      await createTransferPortalEntry(input);
      const entries = await getTransferPortalEntriesBySeason(input.seasonId);
      set({ entries, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  removeEntry: async (id: string, seasonId: string) => {
    set({ loading: true });
    try {
      await deleteTransferPortalEntry(id);
      const entries = await getTransferPortalEntriesBySeason(seasonId);
      set({ entries, loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));
