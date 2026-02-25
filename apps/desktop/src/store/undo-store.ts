import { create } from 'zustand';
import { db } from '@dynasty-os/db';

export interface UndoableOperation {
  id: string;
  table: string;
  operation: 'delete' | 'update';
  recordId: string;
  snapshot: Record<string, unknown>;
  description: string;
  performedAt: number;
}

interface UndoState {
  history: UndoableOperation[];
}
interface UndoActions {
  pushUndo: (op: UndoableOperation) => void;
  undo: () => Promise<void>;
  clearHistory: () => void;
}

const MAX_HISTORY = 20;

export const useUndoStore = create<UndoState & UndoActions>((set, get) => ({
  history: [],
  pushUndo: (op) =>
    set((state) => ({
      history: [...state.history, op].slice(-MAX_HISTORY),
    })),
  undo: async () => {
    const { history } = get();
    if (history.length === 0) return;
    const last = history[history.length - 1];
    if (last.operation === 'delete') {
      // Restore deleted record
      await (db as any)[last.table].add(last.snapshot);
    } else if (last.operation === 'update') {
      // Restore prior state
      await (db as any)[last.table].put(last.snapshot);
    }
    set((state) => ({ history: state.history.slice(0, -1) }));
  },
  clearHistory: () => set({ history: [] }),
}));
