import { create } from 'zustand';
import type { Dynasty } from '@dynasty-os/core-types';
import {
  createDynasty as svcCreate,
  getDynasties,
  deleteDynasty as svcDelete,
  type CreateDynastyInput,
} from '../lib/dynasty-service';
import {
  exportDynasty as svcExport,
  importDynasty,
  downloadJson,
  readFileAsText,
} from '../lib/export-import';

interface DynastyState {
  dynasties: Dynasty[];
  activeDynasty: Dynasty | null;
  loading: boolean;
  error: string | null;
}

interface DynastyActions {
  loadDynasties: () => Promise<void>;
  createDynasty: (input: CreateDynastyInput) => Promise<Dynasty>;
  setActiveDynasty: (dynasty: Dynasty | null) => void;
  switchDynasty: (dynasty: Dynasty) => void;
  deleteDynasty: (id: string) => Promise<void>;
  exportDynasty: (id: string) => Promise<void>;
  importDynastyFromFile: (file: File) => Promise<void>;
  clearError: () => void;
}

type DynastyStore = DynastyState & DynastyActions;

export const useDynastyStore = create<DynastyStore>((set, get) => ({
  dynasties: [],
  activeDynasty: null,
  loading: false,
  error: null,

  loadDynasties: async () => {
    set({ loading: true, error: null });
    try {
      const dynasties = await getDynasties();
      set({ dynasties, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  createDynasty: async (input: CreateDynastyInput) => {
    set({ loading: true, error: null });
    try {
      const dynasty = await svcCreate(input);
      const dynasties = await getDynasties();
      set({ dynasties, loading: false });
      return dynasty;
    } catch (err) {
      set({ error: String(err), loading: false });
      throw err;
    }
  },

  setActiveDynasty: (dynasty: Dynasty | null) => {
    set({ activeDynasty: dynasty });
  },

  switchDynasty: (dynasty: Dynasty) => {
    set({ activeDynasty: dynasty });
  },

  deleteDynasty: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await svcDelete(id);
      const dynasties = await getDynasties();
      const { activeDynasty } = get();
      const stillActive = activeDynasty?.id === id ? null : activeDynasty;
      set({ dynasties, activeDynasty: stillActive, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
      throw err;
    }
  },

  exportDynasty: async (id: string) => {
    try {
      const json = await svcExport(id);
      const { dynasties } = get();
      const dynasty = dynasties.find((d) => d.id === id);
      const safeName = (dynasty?.name ?? 'dynasty').replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const filename = `${safeName}-${Date.now()}.json`;
      await downloadJson(json, filename);
    } catch (err) {
      set({ error: String(err) });
      throw err;
    }
  },

  importDynastyFromFile: async (file: File) => {
    set({ loading: true, error: null });
    try {
      const json = await readFileAsText(file);
      await importDynasty(json);
      const dynasties = await getDynasties();
      set({ dynasties, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
