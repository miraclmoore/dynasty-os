import { create } from 'zustand';

interface FilterState {
  filters: Record<string, Record<string, unknown>>;
}
interface FilterActions {
  setFilter: (page: string, key: string, value: unknown) => void;
  getFilters: (page: string) => Record<string, unknown>;
  clearFilters: (page: string) => void;
  clearAll: () => void;
}

export const useFilterStore = create<FilterState & FilterActions>((set, get) => ({
  filters: {},
  setFilter: (page, key, value) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [page]: { ...(state.filters[page] ?? {}), [key]: value },
      },
    })),
  getFilters: (page) => get().filters[page] ?? {},
  clearFilters: (page) =>
    set((state) => {
      const next = { ...state.filters };
      delete next[page];
      return { filters: next };
    }),
  clearAll: () => set({ filters: {} }),
}));
