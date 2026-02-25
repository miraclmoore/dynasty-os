import { create } from 'zustand';
import { toast } from 'sonner';
import type { NilEntry } from '@dynasty-os/core-types';
import {
  createNilEntry,
  getNilEntriesByDynasty,
  deleteNilEntry,
} from '../lib/nil-service';
import { useToastStore } from './toast-store';
import { useUndoStore, type UndoableOperation } from './undo-store';

interface NilState {
  entries: NilEntry[];
  loading: boolean;
}

interface NilActions {
  loadEntries: (dynastyId: string) => Promise<void>;
  addEntry: (input: Omit<NilEntry, 'id' | 'createdAt' | 'updatedAt'>, dynastyId: string) => Promise<void>;
  removeEntry: (id: string, dynastyId: string) => Promise<void>;
}

type NilStore = NilState & NilActions;

export const useNilStore = create<NilStore>((set, get) => ({
  entries: [],
  loading: false,

  loadEntries: async (dynastyId: string) => {
    set({ loading: true });
    try {
      const entries = await getNilEntriesByDynasty(dynastyId);
      // Sort by year descending (most recent first)
      entries.sort((a, b) => b.year - a.year);
      set({ entries, loading: false });
    } catch (err) {
      set({ loading: false });
      useToastStore.getState().error('Failed to load NIL entries', String(err));
    }
  },

  addEntry: async (input, dynastyId) => {
    set({ loading: true });
    try {
      await createNilEntry(input);
      const entries = await getNilEntriesByDynasty(dynastyId);
      entries.sort((a, b) => b.year - a.year);
      set({ entries, loading: false });
      useToastStore.getState().success('NIL deal logged', `${input.brand} — $${input.amount.toLocaleString()}`);
    } catch (err) {
      set({ loading: false });
      useToastStore.getState().error('Failed to log NIL deal', String(err));
    }
  },

  removeEntry: async (id, dynastyId) => {
    set({ loading: true });
    try {
      const { entries } = get();
      const existing = entries.find((e) => e.id === id);
      if (existing) {
        const op: UndoableOperation = {
          id: crypto.randomUUID(),
          table: 'nilEntries',
          operation: 'delete',
          recordId: id,
          snapshot: existing as unknown as Record<string, unknown>,
          description: `Delete NIL deal ${existing.brand} for ${existing.playerName}`,
          performedAt: Date.now(),
        };
        useUndoStore.getState().pushUndo(op);
      }
      await deleteNilEntry(id);
      const updated = await getNilEntriesByDynasty(dynastyId);
      updated.sort((a, b) => b.year - a.year);
      set({ entries: updated, loading: false });
      toast.success('NIL deal removed', {
        action: {
          label: 'Undo',
          onClick: async () => {
            await useUndoStore.getState().undo();
            await useNilStore.getState().loadEntries(dynastyId);
            toast.success('NIL deal restored');
          },
        },
      });
    } catch (err) {
      set({ loading: false });
      useToastStore.getState().error('Failed to remove NIL deal', String(err));
    }
  },
}));
