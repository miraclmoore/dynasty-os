import { create } from 'zustand';
import { db } from '@dynasty-os/db';

// Union of every table name targeted by pushUndo callers.
// Sources verified by grep of pushUndo across apps/desktop/src/store/*:
//   game-store.ts            -> 'games'
//   player-store.ts          -> 'players'
//   coaching-staff-store.ts  -> 'coachingStaff'
//   future-schedule-store.ts -> 'futureGames'
//   nil-store.ts             -> 'nilEntries'
export type UndoableTableName =
  | 'games'
  | 'players'
  | 'coachingStaff'
  | 'futureGames'
  | 'nilEntries';

// Structural type for the two Dexie Table methods used in undo().
// Avoids importing Table from 'dexie' directly (dexie is a dep of @dynasty-os/db, not apps/desktop).
type UndoableTable = {
  add: (item: Record<string, unknown>) => Promise<unknown>;
  put: (item: Record<string, unknown>) => Promise<unknown>;
};

const TABLE_MAP: Record<UndoableTableName, UndoableTable> = {
  games: db.games as unknown as UndoableTable,
  players: db.players as unknown as UndoableTable,
  coachingStaff: db.coachingStaff as unknown as UndoableTable,
  futureGames: db.futureGames as unknown as UndoableTable,
  nilEntries: db.nilEntries as unknown as UndoableTable,
};

export interface UndoableOperation {
  id: string;
  table: UndoableTableName;
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
    const table = TABLE_MAP[last.table];
    if (!table) {
      // Forward-compat guard: if a future caller pushes a yet-unmapped table name
      // (which would also fail the type check), drop the entry rather than crash.
      set((state) => ({ history: state.history.slice(0, -1) }));
      return;
    }
    if (last.operation === 'delete') {
      // Restore deleted record
      await table.add(last.snapshot);
    } else if (last.operation === 'update') {
      // Restore prior state
      await table.put(last.snapshot);
    }
    set((state) => ({ history: state.history.slice(0, -1) }));
  },
  clearHistory: () => set({ history: [] }),
}));
