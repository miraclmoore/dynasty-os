import { create } from 'zustand';

type Page = 'dashboard' | 'roster' | 'player-profile' | 'legends' | 'records' | 'season-recap';

interface NavigationState {
  currentPage: Page;
  pageParams: Record<string, string>;
}

interface NavigationActions {
  navigate: (page: Page, params?: Record<string, string>) => void;
  goToDashboard: () => void;
  goToRoster: () => void;
  goToPlayerProfile: (playerId: string) => void;
  goToLegends: () => void;
  goToRecords: () => void;
  goToSeasonRecap: (seasonId: string) => void;
}

type NavigationStore = NavigationState & NavigationActions;

export const useNavigationStore = create<NavigationStore>((set) => ({
  currentPage: 'dashboard',
  pageParams: {},

  navigate: (page: Page, params: Record<string, string> = {}) => {
    set({ currentPage: page, pageParams: params });
  },

  goToDashboard: () => {
    set({ currentPage: 'dashboard', pageParams: {} });
  },

  goToRoster: () => {
    set({ currentPage: 'roster', pageParams: {} });
  },

  goToPlayerProfile: (playerId: string) => {
    set({ currentPage: 'player-profile', pageParams: { playerId } });
  },

  goToLegends: () => {
    set({ currentPage: 'legends', pageParams: {} });
  },

  goToRecords: () => {
    set({ currentPage: 'records', pageParams: {} });
  },

  goToSeasonRecap: (seasonId: string) => {
    set({ currentPage: 'season-recap', pageParams: { seasonId } });
  },
}));
